import { Crosshair, Sigma, Users, UsersRound } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FeaturesSectionProps {
  playersCount: number;
  openTeams: number;
  avgMmr: number;
  topWantedRole: string;
  status: "idle" | "loading" | "success" | "error";
}

const metricCards = [
  {
    key: "players",
    title: "Игроков в базе",
    icon: Users,
  },
  {
    key: "teams",
    title: "Открытых команд",
    icon: UsersRound,
  },
  {
    key: "mmr",
    title: "Средний MMR",
    icon: Sigma,
  },
  {
    key: "role",
    title: "Топ запрашиваемая роль",
    icon: Crosshair,
  },
] as const;

export function FeaturesSection({ playersCount, openTeams, avgMmr, topWantedRole, status }: FeaturesSectionProps) {
  const values = {
    players: playersCount > 0 ? String(playersCount) : "0",
    teams: openTeams > 0 ? String(openTeams) : "0",
    mmr: avgMmr > 0 ? String(avgMmr) : "0",
    role: topWantedRole,
  };

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metricCards.map((card, index) => {
        const Icon = card.icon;

        return (
          <div key={card.key} className="hero-enter" style={{ animationDelay: `${220 + index * 100}ms` }}>
            <Card className="group h-full cursor-default border-white/15 transition-all duration-300 hover:-translate-y-1 hover:border-white/35 hover:bg-slate-900/80 hover:shadow-[0_22px_70px_rgba(56,189,248,0.18)]">
              <CardHeader>
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 transition-all duration-300 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-white/20">
                  <Icon className="h-4 w-4 text-white/90" />
                </div>
                <CardTitle className="line-rise" style={{ animationDelay: `${320 + index * 100}ms` }}>
                  {card.title}
                </CardTitle>
                <CardDescription className="line-rise text-xl font-semibold text-white" style={{ animationDelay: `${390 + index * 100}ms` }}>
                  {status === "loading" ? "Загрузка..." : values[card.key]}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        );
      })}
    </section>
  );
}
