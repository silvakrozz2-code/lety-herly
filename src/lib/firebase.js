import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDC2YfWi9DcqlZtcYO-ym4qp-vCzEXW1Zs",
  authDomain: "lashiachat.firebaseapp.com",
  projectId: "lashiachat",
  storageBucket: "lashiachat.firebasestorage.app",
  messagingSenderId: "329728445341",
  appId: "1:329728445341:web:8235ef25fb07d302403d74"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export const ADMIN_EMAIL = "silvakrozz2@gmail.com";
export const WA_NUMBER = "554197134106";
export const PLANO_VALOR = 120;
