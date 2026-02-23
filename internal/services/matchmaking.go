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

func (m *MatchmakingService) FindPlayersForTeam(team *models.Team) ([]*MatchResult, error) {
	players, err := m.playerRepo.GetAll()
	if err != nil {
		return nil, err
	}

	var results []*MatchResult
	leaderMMR := m.getLeaderMMR(team.LeaderSteamID)

	for _, player := range players {
		for _, wantedRole := range team.WantedRoles {
			if player.Role == wantedRole {
				score := m.calculatePlayerFit(player, leaderMMR)
				if score >= 0.6 {
					results = append(results, &MatchResult{
						Player:  player,
						Score:   score,
						RoleFit: true,
						MMRDiff: int(math.Abs(float64(player.MMR - leaderMMR))),
					})
				}
				break
			}
		}
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	if len(results) > 5 {
		return results[:5], nil
	}
	return results, nil
}

func (m *MatchmakingService) getLeaderMMR(steamID uint64) int {
	leader, err := m.playerRepo.GetBySteamID(steamID)
	if err != nil {
		return 4500
	}
	return leader.MMR
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

	// 2. GPM (600+ = 25%, 500+ = 15%)
	switch {
	case player.GPM >= 600:
		score += 0.25
	case player.GPM >= 500:
		score += 0.15
	}

	// 3. Winrate (55%+ = 20%, 50%+ = 10%)
	switch {
	case player.Winrate >= 55:
		score += 0.20
	case player.Winrate >= 50:
		score += 0.10
	}

	// 4. Опыт (100+ матчей = 15%)
	if player.MatchesPlayed >= 100 {
		score += 0.15
	}

	return score
}
