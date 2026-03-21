import { useEffect, useMemo, useState } from "react";
import { LandingPage } from "./pages/LandingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { TeamsPage } from "./pages/TeamsPage";
import { TeamDetailsPage } from "./pages/TeamDetailsPage";
import { PlayersPage } from "./pages/PlayersPage";
import { PlayerDetailsPage } from "./pages/PlayerDetailsPage";
import { TournamentsPage } from "./pages/TournamentsPage";
import { TournamentDetailsPage } from "./pages/TournamentDetailsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { useAuth } from "./hooks/useAuth";

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const auth = useAuth();

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (nextPath: string) => {
    if (nextPath === path) {
      return;
    }

    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  };

  const page = useMemo(() => {
    if (path === "/profile") {
      return (
        <ProfilePage
          currentPath={path}
          onNavigate={navigate}
          player={auth.player}
          token={auth.token}
          authStatus={auth.status}
          onLogin={auth.login}
          onLogout={auth.logout}
        />
      );
    }

    if (path === "/players") {
      return (
        <PlayersPage
          currentPath={path}
          onNavigate={navigate}
          player={auth.player}
          authStatus={auth.status}
          onLogin={auth.login}
          onLogout={auth.logout}
        />
      );
    }

    const playerMatch = path.match(/^\/players\/(\d+)$/);
    if (playerMatch) {
      return (
        <PlayerDetailsPage
          steamId={playerMatch[1]}
          currentPath={path}
          onNavigate={navigate}
          player={auth.player}
          token={auth.token}
          authStatus={auth.status}
          onLogin={auth.login}
          onLogout={auth.logout}
        />
      );
    }

    if (path === "/teams") {
      return (
        <TeamsPage
          currentPath={path}
          onNavigate={navigate}
          player={auth.player}
          token={auth.token}
          authStatus={auth.status}
          onLogin={auth.login}
          onLogout={auth.logout}
        />
      );
    }

    const teamMatch = path.match(/^\/teams\/(\d+)$/);
    if (teamMatch) {
      return (
        <TeamDetailsPage
          teamId={Number(teamMatch[1])}
          currentPath={path}
          onNavigate={navigate}
          player={auth.player}
          token={auth.token}
          authStatus={auth.status}
          onLogin={auth.login}
          onLogout={auth.logout}
        />
      );
    }

    if (path === "/tournaments") {
      return (
        <TournamentsPage
          currentPath={path}
          onNavigate={navigate}
          player={auth.player}
          authStatus={auth.status}
          onLogin={auth.login}
          onLogout={auth.logout}
        />
      );
    }

    const tournamentMatch = path.match(/^\/tournaments\/(\d+)$/);
    if (tournamentMatch) {
      return (
        <TournamentDetailsPage
          leagueId={Number(tournamentMatch[1])}
          currentPath={path}
          onNavigate={navigate}
          player={auth.player}
          authStatus={auth.status}
          onLogin={auth.login}
          onLogout={auth.logout}
        />
      );
    }

    if (path === "/analytics") {
      return (
        <AnalyticsPage
          currentPath={path}
          onNavigate={navigate}
          player={auth.player}
          authStatus={auth.status}
          onLogin={auth.login}
          onLogout={auth.logout}
        />
      );
    }

    return (
      <LandingPage
        currentPath={path}
        onNavigate={navigate}
        player={auth.player}
        authStatus={auth.status}
        authError={auth.error}
        onLogin={auth.login}
        onLogout={auth.logout}
      />
    );
  }, [path, auth.player, auth.token, auth.status, auth.error, auth.login, auth.logout]);

  return page;
}

export default App;

