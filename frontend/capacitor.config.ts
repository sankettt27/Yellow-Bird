import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yellowbird.app',
  appName: 'YellowBird',
  webDir: 'dist',

  // ─── Server Configuration ─────────────────────────────────────────────────
  // During LOCAL WIFI testing: uncomment the server block below and set the URL
  // to your laptop's local IP (find it with `ipconfig` on Windows).
  //
  // During FIELD TESTING over 4G: replace the URL with your localtunnel URL.
  // Run: npx localtunnel --port 5173  →  e.g. https://yellowbird-app.loca.lt
  //
  // For PRODUCTION APK (App Store release): comment out the entire server block.
  // The app will then use the bundled `dist/` files directly.
  //
  // server: {
  //   url: 'http://10.44.36.204:5173',
  //   cleartext: true,
  // },

  android: {
    // Allows the APK to make HTTP requests during testing (required for cleartext HTTP)
    allowMixedContent: true,
  },
};

export default config;
