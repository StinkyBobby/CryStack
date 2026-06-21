import { type ReactNode } from "react";
import { AnimatedBackdrop } from "@/components/background/AnimatedBackdrop";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
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
          <h1 className="text-4xl font-semibold">Глобальная аналитика Dota 2</h1>
          <p className="mt-2 text-white/70">Сигналы про-сцены, мета-герои, тренды и полезные данные из открытых источников.</p>

          <div className="mt-4 grid gap-3 text-sm text-white/80 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Про-матчей недавно" value={<CountUp to={computed.totalProMatches} />} />
            <Metric label="Винрейт Radiant" value={<CountUp to={Math.round(computed.radiantWinrate * 10)} scale={10} suffix="%" />} />
            <Metric label="Средняя длительность" value={<CountUp to={Math.round(computed.avgDurationMin * 10)} scale={10} suffix=" мин" />} />
            <Metric label="Матчей с большим числом убийств" value={<CountUp to={computed.highKillMatches} />} />
          </div>
        </section>

        <section className="hero-enter grid gap-4 lg:grid-cols-3" style={{ animationDelay: "120ms" }}>
          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5 lg:col-span-2">
            <h2 className="text-xl font-semibold">Мета-герои (про-пики)</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {computed.metaHeroes.map((hero) => (
                <div key={hero.id} className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{hero.name}</span>
                    <span>пиков: <CountUp to={hero.picks} /></span>
                  </div>
                  <p className="text-xs text-white/70">винрейт: <CountUp to={Math.round(hero.winrate * 10)} scale={10} suffix="%" /></p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5">
            <h2 className="text-xl font-semibold">Популярные лиги</h2>
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
            <h2 className="text-xl font-semibold">Топ про-игроков</h2>
            <div className="mt-4 space-y-2 text-sm">
              {computed.hotPros.length > 0 ? (
                computed.hotPros.map((pro) => (
                  <div key={pro.accountID} className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span>{pro.name}</span>
                      <span>{pro.team}</span>
                    </div>
                    <p className="text-xs text-white/70">
                      игр: <CountUp to={pro.games} /> | винрейт: <CountUp to={Math.round(pro.winrate * 10)} scale={10} suffix="%" />
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70">Нет актуальных данных по про-игрокам.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5">
            <h2 className="text-xl font-semibold">Интересные факты</h2>
            <div className="mt-4 space-y-3 text-sm">
              {/* Fun stat: most kills in a match */}
              {computed.highestKillMatch && (
                <InsightCard
                  icon=""
                  title="Самый кровавый матч"
                  value={`${computed.highestKillMatch.totalKills} убийств`}
                  detail={`${computed.highestKillMatch.radiantScore} — ${computed.highestKillMatch.direScore}`}
                />
              )}

              {/* Longest match */}
              {computed.longestMatch && (
                <InsightCard
                  icon=""
                  title="Самый длинный матч"
                  value={computed.longestMatch.durationFormatted}
                 detail={`ID: ${computed.longestMatch.matchId}`}
                />
              )}

              {/* Shortest match */}
              {computed.shortestMatch && (
                <InsightCard
                  icon=""
                  title="Самый быстрый матч"
                  value={computed.shortestMatch.durationFormatted}
                  detail={`ID: ${computed.shortestMatch.matchId}`}
                />
              )}

              {/* Radiant vs Dire */}
              <InsightCard
                icon=""
                title="Преимущество Radiant"
                value={`${computed.radiantWinrateFormatted}`}
                detail={`из ${computed.totalProMatches} матчей`}
              />

              {/* Avg kills per match */}
              <InsightCard
                icon=""
                title="Среднее число убийств"
                value={`${computed.avgKillsPerMatch}`}
                detail="за матч в выборке"
              />

              {/* Top hero by winrate (min picks) */}
              {computed.mostReliableHero && (
                <InsightCard
                  icon=""
                  title="Самый стабильный герой"
                  value={computed.mostReliableHero.name}
                  detail={`${computed.mostReliableHero.winrate}% винрейт (${computed.mostReliableHero.picks} пиков)`}
                />
              )}

              {/* Bloodiest league */}
              {computed.bloodiestLeague && (
                <InsightCard
                  icon=""
                  title="Самая агрессивная лига"
                  value={computed.bloodiestLeague.name}
                  detail={`${computed.bloodiestLeague.avgKills} убийств в среднем`}
                />
              )}
            </div>
          </div>
        </section>

        {status === "loading" ? <p className="text-white/70">Загрузка аналитики...</p> : null}
        {status === "error" ? <p className="text-rose-200">Ошибка загрузки аналитики: {error}</p> : null}
      </main>
      <Footer />
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

interface InsightCardProps {
  icon: string;
  title: string;
  value: string;
  detail: string;
}

function InsightCard({ icon, title, value, detail }: InsightCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-900/30 bg-white/[0.02] p-3 transition-colors hover:border-red-900/50 hover:bg-white/[0.04]">
      <span className="mt-0.5 text-lg leading-none">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white/45 uppercase tracking-wider">{title}</p>
        <p className="mt-0.5 text-sm font-semibold text-white/90 truncate">{value}</p>
        <p className="mt-0.5 text-xs text-white/35 truncate">{detail}</p>
      </div>
    </div>
  );
}
