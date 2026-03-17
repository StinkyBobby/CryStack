package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/StinkyBobby/CryStack/internal/config"
	"github.com/StinkyBobby/CryStack/internal/repository"
)

type SteamServiceInterface interface {
	GetSteamID(*http.Request) uint64
	GetProfile(steamID uint64) (name, avatar string, err error)
}

type SteamService struct {
	playerRepo repository.PlayerRepository
	config     *config.Config
	httpClient *http.Client
}

func NewSteamService(playerRepo repository.PlayerRepository, cfg *config.Config, httpClient *http.Client) *SteamService {
	return &SteamService{
		playerRepo: playerRepo,
		config:     cfg,
		httpClient: httpClient,
	}
}

func (s *SteamService) GetSteamID(r *http.Request) uint64 {
	header := r.Header.Get("X-SteamID")
	if header != "" {
		id, _ := strconv.ParseUint(header, 10, 64)
		return id
	}
	return 0
}

func (s *SteamService) GetProfile(steamID uint64) (name, avatar string, err error) {
	url := fmt.Sprintf("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=%s&steamids=%d",
		s.config.SteamAPIKey, steamID)

	resp, err := s.httpClient.Get(url)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	var result struct {
		Response struct {
			Players []struct {
				Personaname string `json:"personaname"`
				Avatar      string `json:"avatarmedium"` // ✅ avatarmedium лучше!
			} `json:"players"`
		} `json:"response"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", err
	}

	if len(result.Response.Players) == 0 {
		return "", "", fmt.Errorf("player not found on steam")
	}

	p := result.Response.Players[0]
	return p.Personaname, p.Avatar, nil
}
