package tests

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/StinkyBobby/CryStack/internal/models"
	"github.com/StinkyBobby/CryStack/internal/repository"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/assert"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	gorm_postgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupPostgresContainer(t *testing.T) (repository.PlayerRepository, *gorm.DB, func()) {
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

	require.NoError(t, db.AutoMigrate(&models.Player{}))
	repo := repository.NewPlayerRepository(db)

	teardown := func() {
		_ = pgContainer.Terminate(ctx)
	}

	return repo, db, teardown
}

func TestPlayerRepositoryImpl_DeleteBySteamID(t *testing.T) {
	repo, db, cleanup := setupPostgresContainer(t)
	defer cleanup()

	t.Run("Successfully delete existing player", func(t *testing.T) {
		player := &models.Player{SteamID: 999, Name: "To Be Deleted"}
		require.NoError(t, db.Create(player).Error)

		err := repo.DeleteBySteamID(999)

		assert.NoError(t, err)

		var count int64
		require.NoError(t, db.Model(&models.Player{}).Where("steam_id = ?", 999).Count(&count).Error)
		assert.Equal(t, int64(0), count)
	})

	t.Run("delete non-existing player should not return error", func(t *testing.T) {
		err := repo.DeleteBySteamID(111222333)
		assert.NoError(t, err)
	})
}

func TestPlayerRepositoryImpl_GetBySteamID(t *testing.T) {
	repo, db, cleanup := setupPostgresContainer(t)
	defer cleanup()

	t.Run("Successfully get existing player by it`s ID", func(t *testing.T) {
		player := &models.Player{SteamID: 999, Name: "To Get"}
		require.NoError(t, db.Create(player).Error)

		got, err := repo.GetBySteamID(999)

		assert.NoError(t, err)
		require.NotNil(t, got)
		assert.Equal(t, uint64(999), got.SteamID)
		assert.Equal(t, "To Get", got.Name)
	})

	t.Run("Get non-existing player should return not found", func(t *testing.T) {
		got, err := repo.GetBySteamID(111222333)
		assert.Nil(t, got)
		assert.Error(t, err)
		assert.True(t, errors.Is(err, gorm.ErrRecordNotFound))
	})
}

func  TestPlayerRepositoryImpl_Create(t *testing.T) {
    repo, db, cleanup := setupPostgresContainer(t)
    defer cleanup()

    t.Run("Creates new player", func(t *testing.T) {
        player := &models.Player{
            SteamID: 1234567890,
            Name:    "New Player",
            Role:    "midlane",
        }

        err := repo.Create(player)
        require.NoError(t, err)

        var fromDB models.Player
        err = db.Where("steam_id = ?", player.SteamID).First(&fromDB).Error
        require.NoError(t, err)

        assert.Equal(t, player.SteamID, fromDB.SteamID)
        assert.Equal(t, player.Name, fromDB.Name)
        assert.Equal(t, player.Role, fromDB.Role)
    })

    t.Run("Returns error on duplicate steam_id", func(t *testing.T) {
        first := &models.Player {
            SteamID: 222333444,
            Name:    "First",
        }
        require.NoError(t, repo.Create(first))
        second := &models.Player {
            SteamID: 222333444,
            Name:    "Second",
        }
        err := repo.Create(second)

        assert.Error(t, err)
    })
}

func TestPlayerRepositoryImpl_GetAll(t *testing.T) {
    repo, _, cleanup := setupPostgresContainer(t)
    defer cleanup()

    t.Run("Returns all players", func(t *testing.T) {
        p1 := &models.Player{SteamID: 1001, Name: "p1", Role: "carry"}
        p2 := &models.Player{SteamID: 1002, Name: "p2", Role: "midlane"}
        p3 := &models.Player{SteamID: 1003, Name: "p3", Role: "support"}

        require.NoError(t, repo.Create(p1))
        require.NoError(t, repo.Create(p2))
        require.NoError(t, repo.Create(p3))

        all, err := repo.GetAll()
        require.NoError(t, err)
        require.Len(t, all, 3)

        bySteamID := make(map[uint64]*models.Player, len(all))
        for _, p := range all {
            bySteamID[p.SteamID] = p
        }

        assert.Contains(t, bySteamID, uint64(1001))
        assert.Contains(t, bySteamID, uint64(1002))
        assert.Contains(t, bySteamID, uint64(1003))
        assert.Equal(t, "p1", bySteamID[1001].Name)
        assert.Equal(t, "p2", bySteamID[1002].Name)
        assert.Equal(t, "p3", bySteamID[1003].Name)
    })
}

func TestPlayerRepositoryImpl_Upsert(t *testing.T) {
    repo, db, cleanup := setupPostgresContainer(t)
    defer cleanup()

    t.Run("inserts player when steam_id does not exists", func(t *testing.T){
        player := &models.Player{
            SteamID: 777001,
            Name:    "Insert Case",
            Role:    "carry",
            MMR:     4200,
        }

        err := repo.Upsert(player)
        require.NoError(t, err)

        var fromDB models.Player
        err = db.Where("steam_id = ?", player.SteamID).First(&fromDB).Error
        require.NoError(t, err)

        assert.Equal(t, player.SteamID, fromDB.SteamID)
        assert.Equal(t, player.Name, fromDB.Name)
        assert.Equal(t, player.Role, fromDB.Role)
        assert.Equal(t, player.MMR, fromDB.MMR)
    })

    t.Run("updates existing player when steam_id is already exists", func(t *testing.T) {
        seed := &models.Player {
            SteamID: 777002,
            Name:    "Before Update",
            Role:    "support",
            MMR:     3000,
        }
        require.NoError(t, repo.Create(seed))

        update := &models.Player {
            SteamID: 777002,
            Name:    "After Update",
            Role:    "midlane",
            MMR:     5100,
        }

        err := repo.Upsert(update)
        require.NoError(t, err)

        var fromDB models.Player
        err = db.Where("steam_id = ?", 777002).First(&fromDB).Error
        require.NoError(t, err)

		assert.Equal(t, uint64(777002), fromDB.SteamID)
		assert.Equal(t, "After Update", fromDB.Name)
		assert.Equal(t, "midlane", fromDB.Role)
		assert.Equal(t, 5100, fromDB.MMR)

		var count int64
			err = db.Model(&models.Player{}).Where("steam_id = ?", 777002).Count(&count).Error
            require.NoError(t, err)
            assert.Equal(t, int64(1), count)
    })
}