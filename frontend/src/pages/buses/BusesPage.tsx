/**
 * Buses Management Page — CRUD for bus fleet management.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Bus as BusIcon, Search, Plus, Pencil, Trash2, X, Gauge,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Bus, Route, PaginatedResponse } from '@/types';

const busSchema = z.object({
  bus_number: z.string().min(1, 'Bus number is required'),
  registration_number: z.string().optional(),
  model: z.string().optional(),
  capacity: z.coerce.number().min(1).max(100),
  assigned_route_id: z.string().nullable().optional(),
  status: z.string().optional(),
});

type BusFormData = z.infer<typeof busSchema>;

export function BusesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [page] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editBus, setEditBus] = useState<Bus | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<Bus>>({
    queryKey: ['buses', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: '15' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/buses?${params}`);
      return res.data;
    },
  });

  const createBus = useMutation({
    mutationFn: (formData: BusFormData) =>
      api.post('/buses', { ...formData, school_id: user?.school_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
      setShowCreateModal(false);
      toast.success('Bus added successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to add bus'),
  });

  const updateBus = useMutation({
    mutationFn: ({ id, ...formData }: BusFormData & { id: string }) =>
      api.patch(`/buses/${id}`, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
      setEditBus(null);
      toast.success('Bus updated successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update bus'),
  });

  const deleteBus = useMutation({
    mutationFn: (id: string) => api.delete(`/buses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
      toast.success('Bus deleted successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to delete bus'),
  });

  const toggleBusStatus = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      return api.patch(`/buses/${id}`, { status: newStatus });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
      const newStatus = variables.currentStatus === 'active' ? 'INACTIVE' : 'ACTIVE';
      toast.success(`Bus set to ${newStatus}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update bus status'),
  });

  const buses = data?.items ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bus Fleet Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage school buses, seating capacity, and real-time status
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Bus
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by bus number or registration..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-700 dark:text-gray-300"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {/* Bus Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : buses.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <BusIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No buses found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buses.map((bus) => (
            <motion.div
              key={bus.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                    <BusIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{bus.bus_number}</h3>
                    <p className="text-xs text-gray-400">{bus.registration_number || 'No reg info'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      bus.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : bus.status === 'on_trip'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        : bus.status === 'maintenance'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        bus.status === 'active'
                          ? 'bg-emerald-500 animate-pulse'
                          : bus.status === 'on_trip'
                          ? 'bg-blue-500 animate-pulse'
                          : bus.status === 'maintenance'
                          ? 'bg-amber-500'
                          : 'bg-gray-400'
                      }`}
                    />
                    {bus.status === 'active' ? 'ACTIVE' : bus.status === 'on_trip' ? 'ON TRIP' : bus.status === 'maintenance' ? 'MAINTENANCE' : 'INACTIVE'}
                  </span>

                  {/* Quick Toggle Switch on Bus Card */}
                  <button
                    type="button"
                    role="switch"
                    title={bus.status === 'active' ? 'Click to make Inactive' : 'Click to make Active'}
                    aria-checked={bus.status === 'active'}
                    disabled={toggleBusStatus.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBusStatus.mutate({ id: bus.id, currentStatus: bus.status });
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      bus.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        bus.status === 'active' ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-gray-50 dark:border-gray-700/50">
                <div>
                  <span className="text-gray-400">Capacity:</span>{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-200">{bus.capacity} seats</span>
                </div>
                <div>
                  <span className="text-gray-400">Model:</span>{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-200">{bus.model || 'Standard'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Gauge className="w-3.5 h-3.5 text-gray-400" />
                  <span>{bus.current_speed} km/h</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditBus(bus)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteBus.mutate(bus.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(showCreateModal || editBus) && (
        <BusFormModal
          bus={editBus}
          onClose={() => { setShowCreateModal(false); setEditBus(null); }}
          onSubmit={(data) => {
            const payload = { ...data };
            if (payload.assigned_route_id === '') {
              payload.assigned_route_id = null;
            }
            if (editBus) updateBus.mutate({ id: editBus.id, ...payload });
            else createBus.mutate(payload);
          }}
        />
      )}
    </div>
  );
}

function BusFormModal({
  bus,
  onClose,
  onSubmit,
}: {
  bus: Bus | null;
  onClose: () => void;
  onSubmit: (data: BusFormData) => void;
}) {
  const { data: routesData } = useQuery<PaginatedResponse<Route>>({
    queryKey: ['routes', 1, '', ''],
    queryFn: async () => {
      const res = await api.get('/routes?page=1&page_size=100');
      return res.data;
    },
  });

  const routes = routesData?.items ?? [];

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<BusFormData>({
    resolver: zodResolver(busSchema),
    defaultValues: {
      bus_number: bus?.bus_number ?? '',
      registration_number: bus?.registration_number ?? '',
      model: bus?.model ?? '',
      capacity: bus?.capacity ?? 40,
      assigned_route_id: bus?.assigned_route_id ?? '',
      status: bus?.status ?? 'active',
    },
  });

  const currentStatus = watch('status') || 'active';
  const isActive = currentStatus === 'active';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <h3 className="font-bold text-gray-900 dark:text-white">
            {bus ? 'Edit Bus Details' : 'Add New Bus'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d: BusFormData) => onSubmit(d))} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Bus Number *</label>
            <input
              {...register('bus_number')}
              placeholder="e.g. BUS-101"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            />
            {errors.bus_number && <p className="text-xs text-red-500 mt-1">{errors.bus_number.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Registration Number</label>
            <input
              {...register('registration_number')}
              placeholder="e.g. KA 01 AB 1234"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Capacity (Seats)</label>
              <input
                type="number"
                {...register('capacity')}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Model / Make</label>
              <input
                {...register('model')}
                placeholder="e.g. Tata Starbus"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Assigned Route</label>
            <select
              {...register('assigned_route_id')}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            >
              <option value="">No Route Assigned</option>
              {routes.map(route => (
                <option key={route.id} value={route.id}>{route.name}</option>
              ))}
            </select>
          </div>

          {/* Operating Status Toggle Switch */}
          <div className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                  Bus Operating Status
                </label>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {isActive
                    ? 'Active — Ready for routes & live GPS tracking'
                    : 'Inactive — Off-duty, unavailable for trips'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                    }`}
                  />
                  {isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>

                {/* Switch button */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  onClick={() => setValue('status', isActive ? 'inactive' : 'active', { shouldDirty: true })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium"
            >
              Save Bus
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
