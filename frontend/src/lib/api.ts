import axios from 'axios';

/**
 * Configured Axios instance with JWT interceptor.
 * Automatically attaches the auth token and handles 401 responses.
 *
 * In the browser (dev), requests go through Vite's proxy → /api/v1
 * In the native APK (Capacitor), we need a full URL since there's no proxy.
 * Set VITE_API_URL in .env to your localtunnel or server URL when building APK.
 */

// Detect if running in native app (Capacitor/APK) vs browser web mode
const isNative = typeof window !== 'undefined' && (
  window.location.protocol === 'file:' ||
  window.location.protocol === 'capacitor:' ||
  Boolean((window as any).Capacitor?.isNativePlatform?.())
);

// Native APK requires absolute VITE_API_URL; Browser dev mode uses relative '/api/v1' via Vite proxy
const BASE_URL = isNative
  ? (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : 'http://localhost:8000/api/v1')
  : '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true' // Required to bypass localtunnel's anti-phishing splash page
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginEndpoint) {
      const detail = error.response?.data?.detail;

      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('user');

      // Show specific message for single-device enforcement
      if (detail === 'SESSION_EXPIRED') {
        alert('⚠️ Your account was logged in on another device.\n\nOnly one device can be active at a time. Please log in again.');
      }

      // Redirect to appropriate login page based on which app we're in
      const isAdminApp = window.location.pathname.startsWith('/admin');
      const loginPath = isAdminApp ? '/admin/login' : '/login';
      if (window.location.pathname !== loginPath) {
        window.location.href = loginPath;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

