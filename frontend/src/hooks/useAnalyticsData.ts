import { useEffect, useMemo, useState } from "react";

async function fetchWithRetry<T>(url: string, retries = 2, timeout = 8000): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return (await resp.json()) as T;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < retries) {
        // Wait before retry (500ms, 1500ms, ...)
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error("Network error");
}

async function fetchPlayerWL(accountId: number): Promise<PlayerWL | null> {
  const key = `wl_${accountId}`;
  const cached = localStorage.getItem(key);
  if (cached) {
    const { ts, data } = JSON.parse(cached) as { ts: number; data: PlayerWL };
    if (Date.now() - ts < 10 * 60 * 1000) return data;
  }
  try {
    const wl = await fetchWithRetry<{ win?: number; lose?: number }>(
      `https://api.opendota.com/api/players/${accountId}/wl`,
      1,
      5000
    );
    const result = { win: Number(wl.win || 0), lose: Number(wl.lose || 0) };
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: result }));
    return result;
  } catch {
    return null;
  }
}

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
          fetchWithRetry<ProMatch[]>("https://api.opendota.com/api/proMatches"),
          fetchWithRetry<HeroStat[]>("https://api.opendota.com/api/heroStats"),
          fetchWithRetry<ProPlayer[]>("https://api.opendota.com/api/proPlayers"),
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
              const wl = await fetchPlayerWL(p.account_id);
              if (!wl) {
                return [p.account_id, null] as const;
              }
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
        setError(e instanceof Error ? e.message : "не удалось загрузить глобальную аналитику");
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

    // Highest kill match
    const highestKillMatch = sample
      .filter((m) => m.radiant_score !== undefined && m.dire_score !== undefined)
      .sort((a, b) => (b.radiant_score || 0) + (b.dire_score || 0) - (a.radiant_score || 0) - (a.dire_score || 0))[0];
    const highestKillMatchFormatted = highestKillMatch
      ? {
          matchId: highestKillMatch.match_id,
          totalKills: (highestKillMatch.radiant_score || 0) + (highestKillMatch.dire_score || 0),
          radiantScore: highestKillMatch.radiant_score || 0,
          direScore: highestKillMatch.dire_score || 0,
        }
      : null;

    // Longest & shortest matches (with duration)
    const withDuration = sample.filter((m) => m.duration && m.duration > 0);
    const longestMatch = [...withDuration].sort((a, b) => (b.duration || 0) - (a.duration || 0))[0];
    const shortestMatch = [...withDuration].sort((a, b) => (a.duration || 0) - (b.duration || 0))[0];

    const fmtDuration = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${String(s).padStart(2, "0")}`;
    };

    // Avg kills per match
    const killsAvailable = sample.filter((m) => m.radiant_score !== undefined && m.dire_score !== undefined);
    const avgKillsPerMatch =
      killsAvailable.length > 0
        ? Math.round(
            killsAvailable.reduce((sum, m) => sum + (m.radiant_score || 0) + (m.dire_score || 0), 0) / killsAvailable.length
          )
        : 0;

    // Most reliable hero (min 20 picks, highest winrate)
    const mostReliableHero = [...heroStats]
      .filter((h) => (h.pro_pick || 0) >= 20)
      .sort((a, b) => {
        const wrA = a.pro_pick > 0 ? (a.pro_win / a.pro_pick) * 100 : 0;
        const wrB = b.pro_pick > 0 ? (b.pro_win / b.pro_pick) * 100 : 0;
        return wrB - wrA;
      })[0];
    const mostReliableHeroFormatted = mostReliableHero
      ? {
          name: mostReliableHero.localized_name,
          winrate: mostReliableHero.pro_pick > 0 ? Math.round((mostReliableHero.pro_win / mostReliableHero.pro_pick) * 100) : 0,
          picks: mostReliableHero.pro_pick || 0,
        }
      : null;

    // Bloodiest league (highest avg kills per match, min 3 matches)
    const leagueKillMap = new Map<string, { totalKills: number; count: number }>();
    killsAvailable.forEach((m) => {
      const key = m.league_name || `League #${m.leagueid}`;
      const kills = (m.radiant_score || 0) + (m.dire_score || 0);
      const existing = leagueKillMap.get(key);
      if (existing) {
        existing.totalKills += kills;
        existing.count += 1;
      } else {
        leagueKillMap.set(key, { totalKills: kills, count: 1 });
      }
    });
    const bloodiestLeagueEntry = [...leagueKillMap.entries()]
      .filter(([, v]) => v.count >= 3)
      .sort((a, b) => b[1].totalKills / b[1].count - a[1].totalKills / a[1].count)[0];
    const bloodiestLeague = bloodiestLeagueEntry
      ? {
          name: bloodiestLeagueEntry[0],
          avgKills: Math.round(bloodiestLeagueEntry[1].totalKills / bloodiestLeagueEntry[1].count),
        }
      : null;

    return {
      totalProMatches,
      radiantWinrate,
      radiantWinrateFormatted: `${radiantWinrate.toFixed(1)}%`,
      avgDurationMin,
      highKillMatches,
      trendingLeagues,
      metaHeroes,
      hotPros,
      highestKillMatch: highestKillMatchFormatted,
      longestMatch: longestMatch
        ? { matchId: longestMatch.match_id, durationFormatted: fmtDuration(longestMatch.duration || 0) }
        : null,
      shortestMatch: shortestMatch
        ? { matchId: shortestMatch.match_id, durationFormatted: fmtDuration(shortestMatch.duration || 0) }
        : null,
      avgKillsPerMatch,
      mostReliableHero: mostReliableHeroFormatted,
      bloodiestLeague,
    };
  }, [heroStats, matches, proPlayers, proPlayersWL]);

  return { status, error, matches, heroStats, proPlayers, computed };
}
