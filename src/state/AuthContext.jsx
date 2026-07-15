import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('rc_user');
    return stored ? JSON.parse(stored) : null;
  });

  const setSession = useCallback((user, accessToken, refreshToken) => {
    localStorage.setItem('rc_access_token', accessToken);
    localStorage.setItem('rc_refresh_token', refreshToken);
    localStorage.setItem('rc_user', JSON.stringify(user));
    setCurrentUser(user);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('rc_access_token');
    localStorage.removeItem('rc_refresh_token');
    localStorage.removeItem('rc_user');
    setCurrentUser(null);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('rc_refresh_token');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // ignore — clear locally regardless
    }
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me');
      const user = data;
      localStorage.setItem('rc_user', JSON.stringify(user));
      setCurrentUser(user);
      return user;
    } catch {
      clearSession();
      return null;
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: Boolean(currentUser),
      setSession,
      clearSession,
      logout,
      refreshUser,
    }),
    [currentUser, setSession, clearSession, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
