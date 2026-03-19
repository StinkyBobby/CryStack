package handlers

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/StinkyBobby/CryStack/internal/config"
	"github.com/StinkyBobby/CryStack/internal/models"
	"github.com/StinkyBobby/CryStack/internal/repository"
	"github.com/StinkyBobby/CryStack/internal/services"
	"github.com/StinkyBobby/CryStack/pkg/jwt"
	"github.com/StinkyBobby/CryStack/pkg/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func bearerToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	token := strings.TrimPrefix(authHeader, "Bearer ")
	if token == authHeader {
		return ""
	}
	return token
}

func backendOrigin(cfg *config.Config) string {
	if cfg.BackendURL != "" {
		return strings.TrimRight(cfg.BackendURL, "/")
	}

	domain := cfg.Domain
	if domain == "" {
		domain = "localhost"
	}

	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	return fmt.Sprintf("http://%s:%s", domain, port)
}

func frontendOrigin(cfg *config.Config) string {
	if cfg.FrontendURL != "" {
		return strings.TrimRight(cfg.FrontendURL, "/")
	}

	domain := cfg.Domain
	if domain == "" {
		domain = "localhost"
	}

	vitePort := cfg.VitePort
	if vitePort == "" {
		vitePort = "5173"
	}

	return fmt.Sprintf("http://%s:%s", domain, vitePort)
}

func extractSteamIDFromClaimedID(claimedID string) uint64 {
	const prefix = "https://steamcommunity.com/openid/id/"
	if !strings.HasPrefix(claimedID, prefix) {
		return 0
	}

	idPart := strings.TrimPrefix(claimedID, prefix)
	parsed, err := url.PathUnescape(idPart)
	if err != nil {
		return 0
	}

	var steamID uint64
	_, err = fmt.Sscanf(parsed, "%d", &steamID)
	if err != nil {
		return 0
	}
	return steamID
}

func verifySteamOpenID(c *gin.Context, httpClient *http.Client) bool {
	form := url.Values{}
	for key, values := range c.Request.URL.Query() {
		if len(values) > 0 {
			form.Set(key, values[0])
		}
	}
	form.Set("openid.mode", "check_authentication")

	resp, err := httpClient.PostForm("https://steamcommunity.com/openid/login", form)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false
	}

	return strings.Contains(string(body), "is_valid:true")
}

func upsertPlayerAndCreateSession(steamID uint64, playerRepo repository.PlayerRepository, sessionRepo repository.SessionRepository, steamSvc *services.SteamService, cfg *config.Config) (string, *models.Player, error) {
	name, avatar, err := steamSvc.GetProfile(steamID)
	if err != nil {
		return "", nil, err
	}

	player := &models.Player{
		SteamID:     steamID,
		Name:        name,
		Avatar:      avatar,
		LastUpdated: time.Now(),
	}

	if err := playerRepo.Upsert(player); err != nil {
		return "", nil, err
	}

	token, err := jwt.GenerateJWT(steamID, cfg.JWTSecret)
	if err != nil {
		return "", nil, err
	}

	session := &models.Session{
		SteamID:   steamID,
		Token:     token,
		ExpiredAt: time.Now().Add(24 * time.Hour),
	}
	if err := sessionRepo.Create(session); err != nil {
		return "", nil, err
	}

	return token, player, nil
}

func RegisterAuthRoutes(api *gin.RouterGroup, gormDB *gorm.DB, cfg *config.Config, httpClient *http.Client) {
	sessionRepo := repository.NewSessionRepository(gormDB)
	playerRepo := repository.NewPlayerRepository(gormDB)
	steamSvc := services.NewSteamService(playerRepo, cfg, httpClient)

	auth := api.Group("/auth")
	{
		auth.GET("/steam/start", func(c *gin.Context) {
			returnTo := backendOrigin(cfg) + "/api/auth/steam/callback"
			realm := backendOrigin(cfg)

			params := url.Values{}
			params.Set("openid.ns", "http://specs.openid.net/auth/2.0")
			params.Set("openid.mode", "checkid_setup")
			params.Set("openid.return_to", returnTo)
			params.Set("openid.realm", realm)
			params.Set("openid.identity", "http://specs.openid.net/auth/2.0/identifier_select")
			params.Set("openid.claimed_id", "http://specs.openid.net/auth/2.0/identifier_select")

			redirectURL := "https://steamcommunity.com/openid/login?" + params.Encode()
			c.Redirect(http.StatusFound, redirectURL)
		})

		auth.GET("/steam/callback", func(c *gin.Context) {
			if !verifySteamOpenID(c, httpClient) {
				c.Redirect(http.StatusFound, frontendOrigin(cfg)+"/?auth_error=steam_verification_failed")
				return
			}

			claimedID := c.Query("openid.claimed_id")
			steamID := extractSteamIDFromClaimedID(claimedID)
			if steamID == 0 {
				c.Redirect(http.StatusFound, frontendOrigin(cfg)+"/?auth_error=steam_id_missing")
				return
			}

			token, _, err := upsertPlayerAndCreateSession(steamID, playerRepo, sessionRepo, steamSvc, cfg)
			if err != nil {
				c.Redirect(http.StatusFound, frontendOrigin(cfg)+"/?auth_error=session_create_failed")
				return
			}

			c.Redirect(http.StatusFound, frontendOrigin(cfg)+"/?token="+url.QueryEscape(token))
		})

		auth.POST("/login", func(c *gin.Context) {
			var body struct {
				SteamID uint64 `json:"steam_id"`
			}

			_ = c.ShouldBindJSON(&body)

			steamID := body.SteamID
			if steamID == 0 {
				steamID = steamSvc.GetSteamID(c.Request)
			}

			if steamID == 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "steam_id missing"})
				return
			}

			token, player, err := upsertPlayerAndCreateSession(steamID, playerRepo, sessionRepo, steamSvc, cfg)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "login failed"})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"token": token,
				"player": gin.H{
					"steam_id": steamID,
					"name":     player.Name,
					"avatar":   player.Avatar,
				},
			})
		})

		protected := auth.Group("")
		protected.Use(middleware.AuthMiddleware(cfg, sessionRepo))
		{
			protected.GET("/me", func(c *gin.Context) {
				steamIDRaw, _ := c.Get("steam_id")
				steamID, ok := steamIDRaw.(uint64)
				if !ok {
					c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
					return
				}

				player, err := playerRepo.GetBySteamID(steamID)
				if err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "player not found"})
					return
				}

				c.JSON(http.StatusOK, gin.H{"player": player})
			})

			protected.POST("/logout", func(c *gin.Context) {
				token := bearerToken(c)
				if token == "" {
					c.JSON(http.StatusUnauthorized, gin.H{"error": "bearer token required"})
					return
				}

				if err := sessionRepo.DeleteByToken(token); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete session"})
					return
				}

				c.JSON(http.StatusOK, gin.H{"message": "logged out"})
			})
		}
	}
}
