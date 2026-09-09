/**
 * Driver Passengers Tab — Shows students assigned to this driver's bus.
 */

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, GraduationCap, MapPin, Phone, AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import type { Driver } from '@/types';
import { useAuthStore } from '@/stores/authStore';

export function DriverPassengersTab() {
  const { user } = useAuthStore();

  const { data: driver } = useQuery<Driver>({
    queryKey: ['driver-me'],
    queryFn: async () => {
      const res = await api.get('/drivers/me');
      return res.data;
    },
    enabled: user?.role === 'driver',
  });

  const { data: connections, isLoading } = useQuery({
    queryKey: ['driver-me-connections'],
    queryFn: async () => {
      const res = await api.get('/drivers/me/connections');
      return res.data;
    },
    enabled: !!driver,
  });

  if (!driver?.assigned_bus_id) {
    return (
      <div className="p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex items-center gap-4"
        >
          <AlertTriangle className="w-10 h-10 text-amber-500 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">No Bus Assigned</h3>
            <p className="text-xs text-gray-500 mt-0.5">Contact your school admin to assign a bus to see your passengers.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-500" />
            My Passengers
            {connections?.students && (
              <span className="ml-1 px-2.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-[10px] font-bold">
                {connections.students.length}
              </span>
            )}
          </h3>
        </div>
        <div className="overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-gray-400">Loading passengers...</div>
          ) : connections?.students?.length > 0 ? (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {connections.students.map((s: any) => (
                <div key={s.student_id} className="px-4 py-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-brand-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-gray-900 dark:text-white block">{s.student_name}</span>
                      {s.class_name && (
                        <span className="text-[10px] text-gray-400">
                          Class {s.class_name}{s.section ? `-${s.section}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-10">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-400">Parent</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{s.parent_name || '—'}</p>
                      {s.parent_phone && (
                        <a href={`tel:${s.parent_phone}`} className="inline-flex items-center gap-1 text-[10px] text-green-500 font-medium mt-0.5">
                          <Phone className="w-3 h-3" />
                          {s.parent_phone}
                        </a>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <p className="text-[10px] text-gray-400">Pickup Stop</p>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-green-500" />
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">{s.pickup_stop_name || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
              No students assigned to this bus yet.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
