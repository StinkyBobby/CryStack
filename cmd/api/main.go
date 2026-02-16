package main

import (
	"fmt"
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

	// безопасная конверсия array -> jsonb только если колонка имеет data_type = 'ARRAY'
	runSafeConvert := func(table, column string) {
		sql := fmt.Sprintf(`
	DO $$
	BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = '%s'
		AND column_name = '%s'
		AND data_type = 'ARRAY'
	) THEN
		EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE jsonb USING to_json(%I)::jsonb', '%s', '%s', '%s');
	END IF;
	END
	$$;`, table, column, table, column, column)
		if err := gormDB.Exec(sql).Error; err != nil {
			log.Printf("Не удалось конвертировать %s.%s: %v\n", table, column, err)
		} else {
			log.Printf("Проверка/конвертация выполнена для %s.%s\n", table, column)
		}
	}

	runSafeConvert("players", "heroes")
	runSafeConvert("teams", "current_roles")
	runSafeConvert("teams", "wanted_roles")

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
