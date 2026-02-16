package services

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/StinkyBobby/CryStack/internal/config"
	"github.com/StinkyBobby/CryStack/internal/repository"
)

type SteamServiceInterface interface {
	GetSteamID(*http.Request) uint64
	GetName(uint64) string
	GetAvatar(uint64) string
}

type SteamService struct {
	playerRepo repository.PlayerRepository
	config     *config.Config
	httpClient *http.Client
}

func NewSteamService(playerRepo repository.PlayerRepository, apiKey string, httpClient *http.Client) *SteamService {
	return &SteamService{
		playerRepo: playerRepo,
		config: &config.Config{
			SteamAPIKey: apiKey,
		},
		httpClient: httpClient,
	}
}

func (s *SteamService) GetSteamIDFromHeader(header string) uint64 {
	if header == "" {
		return 0
	}
	var steamID uint64
	_, err := fmt.Sscanf(header, "%d", &steamID)
	if err != nil {
		return 0
	}
	return steamID
}

// GetSteamID reads steam id from request header "X-SteamID"
func (s *SteamService) GetSteamIDFromRequest(r *http.Request) uint64 {
	return s.GetSteamIDFromHeader(r.Header.Get("X-SteamID"))
}

func (s *SteamService) GetName(steamID uint64) string {
	url := fmt.Sprintf("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=%s&steamids=%d", s.config.SteamAPIKey, steamID)
	resp, err := s.httpClient.Get(url)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	var result struct {
		Response struct {
			Players []struct {
				Personaname string `json:"personaname"`
				Avatar      string `json:"avatar"`
			} `json:"players"`
		} `json:"response"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return ""
	}
	if len(result.Response.Players) == 0 {
		return ""
	}
	return result.Response.Players[0].Personaname
}

func (s *SteamService) GetAvatar(steamID uint64) string {
	url := fmt.Sprintf("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=%s&steamids=%d", s.config.SteamAPIKey, steamID)
	resp, err := s.httpClient.Get(url)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	var result struct {
		Response struct {
			Players []struct {
				Personaname string `json:"personaname"`
				Avatar      string `json:"avatar"`
			} `json:"players"`
		} `json:"response"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return ""
	}
	if len(result.Response.Players) == 0 {
		return ""
	}
	return result.Response.Players[0].Avatar
}
