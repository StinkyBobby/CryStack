import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/api/client";
import type { Player, Team } from "@/types";

interface DashboardData {
  players: Player[];
  teams: Team[];
  proMatches: { match_id: number; start_time: number }[];
}

type Status = "idle" | "loading" | "success" | "error";

export function useDashboardData() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({ players: [], teams: [], proMatches: [] });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setError(null);

      try {
        const [players, teams, proMatchesRaw] = await Promise.all([
          apiRequest<Player[]>("/api/players"),
          apiRequest<Team[]>("/api/teams"),
          fetch("https://api.opendota.com/api/proMatches").then((r) =>
            r.json() as Promise<{ match_id: number; start_time: number }[]>,
          ),
        ]);

        if (cancelled) {
          return;
        }

        setData({
          players: Array.isArray(players) ? players : [],
          teams: Array.isArray(teams) ? teams : [],
          proMatches: Array.isArray(proMatchesRaw) ? proMatchesRaw : [],
        });
        setStatus("success");
      } catch (e) {
        if (cancelled) {
          return;
        }

        const message = e instanceof Error ? e.message : "Failed to load dashboard data";
        setError(message);
        setStatus("error");
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(() => {
    const openTeams = data.teams.filter((team) => team.is_open).length;
    const playersWithStats = data.players.filter((player) => (player.matches_played || 0) > 0).length;
    const avgWinrate =
      playersWithStats > 0
        ? data.players
            .filter((player) => (player.matches_played || 0) > 0)
            .reduce((sum, player) => sum + (player.winrate || 0), 0) / playersWithStats
        : 0;
    const openSlots = data.teams.reduce((sum, team) => sum + (Array.isArray(team.wanted_roles) ? team.wanted_roles.length : 0), 0);

    const roleDemand = new Map<string, number>();
    data.teams.forEach((team) => {
      team.wanted_roles.forEach((role) => {
        roleDemand.set(role, (roleDemand.get(role) ?? 0) + 1);
      });
    });

    const topWantedRole = [...roleDemand.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "n/a";
    const now = Date.now() / 1000;
    const liveMatches = data.proMatches.filter((match) => match.start_time > now - 7200).length;

    return {
      playersCount: data.players.length,
      openTeams,
      avgWinrate,
      playersWithStats,
      openSlots,
      topWantedRole,
      liveMatches,
    };
  }, [data.players, data.teams, data.proMatches]);

  return { status, error, data, metrics };
}
