import { useEffect, useMemo, useState } from "react";
import { LandingPage } from "./pages/LandingPage";
import { ProfilePage } from "./pages/ProfilePage";
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
  }, [path, auth.player, auth.token, auth.status, auth.error]);

  return page;
}

export default App;
