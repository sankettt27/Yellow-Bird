/**
 * AppMobile — Mobile-first app for Drivers and Parents.
 * This is a standalone app with its own routing, separate from the Admin portal.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@/lib/constants';

// Layout
import { MobileLayout } from '@/components/layout/MobileLayout';

// Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { DriverDashboard } from '@/pages/driver/DriverDashboard';
import { DriverPassengersTab } from '@/pages/driver/DriverPassengersTab';
import { DriverBusTab } from '@/pages/driver/DriverBusTab';
import { DriverProfileTab } from '@/pages/driver/DriverProfileTab';
import { ParentDashboard } from '@/pages/parent/ParentDashboard';
import { ParentTrackingTab } from '@/pages/parent/ParentTrackingTab';
import { ParentSettingsPage } from '@/pages/parent/ParentSettingsPage';
import { ParentAlertsPage } from '@/pages/parent/ParentAlertsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Auth guard that only allows Driver and Parent roles.
 * Redirects to login if not authenticated.
 */
function MobileGuard() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Block admin users — they should use the admin portal
  if (user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.SCHOOL_ADMIN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🖥️</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Admin Portal Required</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            This app is for drivers and parents only. Please use the Admin Portal on your computer.
          </p>
          <a
            href="/admin/"
            className="inline-block px-6 py-3 bg-brand-500 text-white font-semibold text-sm rounded-xl hover:bg-brand-600 transition-colors"
          >
            Open Admin Portal →
          </a>
        </div>
      </div>
    );
  }

  return <MobileLayout />;
}

/**
 * Smart redirect for mobile — goes to driver or parent dashboard.
 */
function MobileRedirect() {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    if (user.role === ROLES.DRIVER) return <Navigate to="/driver" replace />;
    if (user.role === ROLES.PARENT) return <Navigate to="/parent" replace />;
    // Admin users on mobile app — redirect to admin portal
    return <Navigate to="/admin/" replace />;
  }

  return <Navigate to="/login" replace />;
}

function NotFoundMobile() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center p-6">
        <h1 className="text-6xl font-bold text-brand-500 mb-3">404</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Page not found</p>
        <a href="/" className="px-5 py-3 bg-brand-500 text-white rounded-xl text-sm font-semibold">
          Go Home
        </a>
      </div>
    </div>
  );
}

export default function AppMobile() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage appMode="mobile" />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Mobile Routes */}
          <Route element={<MobileGuard />}>
            {/* Driver Portal */}
            <Route path="/driver" element={<DriverDashboard />} />
            <Route path="/driver/passengers" element={<DriverPassengersTab />} />
            <Route path="/driver/bus" element={<DriverBusTab />} />
            <Route path="/driver/profile" element={<DriverProfileTab />} />
            {/* Parent Portal */}
            <Route path="/parent" element={<ParentDashboard />} />
            <Route path="/parent/tracking" element={<ParentTrackingTab />} />
            <Route path="/parent/settings" element={<ParentSettingsPage />} />
            <Route path="/notifications" element={<ParentAlertsPage />} />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<MobileRedirect />} />
          <Route path="*" element={<NotFoundMobile />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          className: 'text-sm font-medium dark:bg-gray-800 dark:text-white border dark:border-gray-700',
          style: { borderRadius: '12px' },
        }}
      />
    </QueryClientProvider>
  );
}
