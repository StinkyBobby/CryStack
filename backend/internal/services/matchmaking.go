package services

import (
	"math"
	"sort"

	"github.com/StinkyBobby/CryStack/internal/models"
	"github.com/StinkyBobby/CryStack/internal/repository"
)

type MatchResult struct {
	Player  *models.Player `json:"player"`
	Score   float64        `json:"score"`
	RoleFit bool           `json:"role_fit"`
	MMRDiff int            `json:"mmr_diff"`
}

type MatchmakingServiceInterface interface {
	FindPlayersForTeam(team *models.Team) ([]*MatchResult, error)
}

type MatchmakingService struct {
	playerRepo repository.PlayerRepository
	teamRepo   repository.TeamRepository
}

func NewMatchmakingService(playerRepo repository.PlayerRepository, teamRepo repository.TeamRepository) *MatchmakingService {
	return &MatchmakingService{
		playerRepo: playerRepo,
		teamRepo:   teamRepo,
	}
}

func (m *MatchmakingService) getLeaderMMR(steamID uint64) int {
	leader, err := m.playerRepo.GetBySteamID(steamID)
	if err != nil {
		return 4500
	}
	return leader.MMR
}

func (m *MatchmakingService) FindPlayersForTeam(team *models.Team) ([]*MatchResult, error) {
	if len(team.WantedRoles) == 0 {
		return []*MatchResult{}, nil
	}

	players, err := m.playerRepo.GetAll()
	if err != nil {
		return nil, err
	}

	var results []*MatchResult
	leaderMMR := m.getLeaderMMR(team.LeaderSteamID)

	for _, player := range players {
		if player.SteamID == team.LeaderSteamID {
			continue
		}

		isWanted := false
		for _, wantedRole := range team.WantedRoles {
			if player.Role == wantedRole {
				isWanted = true
				break
			}
		}

		if isWanted {
			score := m.calculatePlayerFit(player, leaderMMR)

			if score >= 0.4 {
				results = append(results, &MatchResult{
					Player:  player,
					Score:   score,
					RoleFit: true,
					MMRDiff: int(math.Abs(float64(player.MMR - leaderMMR))),
				})
			}
		}
	}

	// Сортировка по убыванию Score
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	// Возвращаем топ-5
	if len(results) > 5 {
		return results[:5], nil
	}
	return results, nil
}

func (m *MatchmakingService) calculatePlayerFit(player *models.Player, leaderMMR int) float64 {
	score := 0.0

	// 1. MMR (±200 = 40%, ±400 = 20%)
	mmrDiff := int(math.Abs(float64(player.MMR - leaderMMR)))
	switch {
	case mmrDiff <= 200:
		score += 0.40
	case mmrDiff <= 400:
		score += 0.20
	}

	// 2. GPM (Приводим float64 к сравнению)
	switch {
	case player.GPM >= 600.0:
		score += 0.25
	case player.GPM >= 500.0:
		score += 0.15
	}

	// 3. Winrate
	switch {
	case player.Winrate >= 55.0:
		score += 0.20
	case player.Winrate >= 50.0:
		score += 0.10
	}

	// 4. Опыт
	if player.MatchesPlayed >= 100 {
		score += 0.15
	}

	return score
}
