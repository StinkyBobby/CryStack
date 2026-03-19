import { AnimatedBackdrop } from "@/components/background/AnimatedBackdrop";
import { TopNav } from "@/components/layout/TopNav";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { StatsStrip } from "@/components/sections/StatsStrip";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useDashboardData";

export function LandingPage() {
  const { status, error, metrics } = useDashboardData();
  const { player, status: authStatus, error: authError, login, logout } = useAuth();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#020617] text-white">
      <AnimatedBackdrop />

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-14 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <TopNav player={player} authStatus={authStatus} onLogin={login} onLogout={logout} />
        <HeroSection
          playersCount={metrics.playersCount}
          openTeams={metrics.openTeams}
          player={player}
          authStatus={authStatus}
          authError={authError}
          onLogin={login}
        />
        <FeaturesSection
          playersCount={metrics.playersCount}
          openTeams={metrics.openTeams}
          avgMmr={metrics.avgMmr}
          topWantedRole={metrics.topWantedRole}
          status={status}
        />
        <StatsStrip playersCount={metrics.playersCount} openTeams={metrics.openTeams} status={status} error={error} />
      </main>
    </div>
  );
}
