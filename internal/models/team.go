package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type RolesJSON []string

func (r RolesJSON) Value() (driver.Value, error) {
	if len(r) == 0 {
		return nil, nil
	}
	return json.Marshal(r)
}

func (r *RolesJSON) Scan(value interface{}) error {
	if value == nil {
		*r = RolesJSON{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("cannot scan into RolesJSON")
	}

	return json.Unmarshal(bytes, r)
}

type Team struct {
	ID            uint64       `json:"id" gorm:"primaryKey;autoIncrement;column:id"`
	Name          string    `json:"name" gorm:"column:name;size:64;not null"`
	LeaderSteamID uint64    `json:"leader_steam_id" gorm:"column:leader_steam_id;index"`
	CurrentRoles  RolesJSON `json:"current_roles" gorm:"type:jsonb;column:current_roles"`
	WantedRoles   RolesJSON `json:"wanted_roles" gorm:"type:jsonb;column:wanted_roles"`
	Description   string    `json:"description" gorm:"column:description;size:500"`
	IsOpen        bool      `json:"is_open" gorm:"column:is_open;default:true"`
	CreatedAt     time.Time `json:"created_at" gorm:"column:created_at;default:CURRENT_TIMESTAMP"`
}
