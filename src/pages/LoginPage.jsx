import { useState } from 'react';
import { CarFront, ShieldCheck } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../state/AuthContext.jsx';

export default function LoginPage() {
  const { isAuthenticated, currentUser, setSession } = useAuth();
  const [mode, setMode]         = useState('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]             = useState('passenger');
  const [carType, setCarType]       = useState('');
  const [licensePlate, setLicensePlate]   = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  if (isAuthenticated) {
    return <Navigate to={currentUser?.role === 'driver' ? '/dashboard' : '/'} replace />;
  }

  const apiBase = import.meta.env.VITE_API_URL || '/api/v1';

  const switchMode = (m) => { setMode(m); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
      const payload  = mode === 'register'
        ? { name, email, password, role,
            ...(role === 'driver' ? { carType, licensePlate, licenseNumber } : {}) }
        : { email, password };
      const { data } = await api.post(endpoint, payload);
      setSession(data.user, data.token, data.refreshToken);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <section className="login-panel glass">
        <div className="brand login-brand">
          <span className="brand-icon">
            <CarFront size={24} />
          </span>
          <span>RideConnect</span>
        </div>
        <h1>Smart ride sharing, built around trust.</h1>

        <div className="auth-switch segmented glass">
          <button type="button" className={mode === 'login'    ? 'chip active' : 'chip'} onClick={() => switchMode('login')}>Sign in</button>
          <button type="button" className={mode === 'register' ? 'chip active' : 'chip'} onClick={() => switchMode('register')}>Sign up</button>
        </div>

        <form className="login-form" onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Full name
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
            </label>
          )}

          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </label>

          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </label>

          {mode === 'register' && (
            <fieldset className="role-fieldset">
              <legend>I want to</legend>
              <div className="role-options">
                <label className={`role-card${role === 'passenger' ? ' active' : ''}`}>
                  <input type="radio" name="role" value="passenger" checked={role === 'passenger'} onChange={() => setRole('passenger')} />
                  <strong>Ride as passenger</strong>
                  <span>Find and book seats on available rides</span>
                </label>
                <label className={`role-card${role === 'driver' ? ' active' : ''}`}>
                  <input type="radio" name="role" value="driver" checked={role === 'driver'} onChange={() => setRole('driver')} />
                  <strong>Offer rides as driver</strong>
                  <span>Post rides and accept passenger bookings</span>
                </label>
              </div>
            </fieldset>
          )}

          {mode === 'register' && role === 'driver' && (
            <>
              <label>
                Car type
                <input type="text" value={carType} onChange={(e) => setCarType(e.target.value)} placeholder="e.g. Toyota Fielder" required />
              </label>
              <label>
                Number plate
                <input type="text" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="e.g. KCA 123A" required />
              </label>
              <label>
                Driver's license number
                <input type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="e.g. DL123456" required />
              </label>
            </>
          )}

          {error && <div className="state-bar danger">{error}</div>}

          <button type="submit" className="button" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="security-note" style={{ justifyContent: 'center', margin: '10px 0' }}>or</p>

        <a href={`${apiBase}/auth/google`} className="google-button">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </a>

        <div className="security-note">
          <ShieldCheck size={18} />
          Your data is protected and never shared.
        </div>
      </section>
    </main>
  );
}
