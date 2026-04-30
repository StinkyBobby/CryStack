package models

import "time"

type Session struct {
	Token     string    `json:"-" gorm:"primaryKey;column:token"`
	SteamID   uint64    `json:"steam_id,string" gorm:"column:steam_id"`
	ExpiredAt time.Time `json:"expires_at" gorm:"column:expires_at"`
}
