import type { ReactNode } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { TopNav } from "@/components/layout/TopNav";
import { useProfileData } from "@/hooks/useProfileData";
import type { Player } from "@/types";

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

  if (!player) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-[#000000] text-white">
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
            <p className="mt-3 text-white/75">Войди через Steam, чтобы загрузить реальные данные профиля.</p>
          </section>
        </main>
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

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#000000] text-white">
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
              <img
                src={profile.avatar}
                alt={profile.name}
                className="h-20 w-20 rounded-full border-2 border-[#df2531]/70 object-cover"
              />
              <div>
                <h1 className="line-rise text-3xl font-semibold">{profile.name}</h1>
                <p className="line-rise mt-1 text-sm text-white/70" style={{ animationDelay: "120ms" }}>Steam ID: {profile.steam_id}</p>
                <p className="line-rise mt-1 text-sm text-white/70" style={{ animationDelay: "170ms" }}>Статус загрузки: {status === "loading" ? "Обновление..." : "Актуально"}</p>
              </div>
            </div>
            <div className="text-sm text-white/70">
              <p>Лидерских команд: <CountUp to={data.teamsLed.length} /></p>
              <p>Активных инвайтов: <CountUp to={data.invites.filter((i) => i.status === "pending").length} /></p>
            </div>
          </div>
        </section>

        <section className="hero-enter grid gap-4 sm:grid-cols-2 lg:grid-cols-5" style={{ animationDelay: "120ms" }}>
          <MetricCard title="Текущий MMR" value={<CountUp to={mmr} />} />
          <MetricCard title="Основная роль" value={profile.role || "n/a"} />
          <MetricCard title="Winrate" value={<CountUp to={Math.round(winrate * 10)} scale={10} suffix="%" />} />
          <MetricCard title="GPM" value={<CountUp to={Math.round(gpm)} />} />
          <MetricCard title="XPM" value={<CountUp to={Math.round(xpm)} />} />
        </section>

        <section className="hero-enter grid gap-4 lg:grid-cols-3" style={{ animationDelay: "200ms" }}>
          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5 lg:col-span-2">
            <h3 className="text-lg font-semibold">Детальная статистика</h3>
            <p className="text-sm text-white/70">График формы по последним матчам (K+A-D)</p>

            {matchTrend.length > 1 ? (
              <svg viewBox="0 0 600 180" className="mt-4 h-44 w-full">
                <polyline
                  fill="none"
                  stroke="#df2531"
                  strokeWidth="3"
                  points={matchTrend
                    .map((value, index) => {
                      const x = (index / (matchTrend.length - 1)) * 580 + 10;
                      const max = Math.max(...matchTrend, 1);
                      const y = 170 - (value / max) * 140;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />
              </svg>
            ) : (
              <p className="mt-4 text-sm text-white/70">Недостаточно матчей для построения графика.</p>
            )}
          </div>

          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5">
            <h3 className="text-lg font-semibold">Показатели</h3>
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Матчей" value={<CountUp to={matchesPlayed} />} />
              <Row label="Стиль" value={profile.style || "n/a"} />
              <Row label="Winrate" value={<CountUp to={Math.round(winrate * 10)} scale={10} suffix="%" />} />
            </div>
          </div>
        </section>

        <section className="hero-enter grid gap-4 lg:grid-cols-3" style={{ animationDelay: "280ms" }}>
          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5 lg:col-span-1">
            <h3 className="text-lg font-semibold">Популярные герои</h3>
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
                      <span><CountUp to={match.kills} />/<CountUp to={match.deaths} />/<CountUp to={match.assists} /></span>
                      <span>{formatDuration(match.duration)}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-white/70">Нет последних матчей.</p>
              )}
            </div>
          </div>
        </section>

        {status === "error" ? <p className="text-sm text-rose-200">Ошибка загрузки профиля: {error}</p> : null}
      </main>
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
