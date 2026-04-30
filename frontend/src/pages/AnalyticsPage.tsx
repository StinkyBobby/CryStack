import { type ReactNode } from "react";
import { AnimatedBackdrop } from "@/components/background/AnimatedBackdrop";
import { TopNav } from "@/components/layout/TopNav";
import { CountUp } from "@/components/ui/CountUp";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import type { Player } from "@/types";

interface AnalyticsPageProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  player: Player | null;
  authStatus: "idle" | "loading" | "authenticated" | "anonymous" | "error";
  onLogin: () => void;
  onLogout: () => void;
}

export function AnalyticsPage({ currentPath, onNavigate, player, authStatus, onLogin, onLogout }: AnalyticsPageProps) {
  const { status, error, computed } = useAnalyticsData();

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
          <h1 className="text-4xl font-semibold">Global Dota 2 Analytics</h1>
          <p className="mt-2 text-white/70">Live pro-scene signals, meta heroes, trends and useful insights from public sources.</p>

          <div className="mt-4 grid gap-3 text-sm text-white/80 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Recent pro matches" value={<CountUp to={computed.totalProMatches} />} />
            <Metric label="Radiant winrate" value={<CountUp to={Math.round(computed.radiantWinrate * 10)} scale={10} suffix="%" />} />
            <Metric label="Avg match duration" value={<CountUp to={Math.round(computed.avgDurationMin * 10)} scale={10} suffix=" min" />} />
            <Metric label="High-kill matches" value={<CountUp to={computed.highKillMatches} />} />
          </div>
        </section>

        <section className="hero-enter grid gap-4 lg:grid-cols-3" style={{ animationDelay: "120ms" }}>
          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5 lg:col-span-2">
            <h2 className="text-xl font-semibold">Meta heroes (pro picks)</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {computed.metaHeroes.map((hero) => (
                <div key={hero.id} className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{hero.name}</span>
                    <span>picks: <CountUp to={hero.picks} /></span>
                  </div>
                  <p className="text-xs text-white/70">winrate: <CountUp to={Math.round(hero.winrate * 10)} scale={10} suffix="%" /></p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5">
            <h2 className="text-xl font-semibold">Trending leagues</h2>
            <div className="mt-4 space-y-2 text-sm">
              {computed.trendingLeagues.map((league) => (
                <div key={league.name} className="flex items-center justify-between rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
                  <span className="text-white/80">{league.name}</span>
                  <span><CountUp to={league.matchesCount} /></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="hero-enter grid gap-4 lg:grid-cols-2" style={{ animationDelay: "220ms" }}>
          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5">
            <h2 className="text-xl font-semibold">Hot pro players</h2>
            <div className="mt-4 space-y-2 text-sm">
              {computed.hotPros.length > 0 ? (
                computed.hotPros.map((pro) => (
                  <div key={pro.accountID} className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span>{pro.name}</span>
                      <span>{pro.team}</span>
                    </div>
                    <p className="text-xs text-white/70">
                      games: <CountUp to={pro.games} /> | winrate: <CountUp to={Math.round(pro.winrate * 10)} scale={10} suffix="%" />
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70">Нет актуальных данных по про-игрокам.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5">
            <h2 className="text-xl font-semibold">Insights</h2>
            <div className="mt-4 space-y-2 text-sm">
              {computed.insights.map((insight, idx) => (
                <div key={`${insight}-${idx}`} className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
                  {insight}
                </div>
              ))}
            </div>
          </div>
        </section>

        {status === "loading" ? <p className="text-white/70">Loading global analytics...</p> : null}
        {status === "error" ? <p className="text-rose-200">Global analytics loading error: {error}</p> : null}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
      <p className="text-xs text-white/70">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
