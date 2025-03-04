// public/scripts/controllers/base-tournament-bracket-controller.js

import firebaseService from '../services/firebase-service.js';
import tournamentStateManager from '../services/tournament-state-manager.js';
import timerService from '../services/timer-service.js';

/**
 * Base Tournament Bracket Controller
 * Common functionality for all tournament bracket types
 */
class BaseTournamentBracketController {
  /**
   * Constructor for base tournament bracket controller
   * @param {Object} options - Initialization options
   * @param {string} options.format - Tournament format (e.g., 'Mexicano', 'Americano')
   * @param {Object} options.elements - DOM elements map
   */
  constructor(options = {}) {
    // DOM Elements
    this.elements = options.elements || {};
    
    // Tournament format
    this.format = options.format || 'Unknown';
    
    // State variables
    this.selectedTournamentId = localStorage.getItem('selectedTournament');
    this.unsubscribeFunctions = [];
    
    // Initialize services
    this.timerService = timerService;
    this.stateManager = tournamentStateManager;
    
    // Bind methods to maintain 'this' context
    this.handleScoreChange = this.handleScoreChange.bind(this);
    this.makeScoreEditable = this.makeScoreEditable.bind(this);
    this.updateMatchScore = this.updateMatchScore.bind(this);
    
    // Subscribe to state changes
    this.stateManager.subscribe('tournamentData', (data) => this.onTournamentDataChanged(data));
    this.stateManager.subscribe('bracketData', (data) => this.onBracketDataChanged(data));
    this.stateManager.subscribe('players', (data) => this.onPlayersDataChanged(data));
  }
  
  /**
   * Initialize the controller
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // Show loading indicator
      this.showLoading('Loading tournament data...');
      
      // Set up listener for data changes
      this.setupDataListeners();
      
      // Wait for initial data
      await this.waitForData();
      
      // Hide loading indicator
      this.hideLoading();
      
      // Initialize UI with data
      this.initializeUI();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Format-specific initialization (implemented by child classes)
      this.initializeFormatSpecific();
      
      console.log(`${this.format} tournament bracket initialized successfully`);
    } catch (error) {
      this.hideLoading();
      console.error('Error initializing tournament bracket:', error);
      
      await this.showAlert({
        title: 'Error',
        text: 'Failed to load tournament data. Please try again later.',
        icon: 'error',
        confirmButtonText: 'Go Back to List'
      });
      
      window.location.href = 'tournament-list.html';
    }
  }
  
  /**
   * Set up listeners for data changes from Firebase
   */
  setupDataListeners() {
    if (!this.selectedTournamentId) {
      console.error('No tournament ID found. Cannot set up data listeners.');
      return;
    }
    
    try {
      console.log('Setting up data listeners for tournament:', this.selectedTournamentId);
      
      // Listen for tournament data changes
      const unsubscribeTournament = firebaseService.listenToTournament(
        this.selectedTournamentId,
        (tournamentData) => {
          if (tournamentData) {
            console.log('Tournament data received:', tournamentData.name);
            this.stateManager.setState('tournamentData', tournamentData);
          } else {
            console.error('Tournament not found');
          }
        }
      );
      
      // Listen for bracket data changes
      const unsubscribeBracket = this.setupBracketListener();
      
      // Listen for tournament players changes
      const unsubscribePlayers = firebaseService.listenToTournamentPlayers(
        this.selectedTournamentId,
        (players) => {
          if (Array.isArray(players)) {
            console.log('Player data received. Count:', players.length);
            this.stateManager.setState('players', players);
          } else {
            console.warn('Received invalid players data:', players);
            this.stateManager.setState('players', []);
          }
        }
      );
      
      this.unsubscribeFunctions.push(unsubscribeTournament, unsubscribeBracket, unsubscribePlayers);
      console.log('Data listeners set up successfully');
    } catch (error) {
      console.error('Error setting up data listeners:', error);
      throw error;
    }
  }
  
  /**
   * Set up bracket listener - to be implemented by child classes
   * @returns {Function} Unsubscribe function
   */
  setupBracketListener() {
    throw new Error('setupBracketListener() must be implemented by child classes');
  }
  
  /**
   * Wait for initial data to be loaded
   * @returns {Promise<void>}
   */
  waitForData() {
    return new Promise((resolve) => {
      const checkData = () => {
        const tournamentData = this.stateManager.getState('tournamentData');
        const bracketData = this.stateManager.getState('bracketData');
        const players = this.stateManager.getState('players');
        
        if (tournamentData && players && players.length > 0) {
          resolve();
          return true;
        }
        return false;
      };
      
      // Check if data is already loaded
      if (checkData()) return;
      
      // Set up subscription to check when data is loaded
      const unsubscribe = this.stateManager.subscribe(['tournamentData', 'bracketData', 'players'], () => {
        if (checkData()) {
          unsubscribe();
        }
      });
      
      // Set timeout in case data never loads
      setTimeout(() => {
        unsubscribe();
        console.warn('Timeout waiting for data, proceeding anyway');
        resolve();
      }, 10000);
    });
  }
  
  /**
   * Initialize UI with data
   */
  initializeUI() {
    const tournamentData = this.stateManager.getState('tournamentData');
    
    // Update tournament name if element exists
    if (this.elements.tournamentName && tournamentData?.name) {
      this.elements.tournamentName.textContent = tournamentData.name + ' - ' + this.format;
    }
    
    // Initialize timer display
    this.timerService.initialize({
      timerDisplay: this.elements.timerDisplay,
      startTimerBtn: this.elements.startTimerBtn,
      onTimeUp: () => this.handleTimerComplete()
    });
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Timer controls
    if (this.elements.startTimerBtn) {
      this.elements.startTimerBtn.addEventListener('click', () => {
        if (this.timerService.isRunning()) {
          this.timerService.reset();
        } else {
          this.timerService.start();
        }
      });
    }
    
    // Make global functions available for HTML event handlers
    window.makeScoreEditable = this.makeScoreEditable;
    window.updateMatchScore = this.updateMatchScore;
  }
  
  /**
   * Format-specific initialization - to be implemented by child classes
   */
  initializeFormatSpecific() {
    throw new Error('initializeFormatSpecific() must be implemented by child classes');
  }
  
  /**
   * Handle score change from UI
   * @param {Event} event - DOM event
   */
  handleScoreChange(event) {
    const input = event.target;
    const matchId = input.dataset.matchId;
    const scoreType = input.dataset.scoreType;
    const score = input.value ? parseInt(input.value, 10) : null;
    
    if (matchId && scoreType) {
      this.updateMatchScore(matchId, scoreType, score);
    }
  }
  
  /**
   * Make score element editable
   * @param {HTMLElement} element - Score element
   * @param {string} matchId - Match ID
   * @param {string} scoreType - Score type ('score1' or 'score2')
   */
  makeScoreEditable(element, matchId, scoreType) {
    // Check if already editing
    if (element.querySelector('.score-input')) {
      return;
    }
    
    const currentScore = element.textContent !== '-' ? element.textContent : '';
    
    // Create input element
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'score-input';
    input.value = currentScore;
    input.min = 0;
    input.max = 10;
    input.dataset.matchId = matchId;
    input.dataset.scoreType = scoreType;
  
    // Store original text for restoration if needed
    const originalText = element.textContent;
    
    // Style the parent element to indicate editing mode
    element.classList.add('editing');
    
    // Add input handlers
    input.onblur = () => {
      this.handleScoreUpdate(element, input, matchId, scoreType, originalText);
    };
  
    input.onkeypress = (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    };
  
    // Clear text and add input
    element.textContent = '';
    element.appendChild(input);
    input.focus();
  }
  
  /**
   * Handle score update after editing
   * @param {HTMLElement} element - Score element
   * @param {HTMLInputElement} input - Score input
   * @param {string} matchId - Match ID
   * @param {string} scoreType - Score type ('score1' or 'score2')
   * @param {string} originalText - Original score text
   */
  async handleScoreUpdate(element, input, matchId, scoreType, originalText) {
    const score = input.value ? parseInt(input.value, 10) : null;
    
    try {
      // Update the score
      await this.updateMatchScore(matchId, scoreType, score);
      
      // Remove input and show updated score with visual feedback
      element.classList.remove('editing');
      element.classList.add('score-updated');
      element.textContent = score !== null ? score : '-';
      
      // Remove the visual feedback after a short delay
      setTimeout(() => {
        element.classList.remove('score-updated');
      }, 1500);
    } catch (error) {
      console.error('Error updating score:', error);
      
      // On error, restore original value
      element.classList.remove('editing');
      element.textContent = originalText;
      
      // Show error message
      this.showAlert({
        title: 'Error',
        text: 'Failed to update score',
        icon: 'error',
        timer: 2000
      });
    }
  }
  
  /**
   * Update match score - to be implemented by child classes
   * @param {string} matchId - Match ID
   * @param {string} scoreType - Score type ('score1' or 'score2')
   * @param {number|null} score - Score value
   * @returns {Promise<void>}
   */
  async updateMatchScore(matchId, scoreType, score) {
    throw new Error('updateMatchScore() must be implemented by child classes');
  }
  
  /**
   * Handle timer completion
   */
  handleTimerComplete() {
    this.showAlert({
      title: 'Time\'s Up!',
      text: 'Round time is up! Please enter final scores.',
      icon: 'info'
    });
  }
  
  /**
   * Event handler for tournament data changes
   * @param {Object} tournamentData - Tournament data
   */
  onTournamentDataChanged(tournamentData) {
    // Default implementation - override in child classes if needed
    console.log('Tournament data updated:', tournamentData?.name);
  }
  
  /**
   * Event handler for bracket data changes
   * @param {Object} bracketData - Bracket data
   */
  onBracketDataChanged(bracketData) {
    // Default implementation - override in child classes if needed
    console.log('Bracket data updated, current round:', bracketData?.currentRound);
  }
  
  /**
   * Event handler for players data changes
   * @param {Array} players - Players data
   */
  onPlayersDataChanged(players) {
    // Default implementation - override in child classes if needed
    console.log('Players data updated, count:', players?.length);
  }
  
  /**
   * Get team names as a string
   * @param {Array} team - Team players array
   * @returns {string} Team names string
   */
  getTeamNames(team) {
    if (!team || !Array.isArray(team) || team.length === 0) {
      return 'Unknown Team';
    }
    return team.map(player => player.name || 'Unknown').join(' & ');
  }
  
  /**
   * Show loading indicator
   * @param {string} message - Loading message
   */
  showLoading(message) {
    try {
      Swal.fire({
        title: message || 'Loading...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    } catch (e) {
      console.log(message || 'Loading...');
    }
  }
  
  /**
   * Hide loading indicator
   */
  hideLoading() {
    try {
      Swal.close();
    } catch (e) {
      // Ignore errors
    }
  }
  
  /**
   * Show alert dialog
   * @param {Object} options - Alert options
   * @returns {Promise<Object>} Alert result
   */
  showAlert(options) {
    try {
      return Swal.fire(options);
    } catch (e) {
      console.log(options.title + ': ' + options.text);
      
      if (options.showCancelButton) {
        const confirmed = confirm(options.title + '\n' + options.text);
        return Promise.resolve({ isConfirmed: confirmed });
      } else {
        alert(options.title + '\n' + options.text);
        return Promise.resolve({ isConfirmed: true });
      }
    }
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    // Unsubscribe from all Firebase listeners
    this.unsubscribeFunctions.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    
    // Unsubscribe from state manager
    this.stateManager.unsubscribeAll(this);
    
    // Reset timer
    this.timerService.cleanup();
    
    // Remove global functions
    window.makeScoreEditable = undefined;
    window.updateMatchScore = undefined;
    
    console.log(`${this.format} tournament bracket cleanup complete`);
  }
}

export default BaseTournamentBracketController;