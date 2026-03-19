export type HeroesJSON = number[];
export type RolesJSON = string[];

export interface Player {
    steam_id: number;
    name: string;
    avatar: string;
    role: string;
    style: string;
    heroes: HeroesJSON;
    winrate: number;
    last_updated: string;
    mmr: number;
    gpm: number;
    xpm: number;
    matches_played: number;
}
export interface Invite {
    id: number;
    team_id: number;
    steam_id: number;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
}

export interface Team {
    id: number;
    name: string;
    leader_steam_id: number;
    current_roles: RolesJSON;
    wanted_roles: RolesJSON;
    description: string;
    is_open: boolean;
    created_at: string;
}

export interface Session {
    steam_id: number;
    expires_at: string;
}
