// Firebase initialization
// Converted from ES6 module syntax to regular JavaScript

const firebaseConfig = {
  apiKey: "AIzaSyBxDc-wnMD6VS6bU4GVSKluCZlzZYbVX_0",
  authDomain: "testing-5a0bf.firebaseapp.com",
  projectId: "testing-5a0bf",
  storageBucket: "testing-5a0bf.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef",
  measurementId: "G-ABCDEFGHIJ"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Make Firebase instances available globally
window.firebaseApp = app;
window.firebaseDb = db;
