// Firebase Service
// Converted from ES6 module syntax to regular JavaScript

// Use the global Firebase db instance
// const db = window.firebaseDb;

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
      BRACKETS: 'brackets',
      BRACKETS_AMERICANO: 'brackets_americano'  // New collection for Americano format
    };
  }

  // ------ PLAYERS ------
  
  /**
   * Get all players from the database
   * @returns {Promise<Array>} List of player objects
   */
  async getAllPlayers() {
    try {
      console.log('Getting all players from collection:', this.collections.PLAYERS);
      // Use the global db instance instead of creating a new one
      const playersRef = window.firebaseDb.collection(this.collections.PLAYERS);
      const snapshot = await playersRef.get();
      console.log('Got players snapshot, docs count:', snapshot.docs.length);
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
      const docRef = window.firebaseDb.doc(`${this.collections.PLAYERS}/${playerId}`);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
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
      const playersRef = window.firebaseDb.collection(this.collections.PLAYERS);
      const docRef = await playersRef.add({
        ...playerData,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
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
      const playerRef = window.firebaseDb.doc(`${this.collections.PLAYERS}/${playerId}`);
      await playerRef.update({
        ...playerData,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
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
      const playerRef = window.firebaseDb.doc(`${this.collections.PLAYERS}/${playerId}`);
      await playerRef.delete();
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
      const batch = window.firebaseDb.batch();
      
      players.forEach(player => {
        const playerRef = window.firebaseDb.collection(this.collections.PLAYERS).doc();
        batch.set(playerRef, {
          ...player,
          created_at: firebase.firestore.FieldValue.serverTimestamp(),
          lastActive: firebase.firestore.FieldValue.serverTimestamp()
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
      const tournamentsRef = firebase.firestore().collection(this.collections.TOURNAMENTS);
      const snapshot = await tournamentsRef.get();
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
      const docRef = firebase.firestore().doc(`${this.collections.TOURNAMENTS}/${tournamentId}`);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
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
      
      const tournamentsRef = firebase.firestore().collection(this.collections.TOURNAMENTS);
      const docRef = await tournamentsRef.add({
        ...tournamentData,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
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
      const tournamentRef = firebase.firestore().doc(`${this.collections.TOURNAMENTS}/${tournamentId}`);
      await tournamentRef.update({
        ...tournamentData,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
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
      const tournamentRef = firebase.firestore().doc(`${this.collections.TOURNAMENTS}/${tournamentId}`);
      await tournamentRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting tournament:', error);
      throw error;
    }
  }
  
  // ------ TOURNAMENT BRACKETS (MEXICANO FORMAT) ------
  
  /**
   * Get a tournament bracket (Mexicano format)
   * @param {string} tournamentId - The tournament's ID
   * @returns {Promise<Object|null>} Bracket data or null if not found
   */
  async getTournamentBracket(tournamentId) {
    try {
      const docRef = firebase.firestore().doc(`${this.collections.BRACKETS}/${tournamentId}`);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
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
   * Save tournament bracket data (Mexicano format)
   * @param {string} tournamentId - The tournament's ID
   * @param {Object} bracketData - The bracket data to save
   * @returns {Promise<boolean>} Success indicator
   */
  async saveTournamentBracket(tournamentId, bracketData) {
    try {
      const bracketRef = firebase.firestore().doc(`${this.collections.BRACKETS}/${tournamentId}`);
      await bracketRef.set({
        ...bracketData,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving tournament bracket:', error);
      throw error;
    }
  }

  // ------ TOURNAMENT BRACKETS (AMERICANO FORMAT) ------
  
  /**
   * Get a tournament bracket for Americano format
   * @param {string} tournamentId - The tournament's ID
   * @returns {Promise<Object|null>} Bracket data or null if not found
   */
  async getTournamentBracketAmericano(tournamentId) {
    try {
      console.log(`Getting Americano bracket for tournament: ${tournamentId}`);
      const docRef = firebase.firestore().doc(`${this.collections.BRACKETS_AMERICANO}/${tournamentId}`);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        console.log('No Americano bracket found for this tournament');
        return null;
      }
      
      const data = {
        id: docSnap.id,
        ...docSnap.data()
      };
      console.log('Retrieved Americano bracket data:', data);
      
      return data;
    } catch (error) {
      console.error('Error getting Americano tournament bracket:', error);
      throw error;
    }
  }
  
  /**
   * Save tournament bracket data for Americano format
   * @param {string} tournamentId - The tournament's ID
   * @param {Object} bracketData - The bracket data to save
   * @returns {Promise<boolean>} Success indicator
   */
  async saveTournamentBracketAmericano(tournamentId, bracketData) {
    try {
      console.log(`Saving Americano bracket for tournament: ${tournamentId}`);
      console.log('Bracket data to save:', bracketData);
      
      const bracketRef = firebase.firestore().doc(`${this.collections.BRACKETS_AMERICANO}/${tournamentId}`);
      await bracketRef.set({
        ...bracketData,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log('Americano bracket saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving Americano tournament bracket:', error);
      throw error;
    }
  }
  
  /**
   * Listen for changes to an Americano tournament bracket
   * @param {string} tournamentId - The tournament's ID
   * @param {Function} callback - Function to call with updated data
   * @returns {Function} Unsubscribe function
   */
  listenToTournamentBracketAmericano(tournamentId, callback) {
    console.log(`Setting up listener for Americano bracket: ${tournamentId}`);
    const docRef = firebase.firestore().doc(`${this.collections.BRACKETS_AMERICANO}/${tournamentId}`);
    return docRef.onSnapshot((docSnap) => {
      if (docSnap.exists) {
        const data = {
          id: docSnap.id,
          ...docSnap.data()
        };
        console.log('Americano bracket data updated:', data);
        callback(data);
      } else {
        console.log('No Americano bracket document exists');
        callback(null);
      }
    }, error => {
      console.error('Error listening to Americano tournament bracket:', error);
    });
  }
  
  // ------ TOURNAMENT PLAYERS ------
  
  /**
   * Get players for a tournament
   * @param {string} tournamentId - The tournament's ID
   * @returns {Promise<Array>} List of player objects
   */
  async getTournamentPlayers(tournamentId) {
    try {
      const docRef = firebase.firestore().doc(`${this.collections.TOURNAMENTS}/${tournamentId}/tournament_players/players_list`);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
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
      const docRef = firebase.firestore().doc(`${this.collections.TOURNAMENTS}/${tournamentId}/tournament_players/players_list`);
      await docRef.set({
        players: playersList,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
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
    const docRef = firebase.firestore().doc(`${this.collections.TOURNAMENTS}/${tournamentId}`);
    return docRef.onSnapshot((docSnap) => {
      if (docSnap.exists) {
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
   * Listen for changes to a tournament bracket (Mexicano format)
   * @param {string} tournamentId - The tournament's ID
   * @param {Function} callback - Function to call with updated data
   * @returns {Function} Unsubscribe function
   */
  listenToTournamentBracket(tournamentId, callback) {
    const docRef = firebase.firestore().doc(`${this.collections.BRACKETS}/${tournamentId}`);
    return docRef.onSnapshot((docSnap) => {
      if (docSnap.exists) {
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
    const docRef = firebase.firestore().doc(`${this.collections.TOURNAMENTS}/${tournamentId}/tournament_players/players_list`);
    return docRef.onSnapshot((docSnap) => {
      if (docSnap.exists) {
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
    return firebase.firestore.FieldValue.serverTimestamp();
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

// Make it globally available
window.firebaseService = firebaseService;
