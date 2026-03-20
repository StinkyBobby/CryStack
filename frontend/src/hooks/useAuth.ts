import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/api/client";
import type { Player } from "@/types";

const TOKEN_KEY = "crystack_token";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous" | "error";

interface MeResponse {
  player: Player;
}

function getTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (!token) {
    return null;
  }

  params.delete("token");
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);

  return token;
}

function getAuthErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const authError = params.get("auth_error");

  if (!authError) {
    return null;
  }

  params.delete("auth_error");
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);

  return authError;
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => {
    const tokenFromUrl = getTokenFromUrl();
    if (tokenFromUrl) {
      localStorage.setItem(TOKEN_KEY, tokenFromUrl);
      return tokenFromUrl;
    }

    return localStorage.getItem(TOKEN_KEY);
  });
  const [player, setPlayer] = useState<Player | null>(null);
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [error, setError] = useState<string | null>(() => getAuthErrorFromUrl());

  const loadMe = useCallback(async (activeToken: string) => {
    const me = await apiRequest<MeResponse>("/api/auth/me", { method: "GET", token: activeToken });
    setPlayer({ ...me.player, steam_id: String(me.player.steam_id) });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!token) {
        setStatus("anonymous");
        return;
      }

      setStatus("loading");

      try {
        await loadMe(token);
        if (!cancelled) {
          setStatus("authenticated");
          setError(null);
        }
      } catch (e) {
        if (cancelled) {
          return;
        }

        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setPlayer(null);
        setStatus("anonymous");
        setError(e instanceof Error ? e.message : "failed to restore session");
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [token, loadMe]);

  const login = useCallback(() => {
    window.location.href = `${API_BASE_URL}/api/auth/steam/start`;
  }, []);

  const logout = useCallback(async () => {
    const current = token;

    try {
      if (current) {
        await apiRequest<{ message: string }>("/api/auth/logout", {
          method: "POST",
          token: current,
        });
      }
    } catch {
      // ignore transport errors and clear local session anyway
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setPlayer(null);
      setStatus("anonymous");
      setError(null);
    }
  }, [token]);

  return { token, player, status, error, login, logout };
}
