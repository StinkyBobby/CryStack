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

func RegisterTeamRoutes(api *gin.RouterGroup, gormDB *gorm.DB, cfg *config.Config, httpClient *http.Client) {
	teamRepo := repository.NewTeamRepository(gormDB)
	sessonRepo := repository.NewSessionRepository(gormDB)

	teams := api.Group("/teams")
	{
		teams.GET("/:steam_id", func(c *gin.Context) {
			idStr := c.Param("steam_id")
			id, _ := strconv.ParseUint(idStr, 10, 64)
			tm, err := teamRepo.GetByID(id)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, tm)
		})

		teams.GET("", func(c *gin.Context) {
			all, err := teamRepo.GetOpenTeams()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, all)
		})

		protected := teams.Group("")
		protected.Use(middleware.AuthMiddleware(cfg, sessonRepo))
		{
			protected.POST("", func(c *gin.Context) {
				var t models.Team
				if err := c.BindJSON(&t); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				if err := teamRepo.Create(&t); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, t)
			})

			protected.PUT("/:steam_id", func(c *gin.Context) {
				idStr := c.Param("steam_id")
				id, _ := strconv.ParseUint(idStr, 10, 64)
				var t models.Team
				if err := c.BindJSON(&t); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				t.LeaderSteamID = id
				if err := teamRepo.Update(id, &t); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, t)
			})
		}
	}
}
