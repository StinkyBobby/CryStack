import { useMemo, useState } from "react";
import { AnimatedBackdrop } from "@/components/background/AnimatedBackdrop";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
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

type TabKey = "active" | "upcoming" | "recent";

function formatDate(unixSeconds: number | undefined): string {
  if (!unixSeconds || unixSeconds <= 0) {
    return "n/a";
  }
  return new Date(unixSeconds * 1000).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(unixSeconds: number | undefined): string {
  if (!unixSeconds || unixSeconds <= 0) {
    return "n/a";
  }
  return new Date(unixSeconds * 1000).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function timeAgo(unixSeconds: number | undefined): string {
  if (!unixSeconds || unixSeconds <= 0) return "";
  const diff = Date.now() / 1000 - unixSeconds;
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} дн назад`;
}

function timeUntil(unixSeconds: number | undefined): string {
  if (!unixSeconds || unixSeconds <= 0) return "";
  const diff = unixSeconds - Date.now() / 1000;
  if (diff < 0) return "скоро";
  if (diff < 3600) return `через ${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `через ${Math.floor(diff / 3600)} ч`;
  return `через ${Math.floor(diff / 86400)} дн`;
}

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "active", label: "Активные", icon: "" },
  { key: "upcoming", label: "Предстоящие", icon: "" },
  { key: "recent", label: "Завершённые", icon: "" },
];

export function TournamentsPage({ currentPath, onNavigate, player, authStatus, onLogin, onLogout }: TournamentsPageProps) {
  const { status, error, data } = useTournamentsData();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("active");

  const active = useMemo(() => {
    return data.active.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  }, [data.active, query]);

  const recent = useMemo(() => {
    return data.recent.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  }, [data.recent, query]);

  const upcoming = useMemo(() => {
    return data.upcoming.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  }, [data.upcoming, query]);

  const tabCounts: Record<TabKey, number> = {
    active: data.active.length,
    upcoming: data.upcoming.length,
    recent: data.recent.length,
  };

  const currentList = activeTab === "active" ? active : activeTab === "upcoming" ? upcoming : recent;
  const currentEmptyText =
    activeTab === "active"
      ? "Нет активных турниров по фильтру."
      : activeTab === "upcoming"
        ? "Нет предстоящих турниров по фильтру."
        : "Нет завершённых турниров по фильтру.";

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

        {/* Header */}
        <section className="hero-enter rounded-3xl border border-red-900/45 bg-black/60 p-6">
          <h1 className="text-4xl font-semibold">Турниры</h1>
          <p className="mt-2 text-white/70">Про-турниры Dota 2: активные, предстоящие и завершённые.</p>

          {/* Search */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию турнира..."
              className="h-12 flex-1 rounded-full border border-red-900/45 bg-white/[0.03] px-5 outline-none placeholder:text-white/30 focus:border-[#df2531]/60 transition-colors"
            />
          </div>
        </section>

        {/* Tabs */}
        <section className="hero-enter" style={{ animationDelay: "60ms" }}>
          <div className="flex gap-2 rounded-2xl border border-red-900/30 bg-black/40 p-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-[#df2531]/20 text-white border border-[#df2531]/40 shadow-lg shadow-[#df2531]/10"
                    : "text-white/50 hover:text-white/80 hover:bg-white/[0.03] border border-transparent"
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
                <span
                  className={`ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                    activeTab === tab.key ? "bg-[#df2531]/40 text-white" : "bg-white/[0.06] text-white/40"
                  }`}
                >
                  {tabCounts[tab.key]}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Content */}
        <section className="hero-enter" style={{ animationDelay: "120ms" }}>
          {status === "loading" ? (
            <div className="flex items-center justify-center rounded-3xl border border-red-900/45 bg-black/60 p-16">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500/30 border-t-red-500" />
                <p className="text-sm text-white/50">Загрузка турниров...</p>
              </div>
            </div>
          ) : currentList.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {currentList.map((league) => {
                const latestMatchTime =
                  league.matches.length > 0 ? Math.max(...league.matches.map((m) => m.start_time)) : undefined;

                return (
                  <div
                    key={league.leagueid}
                    className="group rounded-2xl border border-red-900/35 bg-black/60 p-4 transition-all duration-200 hover:border-[#df2531]/50 hover:bg-black/70 hover:shadow-lg hover:shadow-[#df2531]/5"
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold leading-tight text-white/90 group-hover:text-white transition-colors line-clamp-2">
                        {league.name}
                      </h3>
                      <button
                        onClick={() => onNavigate(`/tournaments/${league.leagueid}`)}
                        className="shrink-0 rounded-full border border-red-900/40 px-2.5 py-1 text-xs text-white/50 transition-all hover:border-[#df2531]/60 hover:text-white hover:bg-[#df2531]/10"
                      >
                        →
                      </button>
                    </div>

                    {/* Info */}
                    <div className="mt-3 space-y-1.5">
                      {activeTab === "active" && league.matches.length > 0 && (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/40">Матчей</span>
                            <span className="font-medium text-white/80">
                              <CountUp to={league.matches.length} />
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/40">Последний</span>
                            <span className="text-white/60">{formatDateShort(latestMatchTime)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-emerald-400/80">{timeAgo(latestMatchTime)}</span>
                          </div>
                        </>
                      )}

                      {activeTab === "upcoming" && (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/40">Старт</span>
                            <span className="text-white/60">{formatDate((league as any).start_timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-amber-400/80">{timeUntil((league as any).start_timestamp)}</span>
                          </div>
                        </>
                      )}

                      {activeTab === "recent" && (
                        <>
                          {league.matches.length > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/40">Матчей</span>
                              <span className="font-medium text-white/80">
                                <CountUp to={league.matches.length} />
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/40">Последний матч</span>
                            <span className="text-white/60">
                              {league.matches.length > 0 ? formatDateShort(latestMatchTime) : "n/a"}
                            </span>
                          </div>
                          {league.matches.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/20" />
                              <span className="text-white/40">{timeAgo(latestMatchTime)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-3xl border border-red-900/30 bg-black/40 p-16">
              <p className="text-sm text-white/40">{currentEmptyText}</p>
            </div>
          )}
        </section>

        {status === "error" ? <p className="text-rose-200 text-sm">Ошибка загрузки турниров: {error}</p> : null}
      </main>
      <Footer />
    </div>
  );
}
