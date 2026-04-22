import { Crosshair, Sigma, Users, UsersRound } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp } from "@/components/ui/CountUp";

interface FeaturesSectionProps {
  playersCount: number;
  openTeams: number;
  avgWinrate: number;
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
    key: "winrate",
    title: "Средний винрейт",
    icon: Sigma,
  },
  {
    key: "role",
    title: "Топ запрашиваемая роль",
    icon: Crosshair,
  },
] as const;

export function FeaturesSection({ playersCount, openTeams, avgWinrate, topWantedRole, status }: FeaturesSectionProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metricCards.map((card, index) => {
        const Icon = card.icon;

        return (
          <div key={card.key} className="hero-enter" style={{ animationDelay: `${220 + index * 100}ms` }}>
            <Card className="group h-full cursor-default border-red-900/40 bg-black/55 transition-all duration-300 hover:-translate-y-1 hover:border-[#df2531]/70 hover:bg-black/75 hover:shadow-[0_22px_70px_rgba(223,37,49,0.22)]">
              <CardHeader>
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 transition-all duration-300 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-[#df2531]/25">
                  <Icon className="h-4 w-4 text-white/90" />
                </div>
                <CardTitle className="line-rise" style={{ animationDelay: `${320 + index * 100}ms` }}>
                  {card.title}
                </CardTitle>
                <CardDescription className="line-rise text-xl font-semibold text-white" style={{ animationDelay: `${390 + index * 100}ms` }}>
                  {status === "loading" ? (
                    "Загрузка..."
                  ) : card.key === "players" ? (
                    <CountUp to={playersCount} />
                  ) : card.key === "teams" ? (
                    <CountUp to={openTeams} />
                  ) : card.key === "winrate" ? (
                    <CountUp to={Math.round(avgWinrate * 10)} scale={10} suffix="%" />
                  ) : (
                    topWantedRole
                  )}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        );
      })}
    </section>
  );
}
