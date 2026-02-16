package handlers

import (
	"net/http"

	"github.com/StinkyBobby/CryStack/internal/config"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(r *gin.Engine, gormDB *gorm.DB, cfg *config.Config, httpClient *http.Client) {
	api := r.Group("/api")
	{
		RegisterAuthRoutes(api, gormDB, cfg, httpClient)
		RegisterPlayerRoutes(api, gormDB, cfg, httpClient)
	}
}
