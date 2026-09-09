/**
 * Dashboard Page — Statistics overview with animated cards and charts.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bus, Users, GraduationCap, Route, Navigation, UserCog,
  TrendingUp, Activity, MapPin, School, ArrowUpRight,
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
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Add New Bus', icon: Bus },
              { label: 'Manage Routes', icon: Route },
              { label: 'View Live Map', icon: MapPin },
              { label: 'Manage Drivers', icon: Users },
            ].map(({ label, icon: QIcon }) => (
              <button
                key={label}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors text-left"
              >
                <QIcon className="w-4 h-4 text-gray-400" />
                {label}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
