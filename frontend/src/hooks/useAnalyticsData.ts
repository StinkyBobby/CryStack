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
  personaname?: string;
  team_name?: string;
  wins?: number;
  losses?: number;
  last_match_time?: number;
}

interface PlayerWL {
  win: number;
  lose: number;
}

type Status = "idle" | "loading" | "success" | "error";

export function useAnalyticsData() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<ProMatch[]>([]);
  const [heroStats, setHeroStats] = useState<HeroStat[]>([]);
  const [proPlayers, setProPlayers] = useState<ProPlayer[]>([]);
  const [proPlayersWL, setProPlayersWL] = useState<Record<number, PlayerWL>>({});

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

        const normalizedPros = Array.isArray(proPlayersPayload)
          ? proPlayersPayload.filter((p) => Number.isFinite(p.account_id) && p.account_id > 0)
          : [];

        const wlTargets = normalizedPros
          .filter((p) => {
            const name = (p.name || p.personaname || "").trim();
            return name.length > 0;
          })
          .slice(0, 16);

        const wlEntries = await Promise.all(
          wlTargets.map(async (p) => {
            try {
              const wl = await fetch(`https://api.opendota.com/api/players/${p.account_id}/wl`).then(
                (r) => r.json() as Promise<Partial<PlayerWL>>,
              );
              const wins = Number(wl.win || 0);
              const losses = Number(wl.lose || 0);
              if (wins + losses <= 0) {
                return [p.account_id, null] as const;
              }

              return [p.account_id, { win: wins, lose: losses }] as const;
            } catch {
              return [p.account_id, null] as const;
            }
          }),
        );

        if (cancelled) {
          return;
        }

        const wlMap: Record<number, PlayerWL> = {};
        wlEntries.forEach(([accountID, wl]) => {
          if (wl) {
            wlMap[accountID] = wl;
          }
        });

        setMatches(Array.isArray(matchesPayload) ? matchesPayload : []);
        setHeroStats(Array.isArray(heroesPayload) ? heroesPayload : []);
        setProPlayers(normalizedPros);
        setProPlayersWL(wlMap);
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
      .map((p) => {
        const wl = proPlayersWL[p.account_id];
        const wins = wl?.win ?? p.wins ?? 0;
        const losses = wl?.lose ?? p.losses ?? 0;
        const games = wins + losses;
        const name = (p.name || p.personaname || "").trim();

        return {
          accountID: p.account_id,
          name: name || `Pro #${p.account_id}`,
          team: p.team_name || "Free Agent",
          games,
          winrate: games > 0 ? (wins / games) * 100 : 0,
        };
      })
      .filter((p) => p.games > 0)
      .sort((a, b) => b.games - a.games || b.winrate - a.winrate)
      .slice(0, 8);

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
  }, [heroStats, matches, proPlayers, proPlayersWL]);

  return { status, error, matches, heroStats, proPlayers, computed };
}
