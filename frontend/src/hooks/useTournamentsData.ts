import { useEffect, useMemo, useState } from "react";

interface ProMatch {
  match_id: number;
  leagueid: number;
  league_name: string;
  start_time: number;
  radiant_name?: string;
  dire_name?: string;
  radiant_win: boolean;
}

interface League {
  leagueid: number;
  name: string;
  tier?: string;
  start_timestamp?: number;
  end_timestamp?: number;
}

type Status = "idle" | "loading" | "success" | "error";

export function useTournamentsData() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<ProMatch[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setError(null);
      try {
        const [matchesPayload, leaguesPayload] = await Promise.all([
          fetch("https://api.opendota.com/api/proMatches").then((r) => r.json() as Promise<ProMatch[]>),
          fetch("https://api.opendota.com/api/leagues").then((r) => r.json() as Promise<League[]>),
        ]);

        if (cancelled) return;

        setMatches(Array.isArray(matchesPayload) ? matchesPayload : []);
        setLeagues(Array.isArray(leaguesPayload) ? leaguesPayload : []);
        setStatus("success");
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "failed to load tournaments");
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const data = useMemo(() => {
    const now = Date.now() / 1000;

    const grouped = new Map<number, { leagueid: number; name: string; matches: ProMatch[] }>();
    matches.forEach((match) => {
      if (!match.leagueid) return;
      const existing = grouped.get(match.leagueid);
      if (existing) {
        existing.matches.push(match);
      } else {
        grouped.set(match.leagueid, {
          leagueid: match.leagueid,
          name: match.league_name || `League #${match.leagueid}`,
          matches: [match],
        });
      }
    });

    const activeFromMatches = [...grouped.values()]
      .filter((entry) => Math.max(...entry.matches.map((m) => m.start_time)) > now - 86400)
      .sort((a, b) => b.matches.length - a.matches.length);

    const recentFromMatches = [...grouped.values()]
      .filter((entry) => Math.max(...entry.matches.map((m) => m.start_time)) <= now - 86400)
      .sort((a, b) => Math.max(...b.matches.map((m) => m.start_time)) - Math.max(...a.matches.map((m) => m.start_time)));

    const upcoming = leagues
      .filter((league) => {
        const start = league.start_timestamp ?? 0;
        const end = league.end_timestamp ?? 0;
        return start > now || (start === 0 && end > now);
      })
      .sort((a, b) => (a.start_timestamp ?? 0) - (b.start_timestamp ?? 0))
      .slice(0, 16);

    const recentFromLeagues = leagues
      .filter((league) => {
        const end = league.end_timestamp ?? 0;
        return end > 0 && end <= now && end > now - 3600 * 24 * 120;
      })
      .sort((a, b) => (b.end_timestamp ?? 0) - (a.end_timestamp ?? 0))
      .slice(0, 16)
      .map((league) => ({
        leagueid: league.leagueid,
        name: league.name || `League #${league.leagueid}`,
        matches: [],
      }));

    const dedupeByLeague = <T extends { leagueid: number }>(arr: T[]) => {
      const m = new Map<number, T>();
      arr.forEach((item) => m.set(item.leagueid, item));
      return [...m.values()];
    };

    const active = dedupeByLeague(activeFromMatches).slice(0, 16);
    const recent = dedupeByLeague([...recentFromMatches, ...recentFromLeagues]).slice(0, 16);

    return { active, recent, upcoming };
  }, [matches, leagues]);

  return { status, error, matches, leagues, data };
}
