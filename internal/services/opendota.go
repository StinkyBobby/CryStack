package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"time"

	"github.com/StinkyBobby/CryStack/internal/models"
)

type OpenDotaService struct {
	httpClient *http.Client
}

func NewOpenDotaService(client *http.Client) *OpenDotaService {
	return &OpenDotaService{httpClient: client}
}

var heroRoles = map[int]string{
	1: "Carry", 2: "Carry", 6: "Carry", 10: "Carry",
	11: "Midlane", 17: "Midlane", 22: "Midlane",
	7: "Offlane", 28: "Offlane", 38: "Offlane",
	5: "Support", 20: "Support", 26: "Support",
}

func (s *OpenDotaService) FetchPlayerData(steamID uint64) (*models.Player, error) {
	// 1. Конвертация ID
	steamID32 := steamID
	if steamID > 76561197960265728 {
		steamID32 = steamID - 76561197960265728
	}

	baseUrl := fmt.Sprintf("https://api.opendota.com/api/players/%d", steamID32)

	// 2. MMR и профиль
	resp, err := s.httpClient.Get(baseUrl)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var profileData struct {
		MmrEstimate struct {
			Estimate int `json:"estimate"`
		} `json:"mmr_estimate"`
		Profile struct {
			Name   string `json:"personaname"`
			Avatar string `json:"avatarmedium"`
		} `json:"profile"`
	}
	json.NewDecoder(resp.Body).Decode(&profileData)

	// 3. Последние матчи
	mResp, err := s.httpClient.Get(baseUrl + "/recentMatches")
	if err != nil {
		return nil, err
	}
	defer mResp.Body.Close()

	var matches []struct {
		HeroID   int `json:"hero_id"`
		Gpm      int `json:"gold_per_min"`
		Xpm      int `json:"xp_per_min"`
		Kills    int `json:"kills"`
		Deaths   int `json:"deaths"`
		Assists  int `json:"assists"`
		GameMode int `json:"game_mode"`
	}
	json.NewDecoder(mResp.Body).Decode(&matches)

	heroCounts := make(map[int]int)
	roleCounts := make(map[string]int)
	topHeroes := make(models.HeroesJSON, 0)

	var sumGpm, sumXpm int
	var sumK, sumD, sumA int

	for _, m := range matches {
		sumGpm += m.Gpm
		sumXpm += m.Xpm
		sumK += m.Kills
		sumD += m.Deaths
		sumA += m.Assists
		heroCounts[m.HeroID]++
		if role, ok := heroRoles[m.HeroID]; ok {
			roleCounts[role]++
		}
	}

	avgK := float64(sumK) / float64(len(matches))
	avgD := float64(sumD) / float64(len(matches))
	avgA := float64(sumA) / float64(len(matches))

	avgGpm, avgXpm := 0.0, 0.0
	if len(matches) > 0 {
		avgGpm = float64(sumGpm) / float64(len(matches))
		avgXpm = float64(sumXpm) / float64(len(matches))
	}

	// Определение роли
	bestRole := "Unknown"
	maxCount := 0
	for r, c := range roleCounts {
		if c > maxCount {
			maxCount = c
			bestRole = r
		}
	}

	// Сортировка героев
	type heroStat struct{ ID, Count int }
	var stats []heroStat
	for id, c := range heroCounts {
		stats = append(stats, heroStat{id, c})
	}
	sort.Slice(stats, func(i, j int) bool { return stats[i].Count > stats[j].Count })

	// Наполняем наш инициализированный список
	for i := 0; i < len(stats) && i < 3; i++ {
		topHeroes = append(topHeroes, stats[i].ID)
	}

	// 4. Winrate
	wlResp, _ := s.httpClient.Get(baseUrl + "/wl")
	var wlData struct {
		Win  float64 `json:"win"`
		Loss float64 `json:"lose"`
	}
	json.NewDecoder(wlResp.Body).Decode(&wlData)
	wlResp.Body.Close()

	totalMatches := int(wlData.Win + wlData.Loss)
	winrate := 0.0
	if totalMatches > 0 {
		winrate = (wlData.Win / float64(totalMatches)) * 100
	}

	style := "Flexible"
	if avgGpm > 1000 {
		style = "Turbo Slayer"
	} else if avgK > 10 && avgA < 5 {
		style = "Solo Assassin"
	} else if avgA > 15 {
		style = "Team Player"
	} else if avgD > 10 {
		style = "High Risk"
	} else if avgGpm > 600 && avgK < 4 {
		style = "Passive Farmer"
	}

	return &models.Player{
		SteamID:       steamID,
		Name:          profileData.Profile.Name,
		Avatar:        profileData.Profile.Avatar,
		MMR:           profileData.MmrEstimate.Estimate,
		Winrate:       winrate,
		GPM:           avgGpm,
		XPM:           avgXpm,
		MatchesPlayed: totalMatches,
		Role:          bestRole,
		Style:         style,
		Heroes:        topHeroes,
		LastUpdated:   time.Now(),
	}, nil
}
