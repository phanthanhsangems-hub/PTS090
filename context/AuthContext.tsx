import React, { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

export interface ReplitUser {
  id: string;
  name: string;
  roles: string;
  profileImage: string;
  bio: string;
  url: string;
}

interface AuthContextValue {
  user: ReplitUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginUrl: string;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  loginUrl: "",
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const loginUrl =
    typeof window !== "undefined"
      ? `https://replit.com/auth_with_repl_site?domain=${window.location.host}`
      : "";

  const { data: user, isLoading } = useQuery<ReplitUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const baseUrl = getApiUrl();
        const res = await fetch(new URL("/api/auth/user", baseUrl).toString(), {
          credentials: "include",
        });
        if (res.status === 401) return null;
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
    staleTime: 30000,
    retry: false,
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        loginUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
