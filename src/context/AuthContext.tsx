'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { email: string; senha: string }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const userData = await api.getMe();
        setUser(userData);
      } catch (err: any) {
        if (err.message && (err.message.includes('401') || err.message.toLowerCase().includes('não autorizado') || err.message.toLowerCase().includes('expirado'))) {
          handleLogoutCleanup();
        } else {
          console.warn('Falha na sincronização da sessão:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const handleLogoutCleanup = () => {
    setUser(null);
  };

  const login = async (credentials: { email: string; senha: string }) => {
    const data = await api.login(credentials);
    setUser(data.user);
    return data.user;
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
