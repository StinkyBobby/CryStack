import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/api/client";
import type { Invite, Player, Team } from "@/types";

interface OpenDotaHero {
  id: number;
  localized_name: string;
}

interface OpenDotaMatch {
  match_id: number;
  hero_id: number;
  kills: number;
  deaths: number;
  assists: number;
  duration: number;
  game_mode: number;
  player_slot: number;
  radiant_win: boolean;
  gold_per_min: number;
}

interface ProfileData {
  player: Player | null;
  invites: Invite[];
  teamsLed: Team[];
  heroNames: Record<number, string>;
  recentMatches: OpenDotaMatch[];
}

type Status = "idle" | "loading" | "success" | "error";

function toSteamID32(steamID64: string): string {
  const value = BigInt(steamID64);
  const base = 76561197960265728n;
  return (value > base ? value - base : value).toString();
}

function normalizePlayer(player: Player): Player {
  return {
    ...player,
    steam_id: String(player.steam_id),
    heroes: Array.isArray(player.heroes) ? player.heroes : [],
    role: player.role ?? "",
    style: player.style ?? "",
    winrate: Number.isFinite(player.winrate) ? player.winrate : 0,
    gpm: Number.isFinite(player.gpm) ? player.gpm : 0,
    xpm: Number.isFinite(player.xpm) ? player.xpm : 0,
    mmr: Number.isFinite(player.mmr) ? player.mmr : 0,
    matches_played: Number.isFinite(player.matches_played) ? player.matches_played : 0,
  };
}

export function useProfileData(player: Player | null, token: string | null) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProfileData>({
    player: null,
    invites: [],
    teamsLed: [],
    heroNames: {},
    recentMatches: [],
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!player) {
        setStatus("idle");
        setData({ player: null, invites: [], teamsLed: [], heroNames: {}, recentMatches: [] });
        return;
      }

      setStatus("loading");
      setError(null);

      try {
        if (token) {
          try {
            await apiRequest<Player>(`/api/players/${player.steam_id}/refresh`, {
              method: "PUT",
              token,
            });
          } catch {
            // Continue with cached DB data if refresh is unavailable.
          }
        }

        const [fullPlayerRaw, teamsRaw, heroesRaw, recentMatchesRaw, invitesRaw] = await Promise.all([
          apiRequest<Player>(`/api/players/${player.steam_id}`),
          token ? apiRequest<Team[]>("/api/teams/mine", { token }) : Promise.resolve([] as Team[]),
          fetch("https://api.opendota.com/api/heroes").then((r) => r.json() as Promise<OpenDotaHero[]>),
          fetch(`https://api.opendota.com/api/players/${toSteamID32(player.steam_id)}/recentMatches`).then((r) =>
            r.json() as Promise<OpenDotaMatch[]>,
          ),
          token ? apiRequest<Invite[]>("/api/invites/my", { token }) : Promise.resolve([] as Invite[]),
        ]);

        if (cancelled) {
          return;
        }

        const fullPlayer = normalizePlayer(fullPlayerRaw);
        const teams = Array.isArray(teamsRaw) ? teamsRaw : [];
        const invites = Array.isArray(invitesRaw) ? invitesRaw : [];
        const heroes = Array.isArray(heroesRaw) ? heroesRaw : [];
        const recentMatches = Array.isArray(recentMatchesRaw) ? recentMatchesRaw : [];

        const heroNames = heroes.reduce<Record<number, string>>((acc, hero) => {
          acc[hero.id] = hero.localized_name;
          return acc;
        }, {});

        const teamsLed = teams.filter((team) => String(team.leader_steam_id) === fullPlayer.steam_id);

        setData({
          player: fullPlayer,
          invites,
          teamsLed,
          heroNames,
          recentMatches: recentMatches.slice(0, 8),
        });
        setStatus("success");
      } catch (e) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setError(e instanceof Error ? e.message : "failed to load profile data");
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [player, token]);

  const matchTrend = useMemo(() => {
    return data.recentMatches.map((match) => {
      return Math.max(0, match.kills + match.assists - match.deaths);
    });
  }, [data.recentMatches]);

  return { status, error, data, matchTrend };
}
