// Import Firebase dependencies
import { db } from '../firebase-init';

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

/**
 * Firebase Service
 * Manages all Firebase interactions for the application
 */
class FirebaseService {
  constructor() {
    // Collections
    this.collections = {
      PLAYERS: 'players',
      TOURNAMENTS: 'tournaments',
      BRACKETS: 'brackets'
    };
  }

  // ------ PLAYERS ------
  
  /**
   * Get all players from the database
   * @returns {Promise<Array>} List of player objects
   */
  async getAllPlayers() {
    try {
      const playersRef = collection(db, this.collections.PLAYERS);
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
  
  /**
   * Get a player by ID
   * @param {string} playerId - The player's ID
   * @returns {Promise<Object|null>} Player data or null if not found
   */
  async getPlayer(playerId) {
    try {
      const docRef = doc(db, this.collections.PLAYERS, playerId);
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
  
  /**
   * Add a new player
   * @param {Object} playerData - The player data to add
   * @returns {Promise<string>} The new player's ID
   */
  async addPlayer(playerData) {
    try {
      const playersRef = collection(db, this.collections.PLAYERS);
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
  
  /**
   * Update an existing player
   * @param {string} playerId - The player's ID
   * @param {Object} playerData - The updated data
   * @returns {Promise<boolean>} Success indicator
   */
  async updatePlayer(playerId, playerData) {
    try {
      const playerRef = doc(db, this.collections.PLAYERS, playerId);
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
  
  /**
   * Delete a player
   * @param {string} playerId - The player's ID
   * @returns {Promise<boolean>} Success indicator
   */
  async deletePlayer(playerId) {
    try {
      const playerRef = doc(db, this.collections.PLAYERS, playerId);
      await deleteDoc(playerRef);
      return true;
    } catch (error) {
      console.error('Error deleting player:', error);
      throw error;
    }
  }
  
  /**
   * Add multiple players in a batch operation
   * @param {Array<Object>} players - List of player objects
   * @returns {Promise<boolean>} Success indicator
   */
  async addMultiplePlayers(players) {
    try {
      const batch = writeBatch(db);
      
      players.forEach(player => {
        const playerRef = doc(collection(db, this.collections.PLAYERS));
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
  
  /**
   * Get all tournaments
   * @returns {Promise<Array>} List of tournament objects
   */
  async getAllTournaments() {
    try {
      const tournamentsRef = collection(db, this.collections.TOURNAMENTS);
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
  
  /**
   * Get a tournament by ID
   * @param {string} tournamentId - The tournament's ID
   * @returns {Promise<Object|null>} Tournament data or null if not found
   */
  async getTournament(tournamentId) {
    try {
      const docRef = doc(db, this.collections.TOURNAMENTS, tournamentId);
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
  
  /**
   * Create a new tournament
   * @param {Object} tournamentData - The tournament data
   * @returns {Promise<Object>} The created tournament
   */
  async createTournament(tournamentData) {
    try {
      // Format courts as an array if it's not already
      if (tournamentData.courts && !Array.isArray(tournamentData.courts)) {
        tournamentData.courts = Object.values(tournamentData.courts);
      }
      
      const tournamentsRef = collection(db, this.collections.TOURNAMENTS);
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
  
  /**
   * Update a tournament
   * @param {string} tournamentId - The tournament's ID
   * @param {Object} tournamentData - The updated data
   * @returns {Promise<boolean>} Success indicator
   */
  async updateTournament(tournamentId, tournamentData) {
    try {
      const tournamentRef = doc(db, this.collections.TOURNAMENTS, tournamentId);
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
  
  /**
   * Delete a tournament
   * @param {string} tournamentId - The tournament's ID
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteTournament(tournamentId) {
    try {
      const tournamentRef = doc(db, this.collections.TOURNAMENTS, tournamentId);
      await deleteDoc(tournamentRef);
      return true;
    } catch (error) {
      console.error('Error deleting tournament:', error);
      throw error;
    }
  }
  
  // ------ TOURNAMENT BRACKETS ------
  
  /**
   * Get a tournament bracket
   * @param {string} tournamentId - The tournament's ID
   * @returns {Promise<Object|null>} Bracket data or null if not found
   */
  async getTournamentBracket(tournamentId) {
    try {
      const docRef = doc(db, this.collections.BRACKETS, tournamentId);
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
  
  /**
   * Save tournament bracket data
   * @param {string} tournamentId - The tournament's ID
   * @param {Object} bracketData - The bracket data to save
   * @returns {Promise<boolean>} Success indicator
   */
  async saveTournamentBracket(tournamentId, bracketData) {
    try {
      const bracketRef = doc(db, this.collections.BRACKETS, tournamentId);
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
  
  /**
   * Get players for a tournament
   * @param {string} tournamentId - The tournament's ID
   * @returns {Promise<Array>} List of player objects
   */
  async getTournamentPlayers(tournamentId) {
    try {
      const docRef = doc(db, this.collections.TOURNAMENTS, tournamentId, 'tournament_players', 'players_list');
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
  
  /**
   * Update players for a tournament
   * @param {string} tournamentId - The tournament's ID
   * @param {Array} playersList - List of player objects
   * @returns {Promise<boolean>} Success indicator
   */
  async updateTournamentPlayers(tournamentId, playersList) {
    try {
      const docRef = doc(db, this.collections.TOURNAMENTS, tournamentId, 'tournament_players', 'players_list');
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
  
  /**
   * Listen for changes to a tournament
   * @param {string} tournamentId - The tournament's ID
   * @param {Function} callback - Function to call with updated data
   * @returns {Function} Unsubscribe function
   */
  listenToTournament(tournamentId, callback) {
    const docRef = doc(db, this.collections.TOURNAMENTS, tournamentId);
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
  
  /**
   * Listen for changes to a tournament bracket
   * @param {string} tournamentId - The tournament's ID
   * @param {Function} callback - Function to call with updated data
   * @returns {Function} Unsubscribe function
   */
  listenToTournamentBracket(tournamentId, callback) {
    const docRef = doc(db, this.collections.BRACKETS, tournamentId);
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
  
  /**
   * Listen for changes to tournament players
   * @param {string} tournamentId - The tournament's ID
   * @param {Function} callback - Function to call with updated data
   * @returns {Function} Unsubscribe function
   */
  listenToTournamentPlayers(tournamentId, callback) {
    const docRef = doc(db, this.collections.TOURNAMENTS, tournamentId, 'tournament_players', 'players_list');
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
  
  /**
   * Generate a server timestamp
   * @returns {FieldValue} Server timestamp
   */
  timestamp() {
    return serverTimestamp();
  }
  
  /**
   * Format a Firestore timestamp
   * @param {Timestamp} firestoreTimestamp - Firestore timestamp
   * @returns {string} Formatted date string
   */
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

// Create and export service instance
const firebaseService = new FirebaseService();

// For backward compatibility
window.firebaseService = firebaseService;

export default firebaseService;