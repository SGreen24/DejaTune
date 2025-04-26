// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBmbem6OOR4SZRLCAmqHe9aF_zH6h3dyvQ",
  authDomain: "dejatune-bacb9.firebaseapp.com",
  projectId: "dejatune-bacb9",
  storageBucket: "dejatune-bacb9.appspot.com",
  messagingSenderId: "743128467537",
  appId: "1:743128467537:web:8b848364a3761584b29070",
  measurementId: "G-GR08K4ETGX"
};

// Initialize
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Providers
const provider = new GoogleAuthProvider();
const emailProvider = new EmailAuthProvider();

export { app, analytics, auth, db, provider, emailProvider };
