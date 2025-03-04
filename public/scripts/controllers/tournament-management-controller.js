// public/scripts/controllers/tournament-management-controller.js

import tournamentService from '../services/tournament-service.js';

/**
 * Base Tournament Management Controller
 * Handles common UI logic for all tournament formats
 */
class TournamentManagementController {
  constructor() {
    // State
    this.selectedTournamentId = localStorage.getItem('selectedTournament');
    this.tournamentData = null;
    this.tournamentPlayers = [];
    this.registeredPlayers = [];
    this.unsubscribeFunctions = [];
    
    // Initialize
    this.init();
  }
  
  async init() {
    // Show loading indicator
    this.showLoading('Loading tournament data...');
    
    try {
      await this.loadTournamentData();
      
      // Check if tournament is completed
      if (this.tournamentData.status_id === 3) { // 3 = completed
        // Redirect to tournament stats page
        this.showAlert({
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
      
      // Setup UI components
      this.setupUI();
      
      // Hide loading
      this.hideLoading();
      
      // Format-specific initialization (to be implemented by child classes)
      this.initializeFormatSpecific();
    } catch (error) {
      this.hideLoading();
      console.error('Error initializing tournament management:', error);
      
      this.showAlert({
        title: 'Error',
        text: 'Failed to load tournament data. Please try again later.',
        icon: 'error',
        confirmButtonText: 'Go Back to List',
      }).then(() => {
        window.location.href = 'tournament-list.html';
      });
    }
  }
  
  async loadTournamentData() {
    if (!this.selectedTournamentId) {
      throw new Error('No tournament selected');
    }
    
    // Load tournament data
    this.tournamentData = await tournamentService.getTournament(this.selectedTournamentId);
    
    if (!this.tournamentData) {
      throw new Error('Tournament not found');
    }
    
    // Load registered players (for player selection)
    this.registeredPlayers = await tournamentService.getAllPlayers();
    
    // Load tournament players
    this.tournamentPlayers = await tournamentService.getTournamentPlayers(this.selectedTournamentId);
    
    // Update tournament info display
    this.updateTournamentDisplay();
  }
  
  setupUI() {
    // Initialize search functionality
    this.initializeSearch();
    
    // Initialize quick add functionality
    this.initializeQuickAdd();
    
    // Initialize player list
    this.renderPlayersList();
  }
  
  // Method to be overridden by subclasses
  initializeFormatSpecific() {
    // Format-specific initialization
    console.warn('initializeFormatSpecific() not implemented');
  }
  
  updateTournamentDisplay() {
    const titleElement = document.getElementById('tournamentName');
    const dateElement = document.getElementById('tournamentDate');
    const locationElement = document.getElementById('tournamentLocation');
    const formatElement = document.getElementById('tournamentFormat');
    
    if (titleElement) {
      titleElement.textContent = this.tournamentData.name || 'Tournament';
    }
    
    if (dateElement) {
      dateElement.textContent = `Date: ${tournamentService.formatDate(this.tournamentData.start_date)}`;
    }
    
    if (locationElement) {
      locationElement.textContent = `Location: ${this.tournamentData.location || 'N/A'}`;
    }
    
    if (formatElement) {
      formatElement.textContent = `Format: ${this.tournamentData.format || 'N/A'}`;
    }
  }
  
  initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('resultsContainer');
    
  

    if (!searchInput || !resultsContainer) return;
    
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      resultsContainer.innerHTML = '';
      if (query.length < 2) return; // Require at least 2 characters
      
      const filteredPlayers = this.registeredPlayers.filter(player => 
        player.name && player.name.toLowerCase().includes(query) &&
        !this.tournamentPlayers.some(p => p.id === player.id)
      );
      
      // Limit results to top 5
      const limitedResults = filteredPlayers.slice(0, 5);
      
      limitedResults.forEach(player => {
        const div = document.createElement('div');
        div.classList.add('result-item');
        div.innerHTML = `
          <div class="player-result">
            <span class="player-name">${player.name}</span>
            <span class="player-rating">⭐ ${player.ranking || 'N/A'}</span>
          </div>
        `;
        div.addEventListener('click', () => this.addPlayerToTournament(player));
        resultsContainer.appendChild(div);
      });
    });
  }
  
  async addPlayerToTournament(player) {
    try {
      await tournamentService.addPlayerToTournament(this.selectedTournamentId, player);
      
      // Reset search
      const searchInput = document.getElementById('searchInput');
      const resultsContainer = document.getElementById('resultsContainer');
      
      if (searchInput) searchInput.value = '';
      if (resultsContainer) resultsContainer.innerHTML = '';
      
      // Refresh player list
      this.tournamentPlayers.push(player);
      this.renderPlayersList();
    } catch (error) {
      console.error('Error adding player to tournament:', error);
      this.showAlert({
        title: 'Error',
        text: 'Failed to add player to tournament',
        icon: 'error'
      });
    }
  }
  
  initializeQuickAdd() {
    const quickAddBtn = document.getElementById('quickAddButton');
    const modal = document.getElementById('quickAddModal');
    
    if (!quickAddBtn || !modal) return;
    
    const closeButtons = modal.querySelectorAll('.close-modal, .close-btn');
    const form = document.getElementById('quickAddForm');
    
    // Show modal
    quickAddBtn.addEventListener('click', () => {
      modal.style.display = 'block';
    });
    
    // Close modal
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modal.style.display = 'none';
        form.reset();
        document.getElementById('quickAddStatus').className = 'status-message';
        document.getElementById('quickAddStatus').textContent = '';
      });
    });
    
    // Close on outside click
    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        form.reset();
        document.getElementById('quickAddStatus').className = 'status-message';
        document.getElementById('quickAddStatus').textContent = '';
      }
    });
    
    // Handle form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleQuickAddPlayers();
    });
  }
  
  async handleQuickAddPlayers() {
    const namesText = document.getElementById('playerNames').value.trim();
    const statusEl = document.getElementById('quickAddStatus');
    
    if (!namesText) {
      this.showStatus(statusEl, 'Please enter at least one player name', 'error');
      return;
    }
    
    // Split names by new line
    const names = namesText.split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    if (names.length === 0) {
      this.showStatus(statusEl, 'Please enter at least one valid player name', 'error');
      return;
    }
    
    // Show loading
    this.showStatus(statusEl, `Processing ${names.length} player(s)...`, 'warning');
    
    try {
      // Track results
      const results = {
        added: [],
        notFound: [],
        alreadyInTournament: []
      };
      
      // Process each name
      for (const name of names) {
        // Find player in database (case insensitive)
        const foundPlayer = this.registeredPlayers.find(p => 
          p.name.toLowerCase() === name.toLowerCase());
        
        if (!foundPlayer) {
          results.notFound.push(name);
          continue;
        }
        
        // Check if player is already in tournament
        const alreadyInTournament = this.tournamentPlayers.some(p => p.id === foundPlayer.id);
        
        if (alreadyInTournament) {
          results.alreadyInTournament.push(name);
          continue;
        }
        
        // Add player to tournament
        results.added.push(foundPlayer);
      }
      
      // Add found players to tournament
      if (results.added.length > 0) {
        // Update tournament players
        this.tournamentPlayers = [...this.tournamentPlayers, ...results.added];
        
        // Save to Firebase
        await tournamentService.updateTournamentPlayers(
          this.selectedTournamentId,
          this.tournamentPlayers
        );
        
        // Update UI
        this.renderPlayersList();
      }
      
      // Show results
      let message = '';
      if (results.added.length > 0) {
        message += `Added ${results.added.length} player(s) successfully. `;
      }
      if (results.notFound.length > 0) {
        message += `${results.notFound.length} player(s) not found in database. `;
      }
      if (results.alreadyInTournament.length > 0) {
        message += `${results.alreadyInTournament.length} player(s) already in tournament.`;
      }
      
      this.showStatus(statusEl, message, results.added.length > 0 ? 'success' : 'warning');
      
      // Reset form if everything was successful
      if (results.notFound.length === 0 && results.alreadyInTournament.length === 0) {
        setTimeout(() => {
          document.getElementById('quickAddModal').style.display = 'none';
          document.getElementById('quickAddForm').reset();
          statusEl.className = 'status-message';
          statusEl.textContent = '';
        }, 2000);
      }
    } catch (error) {
      console.error('Error adding players:', error);
      this.showStatus(statusEl, 'Error adding players. Please try again.', 'error');
    }
  }
  
  showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status-message status-${type}`;
  }
  
  renderPlayersList() {
    const playersList = document.getElementById('playersList');
    if (!playersList) return;
    
    playersList.innerHTML = '';
    
    // Sort by rating
    const sortedPlayers = [...this.tournamentPlayers].sort(
      (a, b) => (b.ranking || 0) - (a.ranking || 0)
    );
    
    sortedPlayers.forEach(player => {
      const playerCard = document.createElement('div');
      playerCard.className = 'player-card';
      playerCard.id = player.id;
      playerCard.dataset.player = JSON.stringify(player);
      
      playerCard.innerHTML = `
        <span>${player.name} : ${player.ranking || 'N/A'}</span>
        <span class="remove-player">×</span>
      `;
      
      const removeBtn = playerCard.querySelector('.remove-player');
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        this.confirmRemovePlayer(player.id, player.name);
      };
      
      playersList.appendChild(playerCard);
    });
  }
  
  async confirmRemovePlayer(playerId, playerName) {
    const result = await this.showAlert({
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
        await tournamentService.updateTournamentPlayers(
          this.selectedTournamentId,
          this.tournamentPlayers
        );
        
        // Update UI
        this.renderPlayersList();
        
        this.showAlert({
          title: 'Removed!',
          text: `${playerName} has been removed.`,
          icon: 'success',
          timer: 1500
        });
      } catch (error) {
        console.error('Error removing player:', error);
        this.showAlert({
          title: 'Error',
          text: `Could not remove ${playerName}. Please try again.`,
          icon: 'error'
        });
      }
    }
  }
  
  showLoading(message) {
    // Use SweetAlert2 if available, otherwise console
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
  
  hideLoading() {
    try {
      Swal.close();
    } catch (e) {
      // Ignore errors
    }
  }
  
  showAlert(options) {
    // Use SweetAlert2 if available, otherwise console and confirm
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
  
  // Cleanup listeners when page unloads
  cleanup() {
    this.unsubscribeFunctions.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
  }
}

export default TournamentManagementController;