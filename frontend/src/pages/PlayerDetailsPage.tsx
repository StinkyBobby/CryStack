import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/api/client";
import { AnimatedBackdrop } from "@/components/background/AnimatedBackdrop";
import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/ui/CountUp";
import type { Player, Team } from "@/types";

interface PlayerDetailsPageProps {
  steamId: string;
  currentPath: string;
  onNavigate: (path: string) => void;
  player: Player | null;
  token: string | null;
  authStatus: "idle" | "loading" | "authenticated" | "anonymous" | "error";
  onLogin: () => void;
  onLogout: () => void;
}

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
  player_slot: number;
  radiant_win: boolean;
}

function toSteamID32(steamID64: string): string {
  const value = BigInt(steamID64);
  const base = 76561197960265728n;
  return (value > base ? value - base : value).toString();
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export function PlayerDetailsPage({ steamId, currentPath, onNavigate, player, token, authStatus, onLogin, onLogout }: PlayerDetailsPageProps) {
  const [target, setTarget] = useState<Player | null>(null);
  const [heroNames, setHeroNames] = useState<Record<number, string>>({});
  const [recentMatches, setRecentMatches] = useState<OpenDotaMatch[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setError(null);
      try {
        const [playerRaw, heroesRaw] = await Promise.all([
          apiRequest<Player>(`/api/players/${steamId}`),
          fetch("https://api.opendota.com/api/heroes").then((r) => r.json() as Promise<OpenDotaHero[]>),
        ]);

        const recentRaw = await fetch(`https://api.opendota.com/api/players/${toSteamID32(String(playerRaw.steam_id))}/recentMatches`).then(
          (r) => r.json() as Promise<OpenDotaMatch[]>,
        );

        if (cancelled) {
          return;
        }

        setTarget({
          ...playerRaw,
          steam_id: String(playerRaw.steam_id),
          heroes: Array.isArray(playerRaw.heroes) ? playerRaw.heroes : [],
        });
        setRecentMatches(Array.isArray(recentRaw) ? recentRaw.slice(0, 10) : []);
        setHeroNames(
          (Array.isArray(heroesRaw) ? heroesRaw : []).reduce<Record<number, string>>((acc, hero) => {
            acc[hero.id] = hero.localized_name;
            return acc;
          }, {}),
        );
        setStatus("success");
      } catch (e) {
        if (cancelled) {
          return;
        }
        setStatus("error");
        setError(e instanceof Error ? e.message : "failed to load player profile");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [steamId]);

  useEffect(() => {
    let cancelled = false;

    const loadMine = async () => {
      if (!token) {
        setMyTeams([]);
        return;
      }

      try {
        const teams = await apiRequest<Team[]>("/api/teams/mine", { token });
        if (!cancelled) {
          setMyTeams(Array.isArray(teams) ? teams : []);
          setSelectedTeamId(Array.isArray(teams) && teams.length > 0 ? String(teams[0].id) : "");
        }
      } catch {
        if (!cancelled) {
          setMyTeams([]);
          setSelectedTeamId("");
        }
      }
    };

    loadMine();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const canInvite = !!token && !!target && myTeams.length > 0 && selectedTeamId;

  const sendInvite = async () => {
    if (!canInvite || !target) {
      return;
    }

    setInviteStatus("loading");
    setInviteError(null);

    try {
      await apiRequest("/api/invites", {
        method: "POST",
        token,
        body: {
          team_id: Number(selectedTeamId),
          steam_id: target.steam_id,
        },
      });
      setInviteStatus("success");
    } catch (e) {
      setInviteStatus("error");
      setInviteError(e instanceof Error ? e.message : "failed to invite player");
    }
  };

  const winrate = target?.winrate || 0;

  const trend = useMemo(() => {
    return recentMatches.map((match) => Math.max(0, match.kills + match.assists - match.deaths));
  }, [recentMatches]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#020617] text-white">
      <AnimatedBackdrop />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-14 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <TopNav
          player={player}
          authStatus={authStatus}
          currentPath={currentPath}
          onNavigate={onNavigate}
          onLogin={onLogin}
          onLogout={onLogout}
        />

        <section className="hero-enter rounded-3xl border border-red-900/45 bg-black/60 p-6">
          <button onClick={() => onNavigate("/players")} className="text-sm text-white/70 transition hover:text-white">
            ← Назад к поиску
          </button>

          {target ? (
            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src={target.avatar} alt={target.name} className="h-16 w-16 rounded-full border border-red-900/45 object-cover" />
                <div>
                  <h1 className="text-3xl font-semibold">{target.name}</h1>
                  <p className="text-sm text-white/70">SteamID: {target.steam_id}</p>
                  <p className="text-sm text-white/70">Role: {target.role || "unknown"}</p>
                </div>
              </div>
              <div className="text-right text-sm text-white/80">
                <p>MMR: <CountUp to={target.mmr || 0} /></p>
                <p>Winrate: <CountUp to={Math.round(winrate * 10)} scale={10} suffix="%" /></p>
              </div>
            </div>
          ) : null}

          {status === "loading" ? <p className="mt-3 text-white/70">Загрузка профиля...</p> : null}
          {status === "error" ? <p className="mt-3 text-rose-200">Ошибка: {error}</p> : null}
        </section>

        {target ? (
          <section className="hero-enter grid gap-4 lg:grid-cols-3" style={{ animationDelay: "120ms" }}>
            <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5 lg:col-span-2">
              <h2 className="text-xl font-semibold">Форма последних матчей</h2>
              {trend.length > 1 ? (
                <svg viewBox="0 0 600 180" className="mt-3 h-44 w-full">
                  <polyline
                    fill="none"
                    stroke="#df2531"
                    strokeWidth="3"
                    points={trend
                      .map((value, index) => {
                        const x = (index / (trend.length - 1)) * 580 + 10;
                        const max = Math.max(...trend, 1);
                        const y = 170 - (value / max) * 140;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                </svg>
              ) : (
                <p className="mt-3 text-sm text-white/70">Недостаточно матчей для графика.</p>
              )}
            </div>

            <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5">
              <h2 className="text-xl font-semibold">Инвайт в команду</h2>
              <p className="mt-1 text-sm text-white/70">Выберите свою команду и отправьте приглашение.</p>

              {myTeams.length > 0 ? (
                <>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="mt-3 h-11 w-full rounded-xl border border-red-900/45 bg-white/[0.03] px-4 outline-none"
                  >
                    {myTeams.map((team) => (
                      <option key={team.id} value={String(team.id)} className="bg-black">
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-3">
                    <Button onClick={sendInvite} disabled={!canInvite || inviteStatus === "loading"}>
                      {inviteStatus === "loading" ? "Отправка..." : "Пригласить"}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-white/70">У вас нет своих команд для отправки инвайта.</p>
              )}

              {inviteStatus === "success" ? <p className="mt-2 text-sm text-emerald-300">Инвайт отправлен</p> : null}
              {inviteStatus === "error" ? <p className="mt-2 text-sm text-rose-200">Ошибка: {inviteError}</p> : null}
            </div>
          </section>
        ) : null}

        {target ? (
          <section className="hero-enter rounded-3xl border border-red-900/45 bg-black/60 p-5" style={{ animationDelay: "180ms" }}>
            <h2 className="text-xl font-semibold">Последние матчи</h2>
            <div className="mt-3 space-y-2">
              {recentMatches.length > 0 ? (
                recentMatches.map((match) => {
                  const radiantPlayer = match.player_slot < 128;
                  const won = (radiantPlayer && match.radiant_win) || (!radiantPlayer && !match.radiant_win);
                  return (
                    <div key={match.match_id} className="grid grid-cols-4 items-center rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2 text-sm">
                      <span>{heroNames[match.hero_id] || `Hero #${match.hero_id}`}</span>
                      <span className={won ? "text-emerald-300" : "text-rose-300"}>{won ? "Победа" : "Поражение"}</span>
                      <span>
                        <CountUp to={match.kills} />/<CountUp to={match.deaths} />/<CountUp to={match.assists} />
                      </span>
                      <span>{formatDuration(match.duration)}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-white/70">Нет данных по матчам.</p>
              )}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
