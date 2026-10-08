import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally - redirect to login ONLY if not already on auth pages.
// Without this guard, a failed login (401) would trigger the interceptor and
// immediately redirect back to /login, clearing the error state before it renders.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const authPaths = ['/login', '/signup'];
    const isAuthPage = authPaths.some((p) => window.location.pathname.startsWith(p));

    if (error.response?.status === 401 && !isAuthPage) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
