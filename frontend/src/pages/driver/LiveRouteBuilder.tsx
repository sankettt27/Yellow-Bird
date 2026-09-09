import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Navigation, CheckCircle2, Loader2, Info } from 'lucide-react';
import { useRouteBuilderStore } from '@/stores/routeBuilderStore';
import { useTripStore } from '@/stores/tripStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export function LiveRouteBuilder() {
  const {
    isLiveBuilderOpen,
    closeLiveBuilder,
    liveStops,
    addLiveStop,
    removeLiveStop,
    submitLiveRoute,
    isSubmitting
  } = useRouteBuilderStore();

  const { gpsData, currentTrip } = useTripStore();

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [stopName, setStopName] = useState('');
  const [pendingLocation, setPendingLocation] = useState<{lat: number, lng: number} | null>(null);

  const handleDropStop = async () => {
    if (!gpsData) {
      toast.error("Waiting for GPS signal...");
      return;
    }

    setIsGeocoding(true);
    try {
      // Reverse geocode to get nearest landmark
      const res = await api.get(`/driver-routes/geocode?lat=${gpsData.lat}&lng=${gpsData.lng}`);
      const data = res.data;
      
      let suggestedName = "New Stop";
      if (data.landmark) suggestedName = `Near ${data.landmark}`;
      else if (data.name) suggestedName = data.name;
      else if (data.locality) suggestedName = data.locality;

      setStopName(suggestedName);
      setPendingLocation({ lat: gpsData.lat, lng: gpsData.lng });
      setShowNamePrompt(true);
    } catch (err) {
      // Fallback
      setStopName("New Pickup Stop");
      setPendingLocation({ lat: gpsData.lat, lng: gpsData.lng });
      setShowNamePrompt(true);
    } finally {
      setIsGeocoding(false);
    }
  };

  const confirmStop = () => {
    if (!pendingLocation || !stopName.trim()) return;
    addLiveStop(pendingLocation.lat, pendingLocation.lng, stopName.trim());
    setShowNamePrompt(false);
    setPendingLocation(null);
  };

  if (!isLiveBuilderOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="fixed inset-0 z-[9999] bg-gray-50 dark:bg-gray-950 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm z-10">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-500" /> Live Route Builder
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Drop stops as you drive</p>
        </div>
        <button onClick={closeLiveBuilder} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl bg-gray-100 dark:bg-gray-800 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Big Action Button */}
        <div className="flex justify-center py-6">
          <button
            onClick={handleDropStop}
            disabled={isGeocoding || !gpsData}
            className={`relative group w-48 h-48 rounded-full flex flex-col items-center justify-center gap-3 transition-all duration-300 ${
              !gpsData 
                ? 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                : 'bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-xl shadow-brand-500/30 active:scale-95'
            }`}
          >
            {isGeocoding ? (
              <Loader2 className="w-12 h-12 animate-spin" />
            ) : (
              <>
                <MapPin className="w-12 h-12 drop-shadow-md" />
                <span className="font-bold text-lg leading-tight text-center px-4">
                  {gpsData ? "Drop Stop Here" : "Waiting for GPS..."}
                </span>
              </>
            )}
            
            {/* Pulsing ring */}
            {gpsData && !isGeocoding && (
              <div className="absolute inset-0 rounded-full border-4 border-brand-400 animate-ping opacity-20" />
            )}
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Tap the big button above exactly when you arrive at a pickup location. We will record the GPS coordinates and auto-fill the nearest landmark.
          </p>
        </div>

        {/* List of Dropped Stops */}
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 px-1">Dropped Stops ({liveStops.length})</h3>
          
          {liveStops.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
              <Navigation className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No stops dropped yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {liveStops.map((stop, index) => (
                <div key={stop.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 flex items-center gap-4 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white truncate">{stop.name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}</p>
                  </div>
                  <button 
                    onClick={() => removeLiveStop(stop.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Submit */}
      {liveStops.length > 0 && (
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pb-safe">
          <button
            onClick={() => {
              if (currentTrip) submitLiveRoute(currentTrip.id);
            }}
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Submit Route ({liveStops.length} stops)
              </>
            )}
          </button>
        </div>
      )}

      {/* Name Prompt Modal */}
      <AnimatePresence>
        {showNamePrompt && (
          <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Name this Stop</h3>
              <p className="text-sm text-gray-500 mb-4">We found the nearest landmark. You can edit it if needed.</p>
              
              <input
                type="text"
                value={stopName}
                onChange={(e) => setStopName(e.target.value)}
                autoFocus
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500 outline-none mb-6"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowNamePrompt(false); setPendingLocation(null); }}
                  className="flex-1 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStop}
                  className="flex-1 py-3.5 rounded-xl bg-brand-500 text-white font-bold"
                >
                  Save Stop
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
