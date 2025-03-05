// public/scripts/controllers/americano-management-controller.js

import TournamentManagementController from './tournament-management-controller.js';
import tournamentService from '../services/tournament-service.js';
import americanoService from '../services/americano-service.js';

/**
 * This controller handles the Americano format-specific tournament management UI
 */

/**
 * Americano Tournament Management Controller
 * Handles Americano-specific tournament management
 */
class AmericanoManagementController extends TournamentManagementController {
  constructor() {
    super();
    
    // Americano-specific state
    this.GROUP_COLORS = ['green', 'blue', 'yellow', 'pink'];
    this.bracketData = null;
  }
  
  async initializeFormatSpecific() {
    // Load bracket data if it exists
    try {
      this.bracketData = await tournamentService.getBracketData(
        this.selectedTournamentId, 
        'Americano'
      );
    } catch (error) {
      console.log('No existing bracket data found, will initialize when needed');
    }
    
    // Show group assignments section
    this.showGroupAssignmentsSection();
    
    // Initialize groups
    this.initializeGroupAssignments();
    
    // Set up drag and drop for groups
    this.initializeGroupDragAndDrop();
    
    // Add Save Groups button functionality
    document.getElementById('saveGroups').addEventListener('click', 
      () => this.saveGroups()
    );
    
    // Add Reset Groups button functionality
    document.getElementById('resetGroups').addEventListener('click', 
      () => this.resetGroups()
    );
    
    // If bracket data exists, restore groups from it
    if (this.bracketData) {
      this.restoreGroupsFromBracket();
    }
  }
  
  showGroupAssignmentsSection() {
    const section = document.getElementById('groupAssignmentsSection');
    if (section) {
      section.style.display = 'block';
    }
  }
  
  initializeGroupAssignments() {
    // Clear group containers
    this.GROUP_COLORS.forEach(color => {
      document.getElementById(`${color}GroupPlayers`).innerHTML = '';
    });
    
    // Group players by their group color
    const groupedPlayers = {
      green: [],
      blue: [],
      yellow: [],
      pink: []
    };
    
    // First, try to use existing group info
    this.tournamentPlayers.forEach(player => {
      if (player.group && groupedPlayers[player.group]) {
        groupedPlayers[player.group].push({...player});
      }
    });
    
    // If any group is empty, assign players by rating
    const hasEmptyGroups = Object.values(groupedPlayers).some(group => group.length === 0);
    
    if (hasEmptyGroups) {
      console.log('Some groups are empty, assigning players by rating');
      
      // Reset groups
      this.GROUP_COLORS.forEach(color => {
        groupedPlayers[color] = [];
      });
      
      // Sort players by rating
      const sortedPlayers = [...this.tournamentPlayers].sort((a, b) => 
        (b.ranking || 0) - (a.ranking || 0)
      );
      
      // Distribute players to groups
      const groupSize = Math.ceil(sortedPlayers.length / 4);
      
      sortedPlayers.forEach((player, index) => {
        if (index < groupSize) {
          groupedPlayers.green.push({...player, group: 'green'});
        } else if (index < groupSize * 2) {
          groupedPlayers.blue.push({...player, group: 'blue'});
        } else if (index < groupSize * 3) {
          groupedPlayers.yellow.push({...player, group: 'yellow'});
        } else {
          groupedPlayers.pink.push({...player, group: 'pink'});
        }
      });
    }
    
    // Sort each group by groupOrder if available, otherwise by rating
    this.GROUP_COLORS.forEach(color => {
      // Check if players have groupOrder property
      const hasGroupOrder = groupedPlayers[color].some(p => typeof p.groupOrder === 'number');
      
      if (hasGroupOrder) {
        // Sort by groupOrder
        groupedPlayers[color].sort((a, b) => {
          // Use groupOrder if both have it
          if (typeof a.groupOrder === 'number' && typeof b.groupOrder === 'number') {
            return a.groupOrder - b.groupOrder;
          }
          // Fall back to rating if groupOrder is missing
          return (b.ranking || 0) - (a.ranking || 0);
        });
      } else {
        // Sort by rating
        groupedPlayers[color].sort((a, b) => (b.ranking || 0) - (a.ranking || 0));
      }
    });
    
    // Add players to their group containers
    this.GROUP_COLORS.forEach(color => {
      groupedPlayers[color].forEach(player => {
        const playerCard = this.createPlayerInGroup(player);
        document.getElementById(`${color}GroupPlayers`).appendChild(playerCard);
      });
    });
  }
  
  createPlayerInGroup(player) {
    const playerCard = document.createElement('div');
    playerCard.className = 'player-in-group';
    playerCard.id = `group-${player.id}`;
    playerCard.draggable = true;
    playerCard.dataset.player = JSON.stringify(player);
    
    playerCard.innerHTML = `
      <span class="player-name">${player.name}</span>
      <span class="player-rating">${player.ranking || 'N/A'}</span>
    `;
    
    // Setup drag listeners
    playerCard.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/json', JSON.stringify(player));
      playerCard.classList.add('dragging');
    });
    
    playerCard.addEventListener('dragend', () => {
      playerCard.classList.remove('dragging');
    });
    
    return playerCard;
  }
  
  initializeGroupDragAndDrop() {
    this.GROUP_COLORS.forEach(color => {
      const container = document.getElementById(`${color}GroupPlayers`);
      if (container) {
        this.setupGroupDropZone(container);
      }
    });
  }
  
  setupGroupDropZone(element) {
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      element.classList.add('drag-over');
      
      // Determine drop position
      const afterElement = this.getDragAfterElement(element, e.clientY);
      const draggable = document.querySelector('.player-in-group.dragging');
      
      if (draggable) {
        if (afterElement == null) {
          element.appendChild(draggable);
        } else {
          element.insertBefore(draggable, afterElement);
        }
      }
    });
    
    element.addEventListener('dragleave', (e) => {
      if (e.relatedTarget && !element.contains(e.relatedTarget)) {
        element.classList.remove('drag-over');
      }
    });
    
    element.addEventListener('drop', (e) => {
      e.preventDefault();
      element.classList.remove('drag-over');
      
      try {
        const playerData = JSON.parse(e.dataTransfer.getData('application/json'));
        const existingCard = document.getElementById(`group-${playerData.id}`);
        
        // Determine which group the player is being dropped into
        let newGroup;
        if (element.id === 'greenGroupPlayers') {
          newGroup = 'green';
        } else if (element.id === 'blueGroupPlayers') {
          newGroup = 'blue';
        } else if (element.id === 'yellowGroupPlayers') {
          newGroup = 'yellow';
        } else if (element.id === 'pinkGroupPlayers') {
          newGroup = 'pink';
        }
        
        // Update player's group
        playerData.group = newGroup;
        
        // Create a new player card if it's from a different group
        if (existingCard && !element.contains(existingCard)) {
          existingCard.remove();
          const newCard = this.createPlayerInGroup(playerData);
          
          // Check if we need to insert at a specific position
          const afterElement = this.getDragAfterElement(element, e.clientY);
          if (afterElement) {
            element.insertBefore(newCard, afterElement);
          } else {
            element.appendChild(newCard);
          }
        }
      } catch (error) {
        console.error('Error handling group drop:', error);
      }
    });
  }
  
  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.player-in-group:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  
  async saveGroups() {
    try {
      // Show loading
      this.showLoading('Saving groups...');
      
      // Collect all players from groups with their order
      const groupedPlayers = [];
      
      // Process each group
      this.GROUP_COLORS.forEach(color => {
        document.querySelectorAll(`#${color}GroupPlayers .player-in-group`).forEach((card, index) => {
          try {
            const player = JSON.parse(card.dataset.player);
            player.group = color;
            player.groupOrder = index; // Save the order within the group
            groupedPlayers.push(player);
          } catch (error) {
            console.warn('Error parsing player data:', error);
          }
        });
      });
      
      // Update tournament players with group info
      this.tournamentPlayers = this.tournamentPlayers.map(player => {
        const groupedPlayer = groupedPlayers.find(p => p.id === player.id);
        if (groupedPlayer) {
          player.group = groupedPlayer.group;
          player.groupOrder = groupedPlayer.groupOrder;
        }
        return player;
      });
      
      // Save to Firebase
      await tournamentService.updateTournamentPlayers(
        this.selectedTournamentId,
        this.tournamentPlayers
      );
      
      // Update tournament status if needed (when initial bracket creation)
      if (this.bracketData && this.tournamentData.status_id === 1) {
        console.log('Updating tournament status to ongoing');
        await tournamentService.updateTournamentStatus(
          this.selectedTournamentId,
          { status_id: 2 }
        );
        this.tournamentData.status_id = 2; // Update local data
      }
      
      this.hideLoading();
      
      // Ask if user wants to go directly to the bracket view
      const result = await this.showAlert({
        title: 'Groups Saved!',
        text: 'Do you want to go to the tournament bracket now?',
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Yes, go to bracket',
        cancelButtonText: 'No, stay here'
      });
      
      if (result.isConfirmed) {
        window.location.href = 'tournament-bracket-Americano.html';
      }
    } catch (error) {
      this.hideLoading();
      console.error('Error saving groups:', error);
      this.showAlert({
        title: 'Error',
        text: 'Failed to save group assignments. Please try again.',
        icon: 'error'
      });
    }
  }
  
  resetGroups() {
    this.showAlert({
      title: 'Are you sure?',
      text: 'This will reset all group assignments!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset it!',
      cancelButtonText: 'No, keep it',
    }).then((result) => {
      if (result.isConfirmed) {
        this.initializeGroupAssignments();
        this.showAlert({
          title: 'Reset!',
          text: 'Group assignments have been reset.',
          icon: 'success'
        });
      }
    });
  }
  
  restoreGroupsFromBracket() {
    // Skip if no bracket data or no rounds
    if (!this.bracketData || !this.bracketData.rounds) return;
    
    // Try to get first round data
    const firstRound = this.bracketData.rounds[0];
    if (!firstRound || !firstRound.matches) return;
    
    // Clear all groups
    this.GROUP_COLORS.forEach(color => {
      document.getElementById(`${color}GroupPlayers`).innerHTML = '';
    });
    
    // Group players by their color from matches
    const playersByGroup = {
      green: [],
      blue: [],
      yellow: [],
      pink: []
    };
    
    // Collect players from matches
    firstRound.matches.forEach(match => {
      if (match.groupColor) {
        const allPlayers = [...(match.team1 || []), ...(match.team2 || [])];
        allPlayers.forEach(player => {
          if (player && player.id) {
            // Set group info
            player.group = match.groupColor;
            
            // Add to appropriate group if not already there
            if (!playersByGroup[match.groupColor].some(p => p.id === player.id)) {
              playersByGroup[match.groupColor].push(player);
            }
          }
        });
      }
    });
    
    // Add players to group containers
    this.GROUP_COLORS.forEach(color => {
      playersByGroup[color].forEach(player => {
        const playerCard = this.createPlayerInGroup(player);
        document.getElementById(`${color}GroupPlayers`).appendChild(playerCard);
      });
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const controller = new AmericanoManagementController();
  
  // Make controller available globally for debugging
  window.americanoController = controller;
  
  // Clean up when page is unloaded
  window.addEventListener('beforeunload', () => {
    controller.cleanup();
  });
});

export default AmericanoManagementController;