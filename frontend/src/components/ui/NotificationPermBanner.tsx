/**
 * Notification Permission Banner — Prompts parents to enable alerts
 * for bus departures and arrivals. Supports both Capacitor native (Android/iOS)
 * and Web Browser Notification APIs.
 */

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LocalNotifications } from '@capacitor/local-notifications';
import toast from 'react-hot-toast';

export function NotificationPermBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check if dismissed previously during this session
    if (sessionStorage.getItem('notifBannerDismissed') === 'true') {
      return;
    }

    async function checkPermission() {
      try {
        // 1. Check Capacitor native permissions
        const capPerm = await LocalNotifications.checkPermissions();
        if (capPerm.display === 'granted') {
          return; // Already granted natively
        }
      } catch {
        // Fall back to web permissions if Capacitor plugin is not on native device
      }

      // 2. Check browser Notification permission
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          return; // Already granted in browser
        }
      }

      // If neither is granted and not dismissed, display banner
      setShowBanner(true);
    }

    checkPermission();
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    let granted = false;

    try {
      // Request native Android/iOS permission via Capacitor
      const capResult = await LocalNotifications.requestPermissions();
      if (capResult.display === 'granted') {
        granted = true;
      }
    } catch {
      // Ignored if not running inside Capacitor
    }

    try {
      // Also request browser Notification permission
      if ('Notification' in window) {
        const webPerm = await Notification.requestPermission();
        if (webPerm === 'granted') {
          granted = true;
        }
      }
    } catch {
      // Ignored
    }

    setIsRequesting(false);
    setShowBanner(false);
    sessionStorage.setItem('notifBannerDismissed', 'true');

    if (granted) {
      toast.success('Live trip notifications enabled!', {
        icon: '🔔',
        id: 'notif-granted-toast',
      });
    } else {
      toast('Notifications disabled. You can turn them on anytime in your device settings.', {
        icon: 'ℹ️',
        id: 'notif-denied-toast',
      });
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('notifBannerDismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -10 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden mb-3"
        >
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-3.5 text-white shadow-lg shadow-amber-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-white animate-bounce" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight">
                  Enable Trip Notifications
                </p>
                <p className="text-[11px] text-white/80 mt-0.5 truncate">
                  Get instant alerts when your child's bus starts or arrives.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="px-3 py-1.5 rounded-xl bg-white text-amber-700 font-bold text-xs shadow-sm hover:bg-amber-50 active:scale-95 transition-all disabled:opacity-50"
              >
                {isRequesting ? 'Enabling…' : 'Enable'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
