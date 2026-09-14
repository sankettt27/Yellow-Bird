import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDNZXlgYGIHsLuN3QQA3HBj8qUAll-_HRc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yellowbird-bustracker.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "yellowbird-bustracker",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "yellowbird-bustracker.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "321132977935",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:321132977935:web:61ab7c26ca7ef1cf80287a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5NTE1MKRWT"
};

// Initialize Firebase (retained for future features)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
