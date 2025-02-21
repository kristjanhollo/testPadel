// Constants
const COURT_ORDER = ['Padel Arenas', 'Coolbet', 'Lux Express', '3p Logistics'];

class TournamentManager {
  constructor() {
    this.assignedPlayers = new Set();
    this.tournamentPlayers = [];
    this.registeredPlayers = [];
    this.selectedTournamentId = localStorage.getItem('selectedTournament');
    this.tournamentData = null;

    this.init();
  }

  async init() {
    this.tournamentData = await this.fetchTournamentData();
    if (!this.tournamentData) return;

    this.initializeCourts();
    await this.loadPlayers();
    this.initializeControls();
    this.initializeDragAndDrop();
    this.initializeSearchFunctionality();
    this.updateTournamentDisplay();
  }

  async fetchTournamentData() {
    try {
      const response = await fetch(
        `${window.config.API_URL}/tournaments/${this.selectedTournamentId}`
      );
      if (!response.ok) throw new Error('Failed to fetch tournament data');
      return await response.json();
    } catch (error) {
      console.error('Error fetching tournament data:', error);
      return null;
    }
  }

  updateTournamentDisplay() {
    document.getElementById('tournamentName').textContent = this.tournamentData.name;
    document.getElementById('tournamentDate').textContent = `Date: ${this.tournamentData.start_date}`;
    document.getElementById('tournamentLocation').textContent = `Location: ${this.tournamentData.location}`;
    document.getElementById('tournamentFormat').textContent = `Format: ${this.tournamentData.format}`;
  }

  async loadPlayers() {
    try {
      const response = await fetch(`${window.config.API_URL}/players`);
      if (!response.ok) throw new Error('Failed to load players');
      
      this.tournamentPlayers = await response.json();
      if (window.IsTest) {
        this.registeredPlayers = this.tournamentPlayers.slice(0, 16);
      }
      
      this.initializePlayers();
      this.autoAssignTopPlayers();
    } catch (error) {
      console.error('Error loading players:', error);
    }
  }

  initializeSearchFunctionality() {
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('resultsContainer');

    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      resultsContainer.innerHTML = '';

      if (query) {
        const filteredPlayers = this.tournamentPlayers.filter(player => 
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

  addToSelected(player) {
    if (!this.registeredPlayers.includes(player)) {
      this.registeredPlayers.push(player);
      document.getElementById('searchInput').value = '';
      document.getElementById('resultsContainer').innerHTML = '';
      this.autoAssignTopPlayers();
    }
  }

  initializePlayers() {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';
    this.registeredPlayers.forEach(player => {
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
    if (window.IsTest) {
      this.registeredPlayers = this.tournamentPlayers.slice(0, 16);
    }

    const topPlayers = [...this.registeredPlayers]
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

    COURT_ORDER.forEach((courtName, index) => {
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

    const bracketData = {
      tournamentId: this.selectedTournamentId,
      format: this.tournamentData.format,
      currentRound: 1,
      courts: COURT_ORDER.map(courtName => ({
        name: courtName,
        matches: [],
      })),
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

    localStorage.setItem(
      `tournament_${this.selectedTournamentId}_bracket`,
      JSON.stringify(bracketData)
    );

    localStorage.setItem(
      `tournament_${this.selectedTournamentId}_players`,
      JSON.stringify(this.tournamentPlayers.slice(0, 16))
    );

    window.location.href = this.tournamentData.format === 'Americano' 
      ? 'tournament-bracket.html' 
      : 'tournament-bracket-M.html';
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

  removePlayer(playerId, playerName) {
    Swal.fire({
      title: 'Remove Player?',
      text: `Are you sure you want to remove ${playerName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {

        this.registeredPlayers = this.registeredPlayers.filter(p => p.id !== playerId);
        
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
      }
    });
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
      alert('This player is already assigned to a team');
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
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new TournamentManager();
});
