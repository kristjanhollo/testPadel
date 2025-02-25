// Firebase Service
// This service handles all Firebase interactions for the application

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';

class FirebaseService {
  constructor() {
    // Get the Firestore instance from the shared dependency
    this.db = window.firestoreDB;
    
    // Collections
    this.collections = {
      PLAYERS: 'players',
      TOURNAMENTS: 'tournaments',
      BRACKETS: 'brackets'
    };
  }

  // ------ PLAYERS ------
  
  // Get all players
  async getAllPlayers() {
    try {
      const playersRef = collection(this.db, this.collections.PLAYERS);
      const snapshot = await getDocs(playersRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting players:', error);
      throw error;
    }
  }
  
  // Get player by ID
  async getPlayer(playerId) {
    try {
      const docRef = doc(this.db, this.collections.PLAYERS, playerId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } catch (error) {
      console.error('Error getting player:', error);
      throw error;
    }
  }
  
  // Add a new player
  async addPlayer(playerData) {
    try {
      const playersRef = collection(this.db, this.collections.PLAYERS);
      const docRef = await addDoc(playersRef, {
        ...playerData,
        created_at: serverTimestamp(),
        lastActive: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding player:', error);
      throw error;
    }
  }
  
  // Update player
  async updatePlayer(playerId, playerData) {
    try {
      const playerRef = doc(this.db, this.collections.PLAYERS, playerId);
      await updateDoc(playerRef, {
        ...playerData,
        lastActive: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating player:', error);
      throw error;
    }
  }
  
  // Delete player
  async deletePlayer(playerId) {
    try {
      const playerRef = doc(this.db, this.collections.PLAYERS, playerId);
      await deleteDoc(playerRef);
      return true;
    } catch (error) {
      console.error('Error deleting player:', error);
      throw error;
    }
  }
  
  // Add multiple players at once
  async addMultiplePlayers(players) {
    try {
      const batch = writeBatch(this.db);
      
      players.forEach(player => {
        const playerRef = doc(collection(this.db, this.collections.PLAYERS));
        batch.set(playerRef, {
          ...player,
          created_at: serverTimestamp(),
          lastActive: serverTimestamp()
        });
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error adding multiple players:', error);
      throw error;
    }
  }
  
  // ------ TOURNAMENTS ------
  
  // Get all tournaments
  async getAllTournaments() {
    try {
      const tournamentsRef = collection(this.db, this.collections.TOURNAMENTS);
      const snapshot = await getDocs(tournamentsRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting tournaments:', error);
      throw error;
    }
  }
  
  // Get tournament by ID
  async getTournament(tournamentId) {
    try {
      const docRef = doc(this.db, this.collections.TOURNAMENTS, tournamentId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } catch (error) {
      console.error('Error getting tournament:', error);
      throw error;
    }
  }
  
  // Create a new tournament
  async createTournament(tournamentData) {
    try {
      // Format courts as an array if it's not already
      if (tournamentData.courts && !Array.isArray(tournamentData.courts)) {
        tournamentData.courts = Object.values(tournamentData.courts);
      }
      
      const tournamentsRef = collection(this.db, this.collections.TOURNAMENTS);
      const docRef = await addDoc(tournamentsRef, {
        ...tournamentData,
        created_at: serverTimestamp(),
        status_id: 1 // Default to 'upcoming'
      });
      
      return {
        id: docRef.id,
        ...tournamentData
      };
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
  }
  
  // Update tournament
  async updateTournament(tournamentId, tournamentData) {
    try {
      const tournamentRef = doc(this.db, this.collections.TOURNAMENTS, tournamentId);
      await updateDoc(tournamentRef, {
        ...tournamentData,
        updated_at: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating tournament:', error);
      throw error;
    }
  }
  
  // Delete tournament
  async deleteTournament(tournamentId) {
    try {
      const tournamentRef = doc(this.db, this.collections.TOURNAMENTS, tournamentId);
      await deleteDoc(tournamentRef);
      return true;
    } catch (error) {
      console.error('Error deleting tournament:', error);
      throw error;
    }
  }
  
  // ------ TOURNAMENT BRACKETS ------
  
  // Get tournament bracket
  async getTournamentBracket(tournamentId) {
    try {
      const docRef = doc(this.db, this.collections.BRACKETS, tournamentId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } catch (error) {
      console.error('Error getting tournament bracket:', error);
      throw error;
    }
  }
  
  // Create or update tournament bracket
  async saveTournamentBracket(tournamentId, bracketData) {
    try {
      const bracketRef = doc(this.db, this.collections.BRACKETS, tournamentId);
      await setDoc(bracketRef, {
        ...bracketData,
        updated_at: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving tournament bracket:', error);
      throw error;
    }
  }
  
  // ------ TOURNAMENT PLAYERS ------
  
  // Get players for a tournament
  async getTournamentPlayers(tournamentId) {
    try {
      const docRef = doc(this.db, this.collections.TOURNAMENTS, tournamentId, 'tournament_players', 'players_list');
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return [];
      }
      
      return docSnap.data().players || [];
    } catch (error) {
      console.error('Error getting tournament players:', error);
      throw error;
    }
  }
  
  // Update players for a tournament
  async updateTournamentPlayers(tournamentId, playersList) {
    try {
      const docRef = doc(this.db, this.collections.TOURNAMENTS, tournamentId, 'tournament_players', 'players_list');
      await setDoc(docRef, {
        players: playersList,
        updated_at: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating tournament players:', error);
      throw error;
    }
  }
  
  // ------ REAL-TIME LISTENERS ------
  
  // Listen for changes to a tournament
  listenToTournament(tournamentId, callback) {
    const docRef = doc(this.db, this.collections.TOURNAMENTS, tournamentId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({
          id: docSnap.id,
          ...docSnap.data()
        });
      } else {
        callback(null);
      }
    }, error => {
      console.error('Error listening to tournament:', error);
    });
  }
  
  // Listen for changes to a tournament bracket
  listenToTournamentBracket(tournamentId, callback) {
    const docRef = doc(this.db, this.collections.BRACKETS, tournamentId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({
          id: docSnap.id,
          ...docSnap.data()
        });
      } else {
        callback(null);
      }
    }, error => {
      console.error('Error listening to tournament bracket:', error);
    });
  }
  
  // Listen for changes to tournament players
  listenToTournamentPlayers(tournamentId, callback) {
    const docRef = doc(this.db, this.collections.TOURNAMENTS, tournamentId, 'tournament_players', 'players_list');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().players || []);
      } else {
        callback([]);
      }
    }, error => {
      console.error('Error listening to tournament players:', error);
    });
  }
  
  // ------ UTILITY METHODS ------
  
  // Generate a timestamp
  timestamp() {
    return serverTimestamp();
  }
  
  // Convert to UTC date string from firestore timestamp
  formatDate(firestoreTimestamp) {
    if (!firestoreTimestamp) return 'N/A';
    
    try {
      const date = firestoreTimestamp.toDate();
      return date.toLocaleDateString();
    } catch (error) {
      // Handle if it's already a string date or something else
      return firestoreTimestamp;
    }
  }
}

// Initialize and export the service
const firebaseService = new FirebaseService();
export default firebaseService;

// Also make it available globally for backward compatibility
window.firebaseService = firebaseService;