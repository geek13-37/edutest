import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api } from "./api";
import { tokenStore } from "./tokens";
import type { TokenPair, User } from "@/api/types";

export interface TeacherRegisterData {
  email: string;
  password: string;
  full_name: string;
  school_code: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (data: TeacherRegisterData) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  const loadMe = useCallback(async () => {
    if (!tokenStore.access) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<User>("/auth/me");
      setUser(data);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
    const onLogout = () => {
      tokenStore.clear();
      setUser(null);
      qc.clear();
    };
    window.addEventListener("edutest:logout", onLogout);
    return () => window.removeEventListener("edutest:logout", onLogout);
  }, [loadMe, qc]);

  const applyTokens = async (t: TokenPair) => {
    tokenStore.set(t.access_token, t.refresh_token);
    const { data } = await api.get<User>("/auth/me");
    setUser(data);
  };

  const login = async (loginValue: string, password: string) => {
    const { data } = await api.post<TokenPair>("/auth/login", { login: loginValue, password });
    await applyTokens(data);
  };

  const register = async (payload: TeacherRegisterData) => {
    const { data } = await api.post<TokenPair>("/auth/register", payload);
    await applyTokens(data);
  };

  const logout = () => {
    const refresh = tokenStore.refresh;
    if (refresh) api.post("/auth/logout", { refresh_token: refresh }).catch(() => {});
    tokenStore.clear();
    setUser(null);
    qc.clear();
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
