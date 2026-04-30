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

func setupPostgresContainerSession(t *testing.T) (repository.SessionRepository, *gorm.DB, func()) {
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

	require.NoError(t, db.AutoMigrate(&models.Session{}))
	repo := repository.NewSessionRepository(db)

	teardown := func() {
		_ = pgContainer.Terminate(ctx)
	}

	return repo, db, teardown
}

func TestSessionRepositoryImpl_Create(t *testing.T) {
	repo, db, cleanup := setupPostgresContainerSession(t)
	defer cleanup()

	t.Run("Successfully create a session", func(t *testing.T) {
		session := &models.Session{
			Token:   "token_insides",
			SteamID: 1,
		}
		require.NoError(t, repo.Create(session))

		var fromDB models.Session
		err := db.Where("token = ?", session.Token).First(&fromDB).Error
		require.NoError(t, err)

		assert.Equal(t, session.Token, fromDB.Token)
		assert.Equal(t, session.SteamID, fromDB.SteamID)
	})
}

func TestSessionRepositoryImpl_GetByToken(t *testing.T) {
	repo, db, cleanup := setupPostgresContainerSession(t)
	defer cleanup()

	t.Run("Get existing session by token", func(t *testing.T) {
		session := &models.Session{
			Token:   "token_insides",
			SteamID: 1,
		}
		require.NoError(t, db.Create(session).Error)

		got, err := repo.GetByToken("token_insides")

		assert.NoError(t, err)
		require.NotNil(t, got)
		assert.Equal(t, "token_insides", got.Token)
		assert.Equal(t, uint64(1), got.SteamID)
	})

	t.Run("Get non-existing session should return error", func(t *testing.T) {
		got, err := repo.GetByToken("some_token")
		assert.Nil(t, got)
		assert.Error(t, err)
		assert.True(t, errors.Is(err, gorm.ErrRecordNotFound))
	})
}

func TestSessionRepositoryImpl_DeleteByToken(t *testing.T) {
	repo, db, cleanup := setupPostgresContainerSession(t)
	defer cleanup()

	t.Run("Successfully delete existing session", func(t *testing.T) {
		session := &models.Session{
			Token:   "token_insides",
			SteamID: 1,
		}
		require.NoError(t, db.Create(session).Error)

		err := repo.DeleteByToken("token_insides")
		assert.NoError(t, err)

		var count int64
		require.NoError(t, db.Model(&models.Session{}).Where("token = ?", "token_insides").Count(&count).Error)
		assert.Equal(t, int64(0), count)
	})

	t.Run("Delete non-existing token should not return error", func(t *testing.T) {
		err := repo.DeleteByToken("some_token")
		assert.NoError(t, err)
	})
}
