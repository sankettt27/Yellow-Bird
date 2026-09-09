/**
 * Parent Dashboard — Shows children, their bus, driver, route, and live tracking.
 * Mobile-optimized with large touch targets and single-column layout.
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  GraduationCap, Bus, UserCog, Route, MapPin, Phone,
  RefreshCw, Loader2, AlertCircle, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { WebSocketManager } from '@/lib/socket';
import { VideoSplashScreen } from '@/components/ui/VideoSplashScreen';
import { NotificationPermBanner } from '@/components/ui/NotificationPermBanner';
import { LocalNotifications } from '@capacitor/local-notifications';

interface ChildBusInfo {
  student_id: string;
  student_name: string;
  class_name: string | null;
  section: string | null;
  roll_number: string | null;
  bus_id: string | null;
  bus_number: string | null;
  bus_registration: string | null;
  bus_status: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_id: string | null;
  route_name: string | null;
  route_id: string | null;
  pickup_stop_name: string | null;
  pickup_stop_lat: number | null;
  pickup_stop_lng: number | null;
  drop_stop_name: string | null;
  drop_stop_lat: number | null;
  drop_stop_lng: number | null;
  bus_latitude: number | null;
  bus_longitude: number | null;
  last_trip_started_at?: string | null;
  last_trip_ended_at?: string | null;
}

interface ParentBusInfoResponse {
  parent_name: string;
  children: ChildBusInfo[];
}

export function ParentDashboard() {
  const queryClient = useQueryClient();
  const socketsRef = useRef<Record<string, WebSocketManager>>({});
  const [showSplash, setShowSplash] = useState(true);

  const { data, isLoading, error, refetch, isFetching } = useQuery<ParentBusInfoResponse>({
    queryKey: ['parent-bus-info'],
    queryFn: async () => {
      const res = await api.get('/parents/me/bus-info');
      return res.data;
    },
    refetchInterval: 10_000, // Auto-refresh every 10s for live GPS
  });

  const children = data?.children ?? [];
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  // Track which students already got a "bus nearby" alert this session to avoid spamming
  const nearbyAlertedRef = useRef<Set<string>>(new Set());
  // Parent's live GPS location
  const [parentLocation, setParentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const parentWatchRef = useRef<number | null>(null);

  // Haversine distance in km between two lat/lng points
  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Auto-detect parent's location if device GPS is already enabled
  useEffect(() => {
    async function detectLocation() {
      if (!navigator.geolocation) return;

      // Check if permission is already granted (no popup needed)
      if ('permissions' in navigator) {
        try {
          const status = await navigator.permissions.query({ name: 'geolocation' } as any);
          if (status.state === 'granted') {
            // Silently start watching — no modal, no prompt
            parentWatchRef.current = navigator.geolocation.watchPosition(
              (pos) => {
                setParentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              },
              () => { /* silently ignore errors */ },
              { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
            );
          }
        } catch {
          // permissions API not supported
        }
      }
    }
    detectLocation();

    return () => {
      if (parentWatchRef.current !== null) {
        navigator.geolocation.clearWatch(parentWatchRef.current);
      }
    };
  }, []);

  // Register Service Worker and request notification permission
  useEffect(() => {
    async function setupNotifications() {
      // 1. Register the service worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          swRegistrationRef.current = registration;
        } catch (err) {
          console.error('SW registration failed:', err);
        }
      }

      // 2. Silently check / request Capacitor permissions on mount
      try {
        const capStatus = await LocalNotifications.checkPermissions();
        if (capStatus.display === 'prompt' || capStatus.display === 'prompt-with-rationale') {
          await LocalNotifications.requestPermissions();
        }
      } catch {
        // Not on native device
      }

      // 3. Request notification permission in browser if default
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
    setupNotifications();
  }, []);

  // Helper: fire a native notification via Capacitor LocalNotifications & Service Worker
  const fireNativeNotification = (title: string, body: string, tag?: string) => {
    // Vibrate the phone
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }

    // 1. Capacitor Native Local Notification
    LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Math.floor(Math.random() * 100000),
          schedule: { at: new Date(Date.now() + 100) },
          sound: 'beep.wav',
        },
      ],
    }).catch(() => {
      // Ignored on browser
    });

    // 2. Service Worker push notification
    const sw = swRegistrationRef.current;
    if (sw && 'Notification' in window && Notification.permission === 'granted') {
      sw.active?.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        tag: tag || 'yellowbird-trip',
        icon: '/bus-icon.png',
      });
    }
  };

  // Check if bus GPS ping is near the parent's live location OR pickup stop
  const checkBusNearby = (busLat: number, busLng: number, busId: string) => {
    const NEARBY_KM = 0.5; // 500 meters

    children.forEach((child) => {
      if (child.bus_id !== busId) return;

      // Prefer parent's live GPS; fall back to pickup stop coordinates
      const refLat = parentLocation?.lat ?? child.pickup_stop_lat;
      const refLng = parentLocation?.lng ?? child.pickup_stop_lng;
      if (refLat == null || refLng == null) return;

      const dist = haversineKm(busLat, busLng, refLat, refLng);
      const alertKey = `${child.student_id}-${busId}`;

      if (dist <= NEARBY_KM && !nearbyAlertedRef.current.has(alertKey)) {
        nearbyAlertedRef.current.add(alertKey);

        const locationLabel = parentLocation ? 'you' : (child.pickup_stop_name || 'your stop');
        const meters = Math.round(dist * 1000);
        const message = `${child.student_name}'s bus is ~${meters}m from ${locationLabel}. Get ready!`;

        toast.success(message, { icon: '📍', duration: 10000 });
        fireNativeNotification(
          `📍 Bus Nearby!`,
          message,
          `bus-nearby-${child.student_id}`
        );
      }
    });
  };

  useEffect(() => {
    if (children.length === 0) return;

    const currentBusIds = new Set(children.map(c => c.bus_id).filter(Boolean) as string[]);
    const existingSockets = socketsRef.current;

    // Disconnect old sockets that are no longer relevant
    Object.keys(existingSockets).forEach(busId => {
      if (!currentBusIds.has(busId)) {
        existingSockets[busId].disconnect();
        delete existingSockets[busId];
      }
    });

    // Connect new sockets
    currentBusIds.forEach(busId => {
      if (!existingSockets[busId]) {
        const socket = new WebSocketManager();
        socket.connectSubscriber(busId);
        
        // @ts-ignore
        socket.onMessageCallback = (msg: any) => {
          if (msg.type === 'TRIP_STARTED') {
            const message = msg.data?.message || 'Bus trip started!';
            toast.success(message, { icon: '🚌', duration: 6000 });
            fireNativeNotification('🚌 Bus Trip Started!', message);
            queryClient.invalidateQueries({ queryKey: ['parent-bus-info'] });
            queryClient.invalidateQueries({ queryKey: ['parent-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
            // Reset nearby alerts for a new trip
            nearbyAlertedRef.current.clear();
          } else if (msg.type === 'TRIP_ENDED') {
            const message = msg.data?.message || 'Bus trip completed.';
            toast.success(message, { icon: '🏁', duration: 6000 });
            fireNativeNotification('🏁 Bus Trip Completed', message);
            queryClient.invalidateQueries({ queryKey: ['parent-bus-info'] });
            queryClient.invalidateQueries({ queryKey: ['parent-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });
            nearbyAlertedRef.current.clear();
          } else if (msg.latitude != null && msg.longitude != null) {
            // This is a GPS location ping — check if bus is near any child's stop
            checkBusNearby(msg.latitude, msg.longitude, msg.bus_id || busId);
          }
        };

        existingSockets[busId] = socket;
      }
    });
  }, [children, queryClient]);

  // Handle unmount
  useEffect(() => {
    return () => {
      Object.values(socketsRef.current).forEach(socket => socket.disconnect());
    };
  }, []);

  return (
    <>
      {showSplash && <VideoSplashScreen onComplete={() => setShowSplash(false)} />}
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              My Children
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {data ? `Welcome, ${data.parent_name}` : 'Loading...'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-medium shadow-sm transition-colors disabled:opacity-50 active:scale-95"
          >
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>

        {/* Notification Permission Banner */}
        <NotificationPermBanner />

        {/* Parent's auto-detected location */}
        {parentLocation && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/40">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-400 font-medium">
              📍 Your location detected: {parentLocation.lat.toFixed(4)}, {parentLocation.lng.toFixed(4)}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Failed to load your data</p>
            <p className="text-xs text-gray-400 mt-1">{(error as Error).message}</p>
          </div>
        )}

        {/* No Children */}
        {!isLoading && !error && children.length === 0 && (
          <div className="flex flex-col items-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <GraduationCap className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No children linked yet</p>
            <p className="text-xs text-gray-400 mt-1">Contact the school admin to add your children.</p>
          </div>
        )}

        {/* Children Cards — single column, mobile-optimized */}
        {children.length > 0 && (
          <div className="space-y-4">
            {children.map((child, i) => (
              <ChildCard key={child.student_id} child={child} index={i} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ChildCard({ child, index }: { child: ChildBusInfo; index: number }) {
  const busStatusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    on_trip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm"
    >
      {/* Student Header */}
      <div className="bg-gradient-to-r from-brand-500/10 to-violet-500/10 dark:from-brand-500/20 dark:to-violet-500/20 px-4 py-3.5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-base shadow-md flex-shrink-0">
            {child.student_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{child.student_name}</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Class {child.class_name || '—'}{child.section ? `-${child.section}` : ''} 
              {child.roll_number ? ` • Roll #${child.roll_number}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="p-4 space-y-3.5">
        {/* Bus Info */}
        <InfoRow
          icon={Bus}
          label="Bus"
          value={child.bus_number || 'Not assigned'}
          badge={child.bus_status}
          badgeColors={busStatusColors}
          subtext={child.bus_registration}
        />

        {/* Driver Info — with prominent Call button */}
        <InfoRow
          icon={UserCog}
          label="Driver"
          value={child.driver_name || 'Not assigned'}
          action={child.driver_phone ? (
            <a
              href={`tel:${child.driver_phone}`}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors active:scale-95"
            >
              <Phone className="w-4 h-4" />
              Call
            </a>
          ) : undefined}
        />

        {/* Route Info */}
        <InfoRow
          icon={Route}
          label="Route"
          value={child.route_name || 'No route assigned'}
        />

        {/* Assigned Bus Stop */}
        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/30">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <MapPin className="w-3.5 h-3.5 text-green-500" />
            Assigned Bus Stop
          </div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {child.pickup_stop_name || '—'}
          </p>
        </div>

        {/* Live GPS / Trip Status Indicator */}
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600">
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              Trip Not Active
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {child.last_trip_ended_at
                ? `Previous trip ended at ${new Date(child.last_trip_ended_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`
                : 'Waiting for driver to begin journey'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  badge,
  badgeColors,
  subtext,
  action,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  badge?: string | null;
  badgeColors?: Record<string, string>;
  subtext?: string | null;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4.5 h-4.5 text-gray-500 dark:text-gray-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{value}</p>
            {badge && badgeColors && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeColors[badge] || 'bg-gray-100 text-gray-600'}`}>
                {badge.replace('_', ' ')}
              </span>
            )}
          </div>
          {subtext && <p className="text-[10px] text-gray-400">{subtext}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
