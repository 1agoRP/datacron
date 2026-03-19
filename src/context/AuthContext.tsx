'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('datacron_token');
      if (token) {
        // Sync cookie so middleware can protect routes (for already-logged-in users)
        document.cookie = `datacron_token=${token}; path=/; SameSite=Strict; max-age=${60 * 60 * 24}`;
        try {
          const userData = await api.getMe();
          setUser(userData);
        } catch (error) {
          console.error("Auth init error:", error);
          localStorage.removeItem('datacron_token');
          document.cookie = 'datacron_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials: any) => {
    await api.login(credentials);
    const userData = await api.getMe();
    setUser(userData);
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
