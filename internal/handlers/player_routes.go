package handlers

import (
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
			id, _ := strconv.ParseUint(idStr, 10, 64)
			plr, err := playerRepo.GetBySteamID(id)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, plr)
		})

		protected := players.Group("")
		protected.Use(middleware.AuthMiddleware(cfg, sessionRepo))
		{
			protected.POST("", func(c *gin.Context) {
				var p models.Player
				if err := c.BindJSON(&p); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				if err := playerRepo.Create(&p); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, p)
			})

			protected.PUT("/:steam_id", func(c *gin.Context) {
				idStr := c.Param("steam_id")
				id, _ := strconv.ParseUint(idStr, 10, 64)
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
			})

			protected.PUT("/:steam_id/refresh", func(c *gin.Context) {
				idStr := c.Param("steam_id")
				steamID, _ := strconv.ParseUint(idStr, 10, 64)

				updatedData, err := services.NewOpenDotaService(httpClient).FetchPlayerData(steamID)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch data from OpenDota"})
					return
				}

				player, err := playerRepo.GetBySteamID(steamID)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "player not found in database"})
					return
				}

				player.MMR = updatedData.MMR
				player.GPM = updatedData.GPM
				player.Winrate = updatedData.Winrate
				player.Role = updatedData.Role

				player.XPM = updatedData.XPM                     // <-- Теперь XPM не будет 0
				player.MatchesPlayed = updatedData.MatchesPlayed // <-- Теперь матчи не будут 0
				player.Heroes = updatedData.Heroes               // <-- Теперь герои не будут null
				player.Style = updatedData.Style                 // <-- Стиль тоже подтянется
				player.Avatar = updatedData.Avatar               // <-- Аватар тоже стоит обновить, если сменил
				player.Name = updatedData.Name                   // <-- И никнейм

				player.LastUpdated = time.Now()

				if err := playerRepo.Upsert(player); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update player data"})
					return
				}

				c.JSON(http.StatusOK, player)
			})

			protected.DELETE("/:steam_id", func(c *gin.Context) {
				idStr := c.Param("steam_id")
				id, _ := strconv.ParseUint(idStr, 10, 64)
				if err := playerRepo.DeleteBySteamID(id); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.Status(http.StatusNoContent)
			})
		}
	}
}
