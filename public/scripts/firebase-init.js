import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js';
import { getFirestore  } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';



// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);



export { app, db };