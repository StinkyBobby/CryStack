package db

import (
	"fmt"
	"log"
	"time"

	"github.com/StinkyBobby/CryStack/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func New(cfg *config.Config) (*gorm.DB, error) {
	dsn := cfg.DBURL
	var db *gorm.DB
	var err error

	const maxRetries = 10
	const retryDelay = 2 * time.Second

	for i := 1; i <= maxRetries; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err == nil {
			sqlDB, err := db.DB()
			if err == nil {
				if err := sqlDB.Ping(); err == nil {
					log.Printf("Database connected successfully (attempt: %d)", i)
					return db, nil
				}
			}
		}

		log.Printf("Database is unavailable (attempt %d/%d). Waiting for %v...", i, maxRetries, retryDelay)
		time.Sleep(retryDelay)
	}

	return nil, fmt.Errorf("unable connect database for %d attempts: %w", maxRetries, err)
}
