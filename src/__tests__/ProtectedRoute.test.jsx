import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock useAuth so we can control the auth state per test
vi.mock('../state/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../state/AuthContext.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';

const renderRoute = (role) =>
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute role={role}>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login"     element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders children for an authenticated user with no role constraint', () => {
    useAuth.mockReturnValue({ currentUser: { id: 1, role: 'driver' }, isAuthenticated: true });
    renderRoute(undefined);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', () => {
    useAuth.mockReturnValue({ currentUser: null, isAuthenticated: false });
    renderRoute(undefined);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated user has the required role', () => {
    useAuth.mockReturnValue({ currentUser: { id: 1, role: 'driver' }, isAuthenticated: true });
    renderRoute('driver');
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /dashboard when user role does not match', () => {
    useAuth.mockReturnValue({ currentUser: { id: 1, role: 'passenger' }, isAuthenticated: true });
    renderRoute('driver');
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
