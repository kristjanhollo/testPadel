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
      // Normalize status data - if there's a status object, extract just the status_id
      let normalizedData = { ...tournamentData };
      
      // If status is an object with status_id, extract just the status_id
      if (normalizedData.status && typeof normalizedData.status === 'object' && 'status_id' in normalizedData.status) {
        normalizedData.status_id = normalizedData.status.status_id;
        delete normalizedData.status;
      }
      
      // If status is a direct number, convert it to status_id
      if (typeof normalizedData.status === 'number') {
        normalizedData.status_id = normalizedData.status;
        delete normalizedData.status;
      }
      
      const tournamentRef = doc(db, this.collections.TOURNAMENTS, tournamentId);
      await updateDoc(tournamentRef, {
        ...normalizedData,
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
  
  // ------ TOURNAMENT BRACKETS (MEXICANO FORMAT) ------
  
  /**
   * Get a tournament bracket (Mexicano format)
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
   * Save tournament bracket data (Mexicano format)
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

  // ------ TOURNAMENT BRACKETS (AMERICANO FORMAT) ------
  
  /**
   * Get a tournament bracket for Americano format
   * @param {string} tournamentId - The tournament's ID
   * @returns {Promise<Object|null>} Bracket data or null if not found
   */
  async getTournamentBracketAmericano(tournamentId) {
    try {
      console.log(`Getting Americano bracket for tournament: ${tournamentId}`);
      const docRef = doc(db, this.collections.BRACKETS_AMERICANO, tournamentId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
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
      
      const bracketRef = doc(db, this.collections.BRACKETS_AMERICANO, tournamentId);
      await setDoc(bracketRef, {
        ...bracketData,
        updated_at: serverTimestamp()
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
    const docRef = doc(db, this.collections.BRACKETS_AMERICANO, tournamentId);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
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
   * Listen for changes to a tournament bracket (Mexicano format)
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
 * Add a match to a player's match history
 * @param {string} playerId - The player's ID
 * @param {Object} matchData - Match data to add
 * @returns {Promise<string>} ID of the new match document
 */
async addMatchToPlayer(playerId, matchData) {
  try {
    // Reference to player's matches subcollection
    const matchesRef = collection(db, this.collections.PLAYERS, playerId, 'matches');
    
    // Add the match
    const docRef = await addDoc(matchesRef, {
      ...matchData,
      date: matchData.date || new Date().toISOString(),
      created_at: serverTimestamp()
    });
    
    // Update player's stats
    await this.updatePlayerStats(playerId, {
      matchesCount: 1,
      winsCount: matchData.won ? 1 : 0,
      lossesCount: matchData.won ? 0 : 1
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding match to player:', error);
    throw error;
  }
}

/**
 * Add a tournament to a player's tournament history
 * @param {string} playerId - The player's ID
 * @param {Object} tournamentData - Tournament data to add
 * @returns {Promise<string>} ID of the new tournament document
 */
async addTournamentToPlayer(playerId, tournamentData) {
  try {
    // Reference to player's tournaments subcollection
    const tournamentsRef = collection(db, this.collections.PLAYERS, playerId, 'tournaments');
    
    // Add the tournament
    const docRef = await addDoc(tournamentsRef, {
      ...tournamentData,
      date: tournamentData.date || new Date().toISOString(),
      created_at: serverTimestamp()
    });
    
    // Update player's stats
    await this.updatePlayerStats(playerId, {
      tournamentsCount: 1
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding tournament to player:', error);
    throw error;
  }
}

/**
 * Update player's statistics
 * @param {string} playerId - The player's ID
 * @param {Object} statsUpdate - Stats to update
 * @returns {Promise<void>}
 */
async updatePlayerStats(playerId, statsUpdate) {
  try {
    const playerRef = doc(db, this.collections.PLAYERS, playerId);
    const playerDoc = await getDoc(playerRef);
    
    if (!playerDoc.exists()) {
      throw new Error('Player not found');
    }
    
    const playerData = playerDoc.data();
    const stats = playerData.stats || {
      matchesCount: 0,
      winsCount: 0,
      lossesCount: 0,
      tournamentsCount: 0,
      winRate: 0
    };
    
    // Update counts
    if (statsUpdate.matchesCount) stats.matchesCount += statsUpdate.matchesCount;
    if (statsUpdate.winsCount) stats.winsCount += statsUpdate.winsCount;
    if (statsUpdate.lossesCount) stats.lossesCount += statsUpdate.lossesCount;
    if (statsUpdate.tournamentsCount) stats.tournamentsCount += statsUpdate.tournamentsCount;
    
    // Calculate win rate
    if (stats.matchesCount > 0) {
      stats.winRate = (stats.winsCount / stats.matchesCount) * 100;
    }
    
    // Update player document
    await updateDoc(playerRef, { 
      stats: stats,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating player stats:', error);
    throw error;
  }
}

/**
 * Get matches for a player
 * @param {string} playerId - The player's ID
 * @param {number} limit - Maximum number of matches to retrieve
 * @returns {Promise<Array>} List of match objects
 */
async getPlayerMatches(playerId, limit = 15) {
  try {
    const matchesRef = collection(db, this.collections.PLAYERS, playerId, 'matches');
    const matchesQuery = query(
      matchesRef,
      orderBy('date', 'desc'),
      limit(limit)
    );
    
    const snapshot = await getDocs(matchesQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting player matches:', error);
    throw error;
  }
}

/**
 * Get tournaments for a player
 * @param {string} playerId - The player's ID
 * @param {number} limit - Maximum number of tournaments to retrieve
 * @returns {Promise<Array>} List of tournament objects
 */
async getPlayerTournaments(playerId, limit = 10) {
  try {
    const tournamentsRef = collection(db, this.collections.PLAYERS, playerId, 'tournaments');
    const tournamentsQuery = query(
      tournamentsRef,
      orderBy('date', 'desc'),
      limit(limit)
    );
    
    const snapshot = await getDocs(tournamentsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting player tournaments:', error);
    throw error;
  }
}

/**
 * Add a rating entry to a player's rating history
 * @param {string} playerId - The player's ID
 * @param {number} rating - The new rating
 * @returns {Promise<void>}
 */
async addPlayerRatingEntry(playerId, rating) {
  try {
    const playerRef = doc(db, this.collections.PLAYERS, playerId);
    const playerDoc = await getDoc(playerRef);
    
    if (!playerDoc.exists()) {
      throw new Error('Player not found');
    }
    
    const playerData = playerDoc.data();
    const ratingHistory = playerData.ratingHistory || [];
    
    // Add new rating entry
    ratingHistory.push({
      date: new Date().toISOString(),
      rating: rating
    });
    
    // Update player document
    await updateDoc(playerRef, { 
      ratingHistory: ratingHistory,
      ranking: rating, // Also update the current rating
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding player rating entry:', error);
    throw error;
  }
}

/**
 * Get a player's group history
 * @param {string} playerId - The player's ID
 * @returns {Promise<Array>} The player's group history
 */
async getPlayerGroupHistory(playerId) {
  try {
    const playerRef = doc(db, this.collections.PLAYERS, playerId);
    const playerDoc = await getDoc(playerRef);
    
    if (!playerDoc.exists()) {
      throw new Error('Player not found');
    }
    
    return playerDoc.data().groupHistory || [];
  } catch (error) {
    console.error('Error getting player group history:', error);
    throw error;
  }
}

/**
 * Add a group entry to a player's group history
 * @param {string} playerId - The player's ID
 * @param {string} group - The new group
 * @returns {Promise<void>}
 */
async addPlayerGroupEntry(playerId, group) {
  try {
    const playerRef = doc(db, this.collections.PLAYERS, playerId);
    const playerDoc = await getDoc(playerRef);
    
    if (!playerDoc.exists()) {
      throw new Error('Player not found');
    }
    
    const playerData = playerDoc.data();
    const groupHistory = playerData.groupHistory || [];
    
    // Check if we already have this as the latest group
    if (groupHistory.length > 0) {
      const lastEntry = groupHistory[groupHistory.length - 1];
      if (lastEntry.group === group) {
        // Already the current group, no need to add
        return;
      }
    }
    
    // Add new group entry
    groupHistory.push({
      date: new Date().toISOString(),
      group: group
    });
    
    // Update player document
    await updateDoc(playerRef, { 
      groupHistory: groupHistory,
      group: group, // Also update the current group
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding player group entry:', error);
    throw error;
  }
}

/**
 * Get a player's ranking among all players
 * @param {string} playerId - The player's ID
 * @returns {Promise<number>} The player's ranking position (1-based)
 */
async getPlayerRanking(playerId) {
  try {
    const playersRef = collection(db, this.collections.PLAYERS);
    const playersQuery = query(playersRef, orderBy('ranking', 'desc'));
    const snapshot = await getDocs(playersQuery);
    
    const players = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const playerIndex = players.findIndex(p => p.id === playerId);
    return playerIndex !== -1 ? playerIndex + 1 : null;
  } catch (error) {
    console.error('Error getting player ranking:', error);
    throw error;
  }
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