import { CarFront, CircleUserRound, ClipboardList, Gauge, LogOut, Plus, Search, ShieldCheck } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';

export default function Layout() {
  const { currentUser, isAuthenticated, logout } = useAuth();
  const initials = currentUser?.name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app-shell">
      <header className="topbar glass">
        <NavLink to={currentUser?.role === 'driver' ? '/dashboard' : '/'} className="brand" aria-label="RideLoop home">
          <span className="brand-icon">
            <CarFront size={22} />
          </span>
          <span>RideLoop</span>
        </NavLink>
        <nav className="nav-links" aria-label="Main navigation">
          {isAuthenticated && (
            <NavLink to="/dashboard">
              <Gauge size={18} />
              Dashboard
            </NavLink>
          )}
          {currentUser?.role !== 'driver' && (
            <NavLink to="/" end>
              <Search size={18} />
              Browse
            </NavLink>
          )}
          {currentUser?.role === 'driver' && (
            <NavLink to="/rides/new">
              <Plus size={18} />
              Offer ride
            </NavLink>
          )}
          {currentUser?.role === 'superadmin' && (
            <NavLink to="/admin"><ShieldCheck size={18} />Admin</NavLink>
          )}
          <NavLink to="/inquiries">
            <ClipboardList size={18} />
            {currentUser?.role === 'driver' ? 'Ride requests' : 'My inquiries'}
          </NavLink>
          <NavLink to="/profile">
            <CircleUserRound size={18} />
            Profile
          </NavLink>
        </nav>
        <div className="account-actions">
          {isAuthenticated ? (
            <>
              {currentUser?.role === 'driver' && (
                <span className="driver-online-badge">
                  <span className="pulse-dot green" /> Driver Online
                </span>
              )}
              {currentUser?.photoUrl ? (
                <img src={currentUser.photoUrl} alt="" className="avatar" />
              ) : (
                <span className="avatar initials" aria-label={currentUser?.name || 'User'}>
                  {initials}
                </span>
              )}
              <button className="icon-button" type="button" onClick={logout} aria-label="Log out">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <NavLink to="/login" className="button compact">
              Sign in
            </NavLink>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="footer">
        <span>RideLoop</span>
        <span>Smart carpooling & ride-sharing in Nairobi</span>
      </footer>
    </div>
  );
}
