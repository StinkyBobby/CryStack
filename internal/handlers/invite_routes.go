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
				gormDB.Where("steam_id = ?", invite.SteamID).First(&player)

				var team models.Team
				gormDB.First(&team, invite.TeamID)

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
					return
				}
				if err := tx.Save(&team).Error; err != nil {
					tx.Rollback()
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
