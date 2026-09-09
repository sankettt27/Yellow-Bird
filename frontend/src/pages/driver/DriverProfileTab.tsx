/**
 * Driver Profile Tab — Enhanced with Profile Edit, Active School Selection, Appearance, Preferences, and About.
 */

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  User, Phone, CreditCard, Calendar, Shield, Moon, Sun,
  SunMedium, Volume2, VolumeX, Info, Smartphone, LogOut, Mail, Bus,
  School, Edit3, Save, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Driver } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';

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

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <span className="flex items-center gap-2 text-xs text-gray-400">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </span>
      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 text-right">{value || '—'}</span>
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

function SettingRow({
  icon: Icon,
  iconColor = 'text-gray-500',
  label,
  description,
  right,
}: {
  icon: React.ElementType;
  iconColor?: string;
  label: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3.5">
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

export function DriverProfileTab() {
  const queryClient = useQueryClient();
  const { user, logout, updateUser } = useAuthStore();
  const {
    darkMode, setDarkMode,
    sunlightMode, setSunlightMode,
    voiceAnnouncements, setVoiceAnnouncements,
  } = useSettingsStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [schoolId, setSchoolId] = useState(user?.school_id || '');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  const { data: schools = [], isLoading: isLoadingSchools } = useQuery<PublicSchool[]>({
    queryKey: ['public-schools'],
    queryFn: async () => {
      const res = await api.get('/schools/public');
      return res.data;
    },
  });

  const { data: driver } = useQuery<Driver>({
    queryKey: ['driver-me'],
    queryFn: async () => {
      const res = await api.get('/drivers/me');
      return res.data;
    },
    enabled: user?.role === 'driver',
  });

  useEffect(() => {
    setFullName(user?.full_name || '');
    setPhone(user?.phone || '');
    setSchoolId(user?.school_id || '');
    if (driver) {
      setLicenseNumber(driver.license_number || '');
      setEmergencyContact(driver.emergency_contact || '');
    }
  }, [user, driver]);

  const currentSchool = schools.find((s) => s.id === (isEditing ? schoolId : user?.school_id || schoolId));

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // 1. Update auth user details (name, phone, school_id)
      const authRes = await api.patch('/auth/me', {
        full_name: fullName,
        phone: phone || null,
        school_id: schoolId || null,
      });
      updateUser(authRes.data);

      // 2. Update driver profile details if driver record exists
      if (driver) {
        await api.patch('/drivers/me', {
          license_number: licenseNumber || null,
          emergency_contact: emergencyContact || null,
        });
        queryClient.invalidateQueries({ queryKey: ['driver-me'] });
      }

      toast.success('Driver profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update driver profile';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-5 text-white relative overflow-hidden"
      >
        <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/5 rounded-full" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {user?.full_name?.charAt(0) ?? 'D'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{user?.full_name}</h2>
            <p className="text-white/60 text-xs mt-0.5 truncate">{user?.email}</p>
            <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 text-[10px] font-bold uppercase tracking-wider">
              <Shield className="w-3 h-3" />
              Driver
            </div>
          </div>
        </div>
      </motion.div>

      {/* Personal Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        <div className="px-4 py-3.5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-brand-500" />
            Personal & License Information
          </h3>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 rounded-xl hover:bg-brand-100 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFullName(user?.full_name || '');
                  setPhone(user?.phone || '');
                  setSchoolId(user?.school_id || '');
                  setLicenseNumber(driver?.license_number || '');
                  setEmergencyContact(driver?.emergency_contact || '');
                }}
                className="px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          )}
        </div>

        {!isEditing ? (
          <div className="px-4 py-1">
            <InfoRow label="Full Name" value={user?.full_name} icon={User} />
            <InfoRow label="Email" value={user?.email} icon={Mail} />
            <InfoRow label="Phone" value={user?.phone} icon={Phone} />
            <InfoRow
              label="Registered School"
              value={currentSchool ? currentSchool.name : (user?.school_id ? 'School Connected' : 'No School Selected')}
              icon={School}
            />
            <InfoRow label="License Number" value={driver?.license_number} icon={CreditCard} />
            <InfoRow label="License Expiry" value={driver?.license_expiry} icon={Calendar} />
            <InfoRow label="Emergency Contact" value={driver?.emergency_contact} icon={Phone} />
            <InfoRow label="Status" value={driver?.status} />
          </div>
        ) : (
          <div className="p-4 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">License Number</label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Emergency Contact Phone</label>
              <input
                type="tel"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4"
      >
        <SectionTitle>Appearance</SectionTitle>
        <SettingRow
          icon={darkMode ? Moon : Sun}
          iconColor={darkMode ? 'text-indigo-400' : 'text-amber-500'}
          label="Dark Mode"
          description={darkMode ? 'On — Reduced glare' : 'Off — Light theme active'}
          right={<Toggle on={darkMode} onToggle={setDarkMode} />}
        />
        <SettingRow
          icon={SunMedium}
          iconColor="text-amber-500"
          label="Sunlight Mode"
          description="Ultra-bright, high-contrast display"
          right={<Toggle on={sunlightMode} onToggle={setSunlightMode} />}
        />
      </motion.div>

      {/* Driving Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4"
      >
        <SectionTitle>Driving Preferences</SectionTitle>
        <SettingRow
          icon={voiceAnnouncements ? Volume2 : VolumeX}
          iconColor="text-blue-500"
          label="Voice Announcements"
          description="Speak stop names and passenger counts aloud"
          right={<Toggle on={voiceAnnouncements} onToggle={setVoiceAnnouncements} />}
        />
        <SettingRow
          icon={Bus}
          iconColor="text-green-500"
          label="Assigned Bus"
          description={driver?.assigned_bus_id ? `Bus ID: ${driver.assigned_bus_id.slice(0, 8)}...` : 'None assigned'}
        />
      </motion.div>

      {/* About */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4"
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
      >
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors active:scale-[0.98]"
        >
          <LogOut className="w-4.5 h-4.5" />
          Sign Out
        </button>
      </motion.div>

      <p className="text-center text-[10px] text-gray-300 dark:text-gray-700 mt-4 mb-4">
        Made with ❤️ for safer school commutes
      </p>
    </div>
  );
}

