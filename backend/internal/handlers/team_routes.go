package handlers

import (
	"errors"
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

func parseUintParam(c *gin.Context, name string) (uint64, bool) {
	idStr := c.Param(name)
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid " + name})
		return 0, false
	}
	return id, true
}

func RegisterTeamRoutes(api *gin.RouterGroup, gormDB *gorm.DB, cfg *config.Config, matchmakingSvc *services.MatchmakingService) {
	teamRepo := repository.NewTeamRepository(gormDB)
	sessonRepo := repository.NewSessionRepository(gormDB)

	teams := api.Group("/teams")
	{
		teams.GET("/all", func(c *gin.Context) {
			all := []models.Team{}
			if err := gormDB.Order("created_at desc").Find(&all).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, all)
		})

		teams.GET("/:id", func(c *gin.Context) {
			id, ok := parseUintParam(c, "id")
			if !ok {
				return
			}

			tm, err := teamRepo.GetByID(id)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
					return
				}
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

		teams.GET("/:id/matchmaking", func(c *gin.Context) {
			teamID, ok := parseUintParam(c, "id")
			if !ok {
				return
			}

			tm, err := teamRepo.GetByID(teamID)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			res, err := matchmakingSvc.FindPlayersForTeam(tm)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, res)
		})

		teams.GET("/:id/members", func(c *gin.Context) {
			teamID, ok := parseUintParam(c, "id")
			if !ok {
				return
			}

			var team models.Team
			if err := gormDB.First(&team, teamID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
					return
				}
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}

			acceptedInvites := []models.Invite{}
			if err := gormDB.Where("team_id = ? AND status = ?", teamID, "accepted").Find(&acceptedInvites).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch team members"})
				return
			}

			steamIDs := []uint64{team.LeaderSteamID}
			seen := map[uint64]struct{}{
				team.LeaderSteamID: {},
			}
			for _, inv := range acceptedInvites {
				if _, exists := seen[inv.SteamID]; exists {
					continue
				}
				seen[inv.SteamID] = struct{}{}
				steamIDs = append(steamIDs, inv.SteamID)
			}

			members := []models.Player{}
			if err := gormDB.Where("steam_id IN ?", steamIDs).Find(&members).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch players"})
				return
			}

			c.JSON(http.StatusOK, members)
		})

		protected := teams.Group("")
		protected.Use(middleware.AuthMiddleware(cfg, sessonRepo))
		{
			protected.GET("/mine", func(c *gin.Context) {
				leaderID := c.GetUint64("steam_id")
				myTeams := []models.Team{}

				if err := gormDB.Where("leader_steam_id = ?", leaderID).Order("created_at desc").Find(&myTeams).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch teams"})
					return
				}

				c.JSON(http.StatusOK, myTeams)
			})

			protected.POST("/:id/leave", func(c *gin.Context) {
				teamID, ok := parseUintParam(c, "id")
				if !ok {
					return
				}
				userSteamID := c.GetUint64("steam_id")

				var team models.Team
				if err := gormDB.First(&team, teamID).Error; err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
					return
				}
				if team.LeaderSteamID == userSteamID {
					c.JSON(http.StatusBadRequest, gin.H{"error": "leader cannot leave team"})
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

			protected.POST("/:id/kick/:target_steam_id", func(c *gin.Context) {
				teamID, ok := parseUintParam(c, "id")
				if !ok {
					return
				}
				targetSteamID, ok := parseUintParam(c, "target_steam_id")
				if !ok {
					return
				}
				leaderSteamID := c.GetUint64("steam_id")

				var team models.Team
				if err := gormDB.First(&team, teamID).Error; err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
					return
				}

				if team.LeaderSteamID != leaderSteamID {
					c.JSON(http.StatusForbidden, gin.H{"error": "only leader can kick players"})
					return
				}

				var player models.Player
				if err := gormDB.Where("steam_id = ?", targetSteamID).First(&player).Error; err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "player not found"})
					return
				}

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

				t.LeaderSteamID = c.GetUint64("steam_id")
				if len(t.WantedRoles) == 0 {
					t.IsOpen = true
				}

				if err := teamRepo.Create(&t); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, t)
			})

			protected.POST("/:id/matchmaking/auto-invite", func(c *gin.Context) {
				teamID, ok := parseUintParam(c, "id")
				if !ok {
					return
				}

				tm, err := teamRepo.GetByID(teamID)
				if err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
						return
					}
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				if tm.LeaderSteamID != c.GetUint64("steam_id") {
					c.JSON(http.StatusForbidden, gin.H{"error": "only leader can auto-invite"})
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

			protected.PUT("/:id", func(c *gin.Context) {
				teamID, ok := parseUintParam(c, "id")
				if !ok {
					return
				}

				current, err := teamRepo.GetByID(teamID)
				if err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
						return
					}
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				if current.LeaderSteamID != c.GetUint64("steam_id") {
					c.JSON(http.StatusForbidden, gin.H{"error": "only leader can update team"})
					return
				}

				var t models.Team
				if err := c.BindJSON(&t); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				t.ID = current.ID
				t.LeaderSteamID = current.LeaderSteamID
				t.CreatedAt = current.CreatedAt

				if err := teamRepo.Update(teamID, &t); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}

				updated, err := teamRepo.GetByID(teamID)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}

				c.JSON(http.StatusOK, updated)
			})

			protected.DELETE("/:id", func(c *gin.Context) {
				teamID, ok := parseUintParam(c, "id")
				if !ok {
					return
				}

				tm, err := teamRepo.GetByID(teamID)
				if err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
						return
					}
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}

				if tm.LeaderSteamID != c.GetUint64("steam_id") {
					c.JSON(http.StatusForbidden, gin.H{"error": "only leader can delete team"})
					return
				}

				if err := teamRepo.DeleteByID(teamID); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"message": "Team deleted successfully"})
			})
		}
	}
}
