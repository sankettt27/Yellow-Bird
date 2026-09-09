/**
 * Settings Store — persists user preferences (dark mode, map style, notifications) to localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MapStyle = 'clean' | 'street' | 'satellite' | 'dark';

interface NotificationPrefs {
  tripStart: boolean;
  busNearby: boolean;
  busArrived: boolean;
}

interface SettingsState {
  darkMode: boolean;
  mapStyle: MapStyle;
  notificationPrefs: NotificationPrefs;
  sunlightMode: boolean; // driver-specific
  voiceAnnouncements: boolean; // driver-specific

  setDarkMode: (on: boolean) => void;
  setMapStyle: (style: MapStyle) => void;
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void;
  setSunlightMode: (on: boolean) => void;
  setVoiceAnnouncements: (on: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      darkMode: false,
      mapStyle: 'clean',
      notificationPrefs: {
        tripStart: true,
        busNearby: true,
        busArrived: true,
      },
      sunlightMode: false,
      voiceAnnouncements: false,

      setDarkMode: (on) => {
        // Apply/remove the dark class on <html>
        if (on) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        set({ darkMode: on });
      },

      setMapStyle: (style) => set({ mapStyle: style }),

      setNotificationPref: (key, value) =>
        set((s) => ({
          notificationPrefs: { ...s.notificationPrefs, [key]: value },
        })),

      setSunlightMode: (on) => set({ sunlightMode: on }),
      setVoiceAnnouncements: (on) => set({ voiceAnnouncements: on }),
    }),
    {
      name: 'smart-transport-settings',
    }
  )
);

// Apply dark mode on initial load from persisted state
const { darkMode } = useSettingsStore.getState();
if (darkMode) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}
