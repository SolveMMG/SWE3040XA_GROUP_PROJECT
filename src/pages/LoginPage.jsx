import { CarFront, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated, signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin');
  const [credentials, setCredentials] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer',
    homeArea: '',
    preferredPayment: 'Card',
    vehicle: '',
    licensePlate: '',
    seats: 3,
    driverLicense: '',
  });
  const [error, setError] = useState('');
  const target = location.state?.from?.pathname || '/';

  const getPostAuthDestination = (role) => {
    if (role === 'driver') return '/dashboard';
    if (role === 'customer') return '/profile';
    return target;
  };

  if (isAuthenticated) {
    return <Navigate to={getPostAuthDestination(currentUser?.role)} replace />;
  }

  const handleLogin = (event) => {
    event.preventDefault();
    setError('');
    const result = mode === 'signin' ? signIn(credentials) : signUp(credentials);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    const role = result.user?.role || credentials.role;
    navigate(getPostAuthDestination(role), { replace: true });
  };

  const updateField = (field, value) => {
    setError('');
    setCredentials((current) => ({ ...current, [field]: value }));
  };

  return (
    <main className="login-screen">
      <section className="login-panel glass">
        <div className="brand login-brand">
          <span className="brand-icon">
            <CarFront size={24} />
          </span>
          <span>RideLoop</span>
        </div>
        <h1>Smart ride sharing, built around trust.</h1>
        <p>
          {mode === 'signin'
            ? 'Sign in with your email and password to continue.'
            : 'Create a customer or driver profile with the required details for your role.'}
        </p>
        <div className="segmented auth-switch">
          <button className={mode === 'signin' ? 'active' : ''} type="button" onClick={() => setMode('signin')}>
            Sign in
          </button>
          <button className={mode === 'signup' ? 'active' : ''} type="button" onClick={() => setMode('signup')}>
            Sign up
          </button>
        </div>
        <form className="login-form" onSubmit={handleLogin}>
          {mode === 'signup' && (
            <label>
              Full name
              <input
                value={credentials.name}
                onChange={(event) => updateField('name', event.target.value)}
                autoComplete="name"
                required
              />
            </label>
          )}
          <label>
            Email address
            <input
              type="email"
              value={credentials.email}
              onChange={(event) => updateField('email', event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={credentials.password}
              onChange={(event) => updateField('password', event.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength="8"
              required
            />
          </label>
          {mode === 'signup' && (
            <>
              <label>
                Phone number
                <input
                  type="tel"
                  value={credentials.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  autoComplete="tel"
                  required
                />
              </label>
              <fieldset className="role-fieldset">
                <legend>Account type</legend>
                <div className="role-options">
                  <label className={credentials.role === 'customer' ? 'role-card active' : 'role-card'}>
                    <input
                      type="radio"
                      name="role"
                      value="customer"
                      checked={credentials.role === 'customer'}
                      onChange={(event) => updateField('role', event.target.value)}
                    />
                    <strong>Customer</strong>
                    <span>Find rides, send inquiries, and review completed trips.</span>
                  </label>
                  <label className={credentials.role === 'driver' ? 'role-card active' : 'role-card'}>
                    <input
                      type="radio"
                      name="role"
                      value="driver"
                      checked={credentials.role === 'driver'}
                      onChange={(event) => updateField('role', event.target.value)}
                    />
                    <strong>Driver</strong>
                    <span>Offer rides, manage requests, and maintain driver details.</span>
                  </label>
                </div>
              </fieldset>
              {credentials.role === 'customer' ? (
                <div className="form-grid two">
                  <label>
                    Home area
                    <input value={credentials.homeArea} onChange={(event) => updateField('homeArea', event.target.value)} required />
                  </label>
                  <label>
                    Payment preference
                    <select
                      value={credentials.preferredPayment}
                      onChange={(event) => updateField('preferredPayment', event.target.value)}
                    >
                      <option>Card</option>
                      <option>Cash</option>
                      <option>Mobile wallet</option>
                    </select>
                  </label>
                </div>
              ) : (
                <>
                  <label>
                    Vehicle
                    <input
                      value={credentials.vehicle}
                      onChange={(event) => updateField('vehicle', event.target.value)}
                      required
                    />
                  </label>
                  <div className="form-grid two">
                    <label>
                      License plate
                      <input
                        value={credentials.licensePlate}
                        onChange={(event) => updateField('licensePlate', event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Seats available
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={credentials.seats}
                        onChange={(event) => updateField('seats', event.target.value)}
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Driver license number
                    <input
                      value={credentials.driverLicense}
                      onChange={(event) => updateField('driverLicense', event.target.value)}
                      required
                    />
                  </label>
                </>
              )}
            </>
          )}
          {error && <div className="state-bar danger">{error}</div>}
          <button type="submit" className="google-button">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <div className="security-note">
          <ShieldCheck size={18} />
          This creates a local frontend session until Person A connects real authentication.
        </div>
      </section>
    </main>
  );
}
