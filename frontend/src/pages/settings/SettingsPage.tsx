/**
 * Admin Portal Settings Page — Full configuration dashboard for School Profile,
 * GPS Tracking Rules, Overspeed Thresholds, Notifications, and Security.
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Building2, Bell, Shield, Save, MapPin, RefreshCw, Lock, Compass, ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

type SettingsTab = 'profile' | 'notifications' | 'security';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Form State
  const [schoolForm, setSchoolForm] = useState({
    name: 'Greenfield International School',
    address: '123 Education Boulevard, Sector 42',
    city: 'New Delhi',
    state: 'Delhi',
    phone: '+91-11-2345-6789',
    email: 'admin@greenfield.edu.in',
    website: 'https://greenfield.edu.in',
    timezone: 'Asia/Kolkata',
    latitude: 28.6139,
    longitude: 77.2090,
  });

  const [notifForm, setNotifForm] = useState({
    notify_trip_start: true,
    notify_stop_proximity: true,
    notify_trip_end: true,
    enable_email_alerts: true,
    enable_push_alerts: true,
  });

  // Fetch Settings
  const { data, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data;
    },
  });

  useEffect(() => {
    if (data) {
      if (data.school) {
        setSchoolForm({
          name: data.school.name || '',
          address: data.school.address || '',
          city: data.school.city || '',
          state: data.school.state || '',
          phone: data.school.phone || '',
          email: data.school.email || '',
          website: data.school.website || '',
          timezone: data.school.timezone || 'Asia/Kolkata',
          latitude: data.school.latitude ?? 28.6139,
          longitude: data.school.longitude ?? 77.2090,
        });
      }
      if (data.notifications) {
        setNotifForm({
          notify_trip_start: data.notifications.notify_trip_start ?? true,
          notify_stop_proximity: data.notifications.notify_stop_proximity ?? true,
          notify_trip_end: data.notifications.notify_trip_end ?? true,
          enable_email_alerts: data.notifications.enable_email_alerts ?? true,
          enable_push_alerts: data.notifications.enable_push_alerts ?? true,
        });
      }
    }
  }, [data]);

  // Save Settings Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const cleanedSchool = {
        ...schoolForm,
        latitude: schoolForm.latitude != null && !isNaN(Number(schoolForm.latitude)) ? Number(schoolForm.latitude) : null,
        longitude: schoolForm.longitude != null && !isNaN(Number(schoolForm.longitude)) ? Number(schoolForm.longitude) : null,
      };
      const payload = {
        school: cleanedSchool,
        notifications: notifForm,
      };
      const res = await api.put('/settings', payload);
      return res.data;
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    onSuccess: () => {
      toast.success('Admin Portal settings updated and saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      refetch();
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      let message = 'Failed to save settings. Please check server connection.';
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail.map((d: any) => `${d.loc?.[d.loc.length - 1] || 'field'}: ${d.msg}`).join(', ');
      } else if (err.message && !err.response) {
        message = `Network error: ${err.message}. The server may be waking up — please try again in a few seconds.`;
      }
      toast.error(message);
    },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Portal Settings</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              System Config
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure school profile, alert policies, and security settings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            title="Reload Settings"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-amber-500 text-white font-semibold text-xs sm:text-sm hover:from-brand-600 hover:to-amber-600 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* ================= TABS ================= */}
      <div className="space-y-6">
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="flex space-x-6 overflow-x-auto pb-px">
            {[
              { id: 'profile', label: 'School Profile & Branding', icon: Building2 },
              { id: 'notifications', label: 'Notifications & Alerts', icon: Bell },
              { id: 'security', label: 'Security & Sessions', icon: Shield },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as SettingsTab)}
                className={`flex items-center gap-2 py-3 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors ${
                  activeTab === id
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* TAB 1: School Profile */}
        {activeTab === 'profile' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">School Contact & Institution Details</h3>
              <p className="text-xs text-gray-500">Official information rendered on parent tracking cards and reports</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">School Name</label>
                <input
                  type="text"
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Support Phone</label>
                <input
                  type="text"
                  value={schoolForm.phone}
                  onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Admin Email</label>
                <input
                  type="text"
                  value={schoolForm.email}
                  onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Official Website</label>
                <input
                  type="text"
                  value={schoolForm.website}
                  onChange={(e) => setSchoolForm({ ...schoolForm, website: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Street Address</label>
                <input
                  type="text"
                  value={schoolForm.address}
                  onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">City</label>
                <input
                  type="text"
                  value={schoolForm.city}
                  onChange={(e) => setSchoolForm({ ...schoolForm, city: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Timezone</label>
                <select
                  value={schoolForm.timezone}
                  onChange={(e) => setSchoolForm({ ...schoolForm, timezone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </select>
              </div>

              {/* School GPS Coordinates */}
              <div className="md:col-span-2 p-4.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-brand-500" />
                      School Campus GPS Coordinates
                    </h4>
                    <p className="text-[11px] text-gray-500">Latitude & Longitude used as the central hub location for map centering and ETA distance calculation</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        toast.loading('Acquiring current GPS location...', { id: 'gps-geo' });
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setSchoolForm((prev) => ({
                              ...prev,
                              latitude: Number(pos.coords.latitude.toFixed(6)),
                              longitude: Number(pos.coords.longitude.toFixed(6)),
                            }));
                            toast.success('Auto-detected school GPS coordinates!', { id: 'gps-geo' });
                          },
                          (err) => toast.error(`GPS Acquisition Failed: ${err.message}`, { id: 'gps-geo' })
                        );
                      } else {
                        toast.error('Geolocation is not supported by your browser');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-xs font-semibold hover:bg-brand-500/20 transition-colors self-start sm:self-auto"
                  >
                    <Compass className="w-3.5 h-3.5" /> Auto-Detect GPS Location
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={schoolForm.latitude}
                      onChange={(e) => setSchoolForm({ ...schoolForm, latitude: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/30"
                      placeholder="e.g. 28.613900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={schoolForm.longitude}
                      onChange={(e) => setSchoolForm({ ...schoolForm, longitude: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500/30"
                      placeholder="e.g. 77.209000"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB: Notifications */}
        {activeTab === 'notifications' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Notification & Parent Alert Preferences</h3>
              <p className="text-xs text-gray-500">Control automated triggers for parent push notifications and system messages</p>
            </div>

            <div className="space-y-4">
              {[
                { key: 'notify_trip_start', label: 'Trip Start Departure Alert', desc: 'Notify parents as soon as the driver clicks "Start Trip"' },
                { key: 'notify_stop_proximity', label: 'Bus Approaching Pickup Stop Alert', desc: 'Notify parents when the bus enters the geofence radius (< 500m)' },
                { key: 'notify_trip_end', label: 'Trip Completion Alert', desc: 'Notify parents when the bus arrives at school/final destination' },
                { key: 'enable_push_alerts', label: 'Mobile Push Notifications', desc: 'Deliver native Android push alerts via Capacitor' },
                { key: 'enable_email_alerts', label: 'Email Notification Backup', desc: 'Send email summary alerts for trip updates' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">{label}</h4>
                    <p className="text-[11px] text-gray-500">{desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={(notifForm as any)[key]}
                    onChange={(e) => setNotifForm({ ...notifForm, [key]: e.target.checked })}
                    className="w-5 h-5 accent-brand-500 rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* TAB 4: Security */}
        {activeTab === 'security' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Security & Session Management</h3>
              <p className="text-xs text-gray-500">System authentication parameters and token expiration settings</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-medium text-gray-600 dark:text-gray-300">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-2">
                <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-brand-500" /> JWT Token Expiry
                </span>
                <p className="text-gray-500">JWT access tokens expire after 8 hours (`JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480`). Users automatically re-authenticate seamlessly.</p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-2">
                <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Password Security
                </span>
                <p className="text-gray-500">Passwords are hashed using `bcrypt` (Passlib). Plaintext passwords are never stored in database tables.</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* STICKY SAVE ACTION BAR */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg flex items-center justify-between">
        <span className="text-xs text-gray-500">Any changes made will take effect immediately across all active sessions.</span>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-amber-500 text-white font-bold text-xs sm:text-sm hover:from-brand-600 hover:to-amber-600 shadow-md shadow-brand-500/25 transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
