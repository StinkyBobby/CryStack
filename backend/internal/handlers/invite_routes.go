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

func RegisterInviteRoutes(api *gin.RouterGroup, gormDB *gorm.DB, cfg *config.Config) {
	sessionRepo := repository.NewSessionRepository(gormDB)

	invites := api.Group("/invites")
	invites.Use(middleware.AuthMiddleware(cfg, sessionRepo))
	{
		invites.POST("", func(c *gin.Context) {
			callerSteamID := c.GetUint64("steam_id")
			var body struct {
				TeamID  uint64 `json:"team_id"`
				SteamID string `json:"steam_id"`
			}

			if err := c.BindJSON(&body); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
				return
			}

			steamID, err := strconv.ParseUint(body.SteamID, 10, 64)
			if err != nil || steamID == 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			if body.TeamID == 0 || steamID == 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "team_id and steam_id are required"})
				return
			}

			var team models.Team
			if err := gormDB.First(&team, body.TeamID).Error; err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
				return
			}
			if team.LeaderSteamID != callerSteamID {
				c.JSON(http.StatusForbidden, gin.H{"error": "only leader can send invites"})
				return
			}

			var player models.Player
			if err := gormDB.Where("steam_id = ?", steamID).First(&player).Error; err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "player not found"})
				return
			}

			var existing models.Invite
			if err := gormDB.Where("team_id = ? AND steam_id = ? AND status = ?", body.TeamID, steamID, "pending").First(&existing).Error; err == nil {
				c.JSON(http.StatusConflict, gin.H{"error": "pending invite already exists"})
				return
			}

			invite := models.Invite{
				TeamID:  body.TeamID,
				SteamID: steamID,
				Status:  "pending",
			}

			if err := gormDB.Create(&invite).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create invite"})
				return
			}

			c.JSON(http.StatusCreated, invite)
		})

		invites.GET("/my", func(c *gin.Context) {
			steamID := c.GetUint64("steam_id")
			myInvites := []models.Invite{}

			if err := gormDB.Where("steam_id = ?", steamID).Order("created_at desc").Find(&myInvites).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch invites"})
				return
			}
			c.JSON(http.StatusOK, myInvites)
		})

		invites.GET("/team/:team_id", func(c *gin.Context) {
			teamID, err := strconv.ParseUint(c.Param("team_id"), 10, 64)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team_id"})
				return
			}

			var team models.Team
			if err := gormDB.First(&team, teamID).Error; err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
				return
			}

			if team.LeaderSteamID != c.GetUint64("steam_id") {
				c.JSON(http.StatusForbidden, gin.H{"error": "only leader can view team invites"})
				return
			}

			teamInvites := []models.Invite{}
			if err := gormDB.Where("team_id = ?", teamID).Order("created_at desc").Find(&teamInvites).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch team invites"})
				return
			}
			c.JSON(http.StatusOK, teamInvites)
		})

		invites.PATCH("/:id/respond", func(c *gin.Context) {
			inviteID := c.Param("id")
			callerSteamID := c.GetUint64("steam_id")
			var body struct {
				Action string `json:"action"`
			}

			if err := c.BindJSON(&body); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
				return
			}

			var invite models.Invite
			if err := gormDB.First(&invite, inviteID).Error; err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "invite not found"})
				return
			}

			if invite.SteamID != callerSteamID {
				c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
				return
			}

			if invite.Status != "pending" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invite already processed"})
				return
			}

			switch body.Action {
			case "accept":
				invite.Status = "accepted"

				var player models.Player
				if err := gormDB.Where("steam_id = ?", invite.SteamID).First(&player).Error; err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "player not found"})
					return
				}

				var team models.Team
				if err := gormDB.First(&team, invite.TeamID).Error; err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
					return
				}

				newWanted := models.RolesJSON{}
				roleFound := false
				for _, r := range team.WantedRoles {
					if r == player.Role && !roleFound {
						roleFound = true
						team.CurrentRoles = append(team.CurrentRoles, r)
					} else {
						newWanted = append(newWanted, r)
					}
				}
				if !roleFound && player.Role != "" {
					exists := false
					for _, current := range team.CurrentRoles {
						if current == player.Role {
							exists = true
							break
						}
					}
					if !exists {
						team.CurrentRoles = append(team.CurrentRoles, player.Role)
					}
				}

				team.WantedRoles = newWanted
				if len(team.WantedRoles) == 0 {
					team.IsOpen = false
				} else {
					team.IsOpen = true
				}

				tx := gormDB.Begin()
				if err := tx.Save(&invite).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update invite"})
					return
				}
				if err := tx.Save(&team).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update team"})
					return
				}
				tx.Commit()

				c.JSON(http.StatusOK, gin.H{"message": "Accepted! You are now in the team", "team": team})

			case "decline":
				invite.Status = "declined"
				if err := gormDB.Save(&invite).Error; err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update invite"})
					return
				}
				c.JSON(http.StatusOK, gin.H{"message": "Invite declined"})

			default:
				c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown action"})
			}
		})

		invites.DELETE("/:id", func(c *gin.Context) {
			id := c.Param("id")
			callerSteamID := c.GetUint64("steam_id")

			var invite models.Invite
			if err := gormDB.First(&invite, id).Error; err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "invite not found"})
				return
			}

			if invite.SteamID != callerSteamID {
				var team models.Team
				if err := gormDB.First(&team, invite.TeamID).Error; err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": "team not found"})
					return
				}
				if team.LeaderSteamID != callerSteamID {
					c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
					return
				}
			}

			if err := gormDB.Delete(&models.Invite{}, id).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete invite"})
				return
			}
			c.Status(http.StatusNoContent)
		})
	}
}
