import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cryptoledger_kreal'); // Keep RSA key
      if (
        window.location.pathname !== '/login' && 
        window.location.pathname !== '/register' && 
        window.location.pathname !== '/setup' &&
        window.location.pathname !== '/setup-account'
      ) {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 503 && error.response?.data?.requires_setup) {
      if (window.location.pathname !== '/setup') {
        window.location.href = '/setup';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
