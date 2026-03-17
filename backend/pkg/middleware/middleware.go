package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/StinkyBobby/CryStack/internal/config"
	"github.com/StinkyBobby/CryStack/internal/repository"
	"github.com/StinkyBobby/CryStack/pkg/jwt"
)

func AuthMiddleware(cfg *config.Config, sessionRepo repository.SessionRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(401, gin.H{"error": "Authorization header missing"})
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenStr == authHeader {
			c.AbortWithStatusJSON(401, gin.H{"error": "bearer token required"})
			return
		}

		claims, err := jwt.ValidateJWT(tokenStr, cfg.JWTSecret)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "invalid token"})
			return
		}

		steamID := claims.SteamID

		session, err := sessionRepo.GetByToken(tokenStr)
		if err != nil || session == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "session not found"})
			return
		}
		if session.ExpiredAt.Before(time.Now()) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "session expired"})
			return
		}

		c.Set("steam_id", steamID)
		c.Next()
	}
}
