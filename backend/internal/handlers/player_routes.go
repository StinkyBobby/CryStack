package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/StinkyBobby/CryStack/internal/config"
	"github.com/StinkyBobby/CryStack/internal/models"
	"github.com/StinkyBobby/CryStack/internal/repository"
	"github.com/StinkyBobby/CryStack/internal/services"
	"github.com/StinkyBobby/CryStack/pkg/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterPlayerRoutes(api *gin.RouterGroup, gormDB *gorm.DB, cfg *config.Config, httpClient *http.Client) {
	playerRepo := repository.NewPlayerRepository(gormDB)
	sessionRepo := repository.NewSessionRepository(gormDB)

	players := api.Group("/players")
	{
		players.GET("", func(c *gin.Context) {
			all, err := playerRepo.GetAll()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, all)
		})

		players.GET("/:steam_id", func(c *gin.Context) {
			idStr := c.Param("steam_id")
			id, err := strconv.ParseUint(idStr, 10, 64)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid steam_id"})
				return
			}

			plr, err := playerRepo.GetBySteamID(id)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					c.JSON(http.StatusNotFound, gin.H{"error": "player not found"})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, plr)
		})

		protected := players.Group("")
		protected.Use(middleware.AuthMiddleware(cfg, sessionRepo))
		{
			protected.GET("/me", func(c *gin.Context) {
				steamID, _ := c.Get("steam_id")
				plr, err := playerRepo.GetBySteamID(steamID.(uint64))
				if err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						c.JSON(http.StatusNotFound, gin.H{"error": "player not found"})
						return
					}
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, plr)
			})

			protected.POST("", func(c *gin.Context) {
				authSteamID := c.GetUint64("steam_id")
				var p models.Player
				if err := c.BindJSON(&p); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				p.SteamID = authSteamID
				if err := playerRepo.Upsert(&p); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, p)
			})

			protected.PUT("/:steam_id", func(c *gin.Context) {
				idStr := c.Param("steam_id")
				id, err := strconv.ParseUint(idStr, 10, 64)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "invalid steam_id"})
					return
				}
				if id != c.GetUint64("steam_id") {
					c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
					return
				}

				var p models.Player
				if err := c.BindJSON(&p); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				p.SteamID = id
				if err := playerRepo.Upsert(&p); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, p)
			})

			protected.PUT("/:steam_id/refresh", func(c *gin.Context) {
				idStr := c.Param("steam_id")
				steamID, err := strconv.ParseUint(idStr, 10, 64)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "invalid steam_id"})
					return
				}
				if steamID != c.GetUint64("steam_id") {
					c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
					return
				}

				updatedData, err := services.NewOpenDotaService(httpClient).FetchPlayerData(steamID)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch data from OpenDota"})
					return
				}

				player, err := playerRepo.GetBySteamID(steamID)
				if err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						c.JSON(http.StatusNotFound, gin.H{"error": "player not found in database"})
						return
					}
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}

				player.MMR = updatedData.MMR
				player.GPM = updatedData.GPM
				player.Winrate = updatedData.Winrate
				player.Role = updatedData.Role
				player.XPM = updatedData.XPM
				player.MatchesPlayed = updatedData.MatchesPlayed
				player.Heroes = updatedData.Heroes
				player.Style = updatedData.Style
				player.Avatar = updatedData.Avatar
				player.Name = updatedData.Name
				player.LastUpdated = time.Now()

				if err := playerRepo.Upsert(player); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update player data"})
					return
				}

				c.JSON(http.StatusOK, player)
			})

			protected.DELETE("/:steam_id", func(c *gin.Context) {
				idStr := c.Param("steam_id")
				id, err := strconv.ParseUint(idStr, 10, 64)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": "invalid steam_id"})
					return
				}
				if id != c.GetUint64("steam_id") {
					c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
					return
				}

				if err := playerRepo.DeleteBySteamID(id); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.Status(http.StatusNoContent)
			})
		}
	}
}
