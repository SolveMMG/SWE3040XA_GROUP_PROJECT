import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rc_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, attempt a single token refresh then retry
let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken: localStorage.getItem('rc_refresh_token') },
          );
        }
        const { data } = await refreshPromise;
        refreshPromise = null;
        localStorage.setItem('rc_access_token', data.accessToken);
        localStorage.setItem('rc_refresh_token', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        refreshPromise = null;
        localStorage.removeItem('rc_access_token');
        localStorage.removeItem('rc_refresh_token');
        localStorage.removeItem('rc_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
