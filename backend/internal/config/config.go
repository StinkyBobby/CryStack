package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	SteamAPIKey string
	Port        string
	DBURL       string
	JWTSecret   string
}

func Load() *Config {
	godotenv.Load(".env")

	return &Config{
		SteamAPIKey: os.Getenv("STEAM_API_KEY"),
		Port:        os.Getenv("PORT"),
		DBURL:       os.Getenv("DB_URL"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
	}
}
