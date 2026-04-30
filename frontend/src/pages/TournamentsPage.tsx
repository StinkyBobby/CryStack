import { useMemo, useState } from "react";
import { AnimatedBackdrop } from "@/components/background/AnimatedBackdrop";
import { TopNav } from "@/components/layout/TopNav";
import { CountUp } from "@/components/ui/CountUp";
import { useTournamentsData } from "@/hooks/useTournamentsData";
import type { Player } from "@/types";

interface TournamentsPageProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  player: Player | null;
  authStatus: "idle" | "loading" | "authenticated" | "anonymous" | "error";
  onLogin: () => void;
  onLogout: () => void;
}

function formatDate(unixSeconds: number | undefined): string {
  if (!unixSeconds || unixSeconds <= 0) {
    return "n/a";
  }
  return new Date(unixSeconds * 1000).toLocaleDateString("ru-RU");
}

export function TournamentsPage({ currentPath, onNavigate, player, authStatus, onLogin, onLogout }: TournamentsPageProps) {
  const { status, error, data } = useTournamentsData();
  const [query, setQuery] = useState("");

  const active = useMemo(() => {
    return data.active.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  }, [data.active, query]);

  const recent = useMemo(() => {
    return data.recent.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  }, [data.recent, query]);

  const upcoming = useMemo(() => {
    return data.upcoming.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  }, [data.upcoming, query]);

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
          <h1 className="text-4xl font-semibold">Турниры</h1>
          <p className="mt-2 text-white/70">Открытые данные OpenDota: live, recent и upcoming лиги.</p>

          <div className="mt-4 grid gap-3 text-sm text-white/80 sm:grid-cols-3">
            <div className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
              Active: <CountUp to={active.length} />
            </div>
            <div className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
              Recent: <CountUp to={recent.length} />
            </div>
            <div className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
              Upcoming: <CountUp to={upcoming.length} />
            </div>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию турнира"
            className="mt-4 h-12 w-full rounded-full border border-red-900/45 bg-white/[0.03] px-5 outline-none"
          />
        </section>

        <section className="hero-enter grid gap-4 lg:grid-cols-3" style={{ animationDelay: "120ms" }}>
          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-4">
            <h2 className="text-xl font-semibold">Активные</h2>
            <div className="mt-3 space-y-2">
              {active.length > 0 ? (
                active.map((league) => {
                  const latest = Math.max(...league.matches.map((m) => m.start_time));
                  return (
                    <div key={league.leagueid} className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{league.name}</p>
                        <button
                          onClick={() => onNavigate(`/tournaments/${league.leagueid}`)}
                          className="rounded-full border border-red-900/45 px-2 py-1 text-xs transition hover:border-[#df2531]/70"
                        >
                          Подробнее
                        </button>
                      </div>
                      <p className="text-white/70">
                        Матчей: <CountUp to={league.matches.length} /> | Последний: {formatDate(latest)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-white/70">Нет данных по фильтру.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-4">
            <h2 className="text-xl font-semibold">Предстоящие</h2>
            <div className="mt-3 space-y-2">
              {upcoming.length > 0 ? (
                upcoming.map((league) => (
                  <div key={league.leagueid} className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{league.name}</p>
                      <button
                        onClick={() => onNavigate(`/tournaments/${league.leagueid}`)}
                        className="rounded-full border border-red-900/45 px-2 py-1 text-xs transition hover:border-[#df2531]/70"
                      >
                        Подробнее
                      </button>
                    </div>
                    <p className="text-white/70">Старт: {formatDate(league.start_timestamp)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70">Нет upcoming турниров по фильтру.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-4">
            <h2 className="text-xl font-semibold">Завершенные</h2>
            <div className="mt-3 space-y-2">
              {recent.length > 0 ? (
                recent.map((league) => {
                  const latest = Math.max(...league.matches.map((m) => m.start_time));
                  return (
                    <div key={league.leagueid} className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{league.name}</p>
                        <button
                          onClick={() => onNavigate(`/tournaments/${league.leagueid}`)}
                          className="rounded-full border border-red-900/45 px-2 py-1 text-xs transition hover:border-[#df2531]/70"
                        >
                          Подробнее
                        </button>
                      </div>
                      <p className="text-white/70">Последний матч: {formatDate(latest)}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-white/70">Нет recent турниров по фильтру.</p>
              )}
            </div>
          </div>
        </section>

        {status === "loading" ? <p className="text-white/70">Загрузка турниров...</p> : null}
        {status === "error" ? <p className="text-rose-200">Ошибка загрузки турниров: {error}</p> : null}
      </main>
    </div>
  );
}

