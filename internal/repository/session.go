package repository

import (
	"github.com/StinkyBobby/CryStack/internal/models"
	"gorm.io/gorm"
)

type SessionRepository interface {
	Create(session *models.Session) error
	GetByToken(token string) (*models.Session, error)
	DeleteByToken(token string) error
}

type SessionRepositoryImpl struct {
	db *gorm.DB
}

func NewSessionRepository(db *gorm.DB) SessionRepository {
	return &SessionRepositoryImpl{db: db}
}

func (s *SessionRepositoryImpl) Create(session *models.Session) error {
	return s.db.Create(session).Error
}

func (s *SessionRepositoryImpl) GetByToken(token string) (*models.Session, error) {
	var session models.Session
	err := s.db.Where("token = ?", token).First(&session).Error
	if err != nil {
		return nil, err
	}
	return &session, err
}

func (s *SessionRepositoryImpl) DeleteByToken(token string) error {
	var session models.Session
	err := s.db.Where("token = ?", token).First(&session).Error
	if err == gorm.ErrRecordNotFound {
		return nil
	}
	return s.db.Delete(&session).Error
}
