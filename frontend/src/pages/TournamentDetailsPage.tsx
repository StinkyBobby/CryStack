import { useMemo } from "react";
import { AnimatedBackdrop } from "@/components/background/AnimatedBackdrop";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { CountUp } from "@/components/ui/CountUp";
import { useTournamentsData } from "@/hooks/useTournamentsData";
import type { Player } from "@/types";

interface TournamentDetailsPageProps {
  leagueId: number;
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
  return new Date(unixSeconds * 1000).toLocaleString("ru-RU");
}

export function TournamentDetailsPage({
  leagueId,
  currentPath,
  onNavigate,
  player,
  authStatus,
  onLogin,
  onLogout,
}: TournamentDetailsPageProps) {
  const { status, error, matches, leagues, data } = useTournamentsData();

  const leagueMatches = useMemo(() => {
    return matches.filter((m) => m.leagueid === leagueId).sort((a, b) => b.start_time - a.start_time).slice(0, 20);
  }, [matches, leagueId]);

  const leagueMeta = useMemo(() => {
    const fromLeagues = leagues.find((l) => l.leagueid === leagueId);
    if (fromLeagues) {
      return fromLeagues;
    }

    const fromGrouped = [...data.active, ...data.recent].find((l) => l.leagueid === leagueId);
    if (fromGrouped) {
      return {
        leagueid: fromGrouped.leagueid,
        name: fromGrouped.name,
      };
    }

    return null;
  }, [data.active, data.recent, leagues, leagueId]);

  const radiantWins = leagueMatches.filter((m) => m.radiant_win).length;

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
          <button onClick={() => onNavigate("/tournaments")} className="text-sm text-white/70 transition hover:text-white">
            ← Назад к турнирам
          </button>

          <h1 className="mt-3 text-3xl font-semibold">{leagueMeta?.name || `Лига #${leagueId}`}</h1>
          <p className="mt-2 text-white/70">Детализация по данным OpenDota.</p>

          <div className="mt-4 grid gap-3 text-sm text-white/80 sm:grid-cols-3">
            <div className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
              Матчей: <CountUp to={leagueMatches.length} />
            </div>
            <div className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
              Победы Radiant: <CountUp to={radiantWins} />
            </div>
            <div className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
              Последний матч: {formatDate(leagueMatches[0]?.start_time)}
            </div>
          </div>
        </section>

        <section className="hero-enter rounded-3xl border border-red-900/45 bg-black/60 p-5" style={{ animationDelay: "120ms" }}>
          <h2 className="text-xl font-semibold">Последние матчи лиги</h2>

          <div className="mt-4 space-y-2">
            {leagueMatches.length > 0 ? (
              leagueMatches.map((match) => (
                <div key={match.match_id} className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span>
                      {match.radiant_name || "Radiant"} vs {match.dire_name || "Dire"}
                    </span>
                    <span className="text-white/70">{formatDate(match.start_time)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-white/70">
                    <span>Победитель: {match.radiant_win ? match.radiant_name || "Radiant" : match.dire_name || "Dire"}</span>
                    <a
                      href={`https://www.opendota.com/matches/${match.match_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-red-900/45 px-2 py-1 transition hover:border-[#df2531]/70 hover:text-white"
                    >
                      OpenDota ↗
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/70">По этой лиге пока нет матчей в выборке OpenDota.</p>
            )}
          </div>
        </section>

        {status === "loading" ? <p className="text-white/70">Загрузка турнира...</p> : null}
        {status === "error" ? <p className="text-rose-200">Ошибка загрузки турнира: {error}</p> : null}
      </main>
      <Footer />
    </div>
  );
}
