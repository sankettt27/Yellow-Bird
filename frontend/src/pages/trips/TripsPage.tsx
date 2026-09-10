/**
 * Trip History Page — view all past and active trips with route map replay.
 * Phase 5: Premium trip analytics dashboard.
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Clock, Gauge, Route, Bus, User, ChevronRight,
  CheckCircle, AlertCircle, Play, Pause, RotateCcw, Filter, Search, X, Navigation,
  TrendingUp, Calendar, Activity
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '@/lib/api';
import { WebSocketManager } from '@/lib/socket';
import type { PaginatedResponse } from '@/types';

// ─── Types ───────────────────────────────────────────────────
interface TripLocation {
  id: string;
  trip_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  recorded_at: string;
}

interface TripItem {
  id: string;
  bus_id: string;
  driver_id: string;
  status: string;
  trip_type: string;
  started_at: string | null;
  ended_at: string | null;
  distance_km: number;
  avg_speed_kmh: number;
  created_at: string;
  bus_number: string | null;
  driver_name: string | null;
  location_count?: number;
  locations?: TripLocation[];
}

// ─── Helpers ─────────────────────────────────────────────────
// Backend stores timestamps in UTC without the 'Z' suffix — fix that so the browser parses correctly
function toUTC(iso: string): string {
  return iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z';
}

function formatDuration(started: string | null, ended: string | null): string {
  if (!started) return '—';
  const start = new Date(toUTC(started)).getTime();
  const end = ended ? new Date(toUTC(ended)).getTime() : Date.now();
  const mins = Math.floor((end - start) / 60000);
  if (mins < 0) return '0m';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(toUTC(iso)).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(toUTC(iso)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Speed colour for polyline
function speedColor(speed: number): string {
  if (speed < 20) return '#22c55e';   // green – slow
  if (speed < 40) return '#f59e0b';   // amber – moderate
  return '#ef4444';                   // red – fast
}

// Haversine distance calculator for fallback when distance_km is 0
function calculateDistanceKm(locs: TripLocation[]): number {
  if (locs.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < locs.length; i++) {
    const p1 = locs[i - 1];
    const p2 = locs[i];
    const R = 6371; // radius of Earth in km
    const dLat = (p2.latitude - p1.latitude) * Math.PI / 180;
    const dLon = (p2.longitude - p1.longitude) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1.latitude * Math.PI / 180) *
      Math.cos(p2.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += R * c;
  }
  return total;
}

const replayBusIcon = L.divIcon({
  html: `
    <div style="position:relative;width:36px;height:36px;">
      <div style="
        position:absolute;inset:0;
        background:#3b82f6;
        border-radius:50%;
        border:3px solid white;
        box-shadow:0 0 12px #3b82f6aa;
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6v6"/><path d="M16 6v6"/><path d="M4 12h16"/><path d="M2 17h20"/><path d="M4 17l1-9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2l1 9"/>
        </svg>
      </div>
    </div>
  `,
  className: 'custom-replay-bus-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// ─── Status Badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    completed:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    cancelled:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    scheduled:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  };
  const icons: Record<string, React.ReactElement> = {
    in_progress: <Activity className="w-3 h-3" />,
    completed:   <CheckCircle className="w-3 h-3" />,
    cancelled:   <AlertCircle className="w-3 h-3" />,
    scheduled:   <Clock className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${styles[status] ?? styles.scheduled}`}>
      {icons[status]}
      {status.replace('_', ' ')}
    </span>
  );
}

// ─── Trip Detail Modal ────────────────────────────────────────
function TripDetailModal({ trip, onClose }: { trip: TripItem; onClose: () => void }) {
  const { data, isLoading } = useQuery<TripItem>({
    queryKey: ['trip-detail', trip.id],
    queryFn: async () => {
      const res = await api.get(`/tracking/trips/${trip.id}`);
      return res.data;
    },
  });

  const locations = data?.locations ?? [];
  const polyline = locations.map(l => [l.latitude, l.longitude] as [number, number]);
  const center: [number, number] = polyline.length > 0
    ? polyline[Math.floor(polyline.length / 2)]
    : [20.0003, 73.7845];

  // Replay state
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  // Playback timer loop
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && locations.length > 0) {
      timer = setInterval(() => {
        setReplayIndex((prev) => {
          if (prev >= locations.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, Math.max(50, 300 / speedMultiplier));
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, locations.length, speedMultiplier]);

  // Haversine distance fallback if trip.distance_km is 0
  const distanceKm = trip.distance_km > 0
    ? trip.distance_km
    : calculateDistanceKm(locations);

  // Speed stats
  const speeds = locations.map(l => l.speed).filter(s => s > 0);
  const maxSpeed = speeds.length ? Math.max(...speeds) : 0;
  const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

  const currentPoint = locations[replayIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Route className="w-5 h-5 text-brand-500" />
              Trip Route Replay
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {trip.bus_number} · {formatDate(trip.started_at)} · {formatTime(trip.started_at)} → {formatTime(trip.ended_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Map & Replay Controls */}
          <div className="flex-1 min-h-[350px] relative flex flex-col">
            <div className="flex-1 relative">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading route data…</p>
                  </div>
                </div>
              ) : polyline.length > 0 ? (
                <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={true}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  {/* Speed-coloured polyline segments */}
                  {locations.slice(1).map((loc, i) => (
                    <Polyline
                      key={loc.id}
                      positions={[
                        [locations[i].latitude, locations[i].longitude],
                        [loc.latitude, loc.longitude]
                      ]}
                      color={speedColor(loc.speed)}
                      weight={4}
                      opacity={0.9}
                    />
                  ))}
                  {/* Start marker */}
                  {polyline.length > 0 && (
                    <CircleMarker center={polyline[0]} radius={8} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 1 }}>
                      <Popup>🟢 Trip Start</Popup>
                    </CircleMarker>
                  )}
                  {/* End marker */}
                  {polyline.length > 1 && (
                    <CircleMarker center={polyline[polyline.length - 1]} radius={8} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }}>
                      <Popup>🔴 Trip End</Popup>
                    </CircleMarker>
                  )}
                  
                  {/* Replay moving bus marker */}
                  {currentPoint && (
                    <Marker position={[currentPoint.latitude, currentPoint.longitude]} icon={replayBusIcon}>
                      <Popup>
                        <div className="p-1 text-center text-xs">
                          <p className="font-bold m-0">🚌 Bus Replay</p>
                          <p className="m-0 text-gray-500">Speed: {currentPoint.speed} km/h</p>
                          <p className="m-0 text-[10px] text-gray-400">{formatTime(currentPoint.recorded_at)}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* School Marker */}
                  <Marker position={[20.0003, 73.7845]} icon={schoolIcon}>
                    <Popup>
                      <div className="p-1 text-center">
                        <p className="font-bold text-sm m-0">Our School</p>
                        <p className="text-[10px] text-gray-500 m-0">Main Campus</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 gap-3">
                  <Navigation className="w-12 h-12 text-gray-300" />
                  <p className="text-sm text-gray-400">No GPS data recorded for this trip</p>
                </div>
              )}
            </div>

            {/* Interactive Replay Player Bar */}
            {locations.length > 0 && (
              <div className="p-3 bg-gray-900 text-white flex flex-col gap-2 border-t border-gray-800">
                <div className="flex items-center gap-3">
                  {/* Play / Pause button */}
                  <button
                    onClick={() => {
                      if (replayIndex >= locations.length - 1) {
                        setReplayIndex(0);
                      }
                      setIsPlaying(!isPlaying);
                    }}
                    className="p-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>

                  {/* Reset button */}
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setReplayIndex(0);
                    }}
                    className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                    title="Restart Replay"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Timeline scrubber slider */}
                  <input
                    type="range"
                    min={0}
                    max={locations.length - 1}
                    value={replayIndex}
                    onChange={(e) => setReplayIndex(Number(e.target.value))}
                    className="flex-1 accent-brand-500 cursor-pointer h-2 bg-gray-700 rounded-lg"
                  />

                  {/* Playback speed buttons */}
                  <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-xl">
                    {[1, 2, 5, 10].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSpeedMultiplier(s)}
                        className={`px-2 py-0.5 text-xs font-semibold rounded-lg transition-colors ${
                          speedMultiplier === s
                            ? 'bg-brand-500 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress metadata */}
                <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                  <span>GPS Point {replayIndex + 1} / {locations.length}</span>
                  {currentPoint && (
                    <span>
                      Time: {formatTime(currentPoint.recorded_at)} · Speed: {currentPoint.speed} km/h
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right panel — stats */}
          <div className="w-full md:w-64 flex-shrink-0 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</span>
                <StatusBadge status={trip.status} />
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Duration', value: formatDuration(trip.started_at, trip.ended_at), icon: Clock, color: 'text-blue-500' },
                  { label: 'Distance', value: `${distanceKm.toFixed(1)} km`, icon: Route, color: 'text-purple-500' },
                  { label: 'Max Speed', value: `${maxSpeed.toFixed(0)} km/h`, icon: Gauge, color: 'text-red-500' },
                  { label: 'Avg Speed', value: `${avgSpeed.toFixed(0)} km/h`, icon: TrendingUp, color: 'text-emerald-500' },
                  { label: 'GPS Points', value: String(locations.length), icon: MapPin, color: 'text-orange-500' },
                  { label: 'Trip Type', value: trip.trip_type, icon: Activity, color: 'text-brand-500' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <Icon className={`w-4 h-4 ${color} mb-1.5`} />
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{value}</p>
                  </div>
                ))}
              </div>

              {/* Driver / Bus info */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 text-sm">
                  <Bus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500 dark:text-gray-400 truncate">{trip.bus_number ?? 'Unknown Bus'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500 dark:text-gray-400 truncate">{trip.driver_name ?? 'Unknown Driver'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500 dark:text-gray-400">{formatDate(trip.started_at)}</span>
                </div>
              </div>

              {/* Speed legend */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Speed Legend</p>
                <div className="space-y-1.5">
                  {[
                    { color: '#22c55e', label: '< 20 km/h — Slow' },
                    { color: '#f59e0b', label: '20-40 km/h — Normal' },
                    { color: '#ef4444', label: '> 40 km/h — Fast' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-6 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

// ─── Custom School Marker Icon ────────────────────────────────────
const schoolIcon = L.divIcon({
  html: `
    <div style="position:relative;width:40px;height:40px;">
      <div style="
        position:absolute;inset:4px;
        background:#10b981;
        border-radius:50%;
        border:3px solid white;
        box-shadow:0 4px 12px #10b98166;
        display:flex;align-items:center;justify-content:center;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19v-4"/><path d="M4 10V6"/><path d="M4 6l8-4 8 4"/><path d="M20 6v13"/><path d="M10 19v-5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v5"/><path d="M8 10h8"/><path d="M2 19h20"/>
        </svg>
      </div>
    </div>
  `,
  className: 'custom-school-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

export function TripsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<TripItem | null>(null);
  const wsRef = useRef<WebSocketManager | null>(null);

  // Listen for real-time trip start/end events from the global WebSocket
  useEffect(() => {
    const ws = new WebSocketManager();
    ws.connectGlobalSubscriber();

    // @ts-ignore
    ws.onMessageCallback = (msg: any) => {
      if (msg.type === 'TRIP_STARTED' || msg.type === 'TRIP_ENDED') {
        // Instantly refresh the trips list
        queryClient.invalidateQueries({ queryKey: ['trips'] });
      }
    };

    wsRef.current = ws;
    return () => { ws.disconnect(); };
  }, [queryClient]);

  const { data, isLoading } = useQuery<PaginatedResponse<TripItem>>({
    queryKey: ['trips', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: '15' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/tracking/trips?${params}`);
      return res.data;
    },
    refetchInterval: 10000, // Refresh every 10s as backup
  });

  const trips = (data?.items ?? []) as TripItem[];
  const filteredTrips = search
    ? trips.filter(t =>
        t.bus_number?.toLowerCase().includes(search.toLowerCase()) ||
        t.driver_name?.toLowerCase().includes(search.toLowerCase())
      )
    : trips;

  // Summary stats
  const completedCount = trips.filter(t => t.status === 'completed').length;
  const activeCount = trips.filter(t => t.status === 'in_progress').length;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trip History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Full GPS route replay, speed analytics and journey logs
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Trips',     value: data?.total ?? 0,    icon: Route,        color: 'text-brand-500',    bg: 'bg-brand-50 dark:bg-brand-900/20' },
          { label: 'Active Now',      value: activeCount,          icon: Play,         color: 'text-blue-500',     bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Completed Today', value: completedCount,       icon: CheckCircle,  color: 'text-emerald-500',  bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'This Page',       value: trips.length,         icon: Filter,       color: 'text-purple-500',   bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by bus or driver name…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-700 dark:text-gray-300"
        >
          <option value="">All Statuses</option>
          <option value="in_progress">Active</option>
          <option value="completed">Completed</option>
          <option value="scheduled">Scheduled</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Trips Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 px-6 flex items-center gap-4">
                <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="w-32 h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="w-48 h-2.5 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="w-20 h-6 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-16">
            <Route className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No trips found</p>
            <p className="text-xs text-gray-400 mt-1">Trips will appear here once drivers start their routes</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-6 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-700/30 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
              <div className="col-span-2">Bus / Driver</div>
              <div>Status</div>
              <div>Started</div>
              <div>Duration</div>
              <div className="text-right">Action</div>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-gray-700/30">
              {filteredTrips.map((trip, idx) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="grid grid-cols-6 gap-4 px-6 py-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors group"
                >
                  {/* Bus / Driver */}
                  <div className="col-span-2 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      trip.status === 'in_progress'
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Bus className={`w-4 h-4 ${trip.status === 'in_progress' ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">
                        {trip.bus_number ?? 'Bus'}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {trip.driver_name ?? 'Driver'}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <StatusBadge status={trip.status} />
                  </div>

                  {/* Started */}
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{formatTime(trip.started_at)}</p>
                    <p className="text-xs text-gray-400">{formatDate(trip.started_at)}</p>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {formatDuration(trip.started_at, trip.ended_at)}
                  </div>

                  {/* Action */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => setSelectedTrip(trip)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 hover:text-white hover:bg-brand-500 rounded-lg transition-all border border-brand-200 dark:border-brand-800 group-hover:border-brand-400"
                    >
                      <MapPin className="w-3 h-3" />
                      View Route
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, data.total)} of {data.total} trips
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm font-medium text-brand-600 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
              {page} / {data.total_pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
              disabled={page === data.total_pages}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Trip Detail Modal */}
      <AnimatePresence>
        {selectedTrip && (
          <TripDetailModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
