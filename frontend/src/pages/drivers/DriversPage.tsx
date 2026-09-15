/**
 * Drivers Management Page — Driver profile, license details, emergency contact.
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserCog, Search, Phone, Shield, Bus, Pencil, X, Plus, Users, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Driver, Bus as BusType, PaginatedResponse } from '@/types';

const driverSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Name is required'),
  phone: z.string().optional(),
  license_number: z.string().optional(),
  license_expiry: z.string().optional(),
  emergency_contact: z.string().optional(),
});
type DriverFormData = z.infer<typeof driverSchema>;

export function DriversPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [page] = useState(1);
  const [search, setSearch] = useState('');
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(
    searchParams.get('new') === 'true' || searchParams.get('action') === 'add'
  );
  const [viewConnections, setViewConnections] = useState<Driver | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<Driver>>({
    queryKey: ['drivers', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: '15' });
      if (search) params.set('search', search);
      const res = await api.get(`/drivers?${params}`);
      return res.data;
    },
  });

  // Fetch buses for the assign bus dropdown
  const { data: busesData } = useQuery<PaginatedResponse<BusType>>({
    queryKey: ['buses-list'],
    queryFn: async () => {
      const res = await api.get('/buses?page=1&page_size=100');
      return res.data;
    },
  });
  const busesList = busesData?.items ?? [];

  const updateDriver = useMutation({
    mutationFn: ({ id, ...formData }: Partial<Driver> & { id: string }) =>
      api.patch(`/drivers/${id}`, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['buses-list'] });
      setEditDriver(null);
      toast.success('Driver updated successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update driver'),
  });

  const createDriver = useMutation({
    mutationFn: (formData: DriverFormData) => api.post('/drivers', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setShowCreateModal(false);
      toast.success('Driver registered successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to create driver'),
  });

  const drivers = data?.items ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Drivers Directory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage driver profiles, driving licenses, and emergency contacts
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Driver
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by driver name, license number, phone..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No drivers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((driver) => (
            <motion.div
              key={driver.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
                    {driver.user?.full_name.split(' ').map(n => n[0]).join('').slice(0, 2) ?? 'DR'}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{driver.user?.full_name ?? 'Unknown Driver'}</h3>
                    <p className="text-xs text-gray-400">{driver.user?.email}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setViewConnections(driver)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                    title="View Connections"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditDriver(driver)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                    title="Edit Driver"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> License No:
                  </span>
                  <span className="font-semibold">{driver.license_number || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Emergency Contact:
                  </span>
                  <span>{driver.emergency_contact || driver.user?.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Bus className="w-3.5 h-3.5" /> Assigned Bus:
                  </span>
                  <span className={`font-medium text-xs px-2 py-0.5 rounded-full ${
                    driver.assigned_bus_id
                      ? 'text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-brand-900/20'
                      : 'text-gray-400 bg-gray-100 dark:bg-gray-800'
                  }`}>
                    {driver.assigned_bus_id
                      ? (busesList.find(b => b.id === driver.assigned_bus_id)?.bus_number || 'Assigned')
                      : 'Unassigned'
                    }
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {editDriver && (
        <EditDriverModal
          driver={editDriver}
          buses={busesList}
          onClose={() => setEditDriver(null)}
          onSubmit={(data) => updateDriver.mutate({ id: editDriver.id, ...data })}
        />
      )}

      {showCreateModal && (
        <CreateDriverModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createDriver.mutate(data)}
        />
      )}

      {viewConnections && (
        <DriverConnectionsModal
          driver={viewConnections}
          onClose={() => setViewConnections(null)}
        />
      )}
    </div>
  );
}

function EditDriverModal({
  driver,
  buses,
  onClose,
  onSubmit,
}: {
  driver: Driver;
  buses: BusType[];
  onClose: () => void;
  onSubmit: (data: Partial<Driver>) => void;
}) {
  const [licenseNumber, setLicenseNumber] = useState(driver.license_number ?? '');
  const [licenseExpiry, setLicenseExpiry] = useState(driver.license_expiry ?? '');
  const [emergencyContact, setEmergencyContact] = useState(driver.emergency_contact ?? '');
  const [assignedBusId, setAssignedBusId] = useState(driver.assigned_bus_id ?? '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Edit Driver Profile</h3>
            <p className="text-xs text-gray-400 mt-0.5">{driver.user?.full_name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Driver Info Preview */}
        <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3 space-y-1 text-xs">
          <p className="font-semibold text-brand-700 dark:text-brand-300">{driver.user?.full_name}</p>
          <p className="text-gray-500">{driver.user?.email}</p>
          {driver.user?.phone && <p className="text-gray-500">{driver.user?.phone}</p>}
        </div>

        <div className="space-y-4">
          {/* Assign Bus */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Assign Bus</label>
            <select
              value={assignedBusId}
              onChange={(e) => setAssignedBusId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            >
              <option value="">-- Unassigned --</option>
              {buses.map(bus => (
                <option key={bus.id} value={bus.id}>
                  {bus.bus_number}{bus.registration_number ? ` (${bus.registration_number})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">License Number</label>
              <input
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. DL-14201..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">License Expiry</label>
              <input
                type="date"
                value={licenseExpiry}
                onChange={(e) => setLicenseExpiry(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Emergency Contact Phone</label>
            <input
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit({
                license_number: licenseNumber || undefined,
                license_expiry: licenseExpiry || undefined,
                emergency_contact: emergencyContact || undefined,
                assigned_bus_id: assignedBusId || null,
              })}
              className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateDriverModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: DriverFormData) => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <h3 className="font-bold text-gray-900 dark:text-white">Register New Driver</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => onSubmit(d))} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Full Name *</label>
            <input
              {...register('full_name')}
              placeholder="Driver's Full Name"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            />
            {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Email *</label>
              <input
                {...register('email')}
                placeholder="driver@example.com"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Password *</label>
              <input
                type="password"
                {...register('password')}
                placeholder="Min 6 chars"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Phone</label>
              <input
                {...register('phone')}
                placeholder="+91..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Emergency Contact</label>
              <input
                {...register('emergency_contact')}
                placeholder="+91..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">License Number</label>
            <input
              {...register('license_number')}
              placeholder="e.g. DL-..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            />
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
              Create Driver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DriverConnectionsModal({
  driver,
  onClose,
}: {
  driver: Driver;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<import('@/types').DriverConnectionsResponse>({
    queryKey: ['driver-connections', driver.id],
    queryFn: async () => {
      const res = await api.get(`/drivers/${driver.id}/connections`);
      return res.data;
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Connected Students & Parents</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {driver.user?.full_name} • {data?.bus_number || 'No Bus'} • {data?.route_name || 'No Route'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>
          ) : data?.students && data.students.length > 0 ? (
            <div className="space-y-3">
              {data.students.map((student) => (
                <div key={student.student_id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-brand-500" />
                      <span className="font-bold text-sm text-gray-900 dark:text-white">{student.student_name}</span>
                      <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                        Class {student.class_name || '—'}{student.section ? `-${student.section}` : ''}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase">Parent</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{student.parent_name || '—'}</p>
                      <p className="text-xs text-gray-500">{student.parent_phone || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase">Stops</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="text-green-500 font-medium">P:</span> {student.pickup_stop_name || '—'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="text-red-500 font-medium">D:</span> {student.drop_stop_name || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Users className="w-10 h-10 mb-2 opacity-20" />
              <p>No students connected to this driver.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
