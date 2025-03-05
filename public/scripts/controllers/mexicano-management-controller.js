// public/scripts/controllers/mexicano-management-controller.js

import TournamentManagementController from './tournament-management-controller.js';
import tournamentService from '../services/tournament-service.js';
import mexicanoService from '../services/mexicano-service.js';

/**
 * Mexicano Tournament Management Controller
 * Handles Mexicano-specific tournament management
 */
class MexicanoManagementController extends TournamentManagementController {
  constructor() {
    super();
    
    // Mexicano-specific state
    this.COURT_ORDER = ['Padel Arenas', 'Coolbet', 'Lux Express', '3p Logistics'];
    this.bracketData = null;
    this.assignedPlayers = new Set();
  }
  
  async initializeFormatSpecific() {
    // Load bracket data if it exists
    try {
      this.bracketData = await tournamentService.getBracketData(
        this.selectedTournamentId, 
        'Mexicano'
      );
    } catch (error) {
      console.log('No existing bracket data found, will initialize when needed');
    }
    
    // Initialize court assignments
    this.initializeCourts();
    
    // Set up drag and drop
    this.initializeDragAndDrop();
    
    // Set up control buttons
    this.initializeControls();
    
    // If bracket data exists, restore court assignments
    if (this.bracketData) {
      this.restoreCourtAssignmentsFromBracket();
    }
  }
  
  initializeCourts() {
    const courtsGrid = document.getElementById('courtsGrid');
    if (!courtsGrid) return;
    
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
  
  initializeDragAndDrop() {
    // Make player cards draggable
    document.querySelectorAll('.player-card').forEach(card => {
      card.draggable = true;
      card.addEventListener('dragstart', (e) => {
        try {
          const player = JSON.parse(card.dataset.player);
          e.dataTransfer.setData('application/json', JSON.stringify(player));
          card.classList.add('dragging');
        } catch (error) {
          console.error('Error starting drag:', error);
        }
      });
      
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });
    });
    
    // Make player slots drop targets
    document.querySelectorAll('.player-slot').forEach(slot => {
      this.setupDropZone(slot);
    });
    
    // Make players list a drop target for returning players
    const playersList = document.getElementById('playersList');
    if (playersList) {
      this.setupDropZone(playersList);
    }
  }
  
  setupDropZone(element) {
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      element.classList.add('drag-over');
    });
    
    element.addEventListener('dragleave', (e) => {
      if (e.relatedTarget && !element.contains(e.relatedTarget)) {
        element.classList.remove('drag-over');
      }
    });
    
    element.addEventListener('drop', (e) => this.handleDrop(e, element));
  }
  
  handleDrop(e, dropZone) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    try {
      const playerData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      // If dropped back to players list, just remove from assigned
      if (dropZone.id === 'playersList') {
        this.assignedPlayers.delete(playerData.id);
        this.updatePlayerCardState(playerData.id, false);
        return;
      }
      
      // Handle drop in a player slot
      if (dropZone.classList.contains('player-slot')) {
        this.handleSlotDrop(dropZone, playerData);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }
  
  handleSlotDrop(slot, playerData) {
    // Check if player is already assigned elsewhere
    if (this.assignedPlayers.has(playerData.id)) {
      // Find where the player is assigned
      const existingSlot = document.querySelector(`.player-slot .player-card[id="slot-${playerData.id}"]`);
      
      if (existingSlot) {
        // Remove from current slot
        const oldSlot = existingSlot.closest('.player-slot');
        this.assignedPlayers.delete(playerData.id);
        oldSlot.innerHTML = '<span>Drop Player Here</span>';
        oldSlot.classList.remove('filled');
      }
    }
    
    // Check if slot already has a player
    if (slot.querySelector('.player-card')) {
      const existingPlayerId = slot.querySelector('.player-card').id.replace('slot-', '');
      this.assignedPlayers.delete(existingPlayerId);
      this.updatePlayerCardState(existingPlayerId, false);
    }
    
    // Add player to slot
    slot.innerHTML = '';
    const playerCard = this.createPlayerCardInSlot(playerData);
    slot.appendChild(playerCard);
    slot.classList.add('filled');
    
    // Mark player as assigned
    this.assignedPlayers.add(playerData.id);
    this.updatePlayerCardState(playerData.id, true);
  }
  
  createPlayerCardInSlot(player) {
    const playerCard = document.createElement('div');
    playerCard.className = 'player-card in-slot';
    playerCard.id = `slot-${player.id}`;
    playerCard.draggable = true;
    playerCard.dataset.player = JSON.stringify(player);
    
    playerCard.innerHTML = `
      <span>${player.name} : ${player.ranking || 'N/A'}</span>
      <span class="remove-from-slot">×</span>
    `;
    
    const removeBtn = playerCard.querySelector('.remove-from-slot');
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      this.removeFromSlot(playerCard, player);
    };
    
    // Set up drag events
    playerCard.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/json', JSON.stringify(player));
      playerCard.classList.add('dragging');
    });
    
    playerCard.addEventListener('dragend', () => {
      playerCard.classList.remove('dragging');
    });
    
    return playerCard;
  }
  
  removeFromSlot(playerCard, player) {
    const slot = playerCard.closest('.player-slot');
    this.assignedPlayers.delete(player.id);
    slot.innerHTML = '<span>Drop Player Here</span>';
    slot.classList.remove('filled');
    this.updatePlayerCardState(player.id, false);
  }
  
  updatePlayerCardState(playerId, isAssigned) {
    const playerCard = document.getElementById(playerId);
    if (playerCard) {
      playerCard.classList.toggle('assigned', isAssigned);
    }
  }
  
  initializeControls() {
    const setFirstRoundBtn = document.getElementById('setFirstRound');
    const resetBtn = document.getElementById('resetAssignments');
    const autoAssignBtn = document.getElementById('autoAssignPlayers');
    
    if (setFirstRoundBtn) {
      setFirstRoundBtn.addEventListener('click', () => this.createFirstRound());
    }
    
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetAssignments());
    }
    
    if (autoAssignBtn) {
      autoAssignBtn.addEventListener('click', () => {
        this.showAlert({
          title: 'Auto Assign Players',
          text: 'This will assign all players to courts based on their ratings. Continue?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, assign them',
          cancelButtonText: 'Cancel'
        }).then((result) => {
          if (result.isConfirmed) {
            this.autoAssignTopPlayers();
            this.showAlert({
              title: 'Players Assigned!',
              text: 'Players have been automatically assigned to courts based on ratings',
              icon: 'success'
            });
          }
        });
      });
    }
  }
  
  autoAssignTopPlayers() {
    const topPlayers = [...this.tournamentPlayers]
      .sort((a, b) => (b.ranking || 0) - (a.ranking || 0))
      .slice(0, 16);  // Take top 16 players
    
    // Reset current assignments
    this.resetAssignmentsUI();
    
    // Assign players by rating (SNP pattern: 0&3 vs 1&2 in each group of 4)
    topPlayers.forEach((player, index) => {
      const courtIndex = Math.floor(index / 4);
      const team = index % 4 === 0 || index % 4 === 3 ? 1 : 2;
      const position = index % 2 === 0 ? 1 : 2;
      
      this.assignPlayerToSlot(player, `court-${courtIndex + 1}`, team, position);
    });
  }
  
  assignPlayerToSlot(player, courtId, team, position) {
    const slot = document.querySelector(
      `.player-slot[data-court="${courtId}"][data-team="${team}"][data-position="${position}"]`
    );
    
    if (slot) {
      slot.innerHTML = '';
      const playerCard = this.createPlayerCardInSlot(player);
      slot.appendChild(playerCard);
      slot.classList.add('filled');
      this.assignedPlayers.add(player.id);
      this.updatePlayerCardState(player.id, true);
    }
  }
  
  resetAssignmentsUI() {
    this.assignedPlayers.clear();
    
    // Clear all slots
    document.querySelectorAll('.player-slot').forEach(slot => {
      slot.innerHTML = '<span>Drop Player Here</span>';
      slot.classList.remove('filled');
    });
    
    // Reset player card states
    document.querySelectorAll('.player-card.assigned').forEach(card => {
      card.classList.remove('assigned');
    });
  }
  
  resetAssignments() {
    this.showAlert({
      title: 'Are you sure?',
      text: 'This will reset all court assignments!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset it!',
      cancelButtonText: 'No, keep it',
    }).then((result) => {
      if (result.isConfirmed) {
        this.resetAssignmentsUI();
        this.showAlert({
          title: 'Reset!',
          text: 'All assignments have been reset.',
          icon: 'success'
        });
      }
    });
  }
  
  async createFirstRound() {
    try {
      // Validate court assignments
      if (!this.validateCourtAssignments()) {
        this.showAlert({
          title: 'Incomplete Court Assignments',
          text: 'All courts must have exactly 4 players assigned (2 per team).',
          icon: 'warning'
        });
        return;
      }
      
      // Show loading
      this.showLoading('Creating first round...');
      
      // Get court assignments from UI
      const courtAssignments = this.getCourtAssignmentsFromUI();
      
      // Check if bracket data exists
      if (!this.bracketData) {
        // Create new bracket data
        this.bracketData = mexicanoService.createMexicanoBracket(this.tournamentPlayers);
      }
      
      // Set up first round matches
      for (let i = 0; i < this.COURT_ORDER.length; i++) {
        const courtName = this.COURT_ORDER[i];
        const courtId = `court-${i + 1}`;
        const players = courtAssignments[courtId];
        
        if (players.length === 4) {
          // Get team 1 players (slots 0 and 1)
          const team1 = [players[0], players[1]];
          
          // Get team 2 players (slots 2 and 3)
          const team2 = [players[2], players[3]];
          
          // Create match
          const match = {
            id: `match-${Date.now()}-${i}`,
            courtName: courtName,
            team1: team1,
            team2: team2,
            score1: null,
            score2: null,
            completed: false,
            round: 1
          };
          
          // Add match to court
          this.bracketData.courts[i].matches = [match];
        }
      }
      console.log('Updating tournament status to ongoing');
      // Update round number
      this.bracketData.currentRound = 1;
      
      // Update tournament status to ongoing if it's currently upcoming
      if (this.tournamentData.status_id === 1) {
       
        await tournamentService.updateTournamentStatus(
          this.selectedTournamentId,
          { status_id: 2}
        );
        this.tournamentData.status_id = 2; // Update local data
      }
      
      // Save to Firebase
      await tournamentService.saveBracketData(
        this.selectedTournamentId,
        'Mexicano',
        this.bracketData
      );
      
      // Hide loading
      this.hideLoading();
      
      // Ask if user wants to go to bracket view
      const result = await this.showAlert({
        title: 'First Round Created!',
        text: 'Do you want to go to the tournament bracket now?',
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Yes, go to bracket',
        cancelButtonText: 'No, stay here'
      });
      
      if (result.isConfirmed) {
        window.location.href = 'tournament-bracket-M.html';
      }
    } catch (error) {
      this.hideLoading();
      console.error('Error creating first round:', error);
      this.showAlert({
        title: 'Error',
        text: 'Failed to create first round. Please try again.',
        icon: 'error'
      });
    }
  }
  
  validateCourtAssignments() {
    // Each court must have exactly 4 players (2 per team)
    for (let i = 0; i < this.COURT_ORDER.length; i++) {
      const courtId = `court-${i + 1}`;
      const slots = document.querySelectorAll(`.player-slot[data-court="${courtId}"]`);
      
      // Each slot must have a player
      for (const slot of slots) {
        if (!slot.classList.contains('filled')) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  getCourtAssignmentsFromUI() {
    const assignments = {};
    
    for (let i = 0; i < this.COURT_ORDER.length; i++) {
      const courtId = `court-${i + 1}`;
      assignments[courtId] = this.getPlayersForCourt(courtId);
    }
    
    return assignments;
  }
  
  getPlayersForCourt(courtId) {
    const slots = Array.from(document.querySelectorAll(`.player-slot[data-court="${courtId}"]`));
    const players = [];
    
    // Sort slots by team and position
    slots.sort((a, b) => {
      const aTeam = parseInt(a.dataset.team);
      const bTeam = parseInt(b.dataset.team);
      if (aTeam !== bTeam) {
        return aTeam - bTeam;
      }
      return parseInt(a.dataset.position) - parseInt(b.dataset.position);
    });
    
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
  
  restoreCourtAssignmentsFromBracket() {
    // Only restore from first round
    if (!this.bracketData || !this.bracketData.courts) return;
    
    // Reset current assignments
    this.resetAssignmentsUI();
    
    // Loop through courts
    this.bracketData.courts.forEach((court, courtIndex) => {
      if (court.matches && court.matches.length > 0) {
        const match = court.matches[0]; // First match in the court
        
        // Assign team 1 players
        if (match.team1 && match.team1.length >= 2) {
          this.assignPlayerToSlot(match.team1[0], `court-${courtIndex + 1}`, 1, 1);
          this.assignPlayerToSlot(match.team1[1], `court-${courtIndex + 1}`, 1, 2);
        }
        
        // Assign team 2 players
        if (match.team2 && match.team2.length >= 2) {
          this.assignPlayerToSlot(match.team2[0], `court-${courtIndex + 1}`, 2, 1);
          this.assignPlayerToSlot(match.team2[1], `court-${courtIndex + 1}`, 2, 2);
        }
      }
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const controller = new MexicanoManagementController();
  
  // Make controller available globally for debugging
  window.mexicanoController = controller;
  
  // Clean up when page is unloaded
  window.addEventListener('beforeunload', () => {
    controller.cleanup();
  });
});

export default MexicanoManagementController;