package handlers

import (
	"net/http"
	"time"

	"github.com/StinkyBobby/CryStack/internal/config"
	"github.com/StinkyBobby/CryStack/internal/models"
	"github.com/StinkyBobby/CryStack/internal/repository"
	"github.com/StinkyBobby/CryStack/internal/services"
	"github.com/StinkyBobby/CryStack/pkg/jwt"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterAuthRoutes(api *gin.RouterGroup, gormDB *gorm.DB, cfg *config.Config, httpClient *http.Client) {
	sessionRepo := repository.NewSessionRepository(gormDB)
	playerRepo := repository.NewPlayerRepository(gormDB)
	steamSvc := services.NewSteamService(playerRepo, cfg, httpClient)

	auth := api.Group("/auth")
	{
		auth.POST("/login", func(c *gin.Context) {
			// читаем X-SteamID из заголовка или из JSON { "steam_id": "123..." }
			var body struct {
				SteamID uint64 `json:"steam_id"`
			}

			if err := c.ShouldBindJSON(&body); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json"})
				return
			}

			steamID := body.SteamID
			if steamID == 0 {
				steamID = steamSvc.GetSteamID(c.Request)
			}
			if steamID == 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "steam_id missing"})
				return
			}

			// пробуем создать/обновить игрока минимально
			player := &models.Player{
				SteamID:     steamID,
				Name:        steamSvc.GetName(steamID),
				Avatar:      steamSvc.GetAvatar(steamID),
				LastUpdated: time.Now(),
			}
			if err := playerRepo.Upsert(player); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "player upsert failed"})
				return
			}

			// генерируем JWT и сохраняем сессию
			token, err := jwt.GenerateJWT(steamID, cfg.JWTSecret)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "token generation failed"})
				return
			}
			session := &models.Session{
				SteamID:   steamID,
				Token:     token,
				ExpiredAt: time.Now().Add(24 * time.Hour),
			}
			if err := sessionRepo.Create(session); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "session create failed"})
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
	}
}
