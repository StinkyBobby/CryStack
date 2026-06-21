package models

import (
	"time"
)

type Invite struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	TeamID    uint64    `gorm:"index;not null" json:"team_id"`
	TeamName  string    `gorm:"-" json:"team_name"`
	SteamID   uint64    `gorm:"index;not null" json:"steam_id,string"`
	Status    string    `gorm:"default:'pending'" json:"status"` // pending, accepted, declined
	CreatedAt time.Time `json:"created_at" gorm:"default:CURRENT_TIMESTAMP"`
}
