import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../state/AuthContext.jsx';

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();

  useEffect(() => {
    const accessToken = params.get('token');
    const refreshToken = params.get('refreshToken');

    if (!accessToken || !refreshToken) {
      navigate('/login', { replace: true });
      return;
    }

    // Store tokens so the api interceptor picks them up for the /users/me call
    localStorage.setItem('rc_access_token', accessToken);
    localStorage.setItem('rc_refresh_token', refreshToken);

    api
      .get('/users/me')
      .then(({ data }) => {
        setSession(data, accessToken, refreshToken);
        navigate(data.role === 'driver' ? '/dashboard' : '/', { replace: true });
      })
      .catch(() => navigate('/login', { replace: true }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p>Signing you in…</p>
    </main>
  );
}
