package models

import (
	"time"

	"gorm.io/datatypes"
)

type Player struct {
	SteamID       uint64         `json:"steam_id" gorm:"primaryKey;column:steam_id"`
	Name          string         `json:"name" gorm:"column:name"`
	Avatar        string         `json:"avatar" gorm:"column:avatar"`
	Role          string         `json:"role" gorm:"column:role"`
	Style         string         `json:"style" gorm:"column:style"`
	Heroes        datatypes.JSON `json:"heroes" gorm:"type:jsonb;column:heroes"`
	Winrate       float64        `json:"winrate" gorm:"column:winrate"`
	LastUpdated   time.Time      `json:"last_updated" gorm:"column:last_updated"`
	MMR           int            `json:"mmr" gorm:"column:mmr"`
	GPM           float64        `json:"gpm" gorm:"column:gpm"`
	XPM           float64        `json:"xpm" gorm:"column:xpm"`
	MatchesPlayed int            `json:"matches_played" gorm:"column:matches_played"`
}
