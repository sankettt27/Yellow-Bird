/**
 * Route Builder Store — Simplified for live dynamic route building.
 * The driver taps "Drop Stop Here" to add a stop to the liveRouteStops array.
 * At the end of the trip, they submit the route.
 */

import { create } from 'zustand';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export interface LiveStop {
  id: string; // temporary id
  lat: number;
  lng: number;
  name: string;
}

interface RouteBuilderState {
  isLiveBuilderOpen: boolean;
  liveStops: LiveStop[];
  isSubmitting: boolean;

  openLiveBuilder: () => void;
  closeLiveBuilder: () => void;
  addLiveStop: (lat: number, lng: number, name: string) => void;
  removeLiveStop: (id: string) => void;
  submitLiveRoute: (tripId: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  isLiveBuilderOpen: false,
  liveStops: [],
  isSubmitting: false,
};

export const useRouteBuilderStore = create<RouteBuilderState>((set, get) => ({
  ...initialState,

  openLiveBuilder: () => set({ isLiveBuilderOpen: true }),
  closeLiveBuilder: () => set({ isLiveBuilderOpen: false }),

  addLiveStop: (lat: number, lng: number, name: string) => {
    const newStop: LiveStop = {
      id: Math.random().toString(36).substring(2, 9),
      lat,
      lng,
      name,
    };
    set((state) => ({ liveStops: [...state.liveStops, newStop] }));
    toast.success(`Stop added: ${name}`);
  },

  removeLiveStop: (id: string) => {
    set((state) => ({
      liveStops: state.liveStops.filter((s) => s.id !== id),
    }));
  },

  submitLiveRoute: async (tripId: string) => {
    const { liveStops } = get();
    if (liveStops.length === 0) {
      toast.error('No stops to submit');
      return;
    }

    set({ isSubmitting: true });
    try {
      await api.post('/driver-routes/live-build', {
        trip_id: tripId,
        stops: liveStops.map((s) => ({
          latitude: s.lat,
          longitude: s.lng,
          name: s.name,
        })),
      });
      
      toast.success('Route submitted successfully!');
      set({ liveStops: [], isLiveBuilderOpen: false });
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to submit route');
    } finally {
      set({ isSubmitting: false });
    }
  },

  reset: () => set(initialState),
}));
