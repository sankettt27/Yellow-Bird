/**
 * DashboardLayout — wraps all authenticated pages.
 * Role-aware: Admin users get the desktop Sidebar + Topbar.
 * Driver and Parent users get the mobile-first MobileLayout.
 */

import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@/lib/constants';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileLayout } from './MobileLayout';

const SIDEBAR_WIDTH = 260;

export function DashboardLayout() {
  const { isAuthenticated, user } = useAuthStore();

  // Synchronous guard — no useEffect needed since store initializes from sessionStorage eagerly
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Mobile-first layout for Driver and Parent roles
  const isMobileRole = user?.role === ROLES.DRIVER || user?.role === ROLES.PARENT;
  if (isMobileRole) {
    return <MobileLayout />;
  }

  // Desktop layout for Admin roles
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

