/**
 * Driver Dashboard — Trip Tab.
 * GPS & trip state live in useTripStore (Zustand) so switching tabs
 * NEVER stops the trip or kills the GPS watchPosition.
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Play, Square, Activity, Gauge,
  Clock, Wifi, WifiOff, AlertTriangle, CheckCircle2,
  Satellite, MapPin, Lock, Map as MapIcon, ChevronDown, ChevronUp, LocateFixed,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useTripStore } from '@/stores/tripStore';
import { useRouteBuilderStore } from '@/stores/routeBuilderStore';
import { LiveRouteBuilder } from './LiveRouteBuilder';
import { VideoSplashScreen } from '@/components/ui/VideoSplashScreen';
import api from '@/lib/api';
import type { Driver } from '@/types';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

// ── Trip Timer ────────────────────────────────────────────────────

function TripTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState('00:00:00');
  const start = new Date(startedAt).getTime();

  // Use a simple ref-less interval pattern
  const tick = useCallback(() => {
    const diff = Math.floor((Date.now() - start) / 1000);
    const h = String(Math.floor(diff / 3600)).padStart(2, '0');
    const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    const s = String(diff % 60).padStart(2, '0');
    setElapsed(`${h}:${m}:${s}`);
  }, [start]);

  // Run tick on every render via useEffect
  useState(() => {
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  });

  return <span className="font-mono text-xl font-bold text-brand-500">{elapsed}</span>;
}

// ── GPS Denied Modal ─────────────────────────────────────────────

function GpsDeniedModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl p-6 text-center shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Location Access Denied</h3>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          Please enable location permissions in your browser settings and try again.
        </p>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-left mb-5">
          <p className="text-xs text-amber-700 dark:text-amber-300 font-bold mb-1">How to enable on your phone:</p>
          <ol className="text-xs text-amber-600 dark:text-amber-400 space-y-1 list-decimal ml-4">
            <li>Open your phone <strong>Settings</strong></li>
            <li>Go to <strong>Location</strong> → turn it <strong>ON</strong></li>
            <li>Open browser app permissions → allow <strong>Location</strong></li>
            <li>Come back and tap <strong>Start Trip</strong> again</li>
          </ol>
        </div>
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium text-sm"
        >
          Close
        </button>
      </motion.div>
    </div>
  );
}

// ── Leaflet Icon Fix ─────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeDriverMarkerIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:44px;height:44px;">
        <div style="position:absolute;inset:0;background:#3b82f644;border-radius:50%;animation:bus-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:absolute;inset:4px;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 4px 14px rgba(37,99,235,0.45);display:flex;align-items:center;justify-content:center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
          </svg>
        </div>
      </div>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

function DriverMapFollower({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 1.0 });
  }, [lat, lng, map]);
  return null;
}

function DriverLiveMap({ lat, lng, accuracy }: { lat: number; lng: number; accuracy: number }) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const handleRecenter = () => {
    if (mapInstance) {
      mapInstance.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
    }
  };

  return (
    <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-inner">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        zoomControl={false}
        ref={setMapInstance}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DriverMapFollower lat={lat} lng={lng} />
        {accuracy > 0 && (
          <Circle
            center={[lat, lng]}
            radius={Math.min(accuracy, 100)}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1 }}
          />
        )}
        <Marker position={[lat, lng]} icon={makeDriverMarkerIcon()} />
      </MapContainer>

      {/* Floating Recenter Button */}
      <button
        type="button"
        onClick={handleRecenter}
        className="absolute top-2.5 right-2.5 z-[400] w-9 h-9 rounded-full bg-white dark:bg-gray-900 shadow-md flex items-center justify-center text-gray-700 dark:text-gray-300 active:scale-95 transition-transform"
        title="Recenter Map"
      >
        <LocateFixed className="w-4 h-4 text-brand-500" />
      </button>

      {/* Live Driver Badge */}
      <div className="absolute bottom-2.5 left-2.5 z-[400] px-2.5 py-1 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-[10px] font-bold text-gray-700 dark:text-gray-300 shadow-sm flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        Live Vehicle Position
      </div>
    </div>
  );
}

// ── End Trip Confirmation Modal ───────────────────────────────────

function EndTripConfirmModal({
  startedAt,
  pingsCount,
  isEnding,
  onConfirm,
  onCancel,
}: {
  startedAt?: string | null;
  pingsCount: number;
  isEnding: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0">
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl p-6 text-center shadow-2xl border-t border-gray-100 dark:border-gray-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
      >
        {/* Warning Icon */}
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600">
          <Square className="w-8 h-8 fill-red-500 text-red-500" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">
          End Current Trip?
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
          Parents and school admins will no longer receive your live GPS broadcasts. Make sure all students have disembarked safely.
        </p>

        {/* Trip Summary Card */}
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/60 mb-6 flex items-center justify-around">
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Duration</p>
            {startedAt ? (
              <TripTimer startedAt={startedAt} />
            ) : (
              <span className="font-mono text-lg font-bold text-gray-700 dark:text-gray-300">--:--</span>
            )}
          </div>
          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">GPS Broadcasts</p>
            <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">{pingsCount}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onConfirm}
            disabled={isEnding}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-base shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {isEnding ? (
              <>
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Ending Trip…
              </>
            ) : (
              <>
                <Square className="w-4 h-4 fill-white" />
                Yes, End Trip
              </>
            )}
          </button>

          <button
            onClick={onCancel}
            disabled={isEnding}
            className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Keep Driving (Cancel)
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export function DriverDashboard() {
  const { user } = useAuthStore();

  // All trip/GPS state comes from the persistent store
  const {
    isTracking, currentTrip, gpsStatus, gpsData, gpsError, routeProgress,
    pingsCount, isWsConnected, startTrip, endTrip, resumeTrip, isResuming,
    isApproximateOnly, requestPrecisePermission,
  } = useTripStore();

  const [showDeniedModal, setShowDeniedModal] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  const isMobileBrowserHttp =
    typeof window !== 'undefined' &&
    !window.isSecureContext &&
    !Capacitor.isNativePlatform() &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  const { openLiveBuilder } = useRouteBuilderStore();
  const { data: driver, isLoading } = useQuery<Driver>({
    queryKey: ['driver-me'],
    queryFn: async () => {
      const res = await api.get('/drivers/me');
      return res.data;
    },
    enabled: user?.role === 'driver',
  });

  // ── Auto-resume active trip on app restart ──────────────────
  useEffect(() => {
    if (driver) {
      resumeTrip();
    }
  }, [driver, resumeTrip]);

  const handleStartPress = useCallback(async (busId: string) => {
    if (!driver) return;

    try {
      // Check/request permission — native Android dialog shows once, never again
      let permStatus = await Geolocation.checkPermissions();
      if (permStatus.location !== 'granted') {
        permStatus = await Geolocation.requestPermissions();
      }
      if (permStatus.location !== 'granted') {
        setShowDeniedModal(true);
        return;
      }

      // Start the trip immediately — GPS is acquired in the background by
      // watchPosition inside tripStore. No getCurrentPosition needed, no timeout ever.
      await startTrip(busId, driver.id);
    } catch {
      // Error is already toasted with detail by tripStore.startTrip
    }
  }, [driver, startTrip]);

  const handleEndTrip = useCallback(async () => {
    try {
      setIsEnding(true);
      await endTrip();
      setShowEndConfirm(false);
    } finally {
      setIsEnding(false);
    }
  }, [endTrip]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="flex h-64 items-center justify-center p-4">
        <div className="text-center max-w-sm bg-red-50 dark:bg-red-900/20 rounded-3xl p-8 border border-red-100 dark:border-red-800">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Profile Not Found</h3>
          <p className="text-sm text-gray-500">Contact your administrator.</p>
        </div>
      </div>
    );
  }

  const busAssigned = driver.assigned_bus_id;

  return (
    <>
      {showSplash && <VideoSplashScreen onComplete={() => setShowSplash(false)} />}

      {/* Live Route Builder */}
      <AnimatePresence>
        <LiveRouteBuilder />
      </AnimatePresence>

      {/* GPS Denied Modal */}
      <AnimatePresence>
        {showDeniedModal && <GpsDeniedModal onClose={() => setShowDeniedModal(false)} />}
      </AnimatePresence>

      {/* End Trip Confirmation Modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <EndTripConfirmModal
            startedAt={currentTrip?.started_at}
            pingsCount={pingsCount}
            isEnding={isEnding}
            onConfirm={handleEndTrip}
            onCancel={() => setShowEndConfirm(false)}
          />
        )}
      </AnimatePresence>

      <div className="p-4 space-y-3">

        {/* Status Header Card */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-4 text-white relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs font-medium">Welcome back,</p>
              <h2 className="text-lg font-bold">{user?.full_name?.split(' ')[0]}</h2>
            </div>
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
              isTracking
                ? 'bg-green-400/20 border-green-400/30 text-green-200'
                : 'bg-white/10 border-white/20 text-white/70'
            }`}>
              {isTracking ? '● ON TRIP' : '● OFF DUTY'}
            </div>
          </div>
        </motion.div>

        {busAssigned ? (
          <div className="space-y-3">
            {/* Android Approximate Location Warning */}
            {isApproximateOnly && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-300 dark:border-rose-700 rounded-2xl p-4 text-xs text-rose-800 dark:text-rose-200 space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-100 text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Precise Location Required</span>
                </div>
                <p>
                  Android is currently providing <strong>Approximate Location</strong> (~1 km off). Apps like Zomato & Google Maps require <strong>Precise Location</strong> to lock onto your exact meter-level GPS.
                </p>
                <button
                  type="button"
                  onClick={requestPrecisePermission}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/30 active:scale-95 transition-transform"
                >
                  Enable Precise Location
                </button>
              </div>
            )}

            {/* Mobile Browser HTTP Notice */}
            {isMobileBrowserHttp && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl p-4 text-xs text-amber-800 dark:text-amber-200 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-100 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Mobile Browser Notice</span>
                </div>
                <p>
                  Testing via plain HTTP on mobile (<code className="bg-amber-100 dark:bg-amber-800/40 px-1 py-0.5 rounded font-mono text-[11px]">{window.location.host}</code>). Mobile Chrome restricts GPS on non-HTTPS networks.
                </p>
                <p className="font-medium text-amber-700 dark:text-amber-300">
                  For full native GPS functionality, use the <strong>YellowBird Android APK</strong> or configure Chrome's insecure origin flag.
                </p>
              </div>
            )}

            {/* GPS Status Banner */}
            <AnimatePresence mode="wait">
              <motion.div
                key={gpsStatus}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`rounded-2xl px-4 py-3.5 flex items-center gap-3 border text-sm font-medium ${
                  gpsStatus === 'active'   ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                  : gpsStatus === 'acquiring' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                  : gpsStatus === 'error'  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {gpsStatus === 'active'    && <><CheckCircle2 className="w-5 h-5 shrink-0" /><span>GPS Active — Broadcasting live</span></>}
                {gpsStatus === 'acquiring' && <><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" /><span>Acquiring GPS signal…</span></>}
                {gpsStatus === 'error'     && <><AlertTriangle className="w-5 h-5 shrink-0" /><span>{gpsError || 'GPS error'}</span></>}
                {gpsStatus === 'idle'      && <><Satellite className="w-5 h-5 shrink-0" /><span>Tap Start Trip to begin</span></>}
                {isTracking && (
                  <div className="ml-auto flex items-center gap-1.5 text-xs shrink-0">
                    {isWsConnected ? <><Wifi className="w-4 h-4" />Live</> : <><WifiOff className="w-4 h-4" />Reconnecting…</>}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Live Stats (only during trip) */}
            <AnimatePresence>
              {isTracking && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2.5"
                >
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { label: 'Speed', value: gpsData ? `${Math.round(gpsData.speed)}` : '--', unit: 'km/h', icon: Gauge, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', sub: null },
                      { label: 'Pings',  value: String(pingsCount), unit: '', icon: Activity, color: 'text-green-500 bg-green-50 dark:bg-green-900/20', sub: null },
                      {
                        label: 'Accuracy',
                        value: gpsData ? `±${Math.round(gpsData.accuracy)}` : '--',
                        unit: 'm',
                        icon: Satellite,
                        color: gpsData && gpsData.accuracy <= 15 ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
                        sub: gpsData ? (gpsData.accuracy <= 10 ? '🛰️ Pinpoint' : gpsData.accuracy <= 25 ? 'High' : 'Refining...') : null,
                      },
                    ].map(({ label, value, unit, icon: Icon, color, sub }) => (
                      <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl p-3 border border-gray-100 dark:border-gray-800 text-center">
                        <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center mx-auto mb-1.5`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className="text-base font-bold text-gray-900 dark:text-white">
                          {value}<span className="text-[10px] font-normal text-gray-400 ml-0.5">{unit}</span>
                        </p>
                        <p className="text-[10px] text-gray-400">{label}</p>
                        {sub && (
                          <p className={`text-[9px] font-bold mt-0.5 ${sub.includes('Pinpoint') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                            {sub}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {currentTrip?.started_at && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-3.5 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-brand-500" />
                        <span className="text-xs text-gray-500">Duration</span>
                      </div>
                      <TripTimer startedAt={currentTrip.started_at} />
                    </div>
                  )}

                  {gpsData && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl px-3.5 py-2.5 border border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] text-gray-400 mb-0.5">LIVE COORDINATES</p>
                      <p className="font-mono text-xs text-gray-700 dark:text-gray-300">
                        {gpsData.lat.toFixed(6)}, {gpsData.lng.toFixed(6)}
                      </p>
                    </div>
                  )}

                  {/* Driver Live Map */}
                  {gpsData && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          <MapIcon className="w-3.5 h-3.5 text-brand-500" />
                          Live Vehicle Map
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowMap(!showMap)}
                          className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1 hover:underline"
                        >
                          {showMap ? (
                            <>Hide Map <ChevronUp className="w-3.5 h-3.5" /></>
                          ) : (
                            <>Show Map <ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      </div>

                      {showMap && (
                        <DriverLiveMap
                          lat={gpsData.lat}
                          lng={gpsData.lng}
                          accuracy={gpsData.accuracy}
                        />
                      )}
                    </div>
                  )}

                  {/* Route Progress Card */}
                  {routeProgress && (
                    <div className="bg-brand-50 dark:bg-brand-900/20 rounded-2xl p-4 border border-brand-200 dark:border-brand-800/50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <MapPin className="w-16 h-16 text-brand-500" />
                      </div>
                      <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider mb-1">Next Stop</p>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 pr-12">{routeProgress.next_stop_name}</h3>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Distance</p>
                          <p className="text-sm font-bold text-brand-600 dark:text-brand-400">{routeProgress.distance_to_next_km} km</p>
                        </div>
                        <div className="w-px h-6 bg-brand-200 dark:bg-brand-800/50" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{routeProgress.stops_remaining} stops</p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Route Wizard Button (Only available during active trip) */}
            <AnimatePresence>
              {isTracking && (
                <motion.button
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={openLiveBuilder}
                  className="w-full py-4 rounded-2xl bg-gray-900 dark:bg-gray-800 text-white font-bold text-sm flex items-center justify-center gap-2 mt-3"
                >
                  <MapPin className="w-4 h-4 text-brand-500" />
                  Manage Pickup Route
                </motion.button>
              )}
            </AnimatePresence>

            {/* Start / End Trip Button */}
            {!isTracking ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => handleStartPress(busAssigned)}
                disabled={isResuming}
                className={`w-full py-5 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold text-lg shadow-xl shadow-brand-500/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform ${isResuming ? 'opacity-50' : ''}`}
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  {isResuming ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <Play className="w-5 h-5 fill-white" />
                  )}
                </div>
                {isResuming ? 'Checking...' : 'Start Trip'}
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowEndConfirm(true)}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-lg shadow-xl shadow-red-500/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Square className="w-5 h-5 fill-white" />
                </div>
                End Trip
              </motion.button>
            )}

            {!isTracking && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="text-xs text-gray-400">
                  Your location is <strong className="text-gray-600 dark:text-gray-300">only shared</strong> when a trip is active.
                </p>
              </div>
            )}
          </div>
        ) : (
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
        )}
      </div>
    </>
  );
}
