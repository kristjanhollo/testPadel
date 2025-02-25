// This file imports shared dependencies that should be included in all pages

// Import styles
import '../styles/main.css';

// Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyA4NV5iuhVZcacUQlHU8xWB_O2F9SB8TC4',
  authDomain: 'testing-5a0bf.firebaseapp.com',
  projectId: 'testing-5a0bf',
  storageBucket: 'testing-5a0bf.firebasestorage.app',
  messagingSenderId: '708063470209',
  appId: '1:708063470209:web:b8226e8053ea65488a2380',
  measurementId: 'G-2TZZZTRBX3'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Make Firebase available globally 
window.firebaseApp = app;
window.firestoreDB = db;

// Import SweetAlert2
import Swal from 'sweetalert2';
window.Swal = Swal;

// Import config
import './config.js';

// Import Firebase service
import './services/firebase-service.js';