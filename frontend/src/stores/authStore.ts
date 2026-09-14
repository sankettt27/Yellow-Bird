/**
 * Authentication Zustand store.
 * Manages login state, JWT token, and current user.
 * Uses localStorage for persistent login — the user stays logged in
 * even after closing and reopening the browser/app.
 */

import { create } from 'zustand';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { User, LoginRequest, TokenResponse } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
  setSession: (token: string, user: User) => void;
}

// Synchronously load initial auth state so the DashboardLayout guard
// never flickers-to-login on a hard refresh.
function getInitialState() {
  // Check localStorage (persistent) first, then sessionStorage (legacy fallback)
  const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (token && userStr) {
    try {
      // Migrate from sessionStorage to localStorage if needed
      if (!localStorage.getItem('access_token')) {
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', userStr);
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('user');
      }
      return { user: JSON.parse(userStr) as User, token, isAuthenticated: true };
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('user');
    }
  }
  return { user: null, token: null, isAuthenticated: false };
}

export const useAuthStore = create<AuthState>((set) => ({
  ...getInitialState(),
  isInitialized: true,
  isLoading: false,
  error: null,

  login: async (credentials: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<TokenResponse>('/auth/login', credentials);
      const { access_token, user } = response.data;

      // Store in localStorage for persistent login across browser restarts
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      // Clean up any legacy sessionStorage
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('user');

      set({
        user,
        token: access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      let message: string;
      if (!err.response) {
        // Network error — backend is not running
        message = 'Cannot connect to server. Please make sure the backend is running.';
      } else {
        message = err.response?.data?.detail || 'Invalid email or password.';
      }
      set({ isLoading: false, error: message });
      toast.error(message);
      throw new Error(message);
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isAuthenticated: true });
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }
  },

  clearError: () => set({ error: null }),

  updateUser: (userData: Partial<User>) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...userData };
      localStorage.setItem('user', JSON.stringify(updated));
      return { user: updated };
    });
  },

  setSession: (token: string, user: User) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('user');
    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  },
}));
