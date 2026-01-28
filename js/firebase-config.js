// js/firebase-config.js

// Імпортуємо всі необхідні функції в одному блоці
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Твої ключі D-Space
const firebaseConfig = {
  apiKey: "AIzaSyCInnrEp06upLWTCxtU8wjGZtn7Ud8Uaxw",
  authDomain: "d-space-b94b1.firebaseapp.com",
  projectId: "d-space-b94b1",
  storageBucket: "d-space-b94b1.firebasestorage.app",
  messagingSenderId: "792398965598",
  appId: "1:792398965598:web:52e221b29c8f1ae77fbdcf",
};

// Ініціалізація
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Експорт
export {
  auth,
  db,
  provider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
};
