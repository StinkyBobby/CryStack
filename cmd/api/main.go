package main

import (
	"log"
	"net/http"

	"github.com/StinkyBobby/CryStack/internal/config"
	"github.com/StinkyBobby/CryStack/internal/handlers"
	"github.com/StinkyBobby/CryStack/internal/models"
	"github.com/StinkyBobby/CryStack/pkg/db"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	if cfg.Port == "" {
		cfg.Port = "8080"
	}

	gormDB, err := db.New(cfg)
	if err != nil {
		log.Fatal("Ошибка запуска БД: ", err)
	}
	sqlDB, err := gormDB.DB()
	if err != nil {
		log.Fatal("Ошибка получения sql.DB: ", err)
	}
	defer sqlDB.Close()

	log.Println("БД подключена")

	if err := gormDB.AutoMigrate(&models.Player{}, &models.Session{}, &models.Team{}); err != nil {
		log.Fatal("AutoMigrate error: ", err)
	}

	r := gin.Default()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(cors.Default())

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong", "db": "ok"})
	})

	// передаём gormDB и cfg, http.Client будет создан в хендлерах/сервисах
	handlers.RegisterRoutes(r, gormDB, cfg, &http.Client{})

	r.Run(":" + cfg.Port)
}
