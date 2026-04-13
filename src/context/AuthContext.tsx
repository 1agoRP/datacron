'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { email: string; senha: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Decodes a JWT payload without verification (for local instant render).
 * Use only for non-sensitive UI state. Backend verifies the actual token.
 */
function decodeJwtPayload(token: string): Partial<User> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Using Buffer-like approach for cross-environment compatibility if needed, 
    // but atob is standard in modern browsers.
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    
    // Expiration check (exp is in seconds)
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }
    
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      nome: payload.nome || payload.email?.split('@')[0] || 'Usuário',
      condominios_ids: payload.condominios_ids || [],
    };
  } catch (error) {
    console.error('JWT Decode Error:', error);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('datacron_token');
        if (!token) {
          setLoading(false);
          return;
        }

        // 1. Instant local decode for UI snappiness
        const payload = decodeJwtPayload(token);
        if (payload) {
          // Temporarily set user from token info
          setUser(payload as User);
          setLoading(false); // UI is now interactive

          // 2. Background sync with server for full profile & security check
          try {
            const userData = await api.getMe();
            setUser(userData);
          } catch (err) {
            // Token likely expired or revoked on server
            console.warn('Session sync failed, logging out:', err);
            handleLogoutCleanup();
          }
        } else {
          handleLogoutCleanup();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const handleLogoutCleanup = () => {
    localStorage.removeItem('datacron_token');
    document.cookie = 'datacron_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
    setUser(null);
  };

  const login = async (credentials: { email: string; senha: string }) => {
    const data = await api.login(credentials);
    setUser(data.user);
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
