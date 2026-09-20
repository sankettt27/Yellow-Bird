/**
 * Dedicated Download Landing Page for YellowBird Android App (.apk)
 * Provides direct 1-tap download, copy link, WhatsApp share, and step-by-step install guide.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Smartphone, 
  CheckCircle2, 
  Share2, 
  Copy, 
  FileCheck, 
  Sparkles, 
  ExternalLink 
} from 'lucide-react';
import toast from 'react-hot-toast';

export function DownloadPage() {
  const [copied, setCopied] = useState(false);
  const downloadUrl = `${window.location.origin}/YellowBird.apk`;

  // Optional: Auto-trigger download if navigated with ?auto=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auto') === 'true') {
      const timer = setTimeout(() => {
        handleDownload();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/YellowBird.apk';
    link.setAttribute('download', 'YellowBird.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started! Check your phone notification bar or Downloads folder.', { duration: 5000 });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(downloadUrl);
    setCopied(true);
    toast.success('Download link copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(
      `🚌 *Download YellowBird School Bus Tracker App*\n\nTrack your child's school bus in real-time, view live driver location, and get instant arrival alerts.\n\n👇 *Download Android APK (Direct Link):*\n${downloadUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100/40 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-400/20 dark:bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-amber-500/15 dark:bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Container */}
      <div className="relative max-w-xl mx-auto w-full pt-4 sm:pt-8 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex p-3 sm:p-4 rounded-3xl bg-gradient-to-tr from-brand-500 to-amber-400 text-gray-950 shadow-xl shadow-brand-500/25 ring-4 ring-white dark:ring-gray-800"
          >
            <Smartphone className="w-10 h-10 sm:w-12 sm:h-12" />
          </motion.div>

          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-500/15 text-brand-700 dark:text-brand-400 border border-brand-500/30">
              Official Android Release
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-gray-950 dark:text-white">
              Download YellowBird App
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto mt-1">
              Real-time GPS tracking for parents and drivers. Zero lag, 60–120 FPS performance.
            </p>
          </motion.div>
        </div>

        {/* Primary Download Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ delay: 0.2 }}
          className="p-6 sm:p-8 rounded-3xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-amber-200/80 dark:border-gray-800 shadow-2xl shadow-brand-500/10 space-y-6"
        >
          {/* App Specs Badge */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-white">YellowBird v1.0.0</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]">
                Verified APK
              </span>
            </div>
            <span className="text-gray-500 dark:text-gray-400 font-medium">8.01 MB • Android 8.0+</span>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleDownload}
            className="w-full group relative overflow-hidden flex items-center justify-center gap-3 py-4 sm:py-4.5 px-6 rounded-2xl bg-gradient-to-r from-brand-500 via-amber-500 to-brand-500 text-gray-950 font-bold text-base sm:text-lg shadow-xl shadow-brand-500/30 hover:shadow-brand-500/45 hover:scale-[1.01] active:scale-[0.98] transition-all"
          >
            <Download className="w-6 h-6 animate-bounce" />
            <span>Download Android App (.APK)</span>
          </button>

          {/* Alternative Share / Copy actions */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share on WhatsApp
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-semibold text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied Link!' : 'Copy Direct Link'}
            </button>
          </div>

          {/* Direct Raw Link Notice */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 space-y-1">
            <div className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-brand-500" /> Direct File Download URL:
            </div>
            <p className="font-mono text-[10px] break-all text-brand-600 dark:text-brand-400">
              {downloadUrl}
            </p>
          </div>
        </motion.div>

        {/* 3-Step Install Guide */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ delay: 0.3 }}
          className="p-6 rounded-3xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border border-gray-200 dark:border-gray-800 space-y-4"
        >
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" /> Easy 3-Step Installation Guide
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/60">
              <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-600 dark:text-brand-400 font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </span>
              <div>
                <span className="font-bold text-gray-900 dark:text-white">Tap "Download Android App"</span>
                <p className="text-gray-500 mt-0.5">If Chrome says "File might be harmful", tap <strong>Download anyway</strong> (standard warning for APKs downloaded outside Google Play).</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/60">
              <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-600 dark:text-brand-400 font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </span>
              <div>
                <span className="font-bold text-gray-900 dark:text-white">Open the Downloaded APK</span>
                <p className="text-gray-500 mt-0.5">Tap <strong>Open</strong> from your notification bar or find <strong>YellowBird.apk</strong> in your phone's <em>Files / Downloads</em> folder.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/60">
              <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-600 dark:text-brand-400 font-bold flex items-center justify-center shrink-0 text-xs">
                3
              </span>
              <div>
                <span className="font-bold text-gray-900 dark:text-white">Tap Install & Launch</span>
                <p className="text-gray-500 mt-0.5">If prompted, enable <em>"Allow from this source"</em> for your browser, then tap <strong>Install</strong> to start tracking!</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Web Portal Alternative */}
        <div className="text-center pt-2 pb-6 space-y-2">
          <p className="text-xs text-gray-500">
            Using an iPhone or desktop computer?
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline"
          >
            <span>Open YellowBird Web Portal in Browser</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 pb-4">
        © 2026 YellowBird Transport Technologies. Safe school transportation ecosystem.
      </footer>
    </div>
  );
}
