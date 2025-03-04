// public/scripts/services/tournament-service.js

import firebaseService from './firebase-service.js';
import americanoService from './americano-service.js';
import mexicanoService from './mexicano-service.js';

/**
 * TournamentService
 * Handles common tournament operations regardless of format
 */
class TournamentService {
  constructor() {
    this.formatServices = {
      'Americano': americanoService,
      'Mexicano': mexicanoService
    };
  }
  
  /**
   * Get tournament data by ID
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Object>} Tournament data
   */
  async getTournament(tournamentId) {
    try {
      return await firebaseService.getTournament(tournamentId);
    } catch (error) {
      console.error('TournamentService: Error getting tournament:', error);
      throw error;
    }
  }
  
  /**
   * Get players for a tournament
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Array>} List of players
   */
  async getTournamentPlayers(tournamentId) {
    try {
      return await firebaseService.getTournamentPlayers(tournamentId);
    } catch (error) {
      console.error('TournamentService: Error getting tournament players:', error);
      throw error;
    }
  }
  
  /**
   * Update players for a tournament
   * @param {string} tournamentId - Tournament ID
   * @param {Array} players - List of players
   * @returns {Promise<boolean>} Success indicator
   */
  async updateTournamentPlayers(tournamentId, players) {
    try {
      return await firebaseService.updateTournamentPlayers(tournamentId, players);
    } catch (error) {
      console.error('TournamentService: Error updating tournament players:', error);
      throw error;
    }
  }
  
  /**
   * Get all players from database
   * @returns {Promise<Array>} List of all players
   */
  async getAllPlayers() {
    try {
      return await firebaseService.getAllPlayers();
    } catch (error) {
      console.error('TournamentService: Error getting all players:', error);
      throw error;
    }
  }
  
  /**
   * Add a player to a tournament
   * @param {string} tournamentId - Tournament ID
   * @param {Object} player - Player to add
   * @returns {Promise<boolean>} Success indicator
   */
  async addPlayerToTournament(tournamentId, player) {
    try {
      // Get current tournament players
      const players = await this.getTournamentPlayers(tournamentId);
      
      // Check if player is already in tournament
      if (players.some(p => p.id === player.id)) {
        return false;
      }
      
      // Add player to tournament
      players.push(player);
      
      // Update tournament players
      return await this.updateTournamentPlayers(tournamentId, players);
    } catch (error) {
      console.error('TournamentService: Error adding player to tournament:', error);
      throw error;
    }
  }
  
  /**
   * Remove a player from a tournament
   * @param {string} tournamentId - Tournament ID
   * @param {string} playerId - Player ID
   * @returns {Promise<boolean>} Success indicator
   */
  async removePlayerFromTournament(tournamentId, playerId) {
    try {
      // Get current tournament players
      const players = await this.getTournamentPlayers(tournamentId);
      
      // Remove player
      const updatedPlayers = players.filter(p => p.id !== playerId);
      
      // Update tournament players
      return await this.updateTournamentPlayers(tournamentId, updatedPlayers);
    } catch (error) {
      console.error('TournamentService: Error removing player from tournament:', error);
      throw error;
    }
  }
  
  /**
   * Get bracket data for a tournament
   * @param {string} tournamentId - Tournament ID
   * @param {string} format - Tournament format
   * @returns {Promise<Object>} Bracket data
   */
  async getBracketData(tournamentId, format) {
    try {
      const service = this.getServiceForFormat(format);
      return await service.getBracketData(tournamentId);
    } catch (error) {
      console.error(`TournamentService: Error getting ${format} bracket data:`, error);
      throw error;
    }
  }
  
  /**
   * Create initial bracket for a tournament
   * @param {string} tournamentId - Tournament ID
   * @param {string} format - Tournament format
   * @param {Array} players - Tournament players
   * @returns {Promise<Object>} Created bracket data
   */
  async createInitialBracket(tournamentId, format, players) {
    try {
      const service = this.getServiceForFormat(format);
      return await service.createInitialBracket(tournamentId, players);
    } catch (error) {
      console.error(`TournamentService: Error creating initial ${format} bracket:`, error);
      throw error;
    }
  }
  
  /**
   * Save bracket data for a tournament
   * @param {string} tournamentId - Tournament ID
   * @param {string} format - Tournament format
   * @param {Object} bracketData - Bracket data
   * @returns {Promise<boolean>} Success indicator
   */
  async saveBracketData(tournamentId, format, bracketData) {
    try {
      const service = this.getServiceForFormat(format);
      return await service.saveBracketData(tournamentId, bracketData);
    } catch (error) {
      console.error(`TournamentService: Error saving ${format} bracket data:`, error);
      throw error;
    }
  }
  
  /**
   * Update a tournament's status
   * @param {string} tournamentId - Tournament ID
   * @param {number} statusId - Status ID (1=upcoming, 2=ongoing, 3=completed)
   * @returns {Promise<boolean>} Success indicator
   */
  async updateTournamentStatus(tournamentId, statusId) {
    console.log('Tournament status updated:!', tournamentId, statusId);
    try {
      return await firebaseService.updateTournament(tournamentId, { status_id: statusId });
      
    } catch (error) {
      console.error('TournamentService: Error updating tournament status:', error);
      throw error;
    }
  }
  
  /**
   * Complete a tournament
   * @param {string} tournamentId - Tournament ID
   * @param {string} format - Tournament format
   * @param {Object} bracketData - Current bracket data
   * @returns {Promise<boolean>} Success indicator
   */
  async completeTournament(tournamentId, format, bracketData) {
    try {
      const service = this.getServiceForFormat(format);
      
      // Prepare final standings
      const finalStandings = service.prepareFinalStandings(bracketData);
      
      // Update bracket data
      const updatedBracket = {
        ...bracketData,
        completed: true,
        finalStandings
      };
      
      // Save updated bracket
      await service.saveBracketData(tournamentId, updatedBracket);
      
      // Update tournament status to completed
      await this.updateTournamentStatus(tournamentId, 3);
      
      return true;
    } catch (error) {
      console.error('TournamentService: Error completing tournament:', error);
      throw error;
    }
  }
  
  /**
   * Format a date (either Firestore timestamp or string)
   * @param {any} dateValue - Date value to format
   * @returns {string} Formatted date
   */
  formatDate(dateValue) {
    if (!dateValue) return 'N/A';
    
    try {
      // Handle Firestore timestamp
      if (dateValue.toDate) {
        return dateValue.toDate().toLocaleDateString();
      }
      
      // Handle string date
      return new Date(dateValue).toLocaleDateString();
    } catch (e) {
      return dateValue;
    }
  }
  
  /**
   * Get the appropriate service for a tournament format
   * @param {string} format - Tournament format
   * @returns {Object} Format-specific service
   */
  getServiceForFormat(format) {
    const service = this.formatServices[format];
    
    if (!service) {
      throw new Error(`Unsupported tournament format: ${format}`);
    }
    
    return service;
  }
  
  /**
   * Get a player from the database
   * @param {string} playerId - Player ID
   * @returns {Promise<Object>} Player data
   */
  async getPlayer(playerId) {
    try {
      return await firebaseService.getPlayer(playerId);
    } catch (error) {
      console.error('TournamentService: Error getting player:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const tournamentService = new TournamentService();
export default tournamentService;