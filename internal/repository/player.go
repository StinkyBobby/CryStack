package repository

import (
	"github.com/StinkyBobby/CryStack/internal/models"

	"gorm.io/gorm"
)

type PlayerRepository interface {
	Create(player *models.Player) error
	GetBySteamID(id uint64) (*models.Player, error)
	Upsert(player *models.Player) error //update или insert
	GetAll() ([]*models.Player, error)
	DeleteBySteamID(id uint64) error
}

type PlayerRepositoryImpl struct {
	db *gorm.DB
}

func NewPlayerRepository(db *gorm.DB) PlayerRepository {
	return &PlayerRepositoryImpl{db: db}
}

func (r *PlayerRepositoryImpl) Create(player *models.Player) error {
	return r.db.Create(player).Error
}

func (r *PlayerRepositoryImpl) GetBySteamID(id uint64) (*models.Player, error) {
	var player models.Player
	err := r.db.Where("steam_id = ?", id).First(&player).Error
	if err != nil {
		return nil, err
	} else {
		return &player, nil
	}
}

func (r *PlayerRepositoryImpl) Upsert(player *models.Player) error {
	var existing models.Player
	err := r.db.Where("steam_id = ?", player.SteamID).First(&existing).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return r.Create(player)
		}
		return err
	}
	return r.db.Model(&existing).Updates(player).Error
}

func (r *PlayerRepositoryImpl) GetAll() ([]*models.Player, error) {
	var players []*models.Player
	err := r.db.Find(&players).Error
	if err != nil {
		return nil, err
	}
	return players, nil
}

func (r *PlayerRepositoryImpl) DeleteBySteamID(id uint64) error {
	return r.db.Where("steam_id = ?", id).Delete(&models.Player{}).Error
}
