/**
 * Parent Settings Page — Full-screen settings with profile edit, registered school selection, appearance, notifications, and about.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Moon, Sun, Map, Bell, BellOff, MapPin, Bus,
  Smartphone, Info, LogOut, User, Mail, Phone, School, Edit3, Save, Check, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore, type MapStyle } from '@/stores/settingsStore';
import api from '@/lib/api';

interface PublicSchool {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onToggle(!on)}
      className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
        on ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <motion.div
        layout
        className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md"
        style={{ left: on ? '22px' : '2px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

function SettingRow({
  icon: Icon,
  iconColor = 'text-gray-500',
  label,
  description,
  right,
  onClick,
}: {
  icon: React.ElementType;
  iconColor?: string;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between py-3.5 ${onClick ? 'cursor-pointer active:bg-gray-50 dark:active:bg-gray-800/50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${iconColor}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</p>
          {description && <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="flex-shrink-0 ml-3">{right}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 dark:text-gray-500 px-1 pt-5 pb-1.5">
      {children}
    </p>
  );
}

const mapStyleOptions: { value: MapStyle; label: string; desc: string }[] = [
  { value: 'clean', label: '🗺️ Clean', desc: 'Minimal, uncluttered' },
  { value: 'street', label: '🏙️ Street', desc: 'Google-style, detailed' },
  { value: 'satellite', label: '🛰️ Satellite', desc: 'Aerial imagery' },
];

export function ParentSettingsPage() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuthStore();
  const {
    darkMode, setDarkMode,
    mapStyle, setMapStyle,
    notificationPrefs, setNotificationPref,
  } = useSettingsStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [schoolId, setSchoolId] = useState(user?.school_id || '');

  useEffect(() => {
    setFullName(user?.full_name || '');
    setPhone(user?.phone || '');
    setSchoolId(user?.school_id || '');
  }, [user]);

  const { data: schools = [], isLoading: isLoadingSchools } = useQuery<PublicSchool[]>({
    queryKey: ['public-schools'],
    queryFn: async () => {
      const res = await api.get('/schools/public');
      return res.data;
    },
  });

  const { data: busInfo } = useQuery({
    queryKey: ['parent-bus-info'],
    queryFn: async () => {
      const res = await api.get('/parents/me/bus-info');
      return res.data;
    },
  });

  const childCount = busInfo?.children?.length ?? 0;
  const currentSchool = schools.find((s) => s.id === (isEditing ? schoolId : user?.school_id || schoolId));

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const payload = {
        full_name: fullName,
        phone: phone || null,
        school_id: schoolId || null,
      };
      const res = await api.patch('/auth/me', payload);
      updateUser(res.data);
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-base font-bold text-gray-900 dark:text-white">Settings</h1>
          </div>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 rounded-xl hover:bg-brand-100 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFullName(user?.full_name || '');
                  setPhone(user?.phone || '');
                  setSchoolId(user?.school_id || '');
                }}
                className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-24">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-gradient-to-br from-brand-500 to-violet-600 rounded-2xl p-5 text-white relative overflow-hidden"
        >
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/5 rounded-full" />
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{user?.full_name}</h2>
              <p className="text-white/60 text-xs mt-0.5 truncate">{user?.email}</p>
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 text-[10px] font-bold uppercase tracking-wider">
                <School className="w-3 h-3" />
                Parent • {childCount} {childCount === 1 ? 'Child' : 'Children'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Profile Details & Registered School */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3"
        >
          <SectionTitle>Profile Details</SectionTitle>

          {!isEditing ? (
            <>
              <SettingRow icon={User} iconColor="text-brand-500" label={user?.full_name ?? '—'} description="Full Name" />
              <SettingRow icon={Mail} iconColor="text-blue-500" label={user?.email ?? '—'} description="Email" />
              <SettingRow icon={Phone} iconColor="text-green-500" label={user?.phone ?? 'Not set'} description="Phone Number" />
              
              {/* Connected School Card */}
              {currentSchool ? (
                <div className="mt-2 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                  <div className="flex items-start gap-3">
                    {currentSchool.logo_url ? (
                      <img
                        src={currentSchool.logo_url}
                        alt={currentSchool.name}
                        className="w-12 h-12 rounded-xl object-cover bg-white border border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                        <School className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {currentSchool.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[9px] font-semibold">
                          Registered School
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {currentSchool.address ? `${currentSchool.address}, ` : ''}{currentSchool.city} {currentSchool.state}
                      </p>

                      {currentSchool.latitude != null && currentSchool.longitude != null && (
                        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] font-mono font-bold">
                            <MapPin className="w-3 h-3 text-green-500" />
                            {currentSchool.latitude.toFixed(4)}° N, {currentSchool.longitude.toFixed(4)}° E
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[9px] font-semibold">
                            <Check className="w-2.5 h-2.5" /> Coordinates Auto-Detected
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <SettingRow
                  icon={School}
                  iconColor="text-amber-500"
                  label={user?.school_id ? 'School Connected' : 'No School Selected'}
                  description="Registered School"
                />
              )}
            </>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="+91 9876543210"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                  <span>Registered School</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">Admin Verified Only</span>
                </label>
                {isLoadingSchools ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading active schools...
                  </div>
                ) : (
                  <select
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">-- Select Registered School --</option>
                    {schools.map((sch) => (
                      <option key={sch.id} value={sch.id}>
                        {sch.name} {sch.city ? `(${sch.city})` : ''}
                      </option>
                    ))}
                  </select>
                )}

                {/* Selected School Preview Card */}
                {currentSchool && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                    <div className="flex items-start gap-3">
                      {currentSchool.logo_url ? (
                        <img
                          src={currentSchool.logo_url}
                          alt={currentSchool.name}
                          className="w-12 h-12 rounded-xl object-cover bg-white border border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                          <School className="w-6 h-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {currentSchool.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {currentSchool.address ? `${currentSchool.address}, ` : ''}{currentSchool.city} {currentSchool.state}
                        </p>
                        {currentSchool.latitude != null && currentSchool.longitude != null && (
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] font-mono font-bold">
                              <MapPin className="w-3 h-3 text-green-500" />
                              {currentSchool.latitude.toFixed(4)}° N, {currentSchool.longitude.toFixed(4)}° E
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[9px] font-semibold">
                              <Check className="w-2.5 h-2.5" /> Coordinates Auto-Detected
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-gray-400 mt-1.5">
                  Only schools registered by system administrators are available for selection. Coordinates are automatically pre-loaded.
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4"
        >
          <SectionTitle>Appearance</SectionTitle>
          <SettingRow
            icon={darkMode ? Moon : Sun}
            iconColor={darkMode ? 'text-indigo-400' : 'text-amber-500'}
            label="Dark Mode"
            description={darkMode ? 'On — Easy on the eyes' : 'Off — Light theme active'}
            right={<Toggle on={darkMode} onToggle={setDarkMode} />}
          />

          {/* Map Style Picker */}
          <div className="py-3.5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-teal-500">
                <Map className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Map Style</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Choose how the tracking map looks</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {mapStyleOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMapStyle(opt.value)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    mapStyle === opt.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <p className="text-lg">{opt.label.split(' ')[0]}</p>
                  <p className={`text-[10px] font-bold mt-1 ${
                    mapStyle === opt.value ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500'
                  }`}>{opt.label.split(' ')[1]}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4"
        >
          <SectionTitle>Notifications</SectionTitle>
          <SettingRow
            icon={Bus}
            iconColor="text-green-500"
            label="Trip Started"
            description="Alert when the bus starts its trip"
            right={
              <Toggle
                on={notificationPrefs.tripStart}
                onToggle={(v) => setNotificationPref('tripStart', v)}
              />
            }
          />
          <SettingRow
            icon={MapPin}
            iconColor="text-amber-500"
            label="Bus Nearby"
            description="Alert when bus is within 2 km"
            right={
              <Toggle
                on={notificationPrefs.busNearby}
                onToggle={(v) => setNotificationPref('busNearby', v)}
              />
            }
          />
          <SettingRow
            icon={notificationPrefs.busArrived ? Bell : BellOff}
            iconColor="text-blue-500"
            label="Bus Arrived at School"
            description="Alert when bus reaches school campus"
            right={
              <Toggle
                on={notificationPrefs.busArrived}
                onToggle={(v) => setNotificationPref('busArrived', v)}
              />
            }
          />
        </motion.div>

        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4"
        >
          <SectionTitle>About</SectionTitle>
          <SettingRow icon={Info} iconColor="text-gray-400" label="App Version" right={<span className="text-xs text-gray-400 font-mono">1.0.0</span>} />
          <SettingRow icon={Smartphone} iconColor="text-gray-400" label="YellowBird" description="By sanket Zinjurke" />
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-4"
        >
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors active:scale-[0.98]"
          >
            <LogOut className="w-4.5 h-4.5" />
            Sign Out
          </button>
        </motion.div>

        <p className="text-center text-[10px] text-gray-300 dark:text-gray-700 mt-6 mb-4">
          Made with ❤️ for safer school commutes
        </p>
      </div>
    </div>
  );
}

