import { useMemo, useState } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { AnimatedBackdrop } from "@/components/background/AnimatedBackdrop";
import { TopNav } from "@/components/layout/TopNav";
import { usePlayersList } from "@/hooks/usePlayersList";
import type { Player } from "@/types";

interface PlayersPageProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  player: Player | null;
  authStatus: "idle" | "loading" | "authenticated" | "anonymous" | "error";
  onLogin: () => void;
  onLogout: () => void;
}

export function PlayersPage({ currentPath, onNavigate, player, authStatus, onLogin, onLogout }: PlayersPageProps) {
  const { topPlayers, status, error } = usePlayersList();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>("all");

  const filtered = useMemo(() => {
    return topPlayers.filter((p) => {
      const bySearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.steam_id.includes(search) ||
        (p.style || "").toLowerCase().includes(search.toLowerCase());
      const byRole = role === "all" || p.role.toLowerCase() === role;
      return bySearch && byRole;
    });
  }, [topPlayers, search, role]);

  const roles = ["all", "carry", "midlane", "offlane", "support"];

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
          <h1 className="text-4xl font-semibold">Поиск игроков</h1>
          <p className="mt-2 text-white/70">Поиск по реальным данным профилей игроков.</p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ник, SteamID, стиль"
              className="h-12 flex-1 rounded-full border border-red-900/45 bg-white/[0.03] px-5 outline-none"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-12 rounded-full border border-red-900/45 bg-white/[0.03] px-5 outline-none"
            >
              {roles.map((r) => (
                <option key={r} value={r} className="bg-black">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 text-sm text-white/70">
            Найдено игроков: <CountUp to={filtered.length} />
          </div>
        </section>

        <section className="hero-enter space-y-3" style={{ animationDelay: "120ms" }}>
          {filtered.slice(0, 40).map((p) => (
            <div
              key={p.steam_id}
              className="rounded-2xl border border-red-900/45 bg-black/60 p-4 transition duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-[#df2531]/70"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img src={p.avatar} alt={p.name} className="h-11 w-11 rounded-full border border-red-900/45 object-cover" />
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-white/70">
                      {p.role || "unknown"} • {p.style || "n/a"}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm text-white/80">
                  <p>
                    MMR: <CountUp to={p.mmr || 0} />
                  </p>
                  <p>
                    Winrate: <CountUp to={Math.round((p.winrate || 0) * 10)} scale={10} suffix="%" />
                  </p>
                  <button
                    onClick={() => onNavigate(`/players/${p.steam_id}`)}
                    className="mt-2 rounded-full border border-red-900/45 px-3 py-1 text-xs transition hover:border-[#df2531]/70"
                  >
                    Профиль
                  </button>
                </div>
              </div>
            </div>
          ))}

          {status === "loading" ? <p className="text-white/70">Загрузка игроков...</p> : null}
          {status === "error" ? <p className="text-rose-200">Ошибка: {error}</p> : null}
          {status === "success" && filtered.length === 0 ? <p className="text-white/70">По фильтрам игроков не найдено.</p> : null}
        </section>
      </main>
    </div>
  );
}

