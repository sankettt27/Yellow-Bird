/**
 * SchoolSetupWizard — Post-registration onboarding wizard for new school administrators.
 * Configures school address, GPS campus coordinates (lat/lng), contact info, and default fleet rules.
 * Leads directly to the pristine clean dashboard (zero drivers, zero parents, zero students).
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Navigation,
  Compass,
  Phone,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export function SchoolSetupWizard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Wizard form data
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'India',
    phone: '',
    email: '',
    website: '',
    latitude: 20.005,
    longitude: 73.785,
    overspeed_limit_kmh: 60,
    geofence_radius_meters: 500,
  });

  // Fetch initial school info
  useEffect(() => {
    async function loadSchoolData() {
      try {
        const res = await api.get('/settings');
        if (res.data?.school) {
          const s = res.data.school;
          setForm((prev) => ({
            ...prev,
            name: s.name || prev.name,
            address: s.address || '',
            city: s.city || '',
            state: s.state || '',
            zip_code: s.zip_code || '',
            phone: s.phone || '',
            email: s.email || user?.email || '',
            website: s.website || '',
            latitude: s.latitude ?? 20.005,
            longitude: s.longitude ?? 73.785,
          }));
        }
      } catch (e) {
        // Use defaults
      }
    }
    loadSchoolData();
  }, [user]);

  // Geolocation trigger
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your device or browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        setForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
        setIsLocating(false);
        toast.success(`Coordinates set to: ${lat}, ${lng}`);
      },
      (_error) => {
        setIsLocating(false);
        toast.error('Could not detect location. Please type coordinates manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Submit and save configuration
  const handleSaveAndLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('School Name is required');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        school: {
          name: form.name.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          website: form.website.trim(),
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
        },
        gps: {
          overspeed_limit_kmh: Number(form.overspeed_limit_kmh),
          geofence_radius_meters: Number(form.geofence_radius_meters),
        },
        notifications: {
          notify_trip_start: true,
          notify_stop_proximity: true,
          notify_trip_end: true,
          enable_email_alerts: true,
          enable_push_alerts: true,
        },
      };

      await api.put('/settings', payload);
      toast.success('School configuration complete! Welcome to your dashboard.');

      // Check if user is in dedicated admin route or standard dashboard
      const dest = window.location.pathname.startsWith('/admin') ? '/admin/dashboard' : '/dashboard';
      navigate(dest, { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to save settings. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            First Time School Onboarding
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Configure Your School & Campus
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            Set your school location coordinates and campus address. Parents and drivers will use these
            coordinates to calculate live ETAs and bus stops.
          </p>
        </div>

        {/* Setup Form */}
        <form onSubmit={handleSaveAndLaunch} className="space-y-6">
          {/* Card 1: School Identity & Address */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
              <Building2 className="w-5 h-5 text-brand-500" />
              School Campus & Address
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Official School Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. St. Xavier's International School"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Campus Street Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. 100 Knowledge Park, Sector 5"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Pune"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="e.g. Maharashtra"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 2: GPS Campus Coordinates */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-brand-500" />
                Campus GPS Coordinates (Latitude & Longitude)
              </h2>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                {isLocating ? 'Locating...' : 'Use My Current Location'}
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              All student bus routes converge at these coordinates. You can refine coordinates anytime from Admin Settings.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Latitude *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Longitude *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none font-mono"
                />
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-amber-50/50 dark:bg-gray-800/50 border border-amber-200/50 dark:border-gray-700/50 flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-300">
                Current Pin: <strong>{form.latitude}</strong>, <strong>{form.longitude}</strong>
              </span>
              <a
                href={`https://maps.google.com/?q=${form.latitude},${form.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
              >
                <MapPin className="w-3.5 h-3.5" /> Preview on Google Maps ↗
              </a>
            </div>
          </div>

          {/* Card 3: Contact & Communication */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
              <Phone className="w-5 h-5 text-brand-500" />
              School Contact & Fleet Safeguards
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Office Phone
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91-11-2345-6789"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  School Website
                </label>
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://school.edu.in"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Speed Alert Limit (km/h)
                </label>
                <input
                  type="number"
                  min={30}
                  max={120}
                  value={form.overspeed_limit_kmh}
                  onChange={(e) => setForm({ ...form, overspeed_limit_kmh: Number(e.target.value) || 60 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-brand-500 hover:from-amber-600 hover:to-brand-600 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Save Settings & Open Clean Dashboard <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
