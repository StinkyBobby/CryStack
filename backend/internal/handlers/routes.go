package handlers

import (
	"net/http"

	"github.com/StinkyBobby/CryStack/internal/config"
	"github.com/StinkyBobby/CryStack/internal/repository"
	"github.com/StinkyBobby/CryStack/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(r *gin.Engine, gormDB *gorm.DB, cfg *config.Config, httpClient *http.Client) {
	playerRepo := repository.NewPlayerRepository(gormDB)
	teamRepo := repository.NewTeamRepository(gormDB)

	matchmakingSvc := services.NewMatchmakingService(playerRepo, teamRepo)

	api := r.Group("/api")
	{
		RegisterAuthRoutes(api, gormDB, cfg, httpClient)
		RegisterPlayerRoutes(api, gormDB, cfg, httpClient)
		RegisterTeamRoutes(api, gormDB, cfg, matchmakingSvc)
		RegisterInviteRoutes(api, gormDB, cfg)
	}
}
