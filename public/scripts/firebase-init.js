import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js';
import { getFirestore  } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

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



export { app, db };