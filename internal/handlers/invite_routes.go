package handlers

import (
	"net/http"

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
		invites.GET("/my", func(c *gin.Context) {
			steamID, _ := c.Get("steam_id")
			myInvites := []models.Invite{}

			if err := gormDB.Where("steam_id = ?", steamID).Order("created_at desc").Find(&myInvites).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch invites"})
				return
			}
			c.JSON(http.StatusOK, myInvites)
		})

		invites.GET("/team/:team_id", func(c *gin.Context) {
			teamID := c.Param("team_id")
			teamInvites := []models.Invite{}

			if err := gormDB.Where("team_id = ?", teamID).Order("created_at desc").Find(&teamInvites).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch team invites"})
				return
			}
			c.JSON(http.StatusOK, teamInvites)
		})

		invites.PATCH("/:id/respond", func(c *gin.Context) {
			inviteID := c.Param("id")
			var body struct {
				Action string `json:"action"` //accept или decline
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

				team.WantedRoles = newWanted

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
				gormDB.Save(&invite)
				c.JSON(http.StatusOK, gin.H{"message": "Invite declined"})

			default:
				c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown action"})
			}
		})

		invites.DELETE("/:id", func(c *gin.Context) {
			id := c.Param("id")
			gormDB.Delete(&models.Invite{}, id)
			c.Status(http.StatusNoContent)
		})
	}
}
