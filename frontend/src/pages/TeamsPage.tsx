import { useEffect, useMemo, useState } from "react";
import { AnimatedBackdrop } from "@/components/background/AnimatedBackdrop";
import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/ui/CountUp";
import { useTeamsOverview } from "@/hooks/useTeamsOverview";
import type { Player, Team } from "@/types";

interface TeamsPageProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  player: Player | null;
  token: string | null;
  authStatus: "idle" | "loading" | "authenticated" | "anonymous" | "error";
  onLogin: () => void;
  onLogout: () => void;
}

const ROLE_OPTIONS = ["carry", "midlane", "offlane", "support", "hard_support"];

type TeamSort = "newest" | "wanted_desc" | "name";

export function TeamsPage({ currentPath, onNavigate, player, token, authStatus, onLogin, onLogout }: TeamsPageProps) {
  const { teams, status, error, createTeam, loadMyTeams } = useTeamsOverview();
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [wantedRoleFilter, setWantedRoleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<TeamSort>("newest");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [wantedRoles, setWantedRoles] = useState<string[]>([]);
  const [createStatus, setCreateStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadMine = async () => {
      if (!token) {
        setMyTeams([]);
        return;
      }
      try {
        const mine = await loadMyTeams(token);
        if (!cancelled) {
          setMyTeams(mine);
        }
      } catch {
        if (!cancelled) {
          setMyTeams([]);
        }
      }
    };

    loadMine();
    return () => {
      cancelled = true;
    };
  }, [token, loadMyTeams]);

  const canCreate = useMemo(() => {
    return !!token && name.trim().length >= 3 && wantedRoles.length > 0;
  }, [token, name, wantedRoles]);

  const filteredTeams = useMemo(() => {
    const bySearch = teams.filter((team) => {
      if (!search.trim()) {
        return true;
      }
      const query = search.toLowerCase();
      return (
        team.name.toLowerCase().includes(query) ||
        (team.description || "").toLowerCase().includes(query) ||
        String(team.leader_steam_id).includes(query)
      );
    });

    const byRole = bySearch.filter((team) => {
      if (wantedRoleFilter === "all") {
        return true;
      }
      return (team.wanted_roles || []).some((role) => role === wantedRoleFilter);
    });

    return [...byRole].sort((a, b) => {
      if (sortBy === "wanted_desc") {
        return (b.wanted_roles?.length || 0) - (a.wanted_roles?.length || 0);
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [teams, search, wantedRoleFilter, sortBy]);

  const toggleWantedRole = (role: string) => {
    setWantedRoles((prev) => (prev.includes(role) ? prev.filter((x) => x !== role) : [...prev, role]));
  };

  const submitCreate = async () => {
    if (!token || !canCreate) {
      return;
    }

    setCreateStatus("loading");
    setCreateError(null);

    try {
      await createTeam(
        {
          name: name.trim(),
          description: description.trim(),
          wanted_roles: wantedRoles,
          current_roles: player?.role ? [player.role] : [],
          is_open: true,
        },
        token,
      );

      const mine = await loadMyTeams(token);
      setMyTeams(mine);

      setCreateStatus("success");
      setName("");
      setDescription("");
      setWantedRoles([]);
    } catch (e) {
      setCreateStatus("error");
      setCreateError(e instanceof Error ? e.message : "failed to create team");
    }
  };

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
          <h1 className="text-4xl font-semibold">Команды</h1>
          <p className="mt-2 text-white/70">Список команд, фильтрация и управление своими составами.</p>
          <div className="mt-4 grid gap-3 text-sm text-white/80 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
              Всего команд: <CountUp to={teams.length} />
            </div>
            <div className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
              Мои команды: <CountUp to={myTeams.length} />
            </div>
            <div className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
              Открытые: <CountUp to={teams.filter((t) => t.is_open).length} />
            </div>
            <div className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
              После фильтра: <CountUp to={filteredTeams.length} />
            </div>
          </div>
        </section>

        <section className="hero-enter rounded-3xl border border-red-900/45 bg-black/60 p-6" style={{ animationDelay: "90ms" }}>
          <h2 className="text-2xl font-semibold">Мои команды</h2>
          <div className="mt-3 space-y-2">
            {myTeams.length > 0 ? (
              myTeams.map((team) => (
                <button
                  key={team.id}
                  className="w-full rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2 text-left text-sm transition hover:border-[#df2531]/70"
                  onClick={() => onNavigate(`/teams/${team.id}`)}
                >
                  {team.name} • wanted: {(team.wanted_roles || []).length} • current: {(team.current_roles || []).length}
                </button>
              ))
            ) : (
              <p className="text-sm text-white/70">У вас пока нет созданных команд.</p>
            )}
          </div>
        </section>

        <section className="hero-enter rounded-3xl border border-red-900/45 bg-black/60 p-6" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold">Создать новую команду</h2>
            {!token ? <span className="text-sm text-white/70">Войдите через Steam, чтобы создать команду</span> : null}
          </div>

          <div className="mt-4 grid gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название команды"
              className="h-11 rounded-xl border border-red-900/45 bg-white/[0.03] px-4 outline-none"
              disabled={!token || createStatus === "loading"}
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание команды"
              className="min-h-[96px] rounded-xl border border-red-900/45 bg-white/[0.03] px-4 py-3 outline-none"
              disabled={!token || createStatus === "loading"}
            />

            <div>
              <p className="text-sm text-white/70">Нужные роли</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => {
                  const selected = wantedRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      disabled={!token || createStatus === "loading"}
                      onClick={() => toggleWantedRole(role)}
                      className={`rounded-full border px-3 py-1 text-xs uppercase transition ${
                        selected
                          ? "border-[#df2531] bg-[#df2531]/20 text-white"
                          : "border-red-900/45 bg-white/[0.03] text-white/80 hover:border-[#df2531]/70"
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={submitCreate} disabled={!canCreate || createStatus === "loading"}>
                {createStatus === "loading" ? "Создание..." : "Создать команду"}
              </Button>
              {createStatus === "success" ? <p className="text-sm text-emerald-300">Команда создана</p> : null}
              {createStatus === "error" ? <p className="text-sm text-rose-200">Ошибка: {createError}</p> : null}
            </div>
          </div>
        </section>

        <section className="hero-enter rounded-3xl border border-red-900/45 bg-black/60 p-6" style={{ animationDelay: "120ms" }}>
          <h2 className="text-2xl font-semibold">Поиск и фильтры</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию, описанию, SteamID лидера"
              className="h-11 rounded-xl border border-red-900/45 bg-white/[0.03] px-4 outline-none sm:col-span-2"
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as TeamSort)}
              className="h-11 rounded-xl border border-red-900/45 bg-white/[0.03] px-4 outline-none"
            >
              <option value="newest" className="bg-black">Сортировка: новые</option>
              <option value="wanted_desc" className="bg-black">Сортировка: по нужным ролям</option>
              <option value="name" className="bg-black">Сортировка: по имени</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setWantedRoleFilter("all")}
              className={`rounded-full border px-3 py-1 text-xs transition ${wantedRoleFilter === "all" ? "border-[#df2531] bg-[#df2531]/20" : "border-red-900/45 bg-white/[0.03]"}`}
            >
              Любая роль
            </button>
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role}
                onClick={() => setWantedRoleFilter(role)}
                className={`rounded-full border px-3 py-1 text-xs uppercase transition ${wantedRoleFilter === role ? "border-[#df2531] bg-[#df2531]/20" : "border-red-900/45 bg-white/[0.03]"}`}
              >
                {role}
              </button>
            ))}
          </div>
        </section>

        <section className="hero-enter space-y-3" style={{ animationDelay: "140ms" }}>
          {filteredTeams.map((team) => (
            <button
              key={team.id}
              className="w-full rounded-2xl border border-red-900/45 bg-black/60 p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-[#df2531]/70"
              onClick={() => onNavigate(`/teams/${team.id}`)}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xl font-semibold">{team.name}</p>
                  <p className="text-sm text-white/70">Лидер: {team.leader_steam_id}</p>
                  <p className="text-sm text-white/60">{team.description || "Без описания"}</p>
                </div>
                <div className="text-right text-sm text-white/80">
                  <p>
                    Нужные роли: <CountUp to={(team.wanted_roles || []).length} />
                  </p>
                  <p>
                    Текущие роли: <CountUp to={(team.current_roles || []).length} />
                  </p>
                </div>
              </div>
            </button>
          ))}

          {status === "loading" ? <p className="text-white/70">Загрузка команд...</p> : null}
          {status === "error" ? <p className="text-rose-200">Ошибка: {error}</p> : null}
          {status === "success" && filteredTeams.length === 0 ? <p className="text-white/70">По фильтрам команд не найдено.</p> : null}
        </section>
      </main>
    </div>
  );
}
