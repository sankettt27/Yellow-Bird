/**
 * Driver Bus Tab — Shows assigned bus details and route info.
 */

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Bus as BusIcon, Route, MapPin,
} from 'lucide-react';
import api from '@/lib/api';
import type { Driver } from '@/types';
import { useAuthStore } from '@/stores/authStore';

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <span className="flex items-center gap-2 text-xs text-gray-400">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </span>
      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{value || '—'}</span>
    </div>
  );
}

export function DriverBusTab() {
  const { user } = useAuthStore();

  const { data: driver } = useQuery<Driver>({
    queryKey: ['driver-me'],
    queryFn: async () => {
      const res = await api.get('/drivers/me');
      return res.data;
    },
    enabled: user?.role === 'driver',
  });

  const { data: connections } = useQuery({
    queryKey: ['driver-me-connections'],
    queryFn: async () => {
      const res = await api.get('/drivers/me/connections');
      return res.data;
    },
    enabled: !!driver,
  });

  const { data: busDetails } = useQuery({
    queryKey: ['bus-detail', driver?.assigned_bus_id],
    queryFn: async () => {
      const res = await api.get(`/buses/${driver!.assigned_bus_id}`);
      return res.data;
    },
    enabled: !!driver?.assigned_bus_id,
  });

  if (!driver?.assigned_bus_id) {
    return (
      <div className="p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 flex items-center gap-4"
        >
          <MapPin className="w-10 h-10 text-amber-500 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">No Bus Assigned</h3>
            <p className="text-xs text-gray-500 mt-0.5">Contact your school admin to assign a bus.</p>
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
        <div className="px-4 pt-4 pb-2 border-b border-gray-50 dark:border-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BusIcon className="w-4 h-4 text-brand-500" />
            Assigned Bus
          </h3>
        </div>
        <div className="px-4 py-1">
          {busDetails ? (
            <>
              <InfoRow label="Bus Number" value={busDetails.bus_number} icon={BusIcon} />
              <InfoRow label="Registration" value={busDetails.registration_number} />
              <InfoRow label="Model" value={busDetails.model} />
              <InfoRow label="Capacity" value={busDetails.capacity ? `${busDetails.capacity} seats` : null} />
              <InfoRow label="Route" value={connections?.route_name} icon={Route} />
              <InfoRow label="Bus Status" value={busDetails.status} />
            </>
          ) : (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin" />
              Loading bus details...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
