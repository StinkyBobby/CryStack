import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/api/client";
import type { Player } from "@/types";

type Status = "idle" | "loading" | "success" | "error";

export function usePlayersList() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setError(null);
      try {
        const payload = await apiRequest<Player[]>("/api/players");
        if (cancelled) return;
        setPlayers((Array.isArray(payload) ? payload : []).map((p) => ({ ...p, steam_id: String(p.steam_id), heroes: Array.isArray(p.heroes) ? p.heroes : [] })));
        setStatus("success");
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "не удалось загрузить игроков");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const topPlayers = useMemo(() => {
    return [...players].sort((a, b) => (b.mmr || 0) - (a.mmr || 0)).slice(0, 100);
  }, [players]);

  return { players, topPlayers, status, error };
}
