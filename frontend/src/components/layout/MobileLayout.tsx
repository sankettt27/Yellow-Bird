/**
 * YellowBird mobile shell — shared parent/driver navigation.
 * Authentication and role assignment remain owned by the existing backend.
 */
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BusFront, MapPinned, UsersRound, UserRound, Bell, House,
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
  { label: 'Bus', icon: BusFront, path: '/driver' },
  { label: 'Passengers', icon: UsersRound, path: '/driver/passengers' },
  { label: 'Profile', icon: UserRound, path: '/driver/profile' },
];

const parentTabs: TabItem[] = [
  { label: 'Home', icon: House, path: '/parent' },
  { label: 'Tracking', icon: MapPinned, path: '/parent/tracking' },
  { label: 'Alerts', icon: Bell, path: '/notifications' },
  { label: 'Profile', icon: UserRound, path: '/parent/settings' },
];

export function MobileLayout() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isDriver = user?.role === ROLES.DRIVER;
  const tabs = isDriver ? driverTabs : parentTabs;
  const settingsPath = isDriver ? '/driver/profile' : '/parent/settings';
  const firstName = user?.full_name?.trim().split(/\s+/)[0] || 'there';
  const initials = user?.full_name?.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2) || 'Y';

  return (
    <div className="yb-app-shell min-h-screen flex flex-col">
      <header className="yb-topbar sticky top-0 z-40">
        <div className="mx-auto flex h-[68px] max-w-3xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="yb-brand-mark" aria-hidden="true">
              <BusFront className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#88764f]">
                YellowBird
              </p>
              <h1 className="truncate text-[15px] font-bold leading-tight text-[#35433B]">
                {isDriver ? 'Driver workspace' : 'Family workspace'}
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(settingsPath)}
            className="yb-account-button"
            aria-label="Open profile and settings"
          >
            <span className="yb-avatar">{initials}</span>
            <span className="hidden max-w-[112px] truncate text-xs font-semibold text-[#35433B] sm:block">
              {firstName}
            </span>
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-0 pb-28 sm:px-4">
        <div className="w-full flex-1">
          <Outlet />
        </div>
      </main>

      <nav className="yb-bottom-nav fixed inset-x-0 bottom-0 z-40" aria-label="Main navigation">
        <div
          className={cn('mx-auto grid h-[76px] max-w-3xl px-2', isDriver ? 'grid-cols-3' : 'grid-cols-4')}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {tabs.map((tab) => {
            const isActive = tab.path === '/driver' || tab.path === '/parent'
              ? location.pathname === tab.path
              : location.pathname.startsWith(tab.path);
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex flex-col items-center justify-center gap-1"
              >
                {isActive && (
                  <motion.span
                    layoutId="yb-tab-indicator"
                    className="absolute top-0 h-[3px] w-9 rounded-full bg-[#D49B24]"
                    transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                  />
                )}
                <span className={cn('yb-tab-icon', isActive && 'yb-tab-icon-active')}>
                  <tab.icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.4 : 1.9} />
                </span>
                <span className={cn('text-[10px] font-semibold', isActive ? 'text-[#35433B]' : 'text-[#9B927F]')}>
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
