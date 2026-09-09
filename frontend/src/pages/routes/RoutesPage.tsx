/**
 * Routes & Bus Stops Management Page.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as RouteIcon, MapPin, Plus, Trash2, Clock, Navigation, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Route as RouteType, BusStop, PaginatedResponse } from '@/types';

export function RoutesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'routes' | 'stops'>('routes');
  const [showCreateRoute, setShowCreateRoute] = useState(false);
  const [showCreateStop, setShowCreateStop] = useState(false);

  const { data: routesData, isLoading: loadingRoutes } = useQuery<PaginatedResponse<RouteType>>({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await api.get('/routes');
      return res.data;
    },
  });

  const { data: stopsData, isLoading: loadingStops } = useQuery<BusStop[]>({
    queryKey: ['stops-all'],
    queryFn: async () => {
      const res = await api.get('/routes/stops/all');
      return res.data;
    },
  });

  const createRoute = useMutation({
    mutationFn: (formData: any) =>
      api.post('/routes', { ...formData, school_id: user?.school_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setShowCreateRoute(false);
      toast.success('Route created successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to create route'),
  });

  const createStop = useMutation({
    mutationFn: (formData: any) =>
      api.post('/routes/stops', { ...formData, school_id: user?.school_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stops-all'] });
      setShowCreateStop(false);
      toast.success('Bus stop added');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to add stop'),
  });

  const deleteRoute = useMutation({
    mutationFn: (id: string) => api.delete(`/routes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Route deleted successfully');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to delete route'),
  });

  const routes = routesData?.items ?? [];
  const stops = stopsData ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Routes & Bus Stops</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Design school transportation routes and configure bus pickup/drop stops
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'routes' ? (
            <button
              onClick={() => setShowCreateRoute(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Route
            </button>
          ) : (
            <button
              onClick={() => setShowCreateStop(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Bus Stop
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('routes')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all ${
            activeTab === 'routes'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <RouteIcon className="w-4 h-4" />
          Routes ({routes.length})
        </button>
        <button
          onClick={() => setActiveTab('stops')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all ${
            activeTab === 'stops'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Bus Stops ({stops.length})
        </button>
      </div>

      {activeTab === 'routes' ? (
        loadingRoutes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : routes.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <RouteIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No routes configured</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map((route) => (
              <div
                key={route.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <RouteIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{route.name}</h3>
                      <p className="text-xs text-gray-400">{route.description || 'No description'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteRoute.mutate(route.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-50 dark:border-gray-700/50 pt-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>Est. {route.estimated_duration_mins || 45} mins</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-gray-400" />
                    <span>{route.estimated_distance_km || 12.5} km</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        loadingStops ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : stops.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No bus stops added</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stops.map((stop) => (
              <div
                key={stop.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{stop.name}</h4>
                    <p className="text-xs text-gray-400">
                      {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showCreateRoute && (
        <CreateRouteModal
          onClose={() => setShowCreateRoute(false)}
          onSubmit={(data) => createRoute.mutate(data)}
        />
      )}

      {showCreateStop && (
        <CreateStopModal
          onClose={() => setShowCreateStop(false)}
          onSubmit={(data) => createStop.mutate(data)}
        />
      )}
    </div>
  );
}

function CreateRouteModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('45');
  const [distance, setDistance] = useState('12.5');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <h3 className="font-bold text-gray-900 dark:text-white">Create New Route</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Route Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Route 1 - North Campus Pickup"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Covers Phase 1 to 5"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Est. Duration (mins)</label>
              <input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                type="number"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Est. Distance (km)</label>
              <input
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                type="number"
                step="0.1"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                onSubmit({
                  name,
                  description,
                  estimated_duration_mins: parseFloat(duration) || 45,
                  estimated_distance_km: parseFloat(distance) || 12.5,
                })
              }
              className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium"
            >
              Create Route
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateStopModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) {
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('12.9716');
  const [longitude, setLongitude] = useState('77.5946');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <h3 className="font-bold text-gray-900 dark:text-white">Create Bus Stop</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Stop Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Green Avenue Circle"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Latitude</label>
              <input
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                type="number"
                step="0.0001"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Longitude</label>
              <input
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                type="number"
                step="0.0001"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                onSubmit({
                  name,
                  latitude: parseFloat(latitude) || 12.9716,
                  longitude: parseFloat(longitude) || 77.5946,
                })
              }
              className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium"
            >
              Add Stop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
