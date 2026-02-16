package repository

import (
	"github.com/StinkyBobby/CryStack/internal/models"
	"gorm.io/gorm"
)

type TeamRepository interface {
	Create(team *models.Team) error
	GetByID(id int) (*models.Team, error)
	GetOpenTeams() ([]*models.Team, error)
	Update(id int, team *models.Team) error
}

type TeamRepositoryImpl struct {
	db *gorm.DB
}

func NewTeamRepository(db *gorm.DB) TeamRepository {
	return &TeamRepositoryImpl{db: db}
}

func (t *TeamRepositoryImpl) Create(team *models.Team) error {
	return t.db.Create(team).Error
}

func (t *TeamRepositoryImpl) GetByID(id int) (*models.Team, error) {
	var team models.Team
	err := t.db.Where("id = ?", id).First(&team).Error
	if err == gorm.ErrRecordNotFound {
		return nil, err
	} else {
		return &team, err
	}
}

func (t *TeamRepositoryImpl) GetOpenTeams() ([]*models.Team, error) {
	var open []*models.Team
	err := t.db.Where("is_open = ?", true).Find(&open).Error
	if err == gorm.ErrRecordNotFound {
		return nil, err
	} else {
		return open, err
	}
}

func (t *TeamRepositoryImpl) Update(id int, team *models.Team) error {
	return t.db.Model(&models.Team{}).Where("id = ?", id).Updates(team).Error
}
