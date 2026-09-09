/**
 * Trip Store — Persists active trip and GPS state across tab navigation AND app restarts.
 *
 * Key behaviors:
 * - GPS watchPosition runs at the store level, not inside a component,
 *   so switching driver tabs NEVER stops the trip.
 * - `currentTrip` and `isTracking` are persisted to localStorage so the
 *   driver sees "ON TRIP" immediately on app restart (before API confirms).
 * - `resumeTrip()` is called on DriverDashboard mount — it checks the
 *   backend for an active trip and restarts GPS + WebSocket if found.
 */

import { create } from 'zustand';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { wsClient } from '@/lib/socket';
import type { Trip } from '@/types';
import { Geolocation } from '@capacitor/geolocation';

// ── localStorage helpers ─────────────────────────────────────────
const STORAGE_KEY = 'yb_active_trip';

function saveTripToStorage(trip: Trip | null) {
  if (trip) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function loadTripFromStorage(): Trip | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Types ────────────────────────────────────────────────────────
export interface GpsData {
  lat: number;
  lng: number;
  speed: number;
  accuracy: number;
}

interface TripState {
  // Trip
  currentTrip: Trip | null;
  isTracking: boolean;
  isResuming: boolean;  // true while checking backend for active trip

  // GPS
  gpsStatus: 'idle' | 'acquiring' | 'active' | 'error';
  gpsError: string | null;
  gpsData: GpsData | null;
  isApproximateOnly: boolean;
  routeProgress: {
    next_stop_name: string;
    stops_remaining: number;
    distance_to_next_km: number;
  } | null;
  pingsCount: number;

  // WebSocket
  isWsConnected: boolean;

  // Watch handle (not reactive, just stored here for cleanup)
  _watchId: string | null;
  _wakeLock: any | null;
  _visibilityHandler: (() => void) | null;

  // Actions
  startTrip: (busId: string, driverId: string) => Promise<void>;
  endTrip: () => Promise<void>;
  resumeTrip: () => Promise<void>;
  requestPrecisePermission: () => Promise<void>;
  _beginGps: (busId: string, tripId: string) => void;
  _requestWakeLock: () => Promise<void>;
  _haltGps: () => void;
  reset: () => void;
}

// ── Read initial state from localStorage ─────────────────────────
const savedTrip = loadTripFromStorage();

export const useTripStore = create<TripState>((set, get) => ({
  currentTrip: savedTrip,
  isTracking: !!savedTrip,
  isResuming: false,
  gpsStatus: 'idle',
  gpsError: null,
  gpsData: null,
  isApproximateOnly: false,
  routeProgress: null,
  pingsCount: 0,
  isWsConnected: false,
  _watchId: null,
  _wakeLock: null,
  _visibilityHandler: null,

  startTrip: async (busId: string, driverId: string) => {
    try {
      const res = await api.post('/tracking/trips/start', {
        bus_id: busId,
        driver_id: driverId,
        trip_type: 'MORNING',
      });
      const trip: Trip = res.data;
      saveTripToStorage(trip);
      set({ currentTrip: trip, isTracking: true });
      toast.success('Trip started! Broadcasting live location.');
      get()._beginGps(trip.bus_id, trip.id);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to start trip');
      throw err;
    }
  },

  endTrip: async () => {
    const { currentTrip } = get();
    if (!currentTrip) return;
    try {
      await api.post(`/tracking/trips/${currentTrip.id}/end`);
      await get()._haltGps();
      saveTripToStorage(null);
      set({
        currentTrip: null,
        isTracking: false,
        isWsConnected: false,
        gpsData: null,
        routeProgress: null,
        gpsStatus: 'idle',
        pingsCount: 0,
      });
      toast.success('Trip completed! Location sharing stopped.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to end trip');
      throw err;
    }
  },

  resumeTrip: async () => {
    // Don't resume if already tracking with active GPS
    if (get()._watchId !== null) return;

    set({ isResuming: true });
    try {
      const res = await api.get('/tracking/trips/my-active');
      const trip: Trip | null = res.data;

      if (trip) {
        // Active trip found on server — restore state and restart GPS
        saveTripToStorage(trip);
        set({ currentTrip: trip, isTracking: true });
        get()._beginGps(trip.bus_id, trip.id);
      } else {
        // No active trip — clear any stale local state
        saveTripToStorage(null);
        set({ currentTrip: null, isTracking: false, gpsStatus: 'idle' });
      }
    } catch (err) {
      // Network error — keep whatever local state we have
      console.warn('Could not check for active trip:', err);
    } finally {
      set({ isResuming: false });
    }
  },

  _requestWakeLock: async () => {
    if ('wakeLock' in navigator) {
      try {
        // @ts-ignore
        const lock = await navigator.wakeLock.request('screen');
        set({ _wakeLock: lock });

        const handler = async () => {
          if (document.visibilityState === 'visible' && get().isTracking) {
            try {
              // @ts-ignore
              const newLock = await navigator.wakeLock.request('screen');
              set({ _wakeLock: newLock });
            } catch (e) {
              console.warn('Could not re-acquire wake lock:', e);
            }
          }
        };
        document.addEventListener('visibilitychange', handler);
        set({ _visibilityHandler: handler });
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    }
  },

  requestPrecisePermission: async () => {
    try {
      const res = await Geolocation.requestPermissions({ permissions: ['location'] });
      const isApproximateOnly = res.coarseLocation === 'granted' && res.location !== 'granted';
      set({ isApproximateOnly });
      if (res.location === 'granted') {
        toast.success('Precise GPS permission granted! Locking pinpoint satellite coordinates.');
        const { isTracking, currentTrip } = get();
        if (isTracking && currentTrip) {
          await get()._haltGps();
          get()._beginGps(currentTrip.bus_id, currentTrip.id);
        }
      } else if (isApproximateOnly) {
        toast.error('Android is still in Approximate mode. Please choose "Precise" in Location permissions.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Could not request precise location');
    }
  },

  _beginGps: async (busId: string, tripId: string) => {
    set({ gpsStatus: 'acquiring', gpsError: null });

    await get()._requestWakeLock();

    // Check / prompt permissions and verify whether Precise Location is granted
    try {
      let permStatus = await Geolocation.checkPermissions();
      if (permStatus.location === 'prompt' || permStatus.location === 'prompt-with-rationale') {
        permStatus = await Geolocation.requestPermissions({ permissions: ['location'] });
      }
      const isApproximateOnly = permStatus.coarseLocation === 'granted' && permStatus.location !== 'granted';
      set({ isApproximateOnly });
      if (isApproximateOnly) {
        toast('⚠️ Approximate location active. Enable Precise Location for meter-level accuracy like Google Maps.', {
          icon: '📍',
          duration: 6000,
        });
      }
    } catch {
      // Browser or permission API not available — continue
    }

    wsClient.connectDriver(busId);
    wsClient.onConnect(() => set({ isWsConnected: true }));
    wsClient.onDisconnect(() => set({ isWsConnected: false }));
    wsClient.onMessage((data) => {
      if (data.route_progress) {
        set({ routeProgress: data.route_progress });
      }
    });

    // ── Phase 1: High-Precision Initial Fix ────────────────────────
    // Always use enableHighAccuracy: true and maximumAge: 0.
    // Never accept stale cell-tower fixes!
    try {
      const initialPos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 0,
      });
      if (initialPos && initialPos.coords) {
        const { latitude, longitude, speed, heading, accuracy } = initialPos.coords;
        const speedKmh = speed !== null ? speed * 3.6 : 0;
        set((s) => ({
          gpsData: { lat: latitude, lng: longitude, speed: speedKmh, accuracy: accuracy ?? 0 },
          gpsStatus: 'active',
          pingsCount: s.pingsCount + 1,
        }));
        wsClient.send({
          latitude,
          longitude,
          speed: speedKmh,
          heading: heading ?? 0,
          accuracy: accuracy ?? 0,
          trip_id: tripId,
        });
      }
    } catch {
      // High-accuracy watch below will catch the fix
    }

    // ── Phase 2: High-Frequency Pinpoint Telemetry Stream ─────────
    // 1-second update interval (1000ms), enableHighAccuracy: true, maximumAge: 0
    // enableLocationFallback: false forces Google Play Services Fused GNSS for meter-level accuracy.
    const watchId = await Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        interval: 1000,
        minimumUpdateInterval: 1000,
        enableLocationFallback: false,
      } as any,
      (position, err) => {
        if (err) {
          if (get().gpsData !== null) {
            console.warn('Transient GPS watch drop ignored:', err.message || err);
            return;
          }

          const msg = (err.message || '').toLowerCase();
          const isTransient =
            msg.includes('timeout') ||
            msg.includes('time') ||
            msg.includes('obtain') ||
            msg.includes('unavailable') ||
            msg.includes('position');

          if (isTransient) {
            return;
          }

          set({ gpsError: err.message || 'GPS error', gpsStatus: 'error' });
          toast.error(`GPS Error: ${err.message || 'Location unavailable'}`);
          return;
        }

        if (position && position.coords) {
          const { latitude, longitude, speed, heading, accuracy } = position.coords;
          const speedKmh = speed !== null ? speed * 3.6 : 0;

          // Precision filter: If current fix is already pinpoint (< 15m),
          // reject sudden coarse jumps (accuracy > 70m) that happen when phone temporarily falls back to a distant cell tower
          const currentGps = get().gpsData;
          if (currentGps && currentGps.accuracy > 0 && currentGps.accuracy < 15 && (accuracy ?? 999) > 70) {
            console.warn(`Ignoring coarse jump (±${Math.round(accuracy ?? 0)}m) to maintain pinpoint lock`);
            return;
          }

          set((s) => ({
            gpsData: { lat: latitude, lng: longitude, speed: speedKmh, accuracy: accuracy ?? 0 },
            gpsStatus: 'active',
            pingsCount: s.pingsCount + 1,
          }));
          wsClient.send({
            latitude,
            longitude,
            speed: speedKmh,
            heading: heading ?? 0,
            accuracy: accuracy ?? 0,
            trip_id: tripId,
          });
        }
      }
    );

    set({ _watchId: watchId });
  },

  _haltGps: async () => {
    const { _watchId, _wakeLock, _visibilityHandler } = get();
    if (_watchId !== null) {
      await Geolocation.clearWatch({ id: _watchId });
    }
    if (_wakeLock !== null) {
      try { _wakeLock.release(); } catch (e) {}
    }
    if (_visibilityHandler !== null) {
      document.removeEventListener('visibilitychange', _visibilityHandler);
    }
    wsClient.disconnect();
    set({ _watchId: null, _wakeLock: null, _visibilityHandler: null });
  },

  reset: () => {
    get()._haltGps();
    saveTripToStorage(null);
    set({
      currentTrip: null,
      isTracking: false,
      gpsStatus: 'idle',
      gpsError: null,
      gpsData: null,
      pingsCount: 0,
      isWsConnected: false,
    });
  },
}));
