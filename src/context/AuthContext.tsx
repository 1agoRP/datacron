'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Decodes a JWT payload without verification (for local instant render).
 * This avoids a network roundtrip just to know who the user is.
 */
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem('datacron_token');
      if (token) {
        // Sync cookie so middleware can protect routes
        document.cookie = `datacron_token=${token}; path=/; SameSite=Strict; max-age=${60 * 60 * 24}`;

        // Try to decode JWT locally for INSTANT render (no network wait)
        const payload = decodeJwtPayload(token);
        if (payload) {
          setUser({
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            nome: payload.nome || payload.email?.split('@')[0] || 'Usuário',
          });
          setLoading(false);

          // Validate with server in background (non-blocking)
          api.getMe().then((userData) => {
            setUser(userData);
          }).catch(() => {
            // Token invalid on server — cleanup
            localStorage.removeItem('datacron_token');
            document.cookie = 'datacron_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
            setUser(null);
          });
          return;
        }

        // Token couldn't be decoded (expired or malformed) — clear it
        localStorage.removeItem('datacron_token');
        document.cookie = 'datacron_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials: any) => {
    const data = await api.login(credentials);
    // Use user data from login response directly (no second roundtrip)
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
