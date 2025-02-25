// Import dependencies and styles
import '../styles/tournament-management.css';
import firebaseService from './services/firebase-service';
import IsTest from './main';

// Tournament Manager class
class TournamentManager {
  constructor() {
    // State variables
    this.assignedPlayers = new Set();
    this.tournamentPlayers = [];
    this.registeredPlayers = [];
    this.selectedTournamentId = localStorage.getItem('selectedTournament');
    this.tournamentData = null;
    this.unsubscribeFunctions = []; // Store Firebase listener unsubscribe functions

    // Constants
    this.COURT_ORDER = ['Padel Arenas', 'Coolbet', 'Lux Express', '3p Logistics'];

    // Initialize the application
    this.init();
  }

  async init() {
    if (!window.firebaseService) {
      console.error('Firebase service is not loaded! Make sure firebase-service.js is included before this script.');
      return;
    }

    // Show loading indicator
    Swal.fire({
      title: 'Loading tournament data...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      // Setup realtime listeners for tournament data
      this.setupTournamentListener();
      
      // Wait for initial tournament data to be loaded
      await this.waitForTournamentData();
      
      Swal.close();
      
      this.initializeCourts();
      await this.loadPlayers();
      this.initializeControls();
      this.initializeDragAndDrop();
      this.initializeSearchFunctionality();
      this.updateTournamentDisplay();
    } catch (error) {
      Swal.close();
      console.error('Error initializing tournament management:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to load tournament data. Please try again later.',
        icon: 'error',
        confirmButtonText: 'Go Back to List',
      }).then(() => {
        window.location.href = 'tournament-list.html';
      });
    }
  }

  setupTournamentListener() {
    // Listen for tournament data changes
    const unsubscribeTournament = firebaseService.listenToTournament(
      this.selectedTournamentId,
      (tournamentData) => {
        if (tournamentData) {
          this.tournamentData = tournamentData;
          this.updateTournamentDisplay();
        } else {
          console.error('Tournament not found');
          Swal.fire({
            title: 'Tournament Not Found',
            text: 'The requested tournament could not be found.',
            icon: 'error',
            confirmButtonText: 'Go Back to List',
          }).then(() => {
            window.location.href = 'tournament-list.html';
          });
        }
      }
    );
    
    // Listen for tournament players changes
    const unsubscribePlayers = firebaseService.listenToTournamentPlayers(
      this.selectedTournamentId,
      (players) => {
        this.tournamentPlayers = players;
        this.initializePlayers();
      }
    );
    
    this.unsubscribeFunctions.push(unsubscribeTournament, unsubscribePlayers);
  }

  // Wait for tournament data to be loaded
  waitForTournamentData() {
    return new Promise((resolve) => {
      // Check if data is already loaded
      if (this.tournamentData) {
        resolve();
        return;
      }
      
      // Set up a temporary listener
      const checkInterval = setInterval(() => {
        if (this.tournamentData) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!this.tournamentData) {
          console.error('Timeout waiting for tournament data');
          resolve(); // Resolve anyway to continue flow
        }
      }, 10000);
    });
  }

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

  // Add these methods to your TournamentManager class

  async loadPlayers() {
    try {
      // Get all registered players
      this.registeredPlayers = await firebaseService.getAllPlayers();
      
      // Get tournament players
      this.tournamentPlayers = await firebaseService.getTournamentPlayers(
        this.selectedTournamentId
      );
      console.log(IsTest);
      // For testing: quick load 16 random players if IsTest is true and no players are loaded yet
      if (IsTest === true && this.tournamentPlayers.length === 0) {
        console.log("Test mode: Auto-loading 16 random players");
        
        // Ensure we have enough players in the database
        if (this.registeredPlayers.length >= 16) {
          // Shuffle the array of players to get random selection
          const shuffledPlayers = [...this.registeredPlayers].sort(() => 0.5 - Math.random());
          // Take the first 16 players
          this.tournamentPlayers = shuffledPlayers.slice(0, 16);
        } else {
          // If not enough players, take all available and log a warning
          console.warn(`Test mode: Only ${this.registeredPlayers.length} players available`);
          this.tournamentPlayers = [...this.registeredPlayers];
        }
        
        // Sort by ranking for better court assignments
        this.tournamentPlayers.sort((a, b) => b.ranking - a.ranking);
        
        // Save to Firebase
        await firebaseService.updateTournamentPlayers(
          this.selectedTournamentId,
          this.tournamentPlayers
        );
      }
      
      this.initializePlayers();
      this.autoAssignTopPlayers();
    } catch (error) {
      console.error('Error loading players:', error);
      Swal.fire('Error', 'Failed to load players', 'error');
    }
  }

  initializeSearchFunctionality() {
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('resultsContainer');

    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      resultsContainer.innerHTML = '';

      if (query) {
        const filteredPlayers = this.registeredPlayers.filter(player => 
          player.name && player.name.toLowerCase().includes(query)
        );

        filteredPlayers.forEach(player => {
          const div = document.createElement('div');
          div.classList.add('result-item');
          div.innerHTML = `
            <div class="player-result">
              <span class="player-name">${player.name}</span>
              <span class="player-rating">⭐ ${player.ranking || 'N/A'}</span>
            </div>
          `;
          div.addEventListener('click', () => this.addToSelected(player));
          resultsContainer.appendChild(div);
        });
      }
    });
  }

  async addToSelected(player) {
    if (!this.tournamentPlayers.some(p => p.id === player.id)) {
      this.tournamentPlayers.push(player);
      
      // Update in Firebase
      await firebaseService.updateTournamentPlayers(
        this.selectedTournamentId,
        this.tournamentPlayers
      );
      
      document.getElementById('searchInput').value = '';
      document.getElementById('resultsContainer').innerHTML = '';
      
      this.initializePlayers();
      this.autoAssignTopPlayers();
    }
  }

  initializePlayers() {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;
    
    playersList.innerHTML = '';
    
    this.tournamentPlayers.forEach(player => {
      const playerCard = this.createPlayerCard(player);
      playersList.appendChild(playerCard);
    });
  }

  createPlayerCard(player, inSlot = false) {
    const playerCard = document.createElement('div');
    playerCard.className = `player-card${inSlot ? ' in-slot' : ''}`;
    playerCard.id = inSlot ? `slot-${player.id}` : player.id;
    playerCard.draggable = true;
    playerCard.dataset.player = JSON.stringify(player);

    playerCard.innerHTML = `
      <span>${player.name} : ${player.ranking}</span>
      <span class="${inSlot ? 'remove-from-slot' : 'remove-player'}">×</span>
    `;

    const removeBtn = playerCard.querySelector(`.${inSlot ? 'remove-from-slot' : 'remove-player'}`);
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      if (inSlot) {
        this.removeFromSlot(playerCard, player);
      } else {
        this.removePlayer(player.id, player.name);
      }
    };

    this.setupDragListeners(playerCard, player, inSlot);
    return playerCard;
  }

  removeFromSlot(playerCard, player) {
    const slot = playerCard.closest('.player-slot');
    this.assignedPlayers.delete(player.id);
    slot.innerHTML = '<span>Drop Player Here</span>';
    slot.classList.remove('filled');
    this.updatePlayerCardState(player.id, false);
  }

  setupDragListeners(playerCard, player, inSlot) {
    playerCard.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/json', JSON.stringify(player));
      playerCard.classList.add('dragging');
      if (inSlot) {
        setTimeout(() => this.removeFromSlot(playerCard, player), 0);
      }
    });

    playerCard.addEventListener('dragend', () => {
      playerCard.classList.remove('dragging');
    });
  }

  autoAssignTopPlayers() {
    if (window.IsTest && this.tournamentPlayers.length === 0) {
      this.tournamentPlayers = this.registeredPlayers.slice(0, 16);
    }

    const topPlayers = [...this.tournamentPlayers]
      .sort((a, b) => b.ranking - a.ranking)
      .slice(0, 16);

    topPlayers.forEach((player, index) => {
      const courtIndex = Math.floor(index / 4);
      const team = index % 4 === 0 || index % 4 === 3 ? 1 : 2;
      const position = index % 2 === 0 ? 1 : 2;
      
      const slot = document.querySelector(
        `.player-slot[data-court="court-${courtIndex + 1}"][data-team="${team}"][data-position="${position}"]`
      );

      if (slot) {
        slot.innerHTML = '';
        const playerCard = this.createPlayerCard(player, true);
        slot.appendChild(playerCard);
        slot.classList.add('filled');
        this.assignedPlayers.add(player.id);
        this.updatePlayerCardState(player.id, true);
      }
    });
  }

  initializeCourts() {
    const courtsGrid = document.getElementById('courtsGrid');
    courtsGrid.innerHTML = '';

    this.COURT_ORDER.forEach((courtName, index) => {
      const courtId = `court-${index + 1}`;
      courtsGrid.appendChild(this.createCourtCard(courtId, courtName));
    });
  }

  createCourtCard(courtId, courtName) {
    const courtCard = document.createElement('div');
    courtCard.className = 'court-card';
    courtCard.id = courtId;
    courtCard.innerHTML = `
      <div class="court-header">
        <span class="court-name">${courtName}</span>
      </div>
      <div class="teams-container">
        ${this.createTeamSection(1, courtId)}
        <div class="vs-label">VS</div>
        ${this.createTeamSection(2, courtId)}
      </div>
    `;
    return courtCard;
  }

  createTeamSection(teamNumber, courtId) {
    return `
      <div class="team-section" data-team="${teamNumber}">
        <div class="player-slot" data-court="${courtId}" data-team="${teamNumber}" data-position="1">
          <span>Drop Player Here</span>
        </div>
        <div class="player-slot" data-court="${courtId}" data-team="${teamNumber}" data-position="2">
          <span>Drop Player Here</span>
        </div>
      </div>
    `;
  }

  initializeControls() {
    const setFirstRoundBtn = document.getElementById('setFirstRound');
    const resetBtn = document.getElementById('resetAssignments');

    setFirstRoundBtn.addEventListener('click', () => this.createFirstRound());
    resetBtn.addEventListener('click', () => this.resetAssignments());
  }

  async createFirstRound() {
    if (!this.selectedTournamentId) {
      console.error('No selected tournament ID');
      return;
    }

    try {
      // Show loading
      Swal.fire({
        title: 'Creating first round...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Get court assignments from UI
      const courtAssignments = this.getCourtAssignmentsFromUI();
      
      // Validate courts are filled
      if (!this.validateCourtAssignments(courtAssignments)) {
        Swal.close();
        Swal.fire({
          title: 'Incomplete Courts',
          text: 'Please assign players to all courts before creating the first round.',
          icon: 'warning'
        });
        return;
      }
      
      // Create bracket data
      const bracketData = {
        tournamentId: this.selectedTournamentId,
        format: this.tournamentData.format,
        currentRound: 1,
        courts: this.COURT_ORDER.map((courtName, index) => {
          const courtId = `court-${index + 1}`;
          const courtPlayers = this.getPlayersForCourt(courtId);
          
          return {
            name: courtName,
            matches: [{
              id: `match-${Date.now()}-${index}`,
              team1: [courtPlayers[0], courtPlayers[1]],
              team2: [courtPlayers[2], courtPlayers[3]],
              score1: null,
              score2: null,
              completed: false,
              round: 1,
              courtName
            }]
          };
        }),
        completedMatches: [],
        standings: this.tournamentPlayers.slice(0, 16).map(player => ({
          id: player.id,
          name: player.name,
          points: 0,
          wins: 0,
          losses: 0,
          gamesPlayed: 0,
          rating: player.ranking,
        })),
      };

      // Save to Firebase
      await firebaseService.saveTournamentBracket(
        this.selectedTournamentId,
        bracketData
      );

      // Update tournament status to ongoing
      await firebaseService.updateTournament(
        this.selectedTournamentId,
        { status_id: 2 } // 2 = ongoing
      );
      
      Swal.close();
      
      // Navigate to appropriate bracket view
      window.location.href = this.tournamentData.format === 'Americano' 
        ? 'tournament-bracket.html' 
        : 'tournament-bracket-M.html';
        
    } catch (error) {
      Swal.close();
      console.error('Error creating first round:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to create the first round. Please try again.',
        icon: 'error'
      });
    }
  }

  async updateTournamentDisplay() {
    if (!this.tournamentData) return;
    
    // Check if tournament is completed
    if (this.tournamentData.status_id === 3) { // 3 = completed
      // Redirect to tournament stats page
      Swal.fire({
        title: 'Tournament Completed',
        text: 'This tournament is already completed. Redirecting to results page.',
        icon: 'info',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        window.location.href = 'tournament-stats.html';
      });
      return;
    }
    
    // If not completed, show tournament info as normal
    document.getElementById('tournamentName').textContent = this.tournamentData.name;
    document.getElementById('tournamentDate').textContent = `Date: ${this.formatDate(this.tournamentData.start_date)}`;
    document.getElementById('tournamentLocation').textContent = `Location: ${this.tournamentData.location}`;
    document.getElementById('tournamentFormat').textContent = `Format: ${this.tournamentData.format}`;
  }

  getCourtAssignmentsFromUI() {
    const assignments = {};
    
    this.COURT_ORDER.forEach((courtName, index) => {
      const courtId = `court-${index + 1}`;
      assignments[courtId] = this.getPlayersForCourt(courtId);
    });
    
    return assignments;
  }
  
  getPlayersForCourt(courtId) {
    const slots = document.querySelectorAll(`.player-slot[data-court="${courtId}"]`);
    const players = [];
    
    slots.forEach(slot => {
      const playerCard = slot.querySelector('.player-card');
      if (playerCard) {
        try {
          const player = JSON.parse(playerCard.dataset.player);
          players.push(player);
        } catch (error) {
          console.warn('Error parsing player data:', error);
        }
      }
    });
    
    return players;
  }
  
  validateCourtAssignments(assignments) {
    for (const courtId in assignments) {
      if (assignments[courtId].length !== 4) {
        return false;
      }
    }
    return true;
  }

  resetAssignments() {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will reset all court assignments!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset it!',
      cancelButtonText: 'No, keep it',
    }).then((result) => {
      if (result.isConfirmed) {
        this.performReset();
      }
    });
  }

  performReset() {
    this.assignedPlayers.clear();
    const slots = document.querySelectorAll('.player-slot');
    slots.forEach(slot => {
      if (slot.classList.contains('filled')) {
        const playerCard = slot.querySelector('.player-card');
        if (playerCard) {
          const playerId = playerCard.id.replace('slot-', '');
          this.updatePlayerCardState(playerId, false);
        }
        slot.innerHTML = '<span>Drop Player Here</span>';
        slot.classList.remove('filled');
      }
    });
    Swal.fire('Reset!', 'All assignments have been reset.', 'success');
  }

  async removePlayer(playerId, playerName) {
    const result = await Swal.fire({
      title: 'Remove Player?',
      text: `Are you sure you want to remove ${playerName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove',
      cancelButtonText: 'Cancel',
    });
    
    if (result.isConfirmed) {
      try {
        // Remove from tournament players
        this.tournamentPlayers = this.tournamentPlayers.filter(p => p.id !== playerId);
        
        // Update in Firebase
        await firebaseService.updateTournamentPlayers(
          this.selectedTournamentId,
          this.tournamentPlayers
        );
        
        // Remove from UI
        document.getElementById(playerId)?.remove();
        
        // Remove from any court slot
        const slotCard = document.getElementById(`slot-${playerId}`);
        if (slotCard) {
          const slot = slotCard.closest('.player-slot');
          this.assignedPlayers.delete(playerId);
          slot.innerHTML = '<span>Drop Player Here</span>';
          slot.classList.remove('filled');
        }
        
        Swal.fire('Removed!', `${playerName} has been removed.`, 'success');
      } catch (error) {
        console.error('Error removing player:', error);
        Swal.fire('Error', `Could not remove ${playerName}. Please try again.`, 'error');
      }
    }
  }

  initializeDragAndDrop() {
    const playersList = document.getElementById('playersList');
    this.setupDropZone(playersList);

    document.querySelectorAll('.player-slot').forEach(slot => {
      this.setupDropZone(slot);
    });
  }

  setupDropZone(element) {
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      element.classList.add('drag-over');
    });

    element.addEventListener('dragleave', () => {
      element.classList.remove('drag-over');
    });

    element.addEventListener('drop', (e) => this.handleDrop(e, element));
  }

  handleDrop(e, dropZone) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    try {
      const playerData = JSON.parse(e.dataTransfer.getData('application/json'));

      if (dropZone.id === 'playersList') {
        this.assignedPlayers.delete(playerData.id);
        this.updatePlayerCardState(playerData.id, false);
        return;
      }

      if (dropZone.classList.contains('player-slot')) {
        this.handleSlotDrop(dropZone, playerData);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }

  handleSlotDrop(slot, playerData) {
    if (this.assignedPlayers.has(playerData.id)) {
      Swal.fire('Already Assigned', 'This player is already assigned to a team', 'warning');
      return;
    }

    if (slot.querySelector('.player-card')) {
      const existingPlayerId = slot.querySelector('.player-card').id.replace('slot-', '');
      this.assignedPlayers.delete(existingPlayerId);
      this.updatePlayerCardState(existingPlayerId, false);
    }

    slot.innerHTML = '';
    const playerCard = this.createPlayerCard(playerData, true);
    slot.appendChild(playerCard);
    slot.classList.add('filled');
    this.assignedPlayers.add(playerData.id);
    this.updatePlayerCardState(playerData.id, true);
  }

  updatePlayerCardState(playerId, isAssigned) {
    const playerCard = document.getElementById(playerId);
    if (playerCard) {
      playerCard.classList.toggle('assigned', isAssigned);
    }
  }
  
  // Cleanup listeners when page unloads
  cleanup() {
    this.unsubscribeFunctions.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const manager = new TournamentManager();
  
  // Clean up listeners when page is unloaded
  window.addEventListener('beforeunload', () => {
    manager.cleanup();
  });
  
  // Make manager available globally for debugging
  window.tournamentManager = manager;
});

// Export the class for module usage
export default TournamentManager;