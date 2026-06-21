import { useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "@/api/client";
import { AnimatedBackdrop } from "@/components/background/AnimatedBackdrop";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { CountUp } from "@/components/ui/CountUp";
import { useProfileData } from "@/hooks/useProfileData";
import type { Invite, Player } from "@/types";

interface ProfilePageProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  player: Player | null;
  token: string | null;
  authStatus: "idle" | "loading" | "authenticated" | "anonymous" | "error";
  onLogin: () => void;
  onLogout: () => void;
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export function ProfilePage({ currentPath, onNavigate, player, token, authStatus, onLogin, onLogout }: ProfilePageProps) {
  const { status, error, data, matchTrend } = useProfileData(player, token);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteActionStatus, setInviteActionStatus] = useState<"idle" | "loading" | "error">("idle");
  const [inviteActionError, setInviteActionError] = useState<string | null>(null);

  useEffect(() => {
    setInvites(Array.isArray(data.invites) ? data.invites : []);
  }, [data.invites]);

  const respondInvite = async (inviteId: number, action: "accept" | "decline") => {
    if (!token) {
      return;
    }

    setInviteActionStatus("loading");
    setInviteActionError(null);

    try {
      await apiRequest(`/api/invites/${inviteId}/respond`, {
        method: "PATCH",
        token,
        body: { action },
      });

      setInvites((prev) => prev.map((invite) => (invite.id === inviteId ? { ...invite, status: action === "accept" ? "accepted" : "declined" } : invite)));
      setInviteActionStatus("idle");
    } catch (e) {
      setInviteActionStatus("error");
      setInviteActionError(e instanceof Error ? e.message : "failed to process invite");
    }
  };

  if (!player) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#020617] text-white">
        <AnimatedBackdrop />

        <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-14 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <TopNav
            player={player}
            authStatus={authStatus}
            currentPath={currentPath}
            onNavigate={onNavigate}
            onLogin={onLogin}
            onLogout={onLogout}
          />
          <section className="hero-enter rounded-3xl border border-red-900/50 bg-black/60 p-8 text-center">
            <h2 className="text-2xl font-semibold">Профиль недоступен</h2>
            <p className="mt-3 text-white/75">Войдите через Steam для загрузки данных профиля.</p>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  const profile = data.player ?? player;
  const heroes = Array.isArray(profile.heroes) ? profile.heroes : [];
  const winrate = Number.isFinite(profile.winrate) ? profile.winrate : 0;
  const gpm = Number.isFinite(profile.gpm) ? profile.gpm : 0;
  const xpm = Number.isFinite(profile.xpm) ? profile.xpm : 0;
  const mmr = Number.isFinite(profile.mmr) ? profile.mmr : 0;
  const matchesPlayed = Number.isFinite(profile.matches_played) ? profile.matches_played : 0;
  const pendingInvites = invites.filter((invite) => invite.status === "pending");

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

        <section className="hero-enter rounded-3xl border border-red-900/50 bg-black/60 p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <img src={profile.avatar} alt={profile.name} className="h-20 w-20 rounded-full border-2 border-[#df2531]/70 object-cover" />
              <div>
                <h1 className="line-rise text-3xl font-semibold">{profile.name}</h1>
                <p className="line-rise mt-1 text-sm text-white/70" style={{ animationDelay: "120ms" }}>
                  Steam ID: {profile.steam_id}
                </p>
                <p className="line-rise mt-1 text-sm text-white/70" style={{ animationDelay: "170ms" }}>
                  Синхронизация: {status === "loading" ? "Обновление..." : "Актуально"}
                </p>
              </div>
            </div>
            <div className="text-sm text-white/70">
              <p>
                Лидер команд: <CountUp to={data.teamsLed.length} />
              </p>
              <p>
                Ожидают ответа: <CountUp to={pendingInvites.length} />
              </p>
            </div>
          </div>
        </section>

        <section className="hero-enter grid gap-4 sm:grid-cols-2 lg:grid-cols-5" style={{ animationDelay: "120ms" }}>
          <MetricCard title="Текущий MMR" value={<CountUp to={mmr} />} />
          <MetricCard title="Основная роль" value={profile.role || "н/д"} />
          <MetricCard title="Винрейт" value={<CountUp to={Math.round(winrate * 10)} scale={10} suffix="%" />} />
          <MetricCard title="GPM" value={<CountUp to={Math.round(gpm)} />} />
          <MetricCard title="XPM" value={<CountUp to={Math.round(xpm)} />} />
        </section>

        <section className="hero-enter grid gap-4 lg:grid-cols-3" style={{ animationDelay: "180ms" }}>
          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5 lg:col-span-2">
            <h3 className="text-lg font-semibold">Форма последних матчей</h3>
            <p className="text-sm text-white/70">Динамика показателя (K+A-D) в последних матчах.</p>

            {matchTrend.length > 1 ? (
              <MatchFormChart matchTrend={matchTrend} recentMatches={data.recentMatches} heroNames={data.heroNames} />
            ) : (
              <p className="mt-4 text-sm text-white/70">Недостаточно матчей для отображения графика.</p>
            )}
          </div>

          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5">
            <h3 className="text-lg font-semibold">Основные показатели</h3>
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Матчей" value={<CountUp to={matchesPlayed} />} />
              <Row label="Стиль" value={profile.style || "н/д"} />
              <Row label="Винрейт" value={<CountUp to={Math.round(winrate * 10)} scale={10} suffix="%" />} />
            </div>
          </div>
        </section>

        <section className="hero-enter grid gap-4 lg:grid-cols-3" style={{ animationDelay: "240ms" }}>
          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5 lg:col-span-1">
            <h3 className="text-lg font-semibold">Лучшие герои</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {heroes.length > 0 ? (
                heroes.map((heroID) => (
                  <div key={heroID} className="rounded-xl border border-red-900/40 bg-white/[0.03] px-3 py-2 text-sm">
                    {data.heroNames[heroID] || `Hero #${heroID}`}
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70">Список героев пуст.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5 lg:col-span-2">
            <h3 className="text-lg font-semibold">Входящие приглашения</h3>
            <div className="mt-4 space-y-2">
              {invites.length > 0 ? (
                invites.map((invite) => (
                  <div key={invite.id} className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        {invite.team_name || `Команда #${invite.team_id}`} • статус: {invite.status}
                      </span>
                      {invite.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => respondInvite(invite.id, "accept")}
                            disabled={inviteActionStatus === "loading"}
                            className="rounded-full border border-emerald-500/40 px-3 py-1 text-xs transition hover:border-emerald-300"
                          >
                            Принять
                          </button>
                          <button
                            onClick={() => respondInvite(invite.id, "decline")}
                            disabled={inviteActionStatus === "loading"}
                            className="rounded-full border border-rose-500/40 px-3 py-1 text-xs transition hover:border-rose-300"
                          >
                            Отклонить
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70">Приглашений пока нет.</p>
              )}
              {inviteActionStatus === "error" ? <p className="text-sm text-rose-200">Ошибка действия: {inviteActionError}</p> : null}
            </div>
          </div>
        </section>

        <section className="hero-enter rounded-3xl border border-red-900/45 bg-black/60 p-5" style={{ animationDelay: "280ms" }}>
          <h3 className="text-lg font-semibold">Последние матчи</h3>
          <div className="mt-4 space-y-2">
            {data.recentMatches.length > 0 ? (
              data.recentMatches.map((match) => {
                const radiantPlayer = match.player_slot < 128;
                const won = (radiantPlayer && match.radiant_win) || (!radiantPlayer && !match.radiant_win);
                return (
                  <div key={match.match_id} className="grid grid-cols-4 items-center rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2 text-sm">
                    <span>{data.heroNames[match.hero_id] || `Hero #${match.hero_id}`}</span>
                    <span className={won ? "text-emerald-300" : "text-rose-300"}>{won ? "Победа" : "Поражение"}</span>
                    <span>
                      <CountUp to={match.kills} />/<CountUp to={match.deaths} />/<CountUp to={match.assists} />
                    </span>
                    <span>{formatDuration(match.duration)}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-white/70">Последних матчей нет.</p>
            )}
          </div>
        </section>

        {status === "error" ? <p className="text-sm text-rose-200">Ошибка загрузки профиля: {error}</p> : null}
      </main>
      <Footer />
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-red-900/45 bg-black/60 p-4">
      <p className="text-sm text-white/70">{title}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
      <span className="text-white/70">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

/* ---------- Match Form Chart ---------- */

interface MatchFormChartProps {
  matchTrend: number[];
  recentMatches: { hero_id: number; kills: number; deaths: number; assists: number }[];
  heroNames: Record<number, string>;
}

function MatchFormChart({ matchTrend, recentMatches, heroNames }: MatchFormChartProps) {
  const W = 640;
  const H = 220;
  const padLeft = 48;
  const padRight = 20;
  const padTop = 24;
  const padBottom = 36;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  const minVal = Math.min(...matchTrend);
  const maxVal = Math.max(...matchTrend, 1);
  const range = maxVal - minVal || 1;

  // Nice Y-axis ticks (5-6 lines)
  const tickCount = 5;
  const rawStep = range / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceStep = Math.ceil(rawStep / magnitude) * magnitude;
  const yMin = Math.floor(minVal / niceStep) * niceStep;
  const yMax = Math.ceil(maxVal / niceStep) * niceStep;
  const yRange = yMax - yMin || 1;

  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + niceStep * 0.001; v += niceStep) {
    ticks.push(Math.round(v * 10) / 10);
  }

  const pointCoords = matchTrend.map((value, index) => {
    const x = padLeft + (index / (matchTrend.length - 1)) * chartW;
    const y = padTop + chartH - ((value - yMin) / yRange) * chartH;
    return { x, y, value };
  });

  const linePoints = pointCoords.map((p) => `${p.x},${p.y}`).join(" ");

  // Area fill under the line
  const areaPoints = `${pointCoords[0].x},${padTop + chartH} ${linePoints} ${pointCoords[pointCoords.length - 1].x},${padTop + chartH}`;

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 240 }}>
        {/* Grid lines + Y labels */}
        {ticks.map((tick) => {
          const y = padTop + chartH - ((tick - yMin) / yRange) * chartH;
          return (
            <g key={tick}>
              <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
              <text x={padLeft - 6} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.45)" fontSize="11" fontFamily="monospace">
                {tick}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <polygon points={areaPoints} fill="url(#formGradient)" opacity="0.18" />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="formGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#df2531" />
            <stop offset="100%" stopColor="#df2531" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Line */}
        <polyline fill="none" stroke="#df2531" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={linePoints} />

        {/* Dots + value labels */}
        {pointCoords.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#020617" stroke="#df2531" strokeWidth="2" />
            {/* Value above/below the dot */}
            <text
              x={p.x}
              y={p.value >= (minVal + maxVal) / 2 ? p.y - 12 : p.y + 22}
              textAnchor="middle"
              fill="white"
              fontSize="11"
              fontWeight="600"
              fontFamily="monospace"
            >
              {p.value}
            </text>
          </g>
        ))}

        {/* X-axis: match numbers */}
        {pointCoords.map((p, i) => (
          <text key={`x-${i}`} x={p.x} y={H - 6} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">
            {i + 1}
          </text>
        ))}

        {/* Axis label */}
        <text x={padLeft + chartW / 2} y={H - 0} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10">
          Матчи (последние →)
        </text>
        <text x={12} y={padTop + chartH / 2} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" transform={`rotate(-90, 12, ${padTop + chartH / 2})`}>
          K+A-D
        </text>
      </svg>

      {/* Legend: hero per match */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {recentMatches.slice(0, matchTrend.length).map((m, i) => (
          <span key={i} className="text-xs text-white/50">
            <span className="text-white/70">#{i + 1}</span>{" "}
            {heroNames[m.hero_id] || `Hero #${m.hero_id}`}
            <span className="text-white/35"> ({m.kills}/{m.deaths}/{m.assists})</span>
          </span>
        ))}
      </div>
    </div>
  );
}
