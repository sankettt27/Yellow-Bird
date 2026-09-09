/**
 * Users Management Page — Full CRUD table with search, filters, role badges, add/edit modal.
 * Accessible by School Admin and Super Admin.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users, Search, Plus, Pencil, UserX, UserCheck,
  ChevronLeft, ChevronRight, X, Mail, Phone, Shield,
  GraduationCap, Bus, Building2, User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { User as UserType, PaginatedResponse } from '@/types';
import { ROLES } from '@/lib/constants';

// ─── Validation Schema ─────────────────────────────────────
const createUserSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  role: z.enum(['super_admin', 'school_admin', 'driver', 'parent']),
  is_active: z.boolean(),
});

const editUserSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  is_active: z.boolean(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type EditUserForm = z.infer<typeof editUserSchema>;

// ─── Role Config ───────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', icon: Shield },
  school_admin: { label: 'School Admin', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: Building2 },
  driver: { label: 'Driver', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: Bus },
  parent: { label: 'Parent', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: GraduationCap },
};

function RoleBadge({ role }: { role: string }) {
  const config = ROLE_CONFIG[role] ?? { label: role, color: 'bg-gray-100 text-gray-700', icon: User };
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ─── Avatar ────────────────────────────────────────────────
function UserAvatar({ user }: { user: UserType }) {
  const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['bg-brand-500', 'bg-purple-500', 'bg-amber-500', 'bg-green-500', 'bg-rose-500'];
  const colorIdx = user.full_name.charCodeAt(0) % colors.length;
  return (
    <div className={`w-9 h-9 rounded-full ${colors[colorIdx]} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ─── Create User Modal ─────────────────────────────────────
function CreateUserModal({ open, onClose, schoolId }: { open: boolean; onClose: () => void; schoolId: string | null }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'driver', is_active: true },
  });

  const createUser = useMutation({
    mutationFn: (data: CreateUserForm) =>
      api.post('/users', { ...data, school_id: schoolId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      reset();
      onClose();
      toast.success('User created successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to create user'),
  });

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add New User</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Create a new system user account</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit((d: CreateUserForm) => createUser.mutate(d))} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name *</label>
              <input
                {...register('full_name')}
                placeholder="e.g. Priya Sharma"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              />
              {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address *</label>
              <input
                {...register('email')}
                type="email"
                placeholder="user@school.edu.in"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password *</label>
                <input
                  {...register('password')}
                  type="password"
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
                <input
                  {...register('phone')}
                  placeholder="+91 99999 00000"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role *</label>
              <select
                {...register('role')}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              >
                <option value="school_admin">School Admin</option>
                <option value="driver">Driver</option>
                <option value="parent">Parent</option>
              </select>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <input type="checkbox" {...register('is_active')} id="is_active" className="w-4 h-4 accent-brand-500 rounded" defaultChecked />
              <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                Account is active (user can log in immediately)
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || createUser.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {createUser.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Edit User Modal ───────────────────────────────────────
function EditUserModal({ user, onClose }: { user: UserType; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { full_name: user.full_name, phone: user.phone ?? '', is_active: user.is_active },
  });

  const updateUser = useMutation({
    mutationFn: (data: EditUserForm) => api.patch(`/users/${user.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
      toast.success('User profile updated');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update user'),
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-10"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit User</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit((d) => updateUser.mutate(d))} className="px-6 py-5 space-y-4">
            {updateUser.isError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
                Failed to update user. Please try again.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name *</label>
              <input
                {...register('full_name')}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              />
              {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
              <input
                {...register('phone')}
                placeholder="+91 99999 00000"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              />
            </div>

            {/* Role display (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <RoleBadge role={user.role} />
                <span className="text-xs text-gray-400">(cannot be changed)</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <input type="checkbox" {...register('is_active')} id="edit_is_active" className="w-4 h-4 accent-brand-500 rounded" />
              <label htmlFor="edit_is_active" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                Account is active
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || updateUser.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {updateUser.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Main Page ─────────────────────────────────────────────
export function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'true' | 'false'>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState<UserType | null>(null);

  // Debounced search effect
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout((window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer);
    (window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const { data, isLoading, isError } = useQuery<PaginatedResponse<UserType>>({
    queryKey: ['users', page, debouncedSearch, roleFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: '15' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter !== '') params.set('is_active', statusFilter);
      const res = await api.get(`/users?${params}`);
      return res.data;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/users/${id}`, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update status'),
  });

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage system users, roles, and account access
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </motion.button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: total, color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/20' },
          { label: 'Admins', value: users.filter(u => u.role.includes('admin')).length, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Drivers', value: users.filter(u => u.role === 'driver').length, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Parents', value: users.filter(u => u.role === 'parent').length, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          >
            <option value="">All Roles</option>
            <option value="school_admin">School Admin</option>
            <option value="driver">Driver</option>
            <option value="parent">Parent</option>
            {currentUser?.role === ROLES.SUPER_ADMIN && <option value="super_admin">Super Admin</option>}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as '' | 'true' | 'false'); setPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[auto_1fr_1fr_120px_100px_100px] items-center gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
          <div className="w-9" />
          <div>User</div>
          <div>Contact</div>
          <div>Role</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_1fr_120px_100px_100px] items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-2">
                  <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-48 bg-gray-100 dark:bg-gray-700/50 rounded" />
                </div>
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-8 w-full bg-gray-100 dark:bg-gray-700/50 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <X className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-gray-600 dark:text-gray-400">Failed to load users. Please try again.</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">No users found</h3>
            <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Users List */}
        {!isLoading && users.length > 0 && (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {users.map((user, idx) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="grid grid-cols-[auto_1fr_1fr_120px_100px_100px] items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
              >
                {/* Avatar */}
                <UserAvatar user={user} />

                {/* Name & Email */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{user.email}</span>
                  </p>
                </div>

                {/* Phone */}
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {user.phone ? (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {user.phone}
                    </span>
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600 italic text-xs">No phone</span>
                  )}
                </div>

                {/* Role Badge */}
                <div>
                  <RoleBadge role={user.role} />
                </div>

                {/* Status Toggle */}
                <div>
                  <button
                    onClick={() => user.id !== currentUser?.id && toggleStatus.mutate({ id: user.id, is_active: !user.is_active })}
                    disabled={user.id === currentUser?.id}
                    title={user.id === currentUser?.id ? 'Cannot change own status' : undefined}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      user.is_active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    } ${user.id === currentUser?.id ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
                  >
                    {user.is_active ? (
                      <><UserCheck className="w-3 h-3" /> Active</>
                    ) : (
                      <><UserX className="w-3 h-3" /> Inactive</>
                    )}
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEditUser(user)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit user"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination Footer */}
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium text-gray-700 dark:text-gray-300">{(page - 1) * 15 + 1}–{Math.min(page * 15, total)}</span> of <span className="font-medium text-gray-700 dark:text-gray-300">{total}</span> users
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page + i - 2;
                return p <= totalPages ? (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                      p === page
                        ? 'bg-brand-500 text-white'
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {p}
                  </button>
                ) : null;
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          schoolId={currentUser?.school_id ?? null}
        />
      )}
      {editUser && (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)} />
      )}
    </div>
  );
}
