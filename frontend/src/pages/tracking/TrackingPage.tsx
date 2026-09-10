/**
 * Live Tracking Page — Premium admin/parent real-time fleet monitoring.
 * Features: animated bus markers, telemetry panel, speed indicators, live status.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bus as BusIcon, Navigation, Activity, Wifi, WifiOff,
  Gauge, Clock, MapPin, ChevronRight, Signal, RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';
import type { LocationData, Bus, RouteStop } from '@/types';
import { wsClient } from '@/lib/socket';

// ─── Custom Bus Marker Icon ────────────────────────────────────
function createBusIcon(speed: number, isSelected: boolean) {
  const color = isSelected ? '#d97706' : '#eab308';
  const ring = isSelected ? '#d9770633' : '#eab30833';
  const size = isSelected ? 48 : 40;
  return L.divIcon({
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="
          position:absolute;inset:0;
          background:${ring};
          border-radius:50%;
          animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
        "></div>
        <div style="
          position:absolute;inset:4px;
          background:${color};
          border-radius:50%;
          border:3px solid white;
          box-shadow:0 4px 12px ${color}66;
          display:flex;align-items:center;justify-content:center;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/>
            <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
            <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
          </svg>
        </div>
        ${speed > 0 ? `<div style="
          position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);
          background:${color};color:white;font-size:9px;font-weight:700;
          padding:2px 5px;border-radius:4px;white-space:nowrap;
          box-shadow:0 2px 4px rgba(0,0,0,0.2);
        ">${Math.round(speed)} km/h</div>` : ''}
      </div>
    `,
    className: 'custom-bus-icon',
    iconSize: [size, size + 24],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

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

// ─── Map Auto-Center Helper ────────────────────────────────────
function MapCenterController({ locations }: { locations: Record<string, LocationData> }) {
  const map = useMap();
  const hasCentered = useRef(false);
  useEffect(() => {
    const locs = Object.values(locations);
    if (locs.length > 0 && !hasCentered.current) {
      map.setView([locs[0].latitude, locs[0].longitude], 14, { animate: true });
      hasCentered.current = true;
    }
  }, [locations, map]);
  return null;
}

// ─── Speed Badge ───────────────────────────────────────────────
function SpeedBadge({ speed }: { speed: number }) {
  const color = speed < 20 ? 'text-green-600 bg-green-50' : speed < 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      <Gauge className="w-3 h-3" />
      {Math.round(speed)} km/h
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────
export function TrackingPage() {
  const [locations, setLocations] = useState<Record<string, LocationData>>({});
  const [locationHistory, setLocationHistory] = useState<Record<string, [number, number][]>>({});
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [updateCount, setUpdateCount] = useState(0);
  const mapRef = useRef<L.Map | null>(null);

  // Fetch school coordinates from admin settings
  const { data: settingsData } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const schoolCoords: [number, number] = [
    settingsData?.school?.latitude ?? 20.0003,
    settingsData?.school?.longitude ?? 73.7845,
  ];
  const schoolName = settingsData?.school?.name ?? 'Our School';

  const { data: busesData } = useQuery({
    queryKey: ['buses-all'],
    queryFn: async () => {
      const res = await api.get('/buses?page=1&page_size=100');
      return res.data.items as Bus[];
    },
    refetchInterval: 30000,
  });
  const buses = busesData ?? [];

  const selectedBus = selectedBusId ? buses.find(b => b.id === selectedBusId) : null;
  const selectedLoc = selectedBusId ? locations[selectedBusId] : null;

  // Fetch routes and stops for the selected bus
  const { data: routeStopsData } = useQuery({
    queryKey: ['route-stops', selectedBus?.assigned_route_id],
    queryFn: async () => {
      if (!selectedBus?.assigned_route_id) return [];
      const res = await api.get(`/routes/${selectedBus.assigned_route_id}/stops`);
      return res.data as RouteStop[];
    },
    enabled: !!selectedBus?.assigned_route_id,
  });
  
  const routeStops = routeStopsData ?? [];
  const routePath = routeStops.map(rs => rs.stop ? [rs.stop.latitude, rs.stop.longitude] as [number, number] : null).filter(Boolean) as [number, number][];

  // Refresh button just forces a fetch
  const fetchLocations = useCallback(async () => {
    try {
      const res = await api.get('/tracking/locations/active');
      setLocations(res.data as Record<string, LocationData>);
      setLastRefresh(new Date());
    } catch {}
  }, []);

  // WebSocket Integration for true real-time
  useEffect(() => {
    wsClient.connectGlobalSubscriber();
    wsClient.onConnect(() => {
      setIsConnected(true);
      // Fetch initial active locations in case INIT message is missed or delayed
      api.get('/tracking/locations/active').then(res => {
        const data = res.data as Record<string, LocationData>;
        setLocations(data);
        
        // Initialize history
        const hist: Record<string, [number, number][]> = {};
        for (const [id, loc] of Object.entries(data)) {
          hist[id] = [[loc.latitude, loc.longitude]];
        }
        setLocationHistory(hist);
        
        setLastRefresh(new Date());
      }).catch(() => {});
    });
    
    wsClient.onDisconnect(() => setIsConnected(false));
    
    // @ts-ignore
    wsClient.onMessageCallback = (msg: any) => {
      if (msg.type === 'INIT') {
        setLocations(msg.data);
        
        const hist: Record<string, [number, number][]> = {};
        for (const [id, loc] of Object.entries(msg.data as Record<string, LocationData>)) {
          hist[id] = [[loc.latitude, loc.longitude]];
        }
        setLocationHistory(hist);
        
        setLastRefresh(new Date());
      } else if (msg.type === 'UPDATE') {
        const loc = msg.data as LocationData;
        setLocations(prev => ({ ...prev, [msg.bus_id]: loc }));
        
        // Append to history (keep last 20 points)
        setLocationHistory(prev => {
          const old = prev[msg.bus_id] || [];
          return { ...prev, [msg.bus_id]: [...old.slice(-19), [loc.latitude, loc.longitude]] };
        });
        
        setLastRefresh(new Date());
        setUpdateCount(c => c + 1);
      }
    };

    return () => {
      wsClient.disconnect();
    };
  }, []);

  const activeBusesCount = Object.keys(locations).length;

  const flyToBus = (busId: string) => {
    const loc = locations[busId];
    if (loc && mapRef.current) {
      mapRef.current.flyTo([loc.latitude, loc.longitude], 16, { animate: true, duration: 1.2 });
    }
    setSelectedBusId(busId === selectedBusId ? null : busId);
  };

  return (
    <div className="h-[calc(100vh-72px)] flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Navigation className="w-6 h-6 text-brand-500" />
            Live Fleet Tracking
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time GPS telemetry from all active buses</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <motion.div
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
              isConnected
                ? 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800/30'
                : 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800/30'
            }`}
          >
            {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isConnected ? 'Live' : 'Disconnected'}
          </motion.div>

          {/* Active Bus Count */}
          <div className="flex items-center gap-2 px-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 rounded-xl border border-brand-200 dark:border-brand-800/30">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-bold">{activeBusesCount} Active</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchLocations}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main Layout: Map + Sidebar ── */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* ── Left Sidebar: Fleet List ── */}
        <div className="w-72 shrink-0 flex flex-col gap-3 overflow-hidden">
          {/* Stat row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeBusesCount}</p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Active Buses</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 text-center">
              <p className="text-2xl font-bold text-brand-500">{updateCount}</p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">GPS Updates</p>
            </div>
          </div>

          {/* Bus List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 -mr-0.5">
            {activeBusesCount === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BusIcon className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Active Buses</p>
                <p className="text-xs text-gray-400 mt-1">Buses will appear here when drivers start their trips</p>
              </div>
            ) : (
              <AnimatePresence>
                {Object.entries(locations).map(([busId, loc], i) => {
                  const bus = buses.find(b => b.id === busId);
                  const isSelected = selectedBusId === busId;
                  return (
                    <motion.button
                      key={busId}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => flyToBus(busId)}
                      className={`w-full text-left rounded-2xl border p-3.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700 shadow-md shadow-brand-500/10'
                          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-brand-200 dark:hover:border-brand-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-brand-500 text-white' : 'bg-brand-50 dark:bg-brand-900/30 text-brand-600'
                          }`}>
                            <BusIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">
                              {bus?.bus_number || `Bus ${busId.slice(0, 6)}`}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {bus?.registration_number || 'Unregistered'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-brand-500 rotate-90' : 'text-gray-300'}`} />
                      </div>

                      <div className="flex items-center justify-between">
                        <SpeedBadge speed={loc.speed} />
                        <span className="flex items-center gap-1 text-[10px] text-green-500 font-semibold">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          LIVE
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Last updated footer */}
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 px-1">
            <Clock className="w-3 h-3" />
            Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        {/* ── Map ── */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden relative">
          <MapContainer
            center={schoolCoords}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterController locations={locations} />

            {/* School Marker — dynamic coordinates from admin settings */}
            <Marker position={schoolCoords} icon={schoolIcon}>
              <Popup className="bus-popup">
                <div className="p-1 text-center">
                  <p className="font-bold text-sm m-0">{schoolName}</p>
                  <p className="text-[10px] text-gray-500 m-0">Main Campus</p>
                </div>
              </Popup>
            </Marker>

            {/* Render Route Polyline */}
            {routePath.length > 1 && (
              <Polyline positions={routePath} color="#7c3aed" weight={4} opacity={0.7} dashArray="10, 10" />
            )}
            
            {/* Render Bus Stops */}
            {routeStops.map((rs) => rs.stop && (
              <CircleMarker 
                key={rs.id} 
                center={[rs.stop.latitude, rs.stop.longitude]} 
                radius={6} 
                pathOptions={{ color: '#7c3aed', fillColor: 'white', fillOpacity: 1, weight: 3 }}
              >
                <Popup className="bus-popup">
                  <div className="p-1 text-center">
                    <p className="font-bold text-xs m-0">{rs.stop.name}</p>
                    <p className="text-[10px] text-gray-500 m-0">Stop {rs.sequence_order}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Geofence around first stop */}
            {routePath.length > 0 && (
              <Circle center={routePath[0]} radius={500} pathOptions={{ color: '#ec4899', fillColor: '#ec4899', fillOpacity: 0.1, weight: 1 }} />
            )}

            {/* Historic Trails for buses */}
            {Object.entries(locationHistory).map(([busId, hist]) => {
              if (hist.length > 1) {
                const isSelected = selectedBusId === busId;
                return (
                  <Polyline 
                    key={`trail-${busId}`} 
                    positions={hist} 
                    color={isSelected ? "#7c3aed" : "#3b82f6"} 
                    weight={3} 
                    opacity={isSelected ? 0.8 : 0.4} 
                  />
                );
              }
              return null;
            })}

            {Object.entries(locations).map(([busId, loc]) => {
              const bus = buses.find(b => b.id === busId);
              const isSelected = selectedBusId === busId;
              return (
                <Marker
                  key={busId}
                  position={[loc.latitude, loc.longitude]}
                  icon={createBusIcon(loc.speed, isSelected)}
                  eventHandlers={{ click: () => flyToBus(busId) }}
                >
                  <Popup maxWidth={240} className="bus-popup">
                    <div className="p-2 min-w-[200px]">
                      <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-gray-100">
                        <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0">
                          <BusIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm m-0">{bus?.bus_number || 'Unknown'}</p>
                          <p className="text-xs text-gray-400 m-0">{bus?.registration_number || 'No reg'}</p>
                        </div>
                        <span className="ml-auto flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          LIVE
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-400 m-0">Speed</p>
                          <p className="text-base font-bold text-gray-900 m-0">{Math.round(loc.speed)}<span className="text-xs font-normal text-gray-400"> km/h</span></p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-400 m-0">Capacity</p>
                          <p className="text-base font-bold text-gray-900 m-0">{bus?.capacity ?? '--'}<span className="text-xs font-normal text-gray-400"> seats</span></p>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 text-center m-0">
                        {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Map overlay: empty state */}
          {activeBusesCount === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm z-[500]">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-gray-700 max-w-xs"
              >
                <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Signal className="w-8 h-8 text-brand-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Waiting for Buses</h3>
                <p className="text-sm text-gray-500">Bus markers will appear on the map once drivers start their trips and enable GPS tracking.</p>
              </motion.div>
            </div>
          )}

          {/* Map overlay: selected bus info chip */}
          <AnimatePresence>
            {selectedLoc && selectedBus && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl px-5 py-3 flex items-center gap-4"
              >
                <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center text-white">
                  <BusIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{selectedBus.bus_number}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{selectedBus.registration_number}</p>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                <SpeedBadge speed={selectedLoc.speed} />
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                <button
                  onClick={() => setSelectedBusId(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs font-medium"
                >
                  Deselect
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Leaflet ping animation style */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .leaflet-popup-content-wrapper { border-radius: 16px; padding: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
        .leaflet-popup-tip { display: none; }
        .custom-bus-icon { background: none; border: none; }
      `}</style>
    </div>
  );
}
