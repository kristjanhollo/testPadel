// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA4NV5iuhVZcacUQlHU8xWB_O2F9SB8TC4",
  authDomain: "testing-5a0bf.firebaseapp.com",
  projectId: "testing-5a0bf",
  storageBucket: "testing-5a0bf.firebasestorage.app",
  messagingSenderId: "708063470209",
  appId: "1:708063470209:web:b8226e8053ea65488a2380",
  measurementId: "G-2TZZZTRBX3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);