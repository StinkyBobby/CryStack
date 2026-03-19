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
	Domain      string
	FrontendURL string
	BackendURL  string
	VitePort    string
}

func Load() *Config {
	godotenv.Load(".env")

	return &Config{
		SteamAPIKey: os.Getenv("STEAM_API_KEY"),
		Port:        os.Getenv("PORT"),
		DBURL:       os.Getenv("DB_URL"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		Domain:      os.Getenv("DOMAIN"),
		FrontendURL: os.Getenv("FRONTEND_URL"),
		BackendURL:  os.Getenv("BACKEND_URL"),
		VitePort:    os.Getenv("VITE_PORT"),
	}
}
