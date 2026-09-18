"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { SessionData, StudentInfo } from "./services/types";

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: SessionData | null;
}

interface AuthContextType extends AuthState {
  login: (service: string, credentials: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    session: null,
  });

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setState({ isLoading: false, isAuthenticated: true, session: data });
      } else {
        setState({ isLoading: false, isAuthenticated: false, session: null });
      }
    } catch {
      setState({ isLoading: false, isAuthenticated: false, session: null });
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (service: string, credentials: Record<string, string>) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service, ...credentials }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erreur de connexion" }));
      throw new Error(err.error || "Échec de la connexion");
    }

    const data = await res.json();
    setState({ isLoading: false, isAuthenticated: true, session: data });
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState({ isLoading: false, isAuthenticated: false, session: null });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Data fetching hook
export function useApiData<T>(endpoint: string, defaultValue: T) {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const refetch = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Erreur de chargement");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [endpoint, isAuthenticated]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
