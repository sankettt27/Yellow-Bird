/**
 * AppAdmin — Desktop admin portal for Super Admin and School Admin.
 * Separate from the mobile Driver/Parent app.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@/lib/constants';

// Layout
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

// Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { UsersPage } from '@/pages/users/UsersPage';
import { BusesPage } from '@/pages/buses/BusesPage';
import { DriversPage } from '@/pages/drivers/DriversPage';
import { StudentsPage } from '@/pages/students/StudentsPage';
import { RoutesPage } from '@/pages/routes/RoutesPage';
import { TrackingPage } from '@/pages/tracking/TrackingPage';
import { TripsPage } from '@/pages/trips/TripsPage';
import { ParentsPage } from '@/pages/parents/ParentsPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { Outlet } from 'react-router-dom';

const SIDEBAR_WIDTH = 260;

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
 * Admin layout with sidebar + topbar. Only allows admin roles.
 */
function AdminLayout() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Block driver/parent users — they should use the mobile app
  if (user?.role === ROLES.DRIVER || user?.role === ROLES.PARENT) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-gray-950 p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📱</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Mobile App Required</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            This portal is for administrators only. Please use the YellowBird app on your phone.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-brand-500 text-white font-semibold text-sm rounded-xl hover:bg-brand-600 transition-colors"
          >
            Open YellowBird App →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-gray-950">
      <Sidebar />
      <Topbar sidebarWidth={SIDEBAR_WIDTH} />
      <main
        className="pt-16 min-h-screen transition-all duration-200"
        style={{ marginLeft: SIDEBAR_WIDTH }}
      >
        <Outlet />
      </main>
    </div>
  );
}

/**
 * Placeholder for pages not yet built.
 */
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
      <p className="text-sm text-gray-500">This module will be built in the upcoming phases.</p>
    </div>
  );
}

/**
 * Smart redirect for admin portal.
 */
function AdminRedirect() {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.SCHOOL_ADMIN) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    // Non-admin users → send to mobile app
    return <Navigate to="/" replace />;
  }

  return <Navigate to="/admin/login" replace />;
}

function NotFoundAdmin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-gray-950">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-brand-500 mb-4">404</h1>
        <p className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-2">Page Not Found</p>
        <p className="text-sm text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
        <a
          href="/admin/dashboard"
          className="px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-colors"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}

export default function AppAdmin() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/admin/login" element={<LoginPage appMode="admin" />} />
          <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/admin/reset-password" element={<ResetPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Admin Routes */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/buses" element={<BusesPage />} />
            <Route path="/admin/drivers" element={<DriversPage />} />
            <Route path="/admin/students" element={<StudentsPage />} />
            <Route path="/admin/parents" element={<ParentsPage />} />
            <Route path="/admin/routes" element={<RoutesPage />} />
            <Route path="/admin/stops" element={<RoutesPage />} />
            <Route path="/admin/tracking" element={<TrackingPage />} />
            <Route path="/admin/trips" element={<TripsPage />} />
            <Route path="/admin/schools" element={<PlaceholderPage title="Schools" />} />
            <Route path="/admin/reports" element={<ReportsPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>

          {/* Redirects */}
          <Route path="/admin.html" element={<AdminRedirect />} />
          <Route path="/admin" element={<AdminRedirect />} />
          <Route path="/admin/*" element={<NotFoundAdmin />} />
          <Route path="*" element={<AdminRedirect />} />
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
