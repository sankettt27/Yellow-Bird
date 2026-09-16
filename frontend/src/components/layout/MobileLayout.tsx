/**
 * MobileLayout — Mobile-first shell for Driver and Parent users.
 * Features a compact top header and iOS/Android-style bottom tab navigation.
 * Replaces the desktop Sidebar + Topbar for mobile roles.
 */

import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bus, Navigation, Users, User, GraduationCap,
  MapPin, Bell,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface TabItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const driverTabs: TabItem[] = [
  { label: 'Trip', icon: Navigation, path: '/driver' },
  { label: 'Passengers', icon: Users, path: '/driver/passengers' },
  { label: 'Bus', icon: Bus, path: '/driver/bus' },
  { label: 'Profile', icon: User, path: '/driver/profile' },
];

const parentTabs: TabItem[] = [
  { label: 'My Children', icon: GraduationCap, path: '/parent' },
  { label: 'Track Bus', icon: MapPin, path: '/parent/tracking' },
  { label: 'Alerts', icon: Bell, path: '/notifications' },
];

export function MobileLayout() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const isDriver = user?.role === ROLES.DRIVER;
  const tabs = isDriver ? driverTabs : parentTabs;

  const settingsPath = isDriver ? '/driver/profile' : '/parent/settings';

  return (
    <div className="min-h-screen bg-surface dark:bg-gray-950 flex flex-col">
      {/* ── Mobile Header ── */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Bus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-none">YellowBird</h1>
              <p className="text-[10px] text-gray-400 font-medium leading-none mt-0.5">
                {isDriver ? 'Driver Portal' : 'Parent Portal'}
              </p>
            </div>
          </div>

          {/* User Avatar (tappable → Settings) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(settingsPath)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 transition-colors active:scale-95"
            >
              <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-[10px] font-bold">
                {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 max-w-[80px] truncate">
                {user?.full_name?.split(' ')[0]}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Content Area ── */}
      <main className="flex-1 flex flex-col overflow-y-auto pb-20 relative">
        <Outlet />
      </main>

      {/* ── Bottom Tab Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200/60 dark:border-gray-800/60"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const isActive = tab.path === '/driver'
              ? location.pathname === '/driver'
              : location.pathname.startsWith(tab.path);

            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-indicator"
                    className="absolute -top-0.5 w-8 h-1 rounded-full bg-brand-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <div className={cn(
                  'w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200',
                  isActive
                    ? 'bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 scale-110'
                    : 'text-gray-400 dark:text-gray-500'
                )}>
                  <tab.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5px]')} />
                </div>
                <span className={cn(
                  'text-[10px] font-semibold transition-colors',
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-gray-400 dark:text-gray-500'
                )}>
                  {tab.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
