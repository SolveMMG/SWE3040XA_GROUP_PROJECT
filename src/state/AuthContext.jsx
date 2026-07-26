import { createContext, useContext, useMemo, useState } from 'react';
import { api, userFromApi } from '../services/api.js';

const AuthContext = createContext(null);
const tokenKey = 'rideloop_token';
const userKey = 'rideloop_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey));
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem(userKey);
    return stored ? JSON.parse(stored) : null;
  });
  const saveSession = ({ token: nextToken, user }) => {
    const nextUser = userFromApi(user);
    localStorage.setItem(tokenKey, nextToken);
    localStorage.setItem(userKey, JSON.stringify(nextUser));
    setToken(nextToken); setCurrentUser(nextUser);
    return nextUser;
  };
  const signIn = async ({ email, password }) => {
    try { return { ok: true, user: saveSession(await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })) }; }
    catch (err) { return { ok: false, message: err.message }; }
  };
  const signUp = async ({ name, email, password, role }) => {
    try {
      const backendRole = role === 'driver' ? 'driver' : 'passenger';
      return { ok: true, user: saveSession(await api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role: backendRole }) })) };
    } catch (err) { return { ok: false, message: err.message }; }
  };
  const logout = async () => {
    localStorage.removeItem(tokenKey); localStorage.removeItem(userKey); setToken(null); setCurrentUser(null);
  };
  const updateUser = async (updates) => {
    const user = userFromApi(await api('/users/me', { token, method: 'PUT', body: JSON.stringify(updates) }));
    localStorage.setItem(userKey, JSON.stringify(user)); setCurrentUser(user); return user;
  };
  const value = useMemo(() => ({ token, currentUser, isAuthenticated: Boolean(token && currentUser), signIn, signUp, logout, updateUser }), [token, currentUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context; }
