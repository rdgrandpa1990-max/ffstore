import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase configuration from /firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyAJRdTnP3jtgj2_mvSBcz1DgxIckr9ntbg",
  authDomain: "ffsstore-b04c0.firebaseapp.com",
  projectId: "ffsstore-b04c0",
  storageBucket: "ffsstore-b04c0.firebasestorage.app",
  messagingSenderId: "136459298847",
  appId: "1:136459298847:web:c6e8cbbc62f628ff5e4d2a",
  measurementId: "G-EKPNX6M1MG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (default database)
export const db = getFirestore(app);
export const auth = getAuth(app);
