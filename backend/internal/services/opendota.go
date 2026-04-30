package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
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

type openDotaProfileResponse struct {
	MmrEstimate struct {
		Estimate *int `json:"estimate"`
	} `json:"mmr_estimate"`
	Profile struct {
		Name   string `json:"personaname"`
		Avatar string `json:"avatarmedium"`
	} `json:"profile"`
	RankTier            *int    `json:"rank_tier"`
	LeaderboardRank     *int    `json:"leaderboard_rank"`
	CompetitiveRank     *string `json:"competitive_rank"`
	SoloCompetitiveRank *string `json:"solo_competitive_rank"`
}

func parseRankValue(rank *string) int {
	if rank == nil || *rank == "" {
		return 0
	}
	value, err := strconv.Atoi(*rank)
	if err != nil {
		return 0
	}
	return value
}

func estimateMMRFromRankTier(rankTier int) int {
	if rankTier <= 0 {
		return 0
	}

	medal := rankTier / 10
	star := rankTier % 10
	if star < 1 {
		star = 1
	}
	if star > 5 {
		star = 5
	}

	baseByMedal := map[int]int{
		1: 0,
		2: 770,
		3: 1540,
		4: 2310,
		5: 3080,
		6: 3850,
		7: 4620,
		8: 5420,
	}

	base, ok := baseByMedal[medal]
	if !ok {
		return 0
	}

	return base + (star-1)*154 + 77
}

func resolveMMR(profileData *openDotaProfileResponse) int {
	if profileData.MmrEstimate.Estimate != nil && *profileData.MmrEstimate.Estimate > 0 {
		return *profileData.MmrEstimate.Estimate
	}

	if profileData.RankTier != nil && *profileData.RankTier > 0 {
		if mmr := estimateMMRFromRankTier(*profileData.RankTier); mmr > 0 {
			return mmr
		}
	}

	if mmr := parseRankValue(profileData.CompetitiveRank); mmr > 0 {
		return mmr
	}

	if mmr := parseRankValue(profileData.SoloCompetitiveRank); mmr > 0 {
		return mmr
	}

	if profileData.LeaderboardRank != nil && *profileData.LeaderboardRank > 0 {
		return 7000
	}

	return 0
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

	var profileData openDotaProfileResponse
	if err := json.NewDecoder(resp.Body).Decode(&profileData); err != nil {
		return nil, err
	}

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

	avgK, avgD, avgA := 0.0, 0.0, 0.0
	avgGpm, avgXpm := 0.0, 0.0
	if len(matches) > 0 {
		avgK = float64(sumK) / float64(len(matches))
		avgD = float64(sumD) / float64(len(matches))
		avgA = float64(sumA) / float64(len(matches))
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
		MMR:           resolveMMR(&profileData),
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
