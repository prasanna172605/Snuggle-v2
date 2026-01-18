
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from 'firebase/database';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCccZYjpK8uhRmjzUPrgu3eloASikNpmJc",
  authDomain: "snuggle-73465.firebaseapp.com",
  databaseURL: "https://snuggle-73465-default-rtdb.firebaseio.com",
  projectId: "snuggle-73465",
  storageBucket: "snuggle-73465.firebasestorage.app",
  messagingSenderId: "873162893612",
  appId: "1:873162893612:web:70bdb26473c304a6ca2489",
  measurementId: "G-XPBFXQF0SL"
};

console.log('Initializing Firebase with project:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const realtimeDb = getDatabase(app);

// Note: Offline persistence disabled to avoid multi-tab conflicts
// If needed, can be re-enabled with single-tab enforcement

// Analytics initialized conditionally
let analytics;
isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(console.error);

// Enable messaging if supported (Sync initialization attempt)
let messaging: any;

if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.warn('Messaging failed to init synchronously:', e);
  }
} else {
  console.warn('Push Notifications not supported in this environment');
}

export { messaging };
export { analytics };
console.log('Firebase initialized successfully');
