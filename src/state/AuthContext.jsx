import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const legacyMockToken = 'mock-jwt-for-person-b-frontend';
const usersKey = 'rideloop_users';

function getStoredUsers() {
  const stored = localStorage.getItem(usersKey);
  return stored ? JSON.parse(stored) : [];
}

function saveStoredUsers(users) {
  localStorage.setItem(usersKey, JSON.stringify(users));
}

function normalizeUser(user) {
  return {
    ...user,
    role: user.role || 'customer',
    phone: user.phone || '',
    customerProfile: user.customerProfile || {
      homeArea: '',
      preferredPayment: 'Card',
    },
    driverProfile: user.driverProfile || null,
  };
}

function createUser(credentials) {
  const {
    name,
    email,
    password,
    phone,
    role,
    homeArea,
    preferredPayment,
    vehicle,
    licensePlate,
    seats,
    driverLicense,
  } = credentials;

  return {
    id: `user-${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    phone: phone.trim(),
    role,
    bio: '',
    skills: [],
    photoUrl: '',
    rating: 0,
    customerProfile:
      role === 'customer'
        ? {
            homeArea: homeArea.trim(),
            preferredPayment,
          }
        : null,
    driverProfile:
      role === 'driver'
        ? {
            vehicle: vehicle.trim(),
            licensePlate: licensePlate.trim(),
            seats: Number(seats),
            driverLicense: driverLicense.trim(),
          }
        : null,
  };
}

function startSession(user, setToken, setCurrentUser) {
  const sessionUser = { ...normalizeUser(user), password: undefined };
  const mockToken = `local-session-${user.id}`;
  localStorage.setItem('rideloop_token', mockToken);
  localStorage.setItem('rideloop_user', JSON.stringify(sessionUser));
  setToken(mockToken);
  setCurrentUser(sessionUser);
  return sessionUser;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('rideloop_token');
    if (storedToken === legacyMockToken) {
      localStorage.removeItem('rideloop_token');
      localStorage.removeItem('rideloop_user');
      return null;
    }
    return storedToken;
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('rideloop_user');
    if (!stored) return null;

    return normalizeUser(JSON.parse(stored));
  });

  const signIn = ({ email, password }) => {
    const user = getStoredUsers().find((account) => account.email === email.trim().toLowerCase());
    if (!user || user.password !== password) {
      return { ok: false, message: 'No account matches that email and password.' };
    }

    const sessionUser = startSession(normalizeUser(user), setToken, setCurrentUser);
    return { ok: true, user: sessionUser };
  };

  const signUp = (credentials) => {
    const users = getStoredUsers();
    const email = credentials.email.trim().toLowerCase();

    if (users.some((user) => user.email === email)) {
      return { ok: false, message: 'An account already exists for this email.' };
    }

    const user = createUser(credentials);
    saveStoredUsers([...users, user]);
    const sessionUser = startSession(user, setToken, setCurrentUser);
    return { ok: true, user: sessionUser };
  };

  const logout = () => {
    localStorage.removeItem('rideloop_token');
    localStorage.removeItem('rideloop_user');
    setToken(null);
    setCurrentUser(null);
  };

  const updateUser = (updates) => {
    const nextUser = { ...currentUser, ...updates };
    localStorage.setItem('rideloop_user', JSON.stringify(nextUser));
    saveStoredUsers(
      getStoredUsers().map((user) =>
        user.id === currentUser.id
          ? {
              ...user,
              ...updates,
              password: user.password,
            }
          : user,
      ),
    );
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
