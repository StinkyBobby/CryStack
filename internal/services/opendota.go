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
	url := fmt.Sprintf("https://api.opendota.com/api/players/%d", steamID)
	resp, err := s.httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var profileData struct {
		MmrEstimate struct {
			Estimate int `json:"estimate"`
		} `json:"mmr_estimate"`
	}
	json.NewDecoder(resp.Body).Decode(&profileData)

	wlResp, _ := s.httpClient.Get(url + "/wl")
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

	mResp, _ := s.httpClient.Get(url + "/recentMatches")
	var matches []struct {
		HeroID int `json:"hero_id"`
		Gpm    int `json:"gold_per_min"`
		Xpm    int `json:"xp_per_min"`
	}
	json.NewDecoder(mResp.Body).Decode(&matches)
	mResp.Body.Close()

	var sumGpm, sumXpm int
	roleCounts := make(map[string]int)
	heroCounts := make(map[int]int)

	for _, m := range matches {
		sumGpm += m.Gpm
		sumXpm += m.Xpm
		heroCounts[m.HeroID]++
		if role, ok := heroRoles[m.HeroID]; ok {
			roleCounts[role]++
		}
	}

	avgGpm, avgXpm := 0.0, 0.0
	if len(matches) > 0 {
		avgGpm = float64(sumGpm) / float64(len(matches))
		avgXpm = float64(sumXpm) / float64(len(matches))
	}

	bestRole := "Unknown"
	maxCount := 0
	for r, c := range roleCounts {
		if c > maxCount {
			maxCount = c
			bestRole = r
		}
	}

	type heroStat struct {
		ID    int
		Count int
	}
	var stats []heroStat
	for id, count := range heroCounts {
		stats = append(stats, heroStat{id, count})
	}
	sort.Slice(stats, func(i, j int) bool {
		return stats[i].Count > stats[j].Count
	})

	topHeroes := models.HeroesJSON{}
	for i := 0; i < len(stats) && i < 3; i++ {
		topHeroes = append(topHeroes, stats[i].ID)
	}

	return &models.Player{
		SteamID:       steamID,
		MMR:           profileData.MmrEstimate.Estimate,
		Winrate:       winrate,
		GPM:           avgGpm,
		XPM:           avgXpm,
		MatchesPlayed: totalMatches,
		Role:          bestRole,
		Style:         "Aggressive", //Можно реализовать логику опеределения стиля
		Heroes:        topHeroes,
		LastUpdated:   time.Now(),
	}, nil
}
