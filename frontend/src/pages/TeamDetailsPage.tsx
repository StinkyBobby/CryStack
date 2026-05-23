import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/api/client";
import { AnimatedBackdrop } from "@/components/background/AnimatedBackdrop";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/ui/CountUp";
import type { Player, Team } from "@/types";

interface TeamDetailsPageProps {
  teamId: number;
  currentPath: string;
  onNavigate: (path: string) => void;
  player: Player | null;
  token: string | null;
  authStatus: "idle" | "loading" | "authenticated" | "anonymous" | "error";
  onLogin: () => void;
  onLogout: () => void;
}

interface MatchCandidate {
  player: Player;
  score: number;
  role_fit: boolean;
  mmr_diff: number;
}

type Status = "idle" | "loading" | "success" | "error";

const ROLE_OPTIONS = ["carry", "midlane", "offlane", "support", "hard_support"];

export function TeamDetailsPage({ teamId, currentPath, onNavigate, player, token, authStatus, onLogin, onLogout }: TeamDetailsPageProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [leader, setLeader] = useState<Player | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [members, setMembers] = useState<Player[]>([]);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editWantedRoles, setEditWantedRoles] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteSteamId, setInviteSteamId] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [autoInviteStatus, setAutoInviteStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [autoInviteError, setAutoInviteError] = useState<string | null>(null);
  const [autoInviteSummary, setAutoInviteSummary] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      setError(null);

      try {
        const [teamPayload, playersPayload, membersPayload] = await Promise.all([
          apiRequest<Team>(`/api/teams/${teamId}`),
          apiRequest<Player[]>("/api/players"),
          apiRequest<Player[]>(`/api/teams/${teamId}/members`),
        ]);

        if (cancelled) {
          return;
        }

        const normalizedPlayers = (Array.isArray(playersPayload) ? playersPayload : []).map((p) => ({
          ...p,
          steam_id: String(p.steam_id),
          heroes: Array.isArray(p.heroes) ? p.heroes : [],
        }));

        const normalizedMembers = (Array.isArray(membersPayload) ? membersPayload : []).map((p) => ({
          ...p,
          steam_id: String(p.steam_id),
          heroes: Array.isArray(p.heroes) ? p.heroes : [],
        }));

        const normalizedTeam: Team = {
          ...teamPayload,
          leader_steam_id: String(teamPayload.leader_steam_id),
          current_roles: Array.isArray(teamPayload.current_roles) ? teamPayload.current_roles : [],
          wanted_roles: Array.isArray(teamPayload.wanted_roles) ? teamPayload.wanted_roles : [],
        };

        const sortedMembers = [...normalizedMembers].sort((a, b) => {
          if (a.steam_id === normalizedTeam.leader_steam_id) {
            return -1;
          }
          if (b.steam_id === normalizedTeam.leader_steam_id) {
            return 1;
          }
          return a.name.localeCompare(b.name);
        });

        setTeam(normalizedTeam);
        setEditName(normalizedTeam.name || "");
        setEditDescription(normalizedTeam.description || "");
        setEditWantedRoles([...(normalizedTeam.wanted_roles || [])]);

        setAllPlayers(normalizedPlayers);
        setLeader(normalizedPlayers.find((p) => p.steam_id === String(normalizedTeam.leader_steam_id)) ?? null);
        setMembers(sortedMembers);
        setCandidates([]);
        setAutoInviteStatus("idle");
        setAutoInviteError(null);
        setAutoInviteSummary(null);
        setStatus("success");
      } catch (e) {
        if (cancelled) {
          return;
        }
        setStatus("error");
        setError(e instanceof Error ? e.message : "не удалось загрузить команду");
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const isOwner = !!player && !!team && String(team.leader_steam_id) === String(player.steam_id);

  const teamRoles = useMemo(() => {
    return {
      current: Array.isArray(team?.current_roles) ? team.current_roles : [],
      wanted: Array.isArray(team?.wanted_roles) ? team.wanted_roles : [],
    };
  }, [team]);

  const inviteCandidates = useMemo(() => {
    const query = inviteQuery.trim().toLowerCase();
    return allPlayers
      .filter((p) => p.steam_id !== team?.leader_steam_id)
      .filter((p) => !query || p.name.toLowerCase().includes(query) || p.steam_id.includes(query))
      .slice(0, 20);
  }, [allPlayers, inviteQuery, team]);

  const toggleEditWantedRole = (role: string) => {
    setEditWantedRoles((prev) => (prev.includes(role) ? prev.filter((x) => x !== role) : [...prev, role]));
  };

  const saveTeam = async () => {
    if (!token || !team || !isOwner) {
      return;
    }

    setSaveStatus("loading");
    setSaveError(null);

    try {
      const updated = await apiRequest<Team>(`/api/teams/${team.id}`, {
        method: "PUT",
        token,
        body: {
          name: editName.trim(),
          description: editDescription.trim(),
          current_roles: team.current_roles,
          wanted_roles: editWantedRoles,
          is_open: editWantedRoles.length > 0,
        },
      });

      setTeam({
        ...team,
        ...updated,
        id: updated.id || team.id,
        leader_steam_id: String(updated.leader_steam_id),
        current_roles: Array.isArray(updated.current_roles) ? updated.current_roles : [],
        wanted_roles: Array.isArray(updated.wanted_roles) ? updated.wanted_roles : [],
      });
      setSaveStatus("success");
    } catch (e) {
      setSaveStatus("error");
      setSaveError(e instanceof Error ? e.message : "не удалось сохранить команду");
    }
  };

  const deleteTeam = async () => {
    if (!token || !team || !isOwner) {
      return;
    }

    const confirmed = window.confirm("Удалить команду? Это действие необратимо.");
    if (!confirmed) {
      return;
    }

    try {
      await apiRequest<{ message: string }>(`/api/teams/${team.id}`, { method: "DELETE", token });
      onNavigate("/teams");
    } catch (e) {
      setSaveStatus("error");
      setSaveError(e instanceof Error ? e.message : "не удалось удалить команду");
    }
  };

  const sendManualInvite = async () => {
    if (!token || !team || !isOwner || !inviteSteamId) {
      return;
    }

    setInviteStatus("loading");
    setInviteError(null);

    try {
      await apiRequest(`/api/invites`, {
        method: "POST",
        token,
        body: {
          team_id: team.id,
          steam_id: inviteSteamId,
        },
      });
      setInviteStatus("success");
      setInviteSteamId("");
      setInviteQuery("");
    } catch (e) {
      setInviteStatus("error");
      setInviteError(e instanceof Error ? e.message : "не удалось отправить приглашение");
    }
  };

  const runAutoInvite = async () => {
    if (!token || !team || !isOwner) {
      return;
    }

    const openSlots = teamRoles.wanted.length;
    if (openSlots <= 0) {
      setAutoInviteStatus("idle");
      setAutoInviteError(null);
      setAutoInviteSummary("У команды нет открытых ролей для автоподбора.");
      setCandidates([]);
      return;
    }

    setAutoInviteStatus("loading");
    setAutoInviteError(null);
    setAutoInviteSummary(null);

    try {
      const payload = await apiRequest<MatchCandidate[]>(`/api/teams/${team.id}/matchmaking`, { method: "GET" });
      const normalizedCandidates = (Array.isArray(payload) ? payload : []).map((candidate) => ({
        ...candidate,
        player: {
          ...candidate.player,
          steam_id: String(candidate.player.steam_id),
          heroes: Array.isArray(candidate.player.heroes) ? candidate.player.heroes : [],
        },
      }));

      const seen = new Set<string>();
      const uniqueCandidates = normalizedCandidates.filter((candidate) => {
        const steamId = candidate.player.steam_id;
        if (!steamId || seen.has(steamId)) {
          return false;
        }
        seen.add(steamId);
        return true;
      });

      const selected = uniqueCandidates.slice(0, openSlots);
      const inviteResults = await Promise.all(
        selected.map(async (candidate) => {
          try {
            await apiRequest("/api/invites", {
              method: "POST",
              token,
              body: {
                team_id: team.id,
                steam_id: candidate.player.steam_id,
              },
            });
            return true;
          } catch {
            return false;
          }
        }),
      );

      const invitesSent = inviteResults.filter(Boolean).length;
      const invitesFailed = inviteResults.length - invitesSent;

      setCandidates(uniqueCandidates);
      setAutoInviteStatus("success");
      setAutoInviteSummary(
        `Выбрано кандидатов: ${selected.length}/${openSlots}. Отправлено инвайтов: ${invitesSent}${
          invitesFailed > 0 ? `, ошибок: ${invitesFailed}` : ""
        }.`,
      );
    } catch (e) {
      setAutoInviteStatus("error");
      setAutoInviteError(e instanceof Error ? e.message : "не удалось запустить автоподбор");
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
          <button onClick={() => onNavigate("/teams")} className="text-sm text-white/70 transition hover:text-white">
            ← Назад к командам
          </button>

          {team ? (
            <>
              <h1 className="mt-3 text-4xl font-semibold">{team.name}</h1>
              <p className="mt-2 text-white/70">{team.description || "Описание команды не заполнено."}</p>
              <div className="mt-4 grid gap-3 text-sm text-white/80 sm:grid-cols-3">
                <div className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
                  Лидер: {leader?.name || team.leader_steam_id}
                </div>
                <div className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
                  Текущих ролей: <CountUp to={teamRoles.current.length} />
                </div>
                <div className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
                  Нужных ролей: <CountUp to={teamRoles.wanted.length} />
                </div>
              </div>
            </>
          ) : null}

          {status === "loading" ? <p className="mt-4 text-white/70">Загрузка команды...</p> : null}
          {status === "error" ? <p className="mt-4 text-rose-200">Ошибка: {error}</p> : null}
        </section>

        {team ? (
          <section className={`hero-enter grid gap-4 ${isOwner ? "lg:grid-cols-2" : ""}`} style={{ animationDelay: "120ms" }}>
            <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5">
              <h2 className="text-xl font-semibold">Состав по ролям</h2>
              <div className="mt-4">
                <p className="text-sm text-white/70">Текущие</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {teamRoles.current.length > 0 ? (
                    teamRoles.current.map((role, index) => (
                      <span key={`${role}-${index}`} className="rounded-full border border-red-900/45 bg-white/[0.03] px-3 py-1 text-xs uppercase">
                        {role}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-white/70">Нет данных по текущему составу.</p>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm text-white/70">Нужны в состав</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {teamRoles.wanted.length > 0 ? (
                    teamRoles.wanted.map((role, index) => (
                      <span key={`${role}-${index}`} className="rounded-full border border-red-900/45 bg-[#df2531]/20 px-3 py-1 text-xs uppercase">
                        {role}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-white/70">Команда закрыта, свободных ролей нет.</p>
                  )}
                </div>
              </div>
            </div>

            {isOwner ? (
              <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5">
                <h2 className="text-xl font-semibold">Автоподбор кандидатов</h2>
                <p className="mt-1 text-sm text-white/70">Подбирает лучших игроков по ролям и отправляет инвайты строго по числу открытых ролей.</p>

                <div className="mt-3">
                  <Button onClick={runAutoInvite} disabled={!token || autoInviteStatus === "loading" || teamRoles.wanted.length === 0}>
                    {autoInviteStatus === "loading" ? "Подбор..." : "Запустить автоподбор и автоинвайт"}
                  </Button>
                  {teamRoles.wanted.length === 0 ? <p className="mt-2 text-xs text-white/60">У команды нет открытых ролей для подбора.</p> : null}
                  {autoInviteStatus === "success" && autoInviteSummary ? <p className="mt-2 text-sm text-emerald-300">{autoInviteSummary}</p> : null}
                  {autoInviteStatus === "error" ? <p className="mt-2 text-sm text-rose-200">Ошибка: {autoInviteError}</p> : null}
                </div>

                <div className="mt-4 space-y-2">
                  {candidates.length > 0 ? (
                    candidates.map((candidate) => (
                      <div key={candidate.player.steam_id} className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <img src={candidate.player.avatar} alt={candidate.player.name} className="h-8 w-8 rounded-full object-cover" />
                            <span>{candidate.player.name}</span>
                          </div>
                          <span>
                            score: <CountUp to={Math.round(candidate.score * 100)} suffix="%" />
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-white/70">
                          роль: {candidate.player.role || "неизвестно"} | разница MMR: <CountUp to={candidate.mmr_diff || 0} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-white/70">Нажмите кнопку, чтобы получить кандидатов и отправить инвайты.</p>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {team ? (
          <section className="hero-enter rounded-3xl border border-red-900/45 bg-black/60 p-5" style={{ animationDelay: "160ms" }}>
            <h2 className="text-xl font-semibold">Участники команды</h2>
            <p className="mt-1 text-sm text-white/70">Лидер и игроки, принявшие приглашение.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {members.length > 0 ? (
                members.map((member) => (
                  <div key={member.steam_id} className="rounded-xl border border-red-900/35 bg-white/[0.03] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <img src={member.avatar} alt={member.name} className="h-9 w-9 rounded-full object-cover" />
                      <div>
                        <p className="text-sm font-medium text-white">{member.name}</p>
                        <p className="text-xs text-white/70">{member.role || "роль неизвестна"}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-white/70">
                      {String(member.steam_id) === String(team.leader_steam_id) ? "Лидер команды" : "Участник"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/70">Пока нет подтвержденных участников.</p>
              )}
            </div>
          </section>
        ) : null}

        {team && isOwner ? (
          <section className="hero-enter grid gap-4 lg:grid-cols-2" style={{ animationDelay: "210ms" }}>
            <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5">
              <h2 className="text-xl font-semibold">Управление командой</h2>
              <div className="mt-3 grid gap-3">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Название"
                  className="h-11 rounded-xl border border-red-900/45 bg-white/[0.03] px-4 outline-none"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Описание"
                  className="min-h-[90px] rounded-xl border border-red-900/45 bg-white/[0.03] px-4 py-3 outline-none"
                />

                <div>
                  <p className="text-sm text-white/70">Нужные роли</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleEditWantedRole(role)}
                        className={`rounded-full border px-3 py-1 text-xs uppercase transition ${
                          editWantedRoles.includes(role)
                            ? "border-[#df2531] bg-[#df2531]/20 text-white"
                            : "border-red-900/45 bg-white/[0.03] text-white/80"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={saveTeam} disabled={!token || saveStatus === "loading"}>Сохранить</Button>
                  <Button variant="ghost" onClick={deleteTeam} disabled={!token}>Удалить команду</Button>
                </div>
                {saveStatus === "success" ? <p className="text-sm text-emerald-300">Изменения сохранены</p> : null}
                {saveStatus === "error" ? <p className="text-sm text-rose-200">Ошибка: {saveError}</p> : null}
              </div>
            </div>

            <div className="rounded-3xl border border-red-900/45 bg-black/60 p-5">
              <h2 className="text-xl font-semibold">Ручной инвайт игрока</h2>
              <p className="mt-1 text-sm text-white/70">Можно пригласить любого зарегистрированного игрока.</p>

              <input
                value={inviteQuery}
                onChange={(e) => setInviteQuery(e.target.value)}
                placeholder="Поиск по нику или SteamID"
                className="mt-3 h-11 w-full rounded-xl border border-red-900/45 bg-white/[0.03] px-4 outline-none"
              />

              <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
                {inviteCandidates.map((candidate) => (
                  <button
                    key={candidate.steam_id}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                      inviteSteamId === candidate.steam_id ? "border-[#df2531] bg-[#df2531]/20" : "border-red-900/35 bg-white/[0.03]"
                    }`}
                    onClick={() => setInviteSteamId(candidate.steam_id)}
                  >
                    {candidate.name} • {candidate.role || "неизвестно"} • {candidate.steam_id}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <Button onClick={sendManualInvite} disabled={!inviteSteamId || inviteStatus === "loading"}>
                  {inviteStatus === "loading" ? "Отправка..." : "Отправить инвайт"}
                </Button>
              </div>
              {inviteStatus === "success" ? <p className="mt-2 text-sm text-emerald-300">Инвайт отправлен</p> : null}
              {inviteStatus === "error" ? <p className="mt-2 text-sm text-rose-200">Ошибка: {inviteError}</p> : null}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}

