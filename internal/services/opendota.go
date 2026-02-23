package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"

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
	//  1. Основной профиль
	profileURL := fmt.Sprintf("https://api.opendota.com/api/players/%d", steamID)
	resp, err := s.httpClient.Get(profileURL)
	if err != nil {
		return nil, fmt.Errorf("profile fetch failed: %w", err)
	}
	defer resp.Body.Close()

	var profile struct {
		Name            string `json:"name"`
		Avatar          string `json:"avatar"`
		MMR             int    `json:"mmr_estimate"`
		SoloCompetitive int    `json:"solo_competitive_rank"`
		Profile         struct {
			Personaname string `json:"personaname"`
			Avatar      string `json:"avatar"`
		} `json:"profile"`
		GPM           float64 `json:"gpm"`
		XPM           float64 `json:"xpm"`
		Winrate       float64 `json:"winrate"`
		MatchesPlayed int     `json:"matches_played"`
		Heroes        []struct {
			HeroID int `json:"hero_id"`
		} `json:"heroes"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return nil, fmt.Errorf("json decode failed: %w", err)
	}

	//  2. Парсим герои (топ-10 по играм)
	var heroIDs []int
	for _, hero := range profile.Heroes[:10] { // Топ-10 героев
		heroIDs = append(heroIDs, hero.HeroID)
	}
	sort.Ints(heroIDs) // Сортируем для консистентности

	//  3. Рассчитываем роль и стиль
	role := calculateRole(heroIDs)
	style := calculateStyle(profile.GPM)

	return &PlayerStats{
		Name:          profile.Profile.Personaname,
		Avatar:        profile.Profile.Avatar,
		MMREstimate:   profile.MMR,
		GPM:           profile.GPM,
		XPM:           profile.XPM,
		WinRate:       profile.Winrate,
		MatchesPlayed: profile.MatchesPlayed,
		Style:         style,
		Role:          role,
		Heroes:        heroIDs,
	}, nil
}

// calculateRole по пулу героев
func calculateRole(heroIDs []int) string {
	carryHeroes := map[int]bool{
		1:   true, // Anti-Mage
		19:  true, // Axe
		43:  true, // Alchemist
		77:  true, // Outworld Destroyer
		96:  true, // Spectre
		98:  true, // Troll Warlord
		107: true, // Phantom Assassin
		113: true, // Alchemist (дубль)
		75:  true, // Medusa
		87:  true, // Juggernaut
		9:   true, // Crystal Maiden (farm версия)
		50:  true, // Monkey King
		76:  true, // Slark
		105: true, // Ember Spirit
	}

	supportHeroes := map[int]bool{
		2:   true, // Crystal Maiden
		4:   true, // Bane
		33:  true, // Dark Seer
		89:  true, // Naga Siren
		102: true, // Io
		117: true, // Oracle
		79:  true, // Treant Protector
		85:  true, // Winter Wyvern
		41:  true, // KotL
		61:  true, // Rubick
	}

	midHeroes := map[int]bool{
		6:  true, // Puck
		8:  true, // Storm Spirit
		20: true, // Batrider
		99: true, // Dark Willow
		91: true, // Lone Druid
		65: true, // Leshrac
		97: true, // Queen of Pain
	}

	carryCount := 0
	supportCount := 0
	midCount := 0

	for _, heroID := range heroIDs {
		if carryHeroes[heroID] {
			carryCount++
		}
		if supportHeroes[heroID] {
			supportCount++
		}
		if midHeroes[heroID] {
			midCount++
		}
	}

	// Доминирующая роль (≥3 героя = основная роль)
	switch {
	case carryCount >= 3:
		return "carry"
	case supportCount >= 3:
		return "support"
	case midCount >= 2:
		return "mid"
	default:
		return "offlane"
	}
}

func calculateStyle(gpm float64) string {
	if gpm > 750 {
		return "farm"
	} else if gpm > 550 {
		return "balanced"
	}
	return "support"
}
