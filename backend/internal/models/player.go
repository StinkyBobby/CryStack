package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type HeroesJSON []int

func (hj HeroesJSON) Value() (driver.Value, error) {
	if len(hj) == 0 {
		return nil, nil
	}
	return json.Marshal(hj)
}

func (hj *HeroesJSON) Scan(value interface{}) error {
	if value == nil {
		*hj = HeroesJSON{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("cannot scan into HeroesJSON")
	}

	return json.Unmarshal(bytes, hj)
}

type Player struct {
	SteamID       uint64     `json:"steam_id,string" gorm:"primaryKey;column:steam_id;not null"`
	Name          string     `json:"name" gorm:"column:name;size:64;not null"`
	Avatar        string     `json:"avatar" gorm:"column:avatar"`
	Role          string     `json:"role" gorm:"column:role;size:20"`
	Style         string     `json:"style" gorm:"column:style;size:20"`
	Heroes        HeroesJSON `json:"heroes" gorm:"type:jsonb;column:heroes"`
	Winrate       float64    `json:"winrate" gorm:"column:winrate"`
	LastUpdated   time.Time  `json:"last_updated" gorm:"column:last_updated"`
	MMR           int        `json:"mmr" gorm:"column:mmr;index"`
	GPM           float64    `json:"gpm" gorm:"column:gpm;index"`
	XPM           float64    `json:"xpm" gorm:"column:xpm"`
	MatchesPlayed int        `json:"matches_played" gorm:"column:matches_played"`
}
