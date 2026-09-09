/**
 * Parents Directory Page — Admin view to manage parents, see their children,
 * bus assignments, and full connectivity chain.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users, Search, Plus, Pencil, X, Phone, MapPin,
  GraduationCap, Bus, UserCog, Route, Eye, Loader2, Upload, FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface ParentUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface ParentItem {
  id: string;
  user_id: string;
  address: string | null;
  alternate_phone: string | null;
  created_at: string;
  user: ParentUser | null;
}

interface PaginatedParents {
  items: ParentItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface ChildConnection {
  student_id: string;
  student_name: string;
  class_name: string | null;
  section: string | null;
  bus_number: string | null;
  bus_status: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  route_name: string | null;
  pickup_stop: string | null;
  drop_stop: string | null;
}

interface ParentConnections {
  parent_id: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string | null;
  address: string | null;
  children_count: number;
  children: ChildConnection[];
}

const parentSchema = z.object({
  email: z.string().min(1, 'Email or username required'),
  password: z.string().min(6, 'Min 6 characters'),
  full_name: z.string().min(2, 'Name required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  alternate_phone: z.string().optional(),
});
type ParentFormData = z.infer<typeof parentSchema>;

export function ParentsPage() {
  const queryClient = useQueryClient();
  const [page] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editParent, setEditParent] = useState<ParentItem | null>(null);
  const [viewConnections, setViewConnections] = useState<ParentItem | null>(null);

  const { data, isLoading } = useQuery<PaginatedParents>({
    queryKey: ['parents', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: '20' });
      if (search) params.set('search', search);
      const res = await api.get(`/parents?${params}`);
      return res.data;
    },
  });

  const createParent = useMutation({
    mutationFn: (formData: ParentFormData) => api.post('/parents', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      setShowCreateModal(false);
      toast.success('Parent registered successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to register parent'),
  });

  const updateParent = useMutation({
    mutationFn: ({ id, ...formData }: any) => api.patch(`/parents/${id}`, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      setEditParent(null);
      toast.success('Parent updated successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update parent'),
  });

  const parents = data?.items ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Parents Directory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage parent accounts, view their children, and track connected buses
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Excel
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Parent
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by parent name, email, or phone..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
      </div>

      {/* Stats Bar */}
      {data && (
        <div className="flex gap-4">
          <div className="px-4 py-2 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
            <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold">Total Parents</span>
            <span className="ml-2 text-sm font-bold text-brand-700 dark:text-brand-300">{data.total}</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && parents.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No parents found</p>
          <p className="text-xs text-gray-400 mt-1">Register a parent to get started.</p>
        </div>
      )}

      {/* Cards Grid */}
      {parents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parents.map((parent, i) => (
            <motion.div
              key={parent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4 hover:shadow-md transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold">
                    {parent.user?.full_name.split(' ').map(n => n[0]).join('').slice(0, 2) ?? 'P'}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {parent.user?.full_name ?? 'Unknown'}
                    </h3>
                    <p className="text-xs text-gray-400">{parent.user?.email}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setViewConnections(parent)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                    title="View Connections"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditParent(parent)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Phone:
                  </span>
                  <span className="font-semibold">{parent.user?.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Address:
                  </span>
                  <span className="font-medium truncate max-w-[180px]">{parent.address || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> Alt Phone:
                  </span>
                  <span>{parent.alternate_phone || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    parent.user?.is_active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {parent.user?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && !editParent && (
        <CreateParentModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createParent.mutate(data)}
        />
      )}

      {editParent && (
        <EditParentModal
          parent={editParent}
          onClose={() => setEditParent(null)}
          onSubmit={(data) => updateParent.mutate({ id: editParent.id, ...data })}
        />
      )}

      {showUploadModal && (
        <ParentUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            queryClient.invalidateQueries({ queryKey: ['parents'] });
          }}
        />
      )}

      {viewConnections && (
        <ParentConnectionsModal
          parent={viewConnections}
          onClose={() => setViewConnections(null)}
        />
      )}
    </div>
  );
}


/* ─── Create Parent Modal ─────────────────────────────────── */

function CreateParentModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: ParentFormData) => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ParentFormData>({
    resolver: zodResolver(parentSchema),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <h3 className="font-bold text-gray-900 dark:text-white">Register New Parent</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">Full Name *</label>
            <input {...register('full_name')} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
            {errors.full_name && <p className="text-xs text-red-500 mt-0.5">{errors.full_name.message}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Email *</label>
            <input {...register('email')} type="email" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
            {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Password *</label>
            <input {...register('password')} type="password" className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
            {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Phone</label>
              <input {...register('phone')} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Alt Phone</label>
              <input {...register('alternate_phone')} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Address</label>
            <input {...register('address')} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 dark:text-gray-300">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium">
              Register Parent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


/* ─── Edit Parent Modal ───────────────────────────────────── */

function EditParentModal({
  parent,
  onClose,
  onSubmit,
}: {
  parent: ParentItem;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [fullName, setFullName] = useState(parent.user?.full_name ?? '');
  const [phone, setPhone] = useState(parent.user?.phone ?? '');
  const [address, setAddress] = useState(parent.address ?? '');
  const [altPhone, setAltPhone] = useState(parent.alternate_phone ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ full_name: fullName, phone, address, alternate_phone: altPhone });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <h3 className="font-bold text-gray-900 dark:text-white">Edit Parent</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Alt Phone</label>
              <input value={altPhone} onChange={(e) => setAltPhone(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 dark:text-gray-300">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


/* ─── Parent Connections Modal ────────────────────────────── */

function ParentConnectionsModal({
  parent,
  onClose,
}: {
  parent: ParentItem;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<ParentConnections>({
    queryKey: ['parent-connections', parent.id],
    queryFn: async () => {
      const res = await api.get(`/parents/${parent.id}/connections`);
      return res.data;
    },
  });

  const busStatusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    on_trip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Parent Connections</h3>
            {data && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {data.parent_name} • {data.parent_email} • {data.children_count} child(ren)
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Parent Info */}
        {data && (
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-gray-400 font-semibold uppercase text-[10px]">Phone</p>
              <p className="font-medium text-gray-700 dark:text-gray-200 mt-0.5">{data.parent_phone || '—'}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-gray-400 font-semibold uppercase text-[10px]">Address</p>
              <p className="font-medium text-gray-700 dark:text-gray-200 mt-0.5 truncate">{data.address || '—'}</p>
            </div>
            <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-900/20">
              <p className="text-brand-500 font-semibold uppercase text-[10px]">Children</p>
              <p className="font-bold text-brand-700 dark:text-brand-300 mt-0.5 text-lg">{data.children_count}</p>
            </div>
          </div>
        )}

        {/* Children List */}
        <div className="flex-1 overflow-y-auto min-h-[200px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading connections...
            </div>
          ) : data?.children && data.children.length > 0 ? (
            <div className="space-y-3">
              {data.children.map((child) => (
                <div key={child.student_id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  {/* Student Name */}
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap className="w-4 h-4 text-brand-500" />
                    <span className="font-bold text-sm text-gray-900 dark:text-white">{child.student_name}</span>
                    <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                      Class {child.class_name || '—'}{child.section ? `-${child.section}` : ''}
                    </span>
                  </div>

                  {/* Connection Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Bus className="w-3.5 h-3.5 text-gray-400" />
                      <div>
                        <span className="text-gray-400">Bus: </span>
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{child.bus_number || '—'}</span>
                        {child.bus_status && (
                          <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${busStatusColors[child.bus_status] || ''}`}>
                            {child.bus_status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCog className="w-3.5 h-3.5 text-gray-400" />
                      <div>
                        <span className="text-gray-400">Driver: </span>
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{child.driver_name || '—'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Route className="w-3.5 h-3.5 text-gray-400" />
                      <div>
                        <span className="text-gray-400">Route: </span>
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{child.route_name || '—'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <div>
                        <span className="text-gray-400">Driver Ph: </span>
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{child.driver_phone || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stops */}
                  <div className="flex gap-4 mt-3 pt-2 border-t border-gray-200/50 dark:border-gray-700/50 text-xs">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-green-500" />
                      <span className="text-gray-400">Bus Stop:</span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">{child.pickup_stop || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <GraduationCap className="w-10 h-10 mb-2 opacity-20" />
              <p>No children linked to this parent.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ParentUploadModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDownloadTemplate = () => {
    alert("Please create an Excel (.xlsx) file with these EXACT column headers in the first row:\\n\\nParent Name, Email, Password");
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/parents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || 'Upload successful');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to upload parents');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand-500" />
            Bulk Upload Parents
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900 rounded-xl">
            <p className="text-xs text-brand-700 dark:text-brand-300 mb-2">
              <strong>Instructions:</strong> Please upload an Excel (.xlsx) file with the following exact column headers in the first row:
            </p>
            <div className="flex gap-2 flex-wrap mb-3">
              {['Parent Name', 'Email', 'Password'].map(col => (
                <span key={col} className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-brand-200 dark:border-brand-700 text-xs font-mono">
                  {col}
                </span>
              ))}
            </div>
            <button 
              onClick={handleDownloadTemplate}
              className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3 h-3" /> View Requirements
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Select Excel File (.xlsx)
            </label>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2.5 file:px-4
                file:rounded-xl file:border-0
                file:text-sm file:font-semibold
                file:bg-brand-50 file:text-brand-700
                dark:file:bg-brand-900/30 dark:file:text-brand-400
                hover:file:bg-brand-100 dark:hover:file:bg-brand-900/50
                border border-gray-200 dark:border-gray-700 rounded-xl
                cursor-pointer
              "
            />
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold shadow-sm transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isUploading ? (
              <><span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Uploading...</>
            ) : (
              'Upload'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
