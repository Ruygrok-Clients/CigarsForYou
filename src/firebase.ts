import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBdv7xDnbz5A0fJyC985Va6dWixPgidRwY",
    authDomain: "cigarsforyou-ea835.firebaseapp.com",
    projectId: "cigarsforyou-ea835",
    storageBucket: "cigarsforyou-ea835.firebasestorage.app",
    messagingSenderId: "173229276790",
    appId: "1:173229276790:web:5b3a528f4f60d636512957"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");