/**
 * Parent Tracking Tab — Mobile map for parents.
 * • Asks for parent's location on first open
 * • Shows parent marker + bus marker + pickup stop on map
 * • Calculates live distance: bus → parent location
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bus, MapPin, Navigation, Phone, Info, Clock,
  RefreshCw, LocateFixed, ShieldCheck, ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { WebSocketManager } from '@/lib/socket';
import { useSettingsStore } from '@/stores/settingsStore';
import type { LocationData } from '@/types';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';

// ─── Leaflet Icon Fix ────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Haversine distance (metres) ────────────────────────────────
function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m away`;
  return `${(metres / 1000).toFixed(1)} km away`;
}

// ─── Format Last Trip Time ───────────────────────────────────────
function formatLastTripTime(isoDate?: string | null): string {
  if (!isoDate) return 'No recent trips';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return 'No recent trips';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    if (isToday) return `Today at ${timeStr}`;
    if (isYesterday) return `Yesterday at ${timeStr}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
  } catch {
    return 'Recently';
  }
}

// ─── Map Icons ───────────────────────────────────────────────────
function makeBusIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:52px;height:52px;">
        <div style="position:absolute;inset:0;background:#eab30833;border-radius:50%;animation:bus-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:absolute;inset:6px;background:#eab308;border-radius:50%;border:3px solid white;box-shadow:0 4px 14px #eab30866;display:flex;align-items:center;justify-content:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/>
            <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
            <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
          </svg>
        </div>
      </div>`,
    className: 'smooth-bus-marker',
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -26],
  });
}


// Purple stop (used when parent location is NOT available)
function makeStopIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:36px;height:36px;">
        <div style="position:absolute;inset:2px;background:#6366f1;border-radius:50%;border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
  });
}

// Blue School Icon
function makeSchoolIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:44px;height:44px;">
        <div style="position:absolute;inset:2px;background:#3b82f6;border-radius:12px;border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
      </div>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

// Amber pulsing marker — parent's live location IS the pickup point
function makeParentPickupIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:52px;height:52px;">
        <div style="position:absolute;inset:0;background:#f59e0b33;border-radius:50%;animation:bus-ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="position:absolute;inset:4px;background:linear-gradient(135deg,#f59e0b,#f97316);border-radius:50%;border:3px solid white;box-shadow:0 4px 14px #f59e0b77;display:flex;align-items:center;justify-content:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div style="position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);background:#f59e0b;color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.2);">You're Here</div>
      </div>`,
    className: '',
    iconSize: [52, 70],
    iconAnchor: [26, 26],
    popupAnchor: [0, -30],
  });
}

export interface FlyTarget {
  coords: [number, number];
  zoom?: number;
  ts: number;
}

// ─── Auto-fly controller ─────────────────────────────────────────
function MapFlyTo({ target }: { target: FlyTarget | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target.coords, target.zoom ?? 16, { animate: true, duration: 1.2 });
    }
  }, [target?.ts]);
  return null;
}

// ─── Location Permission Modal ────────────────────────────────────
function LocationPermissionModal({
  onAllow,
  onSkip,
}: {
  onAllow: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[700] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl overflow-hidden shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <LocateFixed className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold">Set Your Pickup Point</h2>
            <p className="text-white/80 text-sm mt-1">
              Your location becomes the pickup point on the map
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="space-y-2.5">
            {[
              { icon: ShieldCheck, text: 'Your location is never sent to the server — stays on your phone only', color: 'text-green-500' },
              { icon: MapPin,      text: 'Your live position becomes the pickup point on the map', color: 'text-indigo-500' },
              { icon: Navigation,  text: 'See how far the bus is from where you are standing right now', color: 'text-amber-500' },
            ].map(({ icon: Icon, text, color }, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${color}`} />
                <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onSkip}
              className="flex-1 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium"
            >
              Skip
            </button>
            <button
              onClick={onAllow}
              id="parent-enable-location-btn"
              className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/30 active:scale-95"
            >
              <LocateFixed className="w-4 h-4" />
              Set as My Pickup Point
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export function ParentTrackingTab() {
  const [liveLocations, setLiveLocations]   = useState<Record<string, LocationData>>({});
  const [selectedIdx, setSelectedIdx]       = useState(0);
  const [flyTarget, setFlyTarget]           = useState<FlyTarget | null>(null);
  const [cardCollapsed, setCardCollapsed]   = useState(false);
  const { mapStyle } = useSettingsStore();

  const flyToCoords = useCallback((coords: [number, number], zoom = 16) => {
    setFlyTarget({ coords, zoom, ts: Date.now() });
  }, []);

  // Parent location state
  const [parentLocation, setParentLocation]           = useState<{ lat: number; lng: number } | null>(null);
  const [showLocModal, setShowLocModal]               = useState(false);
  // Read previously saved decision from sessionStorage so modal doesn't re-appear on tab switch
  const [parentLocStatus, setParentLocStatusRaw] = useState<'pending' | 'granted' | 'denied' | 'skipped'>(
    () => (sessionStorage.getItem('parentLocStatus') as 'granted' | 'denied' | 'skipped' | null) ?? 'pending'
  );

  // Wrapper that always persists the status
  const setParentLocStatus = useCallback((s: 'pending' | 'granted' | 'denied' | 'skipped') => {
    sessionStorage.setItem('parentLocStatus', s);
    setParentLocStatusRaw(s);
  }, []);

  const { data: busInfo, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['parent-bus-info'],
    queryFn: async () => {
      const res = await api.get('/parents/me/bus-info');
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const children: any[] = busInfo?.children ?? [];
  const child  = children[selectedIdx];

  // Refresh handler that ALWAYS centers on parent location (or fetches fresh GPS if needed)
  const handleRefresh = useCallback(async () => {
    refetch();
    if (parentLocation) {
      flyToCoords([parentLocation.lat, parentLocation.lng], 16);
      toast.success('Centered on your location', { id: 'parent-refreshed' });
      return;
    }
    // Attempt fresh GPS fix if parent location is not yet in state
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 6000 });
      if (pos) {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setParentLocation({ lat: coords[0], lng: coords[1] });
        setParentLocStatus('granted');
        flyToCoords(coords, 16);
        toast.success('Centered on your location', { id: 'parent-refreshed' });
        return;
      }
    } catch {
      if (child?.pickup_stop_lat && child?.pickup_stop_lng) {
        flyToCoords([child.pickup_stop_lat, child.pickup_stop_lng], 16);
        toast.success('Centered on pickup stop', { id: 'parent-refreshed' });
      }
    }
  }, [refetch, parentLocation, flyToCoords, child?.pickup_stop_lat, child?.pickup_stop_lng, setParentLocStatus]);

  // Show location modal only if user has NEVER made a choice yet this session, OR automatically start if browser already has permission
  useEffect(() => {
    if (children.length > 0 && parentLocStatus === 'pending') {
      Geolocation.checkPermissions().then((status) => {
        if (status.location === 'granted') {
          setParentLocStatus('granted');
        } else if (status.location === 'prompt' || status.location === 'prompt-with-rationale') {
          setShowLocModal(true);
        } else {
          setParentLocStatus('denied');
        }
      }).catch(() => {
        setShowLocModal(true);
      });
    }

    // If they previously granted, silently start the GPS watch natively
    if (children.length > 0 && parentLocStatus === 'granted' && parentWatchRef.current === null) {
      hasFlownToParent.current = false;
      Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
          interval: 1000,
          minimumUpdateInterval: 1000,
          enableLocationFallback: false,
        } as any,
        (pos, err) => {
          if (err) {
            const msg = (err.message || '').toLowerCase();
            if (msg.includes('timeout') || msg.includes('time') || msg.includes('obtain') || msg.includes('unavailable')) return;
            setParentLocStatus('denied');
            return;
          }
          if (pos) {
            setParentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            if (!hasFlownToParent.current) {
              hasFlownToParent.current = true;
              flyToCoords([pos.coords.latitude, pos.coords.longitude], 16);
            }
          }
        }
      ).then(id => {
        parentWatchRef.current = id;
      });
    }
  }, [children.length, parentLocStatus, setParentLocStatus, flyToCoords]);

  // Fly to pickup stop when child changes
  useEffect(() => {
    if (child?.pickup_stop_lat && child?.pickup_stop_lng) {
      flyToCoords([child.pickup_stop_lat, child.pickup_stop_lng], 16);
    }
  }, [child?.student_id, flyToCoords]);

  // WebSocket live GPS
  useEffect(() => {
    if (children.length === 0) return;
    const sockets: WebSocketManager[] = [];
    const busIds = [...new Set(children.map((c) => c.bus_id).filter(Boolean))] as string[];

    busIds.forEach((busId) => {
      const socket = new WebSocketManager();
      socket.connectSubscriber(busId);
      // @ts-ignore
      socket.onMessageCallback = (msg: any) => {
        if (msg.event_type === 'TRIP_STARTED' || msg.type === 'TRIP_STARTED') {
          LocalNotifications.schedule({
            notifications: [{
              title: `🚌 Bus Started`,
              body: msg.payload?.message || `The bus has started its trip!`,
              id: Math.floor(Math.random() * 2000000000),
              schedule: { at: new Date(Date.now() + 100) },
            }]
          });
          refetch(); // Fetch latest bus status from backend
        } else if (msg.event_type === 'TRIP_ENDED' || msg.type === 'TRIP_ENDED') {
          LocalNotifications.schedule({
            notifications: [{
              title: `🏁 Trip Ended`,
              body: msg.payload?.message || `The bus trip has been completed.`,
              id: Math.floor(Math.random() * 2000000000),
              schedule: { at: new Date(Date.now() + 100) },
            }]
          });
          setLiveLocations((prev) => {
            const next = { ...prev };
            delete next[busId];
            return next;
          });
          refetch();
        } else if (msg.type === 'UPDATE') {
          setLiveLocations((prev) => ({ ...prev, [msg.bus_id]: msg.data }));
        } else if (msg.latitude !== undefined && msg.longitude !== undefined) {
          // Backend sends raw location data directly to bus-specific subscribers
          setLiveLocations((prev) => ({ ...prev, [busId]: msg }));
        }
      };
      sockets.push(socket);
    });

    return () => sockets.forEach((s) => s.disconnect());
  }, [children.map((c) => c.bus_id).join(',')]);

  // Continuous parent GPS watch (exact position, no cache)
  const parentWatchRef = useRef<string | null>(null);
  const hasFlownToParent = useRef(false); // ensures we fly exactly once on first fix

  const requestParentLocation = useCallback(async () => {
    setShowLocModal(false);
    try {
      let permStatus = await Geolocation.checkPermissions();
      if (permStatus.location !== 'granted') {
        permStatus = await Geolocation.requestPermissions();
      }
      if (permStatus.location !== 'granted') {
        setParentLocStatus('denied');
        return;
      }
    } catch {
      setParentLocStatus('denied');
      return;
    }

    // Clear any existing watch first
    if (parentWatchRef.current !== null) {
      await Geolocation.clearWatch({ id: parentWatchRef.current });
      parentWatchRef.current = null;
    }
    
    hasFlownToParent.current = false; // reset so next fix flies to parent
    
    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        interval: 1000,
        minimumUpdateInterval: 1000,
        enableLocationFallback: false,
      } as any,
      (pos, err) => {
        if (err) {
          const msg = (err.message || '').toLowerCase();
          if (msg.includes('timeout') || msg.includes('time') || msg.includes('obtain') || msg.includes('unavailable')) return;
          setParentLocStatus('denied');
          return;
        }
        if (pos) {
          setParentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setParentLocStatus('granted');
          // Always fly to parent on FIRST fix after granting
          if (!hasFlownToParent.current) {
            hasFlownToParent.current = true;
            flyToCoords([pos.coords.latitude, pos.coords.longitude], 16);
          }
        }
      }
    );
    parentWatchRef.current = watchId;
  }, [flyToCoords]);

  // Clean up GPS watch when leaving the page
  useEffect(() => {
    return () => {
      if (parentWatchRef.current !== null) {
        Geolocation.clearWatch({ id: parentWatchRef.current });
      }
    };
  }, []);

  // ── Derived values ───────────────────────────────────────────
  const liveLocation = child?.bus_id ? liveLocations[child.bus_id] : null;
  const isLive = !!liveLocation;

  // ONLY use live WebSocket GPS data for the bus position.
  // We intentionally do NOT fall back to bus_latitude/bus_longitude from the DB
  // because that is the last known position from a previous trip and would show
  // the bus on the map even when the driver hasn't started the trip.
  const displayBusLocation = liveLocation ?? null;

  // Bus marker is ONLY visible when live data is streaming
  const showBusMarker = isLive && !!displayBusLocation;

  // Distance: bus → parent (if both known)
  const distanceToBus =
    showBusMarker && parentLocation
      ? haversineMetres(parentLocation.lat, parentLocation.lng, displayBusLocation.latitude, displayBusLocation.longitude)
      : null;

  // ETA: bus → parent (if distance and bus location known)
  // Assume a minimum speed of 20 km/h for ETA if bus is stuck in traffic or starting up
  const etaMinutes = (distanceToBus != null && showBusMarker)
    ? Math.max(1, Math.round(((distanceToBus / 1000) / Math.max(displayBusLocation.speed || 0, 20)) * 60))
    : null;

  const defaultCenter: [number, number] =
    parentLocation        ? [parentLocation.lat, parentLocation.lng]
    : showBusMarker  ? [displayBusLocation.latitude, displayBusLocation.longitude]
    : child?.pickup_stop_lat ? [child.pickup_stop_lat, child.pickup_stop_lng]
    : [20.5937, 78.9629];

  // ── No children ──────────────────────────────────────────────
  if (!isLoading && children.length === 0) {
    return (
      <div style={{ height: 'calc(100dvh - 130px)' }} className="flex flex-col items-center justify-center p-6 text-center bg-gray-50">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <MapPin className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Bus to Track</h2>
        <p className="text-gray-500 text-sm">No children linked or no bus assigned yet.</p>
        <button onClick={() => refetch()} className="mt-5 px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-medium">Refresh</button>
      </div>
    );
  }

  return (
    <>
      {/* Location Permission Modal */}
      <AnimatePresence>
        {showLocModal && (
          <LocationPermissionModal
            onAllow={requestParentLocation}
            onSkip={() => { setShowLocModal(false); setParentLocStatus('skipped'); }}
          />
        )}
      </AnimatePresence>

      <div style={{ height: 'calc(100dvh - 130px)' }} className="relative w-full flex flex-col">

        {/* Loading */}
        {isLoading && (
          <div className="absolute inset-0 z-[600] flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading…</p>
            </div>
          </div>
        )}

        {/* Child Selector */}
        {children.length > 1 && (
          <div className="absolute top-4 left-4 right-14 z-[500] flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {children.map((c: any, i: number) => (
              <button
                key={i}
                onClick={() => setSelectedIdx(i)}
                className={`px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap shadow-md flex-shrink-0 transition-all ${
                  selectedIdx === i ? 'bg-brand-500 text-white' : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                {c.student_name.split(' ')[0]}'s Bus
              </button>
            ))}
          </div>
        )}

        {/* Top-right buttons */}
        <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
          {/* Refresh & Redirect to Parent Location */}
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-gray-600 disabled:opacity-50 active:scale-95 transition-all"
            title="Refresh & redirect to my location"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-brand-500' : ''}`} />
          </button>
          {/* Re-locate parent */}
          <button
            onClick={() => {
              if (parentLocation) {
                flyToCoords([parentLocation.lat, parentLocation.lng], 16);
                toast.success('Centered on your location', { id: 'parent-located' });
              } else {
                requestParentLocation();
              }
            }}
            className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-colors active:scale-95 ${
              parentLocStatus === 'granted' ? 'bg-amber-400 text-white' : 'bg-white text-gray-600'
            }`}
            title="My location"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        </div>

        {/* Offline notice pill on map */}
        {!isLive && (
          <div className={`absolute ${children.length > 1 ? 'top-16' : 'top-4'} left-4 right-16 z-[400] pointer-events-none`}>
            <div className="bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-full shadow-md border border-gray-200/80 text-[11px] font-medium text-gray-600 flex items-center gap-1.5 w-fit">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="truncate">Bus offline — Live GPS starts when driver begins trip</span>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="flex-1 w-full" style={{ minHeight: 0 }}>
          {/* Injecting CSS to make the bus marker glide smoothly like Zomato/Uber without map jitter */}
          <style>{`
            .smooth-bus-marker {
              transition: transform 1.5s cubic-bezier(0.25, 1, 0.5, 1) !important;
              will-change: transform;
            }
            .leaflet-zoom-anim .smooth-bus-marker,
            .leaflet-pan-anim .smooth-bus-marker {
              transition: none !important;
            }
          `}</style>
          
          <MapContainer
            center={defaultCenter}
            zoom={16}
            zoomControl={false}
            style={{ height: '100%', width: '100%' }}
            key={child?.student_id ?? 'map'}
          >
            {/* Dynamic map tiles based on user settings */}
            <TileLayer
              attribution={
                mapStyle === 'satellite'
                  ? '&copy; Esri'
                  : mapStyle === 'dark'
                    ? '&copy; <a href="https://carto.com/">CARTO</a>'
                    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              }
              url={
                mapStyle === 'satellite'
                  ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
              key={mapStyle}
            />
            <MapFlyTo target={flyTarget} />

            {/* 🟡 Parent's live location = Pickup Point (ALWAYS shown when parent location is known) */}
            {parentLocation && (
              <>
                <Marker
                  position={[parentLocation.lat, parentLocation.lng]}
                  icon={makeParentPickupIcon()}
                >
                  <Popup>
                    <div className="text-center">
                      <p className="font-bold text-xs">📍 You (Pickup Point)</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Your live location</p>
                      {isLive && distanceToBus != null && (
                        <p className="text-[11px] text-amber-600 font-bold mt-1">🚌 Bus is {formatDistance(distanceToBus)}</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
                <Circle
                  center={[parentLocation.lat, parentLocation.lng]}
                  radius={40}
                  pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.12, weight: 1.5, dashArray: '4 4' }}
                />
              </>
            )}

            {/* 🚏 Registered Pickup Stop (Always shown as reference) */}
            {child?.pickup_stop_lat && child?.pickup_stop_lng && (
              <Marker position={[child.pickup_stop_lat, child.pickup_stop_lng]} icon={makeStopIcon()}>
                <Popup>
                  <div className="text-center">
                    <p className="font-bold text-xs">🚏 Registered Pickup Stop</p>
                    <p className="text-[11px] text-gray-500">{child.pickup_stop_name}</p>
                    {!parentLocation && (
                      <p className="text-[10px] text-amber-600 mt-1">Enable location to set your live position</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* 🏫 School Marker */}
            {child?.school_lat && child?.school_lng && (
              <Marker position={[child.school_lat, child.school_lng]} icon={makeSchoolIcon()}>
                <Popup>
                  <div className="text-center">
                    <p className="font-bold text-xs text-blue-700">🏫 School Campus</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Destination</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* 🟢 Live Bus Marker (STRICT: ONLY rendered when live trip is active) */}
            {showBusMarker && (
              <Marker
                position={[displayBusLocation.latitude, displayBusLocation.longitude]}
                icon={makeBusIcon()}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-bold text-xs">🚌 {child?.bus_number}</p>
                    <p className="text-[11px] text-green-600 font-semibold">● LIVE</p>
                    <p className="text-[11px] text-gray-500">{Math.round(displayBusLocation.speed)} km/h</p>
                    {distanceToBus != null && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-[11px] text-amber-600 font-bold">{formatDistance(distanceToBus)} from you</p>
                        {etaMinutes !== null && (
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                            Arriving in ~{etaMinutes} min{etaMinutes !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Bottom Info Card */}
        <div className="absolute bottom-4 left-4 right-4 z-[500]">
          <AnimatePresence mode="wait">
            {child && (
              <motion.div
                key={child.student_id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
              >
                {/* ── Collapse / Expand handle ── */}
                <button
                  onClick={() => setCardCollapsed(c => !c)}
                  className="w-full flex items-center justify-center pt-2.5 pb-1.5 gap-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <div className="w-8 h-1 rounded-full bg-gray-200 absolute" />
                  {cardCollapsed
                    ? <ChevronUp  className="w-5 h-5 relative" />
                    : <ChevronDown className="w-5 h-5 relative" />
                  }
                </button>

                {/* ── Collapsible body ── */}
                <motion.div
                  animate={{ height: cardCollapsed ? 0 : 'auto', opacity: cardCollapsed ? 0 : 1 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                <div className="px-4 pb-4">
                {/* Bus name + Live badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                      <Bus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm leading-tight">{child.bus_number || 'Bus not assigned'}</p>
                      <p className="text-[11px] text-gray-500">{child.route_name || 'No route'}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                    isLive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                    {isLive && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                    {isLive ? 'LIVE' : 'OFFLINE'}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  {/* Bus speed or offline status */}
                  <div className="bg-gray-50 rounded-2xl p-3">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5 flex items-center gap-1">
                      <Navigation className="w-3 h-3" /> {isLive ? 'Bus Speed' : 'Bus Status'}
                    </p>
                    <p className="font-bold text-gray-900 text-sm">
                      {isLive ? `${Math.round(liveLocation!.speed)} km/h` : 'Parked / Offline'}
                    </p>
                    {!isLive && (
                      <p className="text-[10px] text-gray-400 mt-0.5">Waiting for departure</p>
                    )}
                  </div>

                  {/* Distance from parent OR driver status card */}
                  {distanceToBus != null ? (
                    <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[10px] text-amber-600 font-semibold uppercase flex items-center gap-1">
                          <LocateFixed className="w-3 h-3" /> Bus from You
                        </p>
                        {etaMinutes !== null && isLive && (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ~{etaMinutes} min
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-amber-700 text-sm">{formatDistance(distanceToBus)}</p>
                    </div>
                  ) : (
                    <div className={`rounded-2xl p-3 border ${
                      isLive
                        ? 'bg-green-50 border-green-100'
                        : 'bg-gray-50 border-transparent'
                    }`}>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase mb-0.5 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Driver
                      </p>
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {child.driver_name?.split(' ')[0] || '—'}
                      </p>
                      {/* Driver online/offline pill */}
                      <span className={`inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isLive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                        }`} />
                        {isLive ? 'Online — On Trip' : 'Offline'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Offline Context Card */}
                {!isLive && (
                  <div className="bg-slate-50 rounded-2xl p-3 mb-3 border border-slate-200/80 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5 text-amber-600">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-gray-900">
                          Trip Not In Progress
                        </p>
                        {child.last_trip_ended_at && (
                          <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                            {formatLastTripTime(child.last_trip_ended_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        {child.last_trip_ended_at
                          ? `Last completed journey was ${formatLastTripTime(child.last_trip_ended_at)}. Live GPS broadcasting will activate automatically once ${child.driver_name ? child.driver_name.split(' ')[0] : 'the driver'} starts the trip.`
                          : `Live GPS broadcasting will activate automatically once ${child.driver_name ? child.driver_name.split(' ')[0] : 'the driver'} begins the trip.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Pickup point info row */}
                {parentLocation ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl mb-3 border border-amber-100">
                    <LocateFixed className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700">
                      <strong>Your live location</strong> is the pickup point on the map
                    </p>
                  </div>
                ) : child.pickup_stop_name ? (
                  <button
                    onClick={() => setShowLocModal(true)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-indigo-50 rounded-xl mb-3 border border-indigo-100 text-left"
                  >
                    <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-indigo-400 font-semibold">REGISTERED STOP</p>
                      <p className="text-xs text-indigo-700 font-medium truncate">{child.pickup_stop_name}</p>
                    </div>
                    <span className="text-[10px] text-amber-600 font-bold whitespace-nowrap">Use My Location →</span>
                  </button>
                ) : null}

                {/* Live Route Progress */}
                {liveLocation?.route_progress && (
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-blue-50 rounded-xl mb-3 border border-blue-100">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Next Stop</p>
                      <p className="text-xs text-blue-900 font-bold truncate">{liveLocation.route_progress.next_stop_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-blue-700">{liveLocation.route_progress.distance_to_next_km} km</p>
                      <p className="text-[10px] text-blue-500">{liveLocation.route_progress.stops_remaining} remaining</p>
                    </div>
                  </div>
                )}

                {/* Call Driver */}
                {child.driver_phone ? (
                  <a
                    href={`tel:${child.driver_phone}`}
                    className="w-full py-3.5 rounded-2xl bg-gray-900 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <Phone className="w-4 h-4" />
                    Call Driver — {child.driver_name?.split(' ')[0]}
                  </a>
                ) : (
                  <div className="w-full py-3 rounded-2xl bg-gray-100 text-gray-400 text-sm flex items-center justify-center gap-2">
                    <Phone className="w-4 h-4" /> No driver phone
                  </div>
                )}
                </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Map legend */}
        <div className="absolute top-16 left-4 z-[500] bg-white/90 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-sm border border-gray-100 space-y-1.5" style={{ display: children.length > 1 ? 'none' : 'block' }}>
          <div className="flex items-center gap-2 text-[10px] font-medium text-gray-600">
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" /> Live Bus
          </div>
          {parentLocStatus === 'granted' ? (
            <div className="flex items-center gap-2 text-[10px] font-medium text-gray-600">
              <div className="w-3 h-3 rounded-full bg-amber-400 shrink-0" /> You (Pickup Point)
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] font-medium text-gray-600">
              <div className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" /> Registered Stop
            </div>
          )}
        </div>

        <style>{`
          @keyframes bus-ping {
            75%, 100% { transform: scale(2); opacity: 0; }
          }
        `}</style>
      </div>
    </>
  );
}
