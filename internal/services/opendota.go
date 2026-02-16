package services

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/StinkyBobby/CryStack/internal/config"
	"github.com/StinkyBobby/CryStack/internal/repository"
)

type OpenDotaServiceInterface interface {
	GetPlayerStats(steamID uint64) (*PlayerStats, error)
}

type OpenDotaService struct {
	playerRepo repository.PlayerRepository
	cfg        *config.Config
	httpClient *http.Client
}

type PlayerStats struct {
	Name          string  `json:"name"`
	Avatar        string  `json:"avatar"`
	MMREstimate   int     `json:"mmr_estimate"`
	GPM           float64 `json:"gpm"`
	XPM           float64 `json:"xpm"`
	WinRate       float64 `json:"win_rate"`
	MatchesPlayed int     `json:"matches_played"`
	Style         string  `json:"style"`
	Role          string  `json:"role"`
	Heroes        []int   `json:"heroes"`
}

func NewOpenDotaService(playerRepo repository.PlayerRepository, cfg *config.Config, httpClient *http.Client) *OpenDotaService {
	return &OpenDotaService{
		playerRepo: playerRepo,
		cfg:        cfg,
		httpClient: httpClient,
	}
}

func (s *OpenDotaService) GetPlayerStats(steamID uint64) (*PlayerStats, error) {
	url := fmt.Sprintf("https://api.opendota.com/api/players/%d", steamID)
	resp, err := s.httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var result struct {
		Profile struct {
			Personaname string `json:"personaname"`
			Avatar      string `json:"avatar"`
		} `json:"profile"`
		MMREstimate struct {
			Estimate int `json:"estimate"`
		} `json:"mmr_estimate"`
		GPM           float64 `json:"gpm"`
		XPM           float64 `json:"xpm"`
		WinRate       float64 `json:"win_rate"`
		MatchesPlayed int     `json:"matches_played"`
		Style         string  `json:"style"`
		Role          string  `json:"role"`
		Heroes        []int   `json:"heroes"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	if len(result.Profile.Personaname) == 0 {
		return nil, fmt.Errorf("invalid player name")
	}
	return &PlayerStats{
		Name:          result.Profile.Personaname,
		Avatar:        result.Profile.Avatar,
		MMREstimate:   result.MMREstimate.Estimate,
		GPM:           result.GPM,
		XPM:           result.XPM,
		WinRate:       result.WinRate,
		MatchesPlayed: result.MatchesPlayed,
		Style:         result.Style,
		Role:          result.Role,
		Heroes:        result.Heroes,
	}, nil
}
