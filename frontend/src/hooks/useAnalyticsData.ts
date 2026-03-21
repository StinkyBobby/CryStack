import { useEffect, useMemo, useState } from "react";

interface ProMatch {
  match_id: number;
  leagueid: number;
  league_name: string;
  start_time: number;
  duration: number;
  radiant_win: boolean;
  radiant_score?: number;
  dire_score?: number;
}

interface HeroStat {
  id: number;
  localized_name: string;
  pro_pick: number;
  pro_win: number;
  turbo_picks?: number;
  turbo_wins?: number;
}

interface ProPlayer {
  account_id: number;
  name?: string;
  team_name?: string;
  wins?: number;
  losses?: number;
  last_match_time?: number;
}

type Status = "idle" | "loading" | "success" | "error";

export function useAnalyticsData() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<ProMatch[]>([]);
  const [heroStats, setHeroStats] = useState<HeroStat[]>([]);
  const [proPlayers, setProPlayers] = useState<ProPlayer[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setError(null);
      try {
        const [matchesPayload, heroesPayload, proPlayersPayload] = await Promise.all([
          fetch("https://api.opendota.com/api/proMatches").then((r) => r.json() as Promise<ProMatch[]>),
          fetch("https://api.opendota.com/api/heroStats").then((r) => r.json() as Promise<HeroStat[]>),
          fetch("https://api.opendota.com/api/proPlayers").then((r) => r.json() as Promise<ProPlayer[]>),
        ]);

        if (cancelled) {
          return;
        }

        setMatches(Array.isArray(matchesPayload) ? matchesPayload : []);
        setHeroStats(Array.isArray(heroesPayload) ? heroesPayload : []);
        setProPlayers(Array.isArray(proPlayersPayload) ? proPlayersPayload : []);
        setStatus("success");
      } catch (e) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setError(e instanceof Error ? e.message : "failed to load global analytics");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const computed = useMemo(() => {
    const sample = matches.slice(0, 300);
    const totalProMatches = sample.length;
    const radiantWins = sample.filter((m) => m.radiant_win).length;
    const radiantWinrate = totalProMatches > 0 ? (radiantWins / totalProMatches) * 100 : 0;
    const avgDurationMin = totalProMatches > 0 ? sample.reduce((sum, m) => sum + (m.duration || 0), 0) / totalProMatches / 60 : 0;
    const highKillMatches = sample.filter((m) => ((m.radiant_score || 0) + (m.dire_score || 0)) >= 80).length;

    const leagueMap = new Map<string, number>();
    sample.forEach((match) => {
      const key = match.league_name || `League #${match.leagueid}`;
      leagueMap.set(key, (leagueMap.get(key) || 0) + 1);
    });
    const trendingLeagues = [...leagueMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, matchesCount]) => ({ name, matchesCount }));

    const metaHeroes = [...heroStats]
      .sort((a, b) => (b.pro_pick || 0) - (a.pro_pick || 0))
      .slice(0, 10)
      .map((hero) => ({
        id: hero.id,
        name: hero.localized_name,
        picks: hero.pro_pick || 0,
        winrate: hero.pro_pick > 0 ? (hero.pro_win / hero.pro_pick) * 100 : 0,
      }));

    const hotPros = [...proPlayers]
      .filter((p) => !!p.name)
      .sort((a, b) => ((b.wins || 0) - (b.losses || 0)) - ((a.wins || 0) - (a.losses || 0)))
      .slice(0, 8)
      .map((p) => {
        const games = (p.wins || 0) + (p.losses || 0);
        return {
          accountID: p.account_id,
          name: p.name || `Pro #${p.account_id}`,
          team: p.team_name || "Free Agent",
          games,
          winrate: games > 0 ? ((p.wins || 0) / games) * 100 : 0,
        };
      });

    const insights = [
      totalProMatches > 0 ? `Tracked ${totalProMatches} recent pro matches.` : "No pro matches in sample.",
      `Radiant winrate in sample: ${radiantWinrate.toFixed(1)}%.`,
      `Average pro match duration: ${avgDurationMin.toFixed(1)} min.`,
      `High-kill games (80+ total kills): ${highKillMatches}.`,
    ];

    return {
      totalProMatches,
      radiantWinrate,
      avgDurationMin,
      highKillMatches,
      trendingLeagues,
      metaHeroes,
      hotPros,
      insights,
    };
  }, [heroStats, matches, proPlayers]);

  return { status, error, matches, heroStats, proPlayers, computed };
}
