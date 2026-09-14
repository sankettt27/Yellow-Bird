/**
 * Application root - React Router setup with role-based routing.
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@/lib/constants';
import { useStartupPermissions } from '@/hooks/useStartupPermissions';

// Layouts
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// ── Lazy-loaded pages (only downloaded when the user navigates there) ─────────
const LoginPage           = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterSchoolPage  = lazy(() => import('@/pages/auth/RegisterSchoolPage').then(m => ({ default: m.RegisterSchoolPage })));
const SchoolSetupWizard   = lazy(() => import('@/pages/auth/SchoolSetupWizard').then(m => ({ default: m.SchoolSetupWizard })));
const ForgotPasswordPage  = lazy(() => import('@/pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage   = lazy(() => import('@/pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const DashboardPage       = lazy(() => import('@/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const UsersPage           = lazy(() => import('@/pages/users/UsersPage').then(m => ({ default: m.UsersPage })));
const BusesPage           = lazy(() => import('@/pages/buses/BusesPage').then(m => ({ default: m.BusesPage })));
const DriversPage         = lazy(() => import('@/pages/drivers/DriversPage').then(m => ({ default: m.DriversPage })));
const StudentsPage        = lazy(() => import('@/pages/students/StudentsPage').then(m => ({ default: m.StudentsPage })));
const RoutesPage          = lazy(() => import('@/pages/routes/RoutesPage').then(m => ({ default: m.RoutesPage })));
const ParentsPage         = lazy(() => import('@/pages/parents/ParentsPage').then(m => ({ default: m.ParentsPage })));
const TripsPage           = lazy(() => import('@/pages/trips/TripsPage').then(m => ({ default: m.TripsPage })));
const TrackingPage        = lazy(() => import('@/pages/tracking/TrackingPage').then(m => ({ default: m.TrackingPage })));
const ReportsPage         = lazy(() => import('@/pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SettingsPage        = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
// Driver portal
const DriverDashboard     = lazy(() => import('@/pages/driver/DriverDashboard').then(m => ({ default: m.DriverDashboard })));
const DriverPassengersTab = lazy(() => import('@/pages/driver/DriverPassengersTab').then(m => ({ default: m.DriverPassengersTab })));
const DriverBusTab        = lazy(() => import('@/pages/driver/DriverBusTab').then(m => ({ default: m.DriverBusTab })));
const DriverProfileTab    = lazy(() => import('@/pages/driver/DriverProfileTab').then(m => ({ default: m.DriverProfileTab })));
// Parent portal
const ParentDashboard     = lazy(() => import('@/pages/parent/ParentDashboard').then(m => ({ default: m.ParentDashboard })));
const ParentTrackingTab   = lazy(() => import('@/pages/parent/ParentTrackingTab').then(m => ({ default: m.ParentTrackingTab })));
const ParentSettingsPage  = lazy(() => import('@/pages/parent/ParentSettingsPage').then(m => ({ default: m.ParentSettingsPage })));
const ParentAlertsPage    = lazy(() => import('@/pages/parent/ParentAlertsPage').then(m => ({ default: m.ParentAlertsPage })));

// ── Tiny spinner shown while a lazy page chunk is downloading ─────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading...</p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  useStartupPermissions();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register-school" element={<RegisterSchoolPage />} />
            <Route path="/setup-school" element={<SchoolSetupWizard />} />
            <Route path="/admin/register" element={<RegisterSchoolPage />} />
            <Route path="/admin/setup" element={<SchoolSetupWizard />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Dashboard Routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/buses" element={<BusesPage />} />
              <Route path="/drivers" element={<DriversPage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/parents" element={<ParentsPage />} />
              <Route path="/routes" element={<RoutesPage />} />
              <Route path="/stops" element={<RoutesPage />} />
              {/* Driver Portal - tab-based sub-routes */}
              <Route path="/driver" element={<DriverDashboard />} />
              <Route path="/driver/passengers" element={<DriverPassengersTab />} />
              <Route path="/driver/bus" element={<DriverBusTab />} />
              <Route path="/driver/profile" element={<DriverProfileTab />} />
              {/* Parent Portal */}
              <Route path="/parent" element={<ParentDashboard />} />
              <Route path="/parent/tracking" element={<ParentTrackingTab />} />
              <Route path="/parent/settings" element={<ParentSettingsPage />} />
              {/* Admin Map */}
              <Route path="/tracking" element={<TrackingPage />} />
              <Route path="/schools" element={<PlaceholderPage title="Schools" />} />
              <Route path="/trips" element={<TripsPage />} />
              <Route path="/notifications" element={<ParentAlertsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Redirects */}
            <Route path="/" element={<SmartRedirect />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          className: 'text-sm font-medium dark:bg-gray-800 dark:text-white border dark:border-gray-700',
          style: {
            borderRadius: '12px',
          }
        }} 
      />
    </QueryClientProvider>
  );
}

/**
 * Placeholder page for modules not yet implemented.
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
 * 404 Page
 */
function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-gray-950">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-brand-500 mb-4">404</h1>
        <p className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-2">Page Not Found</p>
        <p className="text-sm text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
        <a
          href="/dashboard"
          className="px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-colors"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}

/**
 * Smart Redirect — auto-detects if user is already logged in on this device.
 * If they are, sends them straight to their dashboard (driver/parent/admin).
 * If not, sends them to login.
 */
function SmartRedirect() {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user) {
    const path = user.role === ROLES.DRIVER
      ? '/driver'
      : user.role === ROLES.PARENT
        ? '/parent'
        : '/dashboard';
    return <Navigate to={path} replace />;
  }

  return <Navigate to="/login" replace />;
}

export default App;
