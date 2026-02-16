package handlers

import (
	"net/http"
	"strconv"

	"github.com/StinkyBobby/CryStack/internal/config"
	"github.com/StinkyBobby/CryStack/internal/models"
	"github.com/StinkyBobby/CryStack/internal/repository"
	"github.com/StinkyBobby/CryStack/pkg/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterPlayerRoutes(api *gin.RouterGroup, gormDB *gorm.DB, cfg *config.Config, httpClient *http.Client) {
	playerRepo := repository.NewPlayerRepository(gormDB)

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
		protected.Use(middleware.AuthMiddleware(cfg))
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
