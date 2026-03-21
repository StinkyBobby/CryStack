import { navItems } from "@/data/landing";
import { Button } from "@/components/ui/button";
import type { Player } from "@/types";

interface TopNavProps {
  player: Player | null;
  authStatus: "idle" | "loading" | "authenticated" | "anonymous" | "error";
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogin: () => void;
  onLogout: () => void;
}

export function TopNav({ player, authStatus, currentPath, onNavigate, onLogin, onLogout }: TopNavProps) {
  const isAuthenticated = authStatus === "authenticated" && player;
  const isActive = (path: string) => (path === "/" ? currentPath === "/" : currentPath.startsWith(path));

  return (
    <header className="hero-enter rounded-full border border-white/10 bg-black/45 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <button
          className="line-rise text-base font-semibold tracking-tight sm:text-lg"
          style={{ animationDelay: "120ms" }}
          onClick={() => onNavigate("/")}
        >
          CryStack
        </button>

        <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
          {navItems.map((item, index) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                className={`line-rise transition-colors hover:text-white ${active ? "text-[#df2531]" : ""}`}
                style={{ animationDelay: `${160 + index * 80}ms` }}
                onClick={() => onNavigate(item.path)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="line-rise flex items-center gap-3" style={{ animationDelay: "360ms" }}>
          {isAuthenticated ? (
            <>
              <div className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/90 sm:flex">
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="h-6 w-6 rounded-full border border-white/20 object-cover"
                />
                <span>{player.name}</span>
              </div>
              <Button variant="ghost" className="h-9 px-4 text-xs sm:px-5 sm:text-sm" onClick={onLogout}>
                Выйти
              </Button>
            </>
          ) : (
            <Button className="h-9 px-4 text-xs sm:px-5 sm:text-sm" onClick={onLogin} disabled={authStatus === "loading"}>
              {authStatus === "loading" ? "Проверка..." : "Войти"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
