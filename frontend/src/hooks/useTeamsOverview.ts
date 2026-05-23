import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/api/client";
import type { Team } from "@/types";

type Status = "idle" | "loading" | "success" | "error";

interface CreateTeamInput {
  name: string;
  description: string;
  current_roles?: string[];
  wanted_roles: string[];
  is_open?: boolean;
}

function normalizeTeam(team: Team): Team {
  return {
    ...team,
    leader_steam_id: String(team.leader_steam_id),
    current_roles: Array.isArray(team.current_roles) ? team.current_roles : [],
    wanted_roles: Array.isArray(team.wanted_roles) ? team.wanted_roles : [],
    description: team.description ?? "",
  };
}

export function useTeamsOverview() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  const fetchAllTeams = useCallback(async () => {
    try {
      const all = await apiRequest<Team[]>("/api/teams/all");
      return (Array.isArray(all) ? all : []).map(normalizeTeam);
    } catch {
      const fallback = await apiRequest<Team[]>("/api/teams");
      return (Array.isArray(fallback) ? fallback : []).map(normalizeTeam);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const payload = await fetchAllTeams();
      setTeams(payload);
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "не удалось загрузить команды");
    }
  }, [fetchAllTeams]);

  const loadMyTeams = useCallback(async (token: string) => {
    const payload = await apiRequest<Team[]>("/api/teams/mine", { token });
    return (Array.isArray(payload) ? payload : []).map(normalizeTeam);
  }, []);

  const createTeam = useCallback(async (input: CreateTeamInput, token: string) => {
    const payload = await apiRequest<Team>("/api/teams", {
      method: "POST",
      token,
      body: {
        name: input.name,
        description: input.description,
        current_roles: input.current_roles ?? [],
        wanted_roles: input.wanted_roles,
        is_open: input.is_open ?? true,
      },
    });

    await loadTeams();
    return normalizeTeam(payload);
  }, [loadTeams]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setError(null);
      try {
        const payload = await fetchAllTeams();
        if (cancelled) {
          return;
        }
        setTeams(payload);
        setStatus("success");
      } catch (e) {
        if (cancelled) {
          return;
        }
        setStatus("error");
        setError(e instanceof Error ? e.message : "не удалось загрузить команды");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [fetchAllTeams]);

  return { teams, status, error, loadTeams, loadMyTeams, createTeam };
}
