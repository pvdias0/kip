import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "@/types/auth";
import { apiService } from "@/services/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    legalAcceptance: {
      termsAccepted: boolean;
      privacyAccepted: boolean;
      termsVersion: string;
      privacyVersion: string;
    },
  ) => Promise<void>;
  setUserData: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setUserData = useCallback((userData: User | null) => {
    setUser(userData);

    if (userData) {
      localStorage.setItem("auth_user", JSON.stringify(userData));
    } else {
      localStorage.removeItem("auth_user");
    }
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    setError(null);
    apiService.setToken(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }, []);

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token");
    const loadProfile = async () => {
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        setToken(savedToken);
        apiService.setToken(savedToken);
        const response = await apiService.getProfile();
        setUserData(response.user as User);
      } catch (err) {
        console.error("Failed to load auth data:", err);
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [clearSession, setUserData]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.login(email, password);
      console.log("Login response:", response);

      const { user: userData, token: newToken } = response;

      if (!userData || !newToken) {
        throw new Error("Resposta inválida do servidor");
      }

      setUserData(userData as User);
      setToken(newToken as string);
      apiService.setToken(newToken);
      localStorage.setItem("auth_token", newToken);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao fazer login";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    legalAcceptance: {
      termsAccepted: boolean;
      privacyAccepted: boolean;
      termsVersion: string;
      privacyVersion: string;
    },
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      await apiService.register(name, email, password, legalAcceptance);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar conta";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearSession();
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token,
    login,
    register,
    setUserData,
    logout,
    isLoading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
