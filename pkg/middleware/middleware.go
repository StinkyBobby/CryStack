package middleware

import (
	"github.com/gin-gonic/gin"
	"strings"

	"github.com/StinkyBobby/CryStack/internal/config"
	"github.com/StinkyBobby/CryStack/pkg/jwt"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
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

		c.Set("steam_id", claims.SteamID)
		c.Next()
	}
}

// хзхз
