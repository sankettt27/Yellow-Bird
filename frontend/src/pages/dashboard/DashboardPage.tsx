/**
 * Dashboard Page — Statistics overview with animated cards and charts.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bus, Users, GraduationCap, Route, Navigation, UserCog,
  TrendingUp, Activity, MapPin, School, ArrowUpRight, ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@/lib/constants';
import api from '@/lib/api';
import type { DashboardStats } from '@/types';

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bg: string;
  change?: string;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdminPath = window.location.pathname.startsWith('/admin');
  const getPath = (route: string) => (isAdminPath ? `/admin${route}` : route);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get<DashboardStats>('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  const statCards: StatCard[] = [
    ...(isSuperAdmin ? [{
      label: 'Total Schools',
      value: stats?.total_schools ?? 0,
      icon: School,
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-500/10',
      change: '+2 this month',
    }] : []),
    {
      label: 'Total Buses',
      value: stats?.total_buses ?? 0,
      icon: Bus,
      color: 'text-brand-500',
      bg: 'bg-brand-50 dark:bg-brand-500/10',
    },
    {
      label: 'Active Buses',
      value: stats?.active_buses ?? 0,
      icon: Navigation,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-500/10',
    },
    {
      label: 'Total Drivers',
      value: stats?.total_drivers ?? 0,
      icon: UserCog,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      label: 'Online Drivers',
      value: stats?.online_drivers ?? 0,
      icon: Activity,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'Total Students',
      value: stats?.total_students ?? 0,
      icon: GraduationCap,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    },
    {
      label: 'Total Routes',
      value: stats?.total_routes ?? 0,
      icon: Route,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    },
    {
      label: "Today's Trips",
      value: stats?.today_trips ?? 0,
      icon: TrendingUp,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {user?.full_name}. Here's your transportation overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="mt-4">
                {loading ? (
                  <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {card.value}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
              </div>
              {card.change && (
                <p className="text-xs text-green-600 font-medium mt-2">{card.change}</p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions / Active Trips Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Trips Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Trips</h3>
            <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-semibold">
              {stats?.active_trips ?? 0} Running
            </span>
          </div>
          {(stats?.active_trips ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <Navigation className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No active trips at the moment</p>
              <p className="text-xs text-gray-400 mt-1">Trips will appear here when drivers start tracking</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Active trip data will appear here in Phase 4.</p>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400">
              Shortcuts
            </span>
          </div>
          <div className="space-y-2.5">
            {[
              {
                label: 'Add New Bus',
                desc: 'Register a vehicle to your fleet',
                icon: Bus,
                color: 'text-amber-600 dark:text-amber-400',
                bg: 'bg-amber-100 dark:bg-amber-500/20',
                onClick: () => navigate(getPath('/buses?new=true')),
              },
              {
                label: 'Manage Routes',
                desc: 'Create, edit and assign routes',
                icon: Route,
                color: 'text-blue-600 dark:text-blue-400',
                bg: 'bg-blue-100 dark:bg-blue-500/20',
                onClick: () => navigate(getPath('/routes')),
              },
              {
                label: 'View Live Map',
                desc: 'Monitor real-time GPS locations',
                icon: MapPin,
                color: 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-emerald-100 dark:bg-emerald-500/20',
                onClick: () => navigate(getPath('/tracking')),
              },
              {
                label: 'Manage Drivers',
                desc: 'View & assign school bus drivers',
                icon: Users,
                color: 'text-purple-600 dark:text-purple-400',
                bg: 'bg-purple-100 dark:bg-purple-500/20',
                onClick: () => navigate(getPath('/drivers')),
              },
            ].map(({ label, desc, icon: QIcon, color, bg, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 hover:bg-brand-50/70 dark:hover:bg-gray-700 hover:border-brand-200 dark:hover:border-brand-500/30 border border-transparent transition-all group text-left cursor-pointer shadow-sm hover:shadow"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    <QIcon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 block group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {label}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                      {desc}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
