package tests

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/StinkyBobby/CryStack/internal/models"
	"github.com/StinkyBobby/CryStack/internal/repository"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	gorm_postgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupPostgresContainerTeam(t *testing.T) (repository.TeamRepository, *gorm.DB, func()) {
	t.Helper()
	ctx := context.Background()

	pgContainer, err := postgres.Run(
		ctx,
		"postgres:15-alpine",
		postgres.WithDatabase("test_db"),
		postgres.WithUsername("user"),
		postgres.WithPassword("pass"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").WithOccurrence(2).WithStartupTimeout(30*time.Second),
		),
	)
	if err != nil {
		t.Skipf("skipping integration test: postgres testcontainer is unavailable: %v", err)
	}

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	db, err := gorm.Open(gorm_postgres.Open(connStr), &gorm.Config{})
	require.NoError(t, err)

	require.NoError(t, db.AutoMigrate(&models.Team{}))
	repo := repository.NewTeamRepository(db)

	teardown := func() {
		_ = pgContainer.Terminate(ctx)
	}

	return repo, db, teardown
}

func TestTeamRepositoryImpl_Create(t *testing.T) {
	repo, db, cleanup := setupPostgresContainerTeam(t)
	defer cleanup()

	t.Run("Successfully create team", func(t *testing.T) {
		team := &models.Team{
			ID:          1,
			Name:        "New Team",
			Description: "Some description",
		}

		err := repo.Create(team)
		require.NoError(t, err)

		var fromDB models.Team
		err = db.Where("id = ?", team.ID).First(&fromDB).Error
		require.NoError(t, err)

		assert.Equal(t, team.ID, fromDB.ID)
		assert.Equal(t, team.Name, fromDB.Name)
		assert.Equal(t, team.Description, fromDB.Description)
	})
}

func TestTeamRepositoryImpl_GetByID(t *testing.T) {
	repo, db, cleanup := setupPostgresContainerTeam(t)
	defer cleanup()

	t.Run("Successfully get existing team by it`s ID", func(t *testing.T) {
		team := &models.Team{
			ID:          1,
			Name:        "New Team",
			Description: "Some description",
		}

		require.NoError(t, db.Create(team).Error)

		got, err := repo.GetByID(1)

		assert.NoError(t, err)
		assert.NotNil(t, got)
		assert.Equal(t, uint64(1), got.ID)
		assert.Equal(t, "New Team", got.Name)
		assert.Equal(t, "Some description", got.Description)
	})

	t.Run("Get non-existing team should return not found", func(t *testing.T) {
		got, err := repo.GetByID(123)
		assert.NotNil(t, got)
		assert.Error(t, err)
		assert.True(t, errors.Is(err, gorm.ErrRecordNotFound))
	})
}

func TestTeamRepositoryImpl_GetOpenTeams(t *testing.T) {
	repo, _, cleanup := setupPostgresContainerTeam(t)
	defer cleanup()

	t.Run("Successfully get open teams by ID", func(t *testing.T) {
		t1 := &models.Team{
			ID:          1,
			Name:        "New Team 1",
			Description: "Some description",
		}
		require.NoError(t, repo.Create(t1))

		t2 := &models.Team{
			ID:          2,
			Name:        "New Team 2",
			Description: "Some description",
		}
		err := repo.Create(t2)

		assert.Error(t, err)
	})
}

func TestTeamRepositoryImpl_Update(t *testing.T) {
	repo, db, cleanup := setupPostgresContainerTeam(t)
	defer cleanup()

	t.Run("Successfully updating team information", func(t *testing.T) {
		team := &models.Team{
			ID:          1,
			Name:        "New Team",
			Description: "Some description",
		}
		require.NoError(t, repo.Create(team))

		update := &models.Team{
			ID:          1,
			Name:        "New Team Updated",
			Description: "Some description Updated",
		}

		err := repo.Update(1, update)
		require.NoError(t, err)

		var fromDB models.Team
		err = db.Where("id = ?", 1).First(&fromDB).Error
		require.NoError(t, err)

		assert.Equal(t, uint64(1), fromDB.ID)
		assert.Equal(t, team.Name, fromDB.Name)
		assert.Equal(t, team.Description, fromDB.Description)
	})
}

func TestTeamRepositoryImpl_DeleteByID(t *testing.T) {
	repo, db, cleanup := setupPostgresContainerTeam(t)
	defer cleanup()

	t.Run("Successfully delete existing team", func(t *testing.T) {
		team := &models.Team{
			ID:          1,
			Name:        "New Team",
			Description: "Some description",
		}
		require.NoError(t, db.Create(team).Error)

		err := repo.DeleteByID(1)
		assert.NoError(t, err)

		var count int64
		require.NoError(t, db.Model(&models.Team{}).Where("id = ?", 1).Count(&count).Error)
		assert.Equal(t, int64(0), count)
	})
}
