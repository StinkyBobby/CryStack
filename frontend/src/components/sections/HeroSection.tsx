import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedText } from "@/components/ui/AnimatedText";
import type { Player } from "@/types";

interface HeroSectionProps {
  playersCount: number;
  openTeams: number;
  player: Player | null;
  authStatus: "idle" | "loading" | "authenticated" | "anonymous" | "error";
  authError: string | null;
  onLogin: () => void;
}

export function HeroSection({ playersCount, openTeams, player, authStatus, authError, onLogin }: HeroSectionProps) {
  const isAuthenticated = authStatus === "authenticated" && player;

  return (
    <section className="hero-enter relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-500/85 via-fuchsia-500/80 to-sky-500/75 px-6 py-12 sm:px-10 sm:py-16">
      <div className="absolute -left-16 -top-14 h-52 w-52 animate-pulse rounded-full bg-white/20 blur-3xl" />
      <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-indigo-900/40 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.35),transparent_55%)]" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <p className="line-rise mb-4 rounded-full border border-white/40 bg-white/10 px-4 py-1 text-[11px] font-medium uppercase tracking-[0.20em] text-white/90 sm:text-xs">
          Dota 2 Team Intelligence
        </p>

        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          <AnimatedText text="CryStack" className="glow-title" delayMs={110} />
        </h1>

        <p className="line-rise mt-4 max-w-xl text-balance text-sm text-white/90 sm:text-base" style={{ animationDelay: "380ms" }}>
          В базе сейчас {playersCount} игроков и {openTeams} открытых команд. Собирай состав на основе реальной статистики.
        </p>

        {!isAuthenticated ? (
          <div className="line-rise mt-8 flex w-full max-w-xl flex-col items-center gap-3 sm:flex-row" style={{ animationDelay: "520ms" }}>
            <Button size="lg" className="w-full sm:w-auto" onClick={onLogin} disabled={authStatus === "loading"}>
              {authStatus === "loading" ? "Вход..." : "Войти через Steam"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="line-rise mt-8 flex items-center gap-3 rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm text-white" style={{ animationDelay: "520ms" }}>
            <img src={player.avatar} alt={player.name} className="h-7 w-7 rounded-full border border-white/20 object-cover" />
            <span>Вы вошли как {player.name} ({player.steam_id})</span>
          </div>
        )}

        {authError ? <p className="line-rise mt-3 text-sm text-rose-100/95">Ошибка входа: {authError}</p> : null}
      </div>
    </section>
  );
}
