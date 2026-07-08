import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const API_BASE = '/api/v1';

function normalizeUser(user) {
  return {
    ...user,
    role:           user.role            || 'customer',
    phone:          user.phone           || '',
    bio:            user.bio             || '',
    skills:         user.skills          || [],
    photoUrl:       user.photoUrl        || user.photo_url || '',
    rating:         user.rating          || user.avg_rating || 0,
    customerProfile: user.customerProfile || { homeArea: '', preferredPayment: 'Card' },
    driverProfile:   user.driverProfile  || null,
  };
}

function startSession(user, token, refreshToken, setToken, setCurrentUser) {
  const sessionUser = normalizeUser(user);
  localStorage.setItem('rideloop_token',         token);
  localStorage.setItem('rideloop_refresh_token', refreshToken);
  localStorage.setItem('rideloop_user',          JSON.stringify(sessionUser));
  setToken(token);
  setCurrentUser(sessionUser);
  return sessionUser;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('rideloop_token'));
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('rideloop_user');
    if (!stored) return null;
    return normalizeUser(JSON.parse(stored));
  });

  const signIn = async ({ email, password }) => {
    try {
      const res  = await fetch(`${API_BASE}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, message: data.error?.message || 'Sign in failed.' };
      }
      const sessionUser = startSession(data.user, data.token, data.refreshToken, setToken, setCurrentUser);
      return { ok: true, user: sessionUser };
    } catch {
      return { ok: false, message: 'Network error. Is the server running?' };
    }
  };

  const signUp = async (credentials) => {
    try {
      const res  = await fetch(`${API_BASE}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, message: data.error?.message || 'Registration failed.' };
      }
      const sessionUser = startSession(data.user, data.token, data.refreshToken, setToken, setCurrentUser);
      return { ok: true, user: sessionUser };
    } catch {
      return { ok: false, message: 'Network error. Is the server running?' };
    }
  };

  const logout = () => {
    const storedToken   = localStorage.getItem('rideloop_token');
    const refreshToken  = localStorage.getItem('rideloop_refresh_token');
    if (storedToken && refreshToken) {
      fetch(`${API_BASE}/auth/logout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${storedToken}` },
        body:    JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
    localStorage.removeItem('rideloop_token');
    localStorage.removeItem('rideloop_refresh_token');
    localStorage.removeItem('rideloop_user');
    setToken(null);
    setCurrentUser(null);
  };

  const updateUser = (updates) => {
    const nextUser = normalizeUser({ ...currentUser, ...updates });
    localStorage.setItem('rideloop_user', JSON.stringify(nextUser));
    setCurrentUser(nextUser);
  };

  const value = useMemo(
    () => ({
      token,
      currentUser,
      isAuthenticated: Boolean(token && currentUser),
      signIn,
      signUp,
      logout,
      updateUser,
    }),
    [token, currentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
