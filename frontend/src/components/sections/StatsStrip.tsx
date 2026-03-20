import { CountUp } from "@/components/ui/CountUp";

interface StatsStripProps {
  playersCount: number;
  openTeams: number;
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
}

export function StatsStrip({ playersCount, openTeams, status, error }: StatsStripProps) {
  return (
    <section
      className="hero-enter grid gap-3 rounded-3xl border border-red-900/45 bg-black/60 p-4 backdrop-blur-md sm:grid-cols-3 sm:p-6"
      style={{ animationDelay: "380ms" }}
    >
      <div className="rounded-2xl border border-red-900/45 bg-white/[0.03] p-4">
        <div className="line-rise text-2xl font-semibold tracking-tight" style={{ animationDelay: "500ms" }}>
          <CountUp to={playersCount} />
        </div>
        <p className="line-rise mt-1 text-sm text-white/70" style={{ animationDelay: "560ms" }}>
          зарегистрированных игроков
        </p>
      </div>

      <div className="rounded-2xl border border-red-900/45 bg-white/[0.03] p-4">
        <div className="line-rise text-2xl font-semibold tracking-tight" style={{ animationDelay: "620ms" }}>
          <CountUp to={openTeams} />
        </div>
        <p className="line-rise mt-1 text-sm text-white/70" style={{ animationDelay: "680ms" }}>
          команд сейчас открыто
        </p>
      </div>

      <div className="rounded-2xl border border-red-900/45 bg-white/[0.03] p-4">
        <div className="line-rise text-2xl font-semibold tracking-tight" style={{ animationDelay: "740ms" }}>
          {status === "error" ? "Ошибка" : status === "loading" ? "Sync" : "Live"}
        </div>
        <p className="line-rise mt-1 text-sm text-white/70" style={{ animationDelay: "800ms" }}>
          {status === "error" ? error || "не удалось загрузить данные" : "данные подтягиваются с backend API"}
        </p>
      </div>
    </section>
  );
}
