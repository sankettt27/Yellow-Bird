/**
 * useStartupPermissions
 *
 * Requests Location, Camera, and Notification permissions from the user
 * on first app launch using native Capacitor dialogs.
 * Runs once per session (tracked via a ref so it never fires twice).
 */

import { useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export function useStartupPermissions() {
  const didRun = useRef(false);

  useEffect(() => {
    // Only request permissions when running as a native app (APK)
    if (!Capacitor.isNativePlatform()) return;
    // Only run once per session
    if (didRun.current) return;
    didRun.current = true;

    const requestAll = async () => {
      // 1. Location
      try {
        const locStatus = await Geolocation.checkPermissions();
        if (locStatus.location === 'prompt' || locStatus.location === 'prompt-with-rationale') {
          await Geolocation.requestPermissions({ permissions: ['location'] });
        }
      } catch (e) {
        console.warn('Location permission request failed:', e);
      }

      // 2. Notifications — small delay so Android shows each dialog separately
      await new Promise((r) => setTimeout(r, 500));
      try {
        const notifStatus = await PushNotifications.checkPermissions();
        if (notifStatus.receive === 'prompt') {
          await PushNotifications.requestPermissions();
        }
      } catch (e) {
        console.warn('Notification permission request failed:', e);
      }
    };

    requestAll();
  }, []);
}
