package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/StinkyBobby/CryStack/internal/config"
	"github.com/StinkyBobby/CryStack/internal/models"
	"github.com/StinkyBobby/CryStack/internal/repository"
	"github.com/StinkyBobby/CryStack/internal/services"
	"github.com/StinkyBobby/CryStack/pkg/middleware"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func processPlayerRemoval(team *models.Team, player *models.Player, db *gorm.DB) error {
	roleFound := false
	newCurrent := models.RolesJSON{}

	for _, r := range team.CurrentRoles {
		if r == player.Role && !roleFound {
			roleFound = true
			team.WantedRoles = append(team.WantedRoles, r)
		} else {
			newCurrent = append(newCurrent, r)
		}
	}

	if !roleFound {
		return fmt.Errorf("player with this role not found in team")
	}

	team.CurrentRoles = newCurrent
	team.IsOpen = true

	return db.Save(team).Error
}

func RegisterTeamRoutes(api *gin.RouterGroup, gormDB *gorm.DB, cfg *config.Config, matchmakingSvc *services.MatchmakingService) {
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

		teams.GET("/:steam_id/matchmaking", func(c *gin.Context) {
			idStr := c.Param("steam_id")
			teamID, _ := strconv.ParseUint(idStr, 10, 64)

			tm, err := teamRepo.GetByID(teamID)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
				return
			}

			res, err := matchmakingSvc.FindPlayersForTeam(tm)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, res)
		})

		protected := teams.Group("")
		protected.Use(middleware.AuthMiddleware(cfg, sessonRepo))
		{
			// ДОЮАВИТЬ В POSTMAN
			protected.POST("/:id/leave", func(c *gin.Context) {
				teamID := c.Param("id")
				userSteamID, _ := c.Get("steam_id")

				var team models.Team
				if err := gormDB.First(&team, teamID).Error; err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
					return
				}

				var player models.Player
				if err := gormDB.Where("steam_id = ?", userSteamID).First(&player).Error; err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "player data not found"})
					return
				}

				if err := processPlayerRemoval(&team, &player, gormDB); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				c.JSON(http.StatusOK, gin.H{"message": "You left the team", "team": team})
			})

			// POST /api/teams/:id/kick/:steam_id ДОБАВИТЬ В POSTMAN
			protected.POST("/:id/kick/:target_steam_id", func(c *gin.Context) {
				teamID := c.Param("id")
				targetSteamID := c.Param("target_steam_id")
				leaderSteamID, _ := c.Get("steam_id")

				var team models.Team
				gormDB.First(&team, teamID)

				// Проверка прав лидера
				if team.LeaderSteamID != leaderSteamID.(uint64) {
					c.JSON(http.StatusForbidden, gin.H{"error": "Only leader can kick players"})
					return
				}

				var player models.Player
				gormDB.Where("steam_id = ?", targetSteamID).First(&player)

				if err := processPlayerRemoval(&team, &player, gormDB); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				c.JSON(http.StatusOK, gin.H{"message": "Player kicked", "team": team})
			})

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

			protected.POST("/:id/matchmaking/auto-invite", func(c *gin.Context) {
				idStr := c.Param("id")
				teamID, _ := strconv.ParseUint(idStr, 10, 64)

				tm, err := teamRepo.GetByID(uint64(teamID))
				if err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
					return
				}

				res, err := matchmakingSvc.FindPlayersForTeam(tm)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}

				var createdInvites []models.Invite
				for _, match := range res {
					invite := models.Invite{
						TeamID:  uint64(tm.ID),
						SteamID: match.Player.SteamID,
						Status:  "pending",
					}

					if err := gormDB.Create(&invite).Error; err != nil {
						continue
					}
					createdInvites = append(createdInvites, invite)
				}

				c.JSON(http.StatusOK, gin.H{
					"message":      "Auto-invite complete",
					"invites_sent": len(createdInvites),
					"candidates":   res,
				})
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

			protected.DELETE("/:steam_id", func(c *gin.Context) {
				idStr := c.Param("steam_id")
				id, _ := strconv.ParseUint(idStr, 10, 64)
				if err := teamRepo.DeleteByID(id); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"message": "Team deleted successfully"})
			})
		}
	}
}
