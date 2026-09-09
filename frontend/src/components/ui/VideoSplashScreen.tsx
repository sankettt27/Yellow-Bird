import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function VideoSplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Skip if already seen this session
    const hasSeenIntro = sessionStorage.getItem('hasSeenIntro');
    if (hasSeenIntro) {
      setIsVisible(false);
      onComplete();
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.play().catch(() => {
        // Autoplay blocked — skip splash entirely
        handleComplete();
      });
    };

    // Wait until enough data is loaded before showing — prevents grey flash
    if (video.readyState >= 3) {
      setIsVideoReady(true);
      tryPlay();
    } else {
      video.addEventListener('canplay', () => {
        setIsVideoReady(true);
        tryPlay();
      }, { once: true });
    }

    // Safety: if video fails to load at all, skip after 3s
    const timeout = setTimeout(handleComplete, 8000);
    return () => clearTimeout(timeout);
  }, [onComplete]);

  const handleComplete = () => {
    sessionStorage.setItem('hasSeenIntro', 'true');
    setIsVisible(false);
    setTimeout(onComplete, 700);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          // Full screen overlay — bg matches the video's background colour so
          // there is ZERO grey flash. The video fades in on top once ready.
          className="fixed inset-0 z-[10000] bg-[#eaebef] overflow-hidden"
          style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
        >
          {/* Video fades in only when it has data — no grey player flash */}
          <motion.video
            ref={videoRef}
            src="/intro.mp4"
            autoPlay
            muted
            playsInline
            disablePictureInPicture
            onEnded={handleComplete}
            initial={{ opacity: 0 }}
            animate={{ opacity: isVideoReady ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            // object-cover fills every pixel edge-to-edge, no bars ever
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              pointerEvents: 'none',
              // Hide default browser video controls on Android WebView
              WebkitAppearance: 'none',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
