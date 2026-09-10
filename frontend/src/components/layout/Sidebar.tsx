/**
 * Sidebar navigation — collapsible, role-aware, premium dark design.
 */

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Bus, Users, GraduationCap, MapPin, Route,
  Navigation, BarChart3, Settings, School, ChevronLeft,
  ChevronRight, UserCog, History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { ROLES, ROLE_LABELS } from '@/lib/constants';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Users', icon: Users, path: '/admin/users', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Schools', icon: School, path: '/admin/schools', roles: [ROLES.SUPER_ADMIN] },
  { label: 'Buses', icon: Bus, path: '/admin/buses', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Drivers', icon: UserCog, path: '/admin/drivers', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Students', icon: GraduationCap, path: '/admin/students', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Parents', icon: Users, path: '/admin/parents', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Routes', icon: Route, path: '/admin/routes', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Bus Stops', icon: MapPin, path: '/admin/stops', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Live Tracking', icon: Navigation, path: '/admin/tracking', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Trips', icon: History, path: '/admin/trips', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Reports', icon: BarChart3, path: '/admin/reports', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
  { label: 'Settings', icon: Settings, path: '/admin/settings', roles: [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();
  const location = useLocation();

  const filteredItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-sidebar border-r border-gray-800"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-800">
        <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
          <Bus className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h1 className="text-sm font-bold text-white leading-tight">YellowBird</h1>
              <p className="text-[10px] text-gray-500 font-medium">Management System</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path ||
            location.pathname.startsWith(item.path + '/');
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              )}
            >
              <Icon className={cn(
                'w-[18px] h-[18px] flex-shrink-0 transition-colors',
                isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'
              )} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 w-[3px] h-6 bg-brand-500 rounded-r-full"
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Card & Collapse Toggle */}
      <div className="border-t border-gray-800 p-3">
        <AnimatePresence>
          {!collapsed && user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 p-2 rounded-xl bg-gray-800/50 mb-2"
            >
              <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold flex-shrink-0">
                {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
                <p className="text-[10px] text-gray-500">{ROLE_LABELS[user.role]}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
