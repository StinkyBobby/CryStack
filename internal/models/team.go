package models

import (
	"time"

	"gorm.io/datatypes"
)

type Team struct {
	ID            int            `json:"id" gorm:"primaryKey;autoIncrement;column:id"`
	Name          string         `json:"name" gorm:"column:name"`
	LeaderSteamID uint64         `json:"leader_steam_id" gorm:"column:leader_steam_id"`
	CurrentRoles  datatypes.JSON `json:"current_roles" gorm:"type:jsonb;column:current_roles"`
	WantedRoles   datatypes.JSON `json:"wanted_roles" gorm:"type:jsonb;column:wanted_roles"`
	Description   string         `json:"description" gorm:"column:description"`
	IsOpen        bool           `json:"is_open" gorm:"column:is_open"`
	CreatedAt     time.Time      `json:"created_at" gorm:"column:created_at"`
}
