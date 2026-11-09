/**
 * Settings Store — persists user preferences (dark mode, map style, notifications) to localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MapStyle = 'clean' | 'street' | 'satellite' | 'dark';

interface NotificationPrefs {
  busApproachingPickup: boolean;
  busReachedPickup: boolean;
  childPickupConfirmed: boolean;
  busReachedSchool: boolean;
  returnJourneyStarted: boolean;
  childDropoffConfirmed: boolean;
  tripCompleted: boolean;
  busDelay: boolean;
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
        busApproachingPickup: true,
        busReachedPickup: true,
        childPickupConfirmed: true,
        busReachedSchool: true,
        returnJourneyStarted: true,
        childDropoffConfirmed: true,
        tripCompleted: true,
        busDelay: true,
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
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsState>;
        return {
          ...current,
          ...saved,
          notificationPrefs: {
            ...current.notificationPrefs,
            ...(saved.notificationPrefs ?? {}),
          },
        };
      },
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
