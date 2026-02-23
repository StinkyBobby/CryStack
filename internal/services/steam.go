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
	GetSteamID(*http.Request) uint64 // ✅ Имя совпадает с интерфейсом!
	GetName(uint64) string
	GetAvatar(uint64) string
}

type SteamService struct {
	playerRepo repository.PlayerRepository
	config     *config.Config // ✅ Принимаем готовый config!
	httpClient *http.Client
}

func (s *SteamService) GetSteamIDFromRequest(request *http.Request) uint64 {
	panic("unimplemented")
}

func NewSteamService(playerRepo repository.PlayerRepository, cfg *config.Config, httpClient *http.Client) *SteamService {
	return &SteamService{
		playerRepo: playerRepo,
		config:     cfg, // ✅ Используем переданный config!
		httpClient: httpClient,
	}
}

func (s *SteamService) GetSteamID(r *http.Request) uint64 { // ✅ Имя совпадает!
	return s.GetSteamIDFromHeader(r.Header.Get("X-SteamID"))
}

func (s *SteamService) GetSteamIDFromHeader(header string) uint64 {
	if header == "" {
		return 0
	}
	steamID, err := strconv.ParseUint(header, 10, 64)
	if err != nil {
		return 0
	}
	return steamID
}

// ✅ Один запрос для Name + Avatar!
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
		return "", "", fmt.Errorf("player not found")
	}

	return result.Response.Players[0].Personaname, result.Response.Players[0].Avatar, nil
}

func (s *SteamService) GetName(steamID uint64) string {
	name, _, err := s.GetProfile(steamID)
	if err != nil {
		return ""
	}
	return name
}

func (s *SteamService) GetAvatar(steamID uint64) string {
	_, avatar, err := s.GetProfile(steamID)
	if err != nil {
		return ""
	}
	return avatar
}
