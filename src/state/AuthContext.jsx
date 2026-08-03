import { createContext, useContext, useMemo, useState } from 'react';
import { requestNotificationPermission } from '../lib/firebase.js';
import { api, userFromApi } from '../services/api.js';

const AuthContext = createContext(null);
const tokenKey = 'rideconnect_token';
const refreshKey = 'rideconnect_refresh';
const userKey = 'rideconnect_user';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey));
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem(userKey);
    return stored ? JSON.parse(stored) : null;
  });

  const saveSession = ({ token: nextToken, refreshToken, user }) => {
    const nextUser = userFromApi(user);
    localStorage.setItem(tokenKey, nextToken);
    if (refreshToken) localStorage.setItem(refreshKey, refreshToken);
    localStorage.setItem(userKey, JSON.stringify(nextUser));
    
    setToken(nextToken);
    setCurrentUser(nextUser);

    // Request notification permission and save FCM token in the background
    requestNotificationPermission().then((fcmToken) => {
      if (fcmToken) {
        api('/users/me/fcm-token', {
          token: nextToken,
          method: 'PUT',
          body: JSON.stringify({ token: fcmToken }),
        }).catch(() => {});
      }
    });

    return nextUser;
  };

  const signIn = async ({ email, password }) => {
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return { ok: true, user: saveSession(data) };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  };

  const signUp = async ({ name, email, password, role }) => {
    try {
      const backendRole = role === 'driver' ? 'driver' : 'passenger';
      const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role: backendRole }),
      });
      return { ok: true, user: saveSession(data) };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  };

  const logout = async () => {
    const storedRefresh = localStorage.getItem(refreshKey);
    if (storedRefresh) {
      api('/auth/logout', {
        token,
        method: 'POST',
        body: JSON.stringify({ refreshToken: storedRefresh }),
      }).catch(() => {});
    }
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(refreshKey);
    localStorage.removeItem(userKey);
    setToken(null);
    setCurrentUser(null);
  };

  const updateUser = async (updates) => {
    const response = await api('/users/me', {
      token,
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    const user = userFromApi(response);
    localStorage.setItem(userKey, JSON.stringify(user));
    setCurrentUser(user);
    return user;
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
    [token, currentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
