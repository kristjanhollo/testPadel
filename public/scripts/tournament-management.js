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
      
      this.showGroupAssignmentsSection();
      this.initializeGroupAssignments();
      this.initializeGroupDragAndDrop();
      
      // Kontrolli, kas bracket eksisteerib ja taasta grupid sellest
      if (this.tournamentData && this.tournamentData.format === 'Americano') {
        const americanoBracketData = await firebaseService.getTournamentBracketAmericano(this.selectedTournamentId);
        if (americanoBracketData) {
          this.restoreGroupsFromBracket(americanoBracketData);
        }
      } else {
        const bracketData = await firebaseService.getTournamentBracket(this.selectedTournamentId);
        if (bracketData) {
          this.restoreGroupsFromBracket(bracketData);
        }
      }
      
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
  initializeQuickAdd() {
    const quickAddBtn = document.getElementById('quickAddButton');
    const modal = document.getElementById('quickAddModal');
    const closeButtons = modal.querySelectorAll('.close-modal, .close-btn');
    const form = document.getElementById('quickAddForm');
    
    // Show modal when Quick Add button is clicked
    quickAddBtn.addEventListener('click', () => {
      modal.style.display = 'block';
    });
    
    // Close modal when close button or outside is clicked
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modal.style.display = 'none';
        form.reset();
        document.getElementById('quickAddStatus').className = 'status-message';
        document.getElementById('quickAddStatus').textContent = '';
      });
    });
    
    // Close modal when clicking outside
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
      // Get all players to search by name
      const allPlayers = this.registeredPlayers;
      
      // Track results
      const results = {
        added: [],
        notFound: [],
        alreadyInTournament: []
      };
      
      // Process each name
      names.forEach(name => {
        // Find player in database (case insensitive)
        const foundPlayer = allPlayers.find(p => 
          p.name.toLowerCase() === name.toLowerCase());
        
        if (!foundPlayer) {
          results.notFound.push(name);
          return;
        }
        
        // Check if player is already in tournament
        const alreadyInTournament = this.tournamentPlayers.some(p => p.id === foundPlayer.id);
        
        if (alreadyInTournament) {
          results.alreadyInTournament.push(name);
          return;
        }
        
        // Add player to tournament
        results.added.push(foundPlayer);
      });
      
      // Add found players to tournament
      if (results.added.length > 0) {
        this.tournamentPlayers = [...this.tournamentPlayers, ...results.added];
        
        // Update in Firebase
        await firebaseService.updateTournamentPlayers(
          this.selectedTournamentId,
          this.tournamentPlayers
        );
        
        // Refresh player list
        this.initializePlayers();
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

restoreCourtAssignmentsFromBracket(bracketData) {
  // Clear any existing assignments
  this.assignedPlayers.clear();
  
  // Loop through courts in the bracket
  bracketData.courts.forEach((court, courtIndex) => {
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

restoreAmericanoAssignmentsFromBracket(bracketData) {
  // Clear any existing assignments
  this.assignedPlayers.clear();
  
  // Get first round matches
  const firstRound = bracketData.rounds[0];
  if (!firstRound || !firstRound.matches || firstRound.matches.length === 0) {
    return;
  }
  
  // Group matches by their group color
  const groupColors = ['green', 'blue', 'yellow', 'pink'];
  
  groupColors.forEach((color, courtIndex) => {
    // Find match for this group
    const match = firstRound.matches.find(m => m.groupColor === color);
    if (!match) return;
    
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
  });
}

async loadPlayers() {
  try {
    // Get all registered players
    this.registeredPlayers = await firebaseService.getAllPlayers();
    
    // Get tournament players
    this.tournamentPlayers = await firebaseService.getTournamentPlayers(
      this.selectedTournamentId
    );
    
    // Initialize players in the UI
    this.initializePlayers();
    
    // Check if there's already a bracket for this tournament
    let bracketExists = false;
    
    if (this.tournamentData && this.tournamentData.format === 'Americano') {
      // For Americano format
      const americanoBracketData = await firebaseService.getTournamentBracketAmericano(this.selectedTournamentId);
      
      if (americanoBracketData && americanoBracketData.rounds && americanoBracketData.rounds.length > 0 && 
          americanoBracketData.rounds[0].matches && americanoBracketData.rounds[0].matches.length > 0) {
        // If bracket exists, restore assignments from it
        this.restoreAmericanoAssignmentsFromBracket(americanoBracketData);
        bracketExists = true;
      }
    } else {
      // For other formats (Mexicano)
      const bracketData = await firebaseService.getTournamentBracket(this.selectedTournamentId);
      
      if (bracketData && bracketData.courts && bracketData.courts.length > 0) {
        // If bracket exists, restore court assignments from it
        this.restoreCourtAssignmentsFromBracket(bracketData);
        bracketExists = true;
      }
    }
    
    // Only auto-assign if no bracket exists
    if (!bracketExists && IsTest !== true) {
      this.autoAssignTopPlayers();
    }
    
    // For testing purposes only - handle test mode separately
    /*if (IsTest === true && this.tournamentPlayers.length === 0) {
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
      
      // Auto-assign for test mode
      this.autoAssignTopPlayers();
    }*/
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

    // Check if we have Americano format and players have group info
    if (this.tournamentData && this.tournamentData.format === 'Americano') {
      // Group players by their group
      const groupedPlayers = {
        green: [],
        blue: [],
        yellow: [],
        pink: []
      };
      
      // First, try to use existing group info
      this.tournamentPlayers.forEach(player => {
        if (player.group && groupedPlayers[player.group]) {
          groupedPlayers[player.group].push(player);
        }
      });
      
      // If any group is empty, assign players by rating
      const hasEmptyGroups = Object.values(groupedPlayers).some(group => group.length === 0);
      
      if (hasEmptyGroups) {
        // Reset groups
        groupedPlayers.green = [];
        groupedPlayers.blue = [];
        groupedPlayers.yellow = [];
        groupedPlayers.pink = [];
        
        // Sort players by rating
        const sortedPlayers = [...this.tournamentPlayers].sort((a, b) => b.ranking - a.ranking);
        
        // Distribute players to groups
        const groupSize = Math.ceil(sortedPlayers.length / 4);
        
        sortedPlayers.forEach((player, index) => {
          if (index < groupSize) {
            groupedPlayers.green.push(player);
            player.group = 'green';
          } else if (index < groupSize * 2) {
            groupedPlayers.blue.push(player);
            player.group = 'blue';
          } else if (index < groupSize * 3) {
            groupedPlayers.yellow.push(player);
            player.group = 'yellow';
          } else {
            groupedPlayers.pink.push(player);
            player.group = 'pink';
          }
        });
      }
      
      // Assign players to courts based on their groups
      const groupColors = ['green', 'blue', 'yellow', 'pink'];
      
      groupColors.forEach((color, courtIndex) => {
        const players = groupedPlayers[color];
        
        // Sort players by rating within each group
        players.sort((a, b) => b.ranking - a.ranking);
        
        // Assign players to slots according to Americano format
        // For Round 1: 1&4 vs 2&3
        if (players.length >= 4) {
          // Team 1: Player 1 (highest rating)
          this.assignPlayerToSlot(players[0], `court-${courtIndex + 1}`, 1, 1);
          
          // Team 1: Player 4 (lowest rating of the four)
          this.assignPlayerToSlot(players[3], `court-${courtIndex + 1}`, 1, 2);
          
          // Team 2: Player 2 (second highest rating)
          this.assignPlayerToSlot(players[1], `court-${courtIndex + 1}`, 2, 1);
          
          // Team 2: Player 3 (third highest rating)
          this.assignPlayerToSlot(players[2], `court-${courtIndex + 1}`, 2, 2);
        }
      });
    } else {
      // For non-Americano formats, use the original logic
      const topPlayers = [...this.tournamentPlayers]
        .sort((a, b) => b.ranking - a.ranking)
        .slice(0, 16);

      topPlayers.forEach((player, index) => {
        const courtIndex = Math.floor(index / 4);
        const team = index % 4 === 0 || index % 4 === 3 ? 1 : 2;
        const position = index % 2 === 0 ? 1 : 2;
        
        this.assignPlayerToSlot(player, `court-${courtIndex + 1}`, team, position);
      });
    }
  }
  
  assignPlayerToSlot(player, courtId, team, position) {
    const slot = document.querySelector(
      `.player-slot[data-court="${courtId}"][data-team="${team}"][data-position="${position}"]`
    );

    if (slot) {
      slot.innerHTML = '';
      const playerCard = this.createPlayerCard(player, true);
      slot.appendChild(playerCard);
      slot.classList.add('filled');
      this.assignedPlayers.add(player.id);
      this.updatePlayerCardState(player.id, true);
    }
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
      const autoAssignBtn = document.getElementById('autoAssignPlayers');
      const saveGroupsBtn = document.getElementById('saveGroups'); // LISA SEE RIDA
      
      setFirstRoundBtn.addEventListener('click', () => this.createFirstRound());
      resetBtn.addEventListener('click', () => this.resetAssignments());
      if (saveGroupsBtn) {
        saveGroupsBtn.addEventListener('click', () => this.saveGroupAssignments());
      }

    if (autoAssignBtn) {
      autoAssignBtn.addEventListener('click', () => {
        Swal.fire({
          title: 'Auto Assign Players',
          text: 'This will assign all players to courts based on their ratings. Continue?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, assign them',
          cancelButtonText: 'Cancel'
        }).then((result) => {
          if (result.isConfirmed) {
            this.autoAssignTopPlayers();
            Swal.fire(
              'Players Assigned!',
              'Players have been automatically assigned to courts based on ratings',
              'success'
            );
          }
        });
      });
    }
  }

  async createFirstRound() {
    try {
        // Get and sort players by ranking for each group
        const [greenGroupPlayers, blueGroupPlayers, yellowGroupPlayers, pinkGroupPlayers] = 
            await Promise.all([
                this.getGroupPlayers('green'),
                this.getGroupPlayers('blue'),
                this.getGroupPlayers('yellow'),
                this.getGroupPlayers('pink')
            ]);

        // Sort players by ranking in each group
        const sortByRanking = players => players.sort((a, b) => b.ranking - a.ranking);
        
        const sortedGroups = {
            green: sortByRanking(greenGroupPlayers),
            blue: sortByRanking(blueGroupPlayers),
            yellow: sortByRanking(yellowGroupPlayers),
            pink: sortByRanking(pinkGroupPlayers)
        };

        let matches = [];

        if (this.tournamentData.format === 'Americano') {
            // Create matches between groups (Green vs Blue, Yellow vs Pink)
            matches = [
                ...this.createMatchesBetweenGroups(sortedGroups.green, sortedGroups.blue),
                ...this.createMatchesBetweenGroups(sortedGroups.yellow, sortedGroups.pink)
            ];
        } else {
            // Create matches within each group for Mexicano format
            matches = [
                ...this.createMatchesWithinGroup(sortedGroups.green),
                ...this.createMatchesWithinGroup(sortedGroups.blue),
                ...this.createMatchesWithinGroup(sortedGroups.yellow),
                ...this.createMatchesWithinGroup(sortedGroups.pink)
            ];
        }

        // Save brackets to database
        await this.saveBracket(matches, 1);
        
        return matches;

    } catch (error) {
        console.error('Error in createFirstRound:', error);
        throw new Error(`Failed to create first round: ${error.message}`);
    }
}
/**
 * Taastab mängijate gruppide info bracketi andmetest
 * @param {Object} bracketData - Bracketi andmed
 */
restoreGroupsFromBracket(bracketData) {
  // Tühjenda kõik grupid
  document.getElementById('greenGroupPlayers').innerHTML = '';
  document.getElementById('blueGroupPlayers').innerHTML = '';
  document.getElementById('yellowGroupPlayers').innerHTML = '';
  document.getElementById('pinkGroupPlayers').innerHTML = '';
  
  // Kui tegu on Mexicano formaadiga
  if (this.tournamentData.format === 'Mexicano') {
    // Taastame grupid kourtide järgi
    bracketData.courts.forEach((court, index) => {
      if (!court.matches || court.matches.length === 0) return;
      
      const match = court.matches[0]; // Esimene mäng kourtil
      const allPlayers = [...(match.team1 || []), ...(match.team2 || [])];
      const groupColor = this.getGroupColorForCourtIndex(index);
      
      // Lisa mängijad vastavasse gruppi
      allPlayers.forEach(player => {
        if (player && player.id) {
          // Lisa grupi info mängijale
          player.group = groupColor;
          
          // Lisa mängija gruppi
          const playerCard = this.createPlayerInGroup(player);
          document.getElementById(`${groupColor}GroupPlayers`).appendChild(playerCard);
        }
      });
    });
  } 
  // Kui tegu on Americano formaadiga
  else if (bracketData.rounds && bracketData.rounds.length > 0) {
    const firstRound = bracketData.rounds[0];
    
    // Grupeeri mängijad värvi järgi
    const playersByGroup = {
      green: [],
      blue: [],
      yellow: [],
      pink: []
    };
    
    // Kogu mängijad gruppide järgi
    firstRound.matches.forEach(match => {
      if (match.groupColor) {
        const allPlayers = [...(match.team1 || []), ...(match.team2 || [])];
        allPlayers.forEach(player => {
          if (player && player.id) {
            player.group = match.groupColor;
            playersByGroup[match.groupColor].push(player);
          }
        });
      }
    });
    
    // Lisa mängijad grupikontainebritesse
    Object.keys(playersByGroup).forEach(color => {
      playersByGroup[color].forEach(player => {
        const playerCard = this.createPlayerInGroup(player);
        document.getElementById(`${color}GroupPlayers`).appendChild(playerCard);
      });
    });
  }
}

/**
 * Abifunktsioon, mis tagastab grupi värvi courtiindeksi järgi
 * @param {number} courtIndex - Courtiindeks
 * @returns {string} Grupi värv
 */
getGroupColorForCourtIndex(courtIndex) {
  const colors = ['green', 'blue', 'yellow', 'pink'];
  return colors[Math.min(courtIndex, colors.length - 1)];
}

getGroupPlayers(groupColor) {
  const players = [];
  document.querySelectorAll(`#${groupColor}GroupPlayers .player-in-group`).forEach(card => {
      try {
          const player = JSON.parse(card.dataset.player);
          players.push(player);
      } catch (error) {
          console.warn('Error parsing player data:', error);
      }
  });
  return players;
}
/**
 * Salvestab mängijate grupikuuluvuse andmebaasi
 */
async saveGroups() {
  try {
    // Näita laadimisanimatsiooni
    Swal.fire({
      title: 'Saving group assignments...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // Kogu gruppide info
    const groupAssignments = {
      green: this.getGroupPlayers('green'),
      blue: this.getGroupPlayers('blue'),
      yellow: this.getGroupPlayers('yellow'),
      pink: this.getGroupPlayers('pink')
    };
    
    // Uuenda turniirimängijate grupikuuluvust
    this.tournamentPlayers = this.tournamentPlayers.map(player => {
      // Otsi mängija kõigist gruppidest
      for (const [color, players] of Object.entries(groupAssignments)) {
        const groupPlayer = players.find(p => p.id === player.id);
        if (groupPlayer) {
          player.group = color;
          break;
        }
      }
      return player;
    });
    
    // Salvesta andmebaasi
    await firebaseService.updateTournamentPlayers(
      this.selectedTournamentId,
      this.tournamentPlayers
    );
    
    Swal.close();
    
    // Määra õige bracketi URL sõltuvalt formaadist
    const bracketUrl = this.tournamentData.format === 'Americano' 
      ? 'tournament-bracket-Americano.html' 
      : 'tournament-bracket-M.html';
    
    // Küsi, kas kasutaja soovib liikuda bracketi vaatele
    const result = await Swal.fire({
      title: 'Groups Saved!',
      text: 'Do you want to go to the tournament bracket now?',
      icon: 'success',
      showCancelButton: true,
      confirmButtonText: 'Yes, go to bracket',
      cancelButtonText: 'No, stay here'
    });
    
    if (result.isConfirmed) {
      window.location.href = bracketUrl;
    }
    
  } catch (error) {
    Swal.close();
    console.error('Error saving groups:', error);
    Swal.fire('Error', 'Failed to save group assignments. Please try again.', 'error');
  }
}


createMatchesBetweenGroups(group1, group2) {
    return group1.map((player1, index) => ({
        player1: player1,
        player2: group2[index],
        round: 1,
        score: { set1: '', set2: '', set3: '' },
        timestamp: new Date()
    }));
}

createMatchesWithinGroup(group) {
    const matches = [];
    for (let i = 0; i < group.length - 1; i++) {
        for (let j = i + 1; j < group.length; j++) {
            matches.push({
                player1: group[i],
                player2: group[j],
                round: 1,
                score: { set1: '', set2: '', set3: '' },
                timestamp: new Date()
            });
        }
    }
    return matches;
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
  /**
 * Lisab auto-assign nupud grupikontaineritesse
 */
addGroupAutoAssignButtons() {
  const colors = ['green', 'blue', 'yellow', 'pink'];
  
  colors.forEach(color => {
    const container = document.getElementById(`${color}GroupPlayers`);
    if (!container) return;
    
    // Kontrolli, kas nupp juba eksisteerib
    if (container.querySelector('.group-auto-assign-btn')) return;
    
    // Loo nupp
    const btn = document.createElement('button');
    btn.className = 'group-auto-assign-btn';
    btn.textContent = 'Auto Assign';
    btn.onclick = () => this.autoAssignPlayersToGroup(color);
    
    // Lisa nupp konteineri algusesse
    container.parentNode.insertBefore(btn, container);
  });
}

/**
 * Paigutab mängijad automaatselt kindlasse gruppi
 * @param {string} groupColor - Grupi värv
 */
autoAssignPlayersToGroup(groupColor) {
  // Kontrolli, mitu mängijat gruppi mahub
  const targetGroupSize = 4; // Võib muuta vastavalt vajadusele
  
  // Sorteeri turniirimängijad reitingu järgi
  const sortedPlayers = [...this.tournamentPlayers].sort((a, b) => 
    (b.ranking || 0) - (a.ranking || 0)
  );
  
  // Määra mängijate vahemik reitingu järgi
  let playersForGroup = [];
  
  switch(groupColor) {
    case 'green': // Top mängijad
      playersForGroup = sortedPlayers.slice(0, targetGroupSize);
      break;
    case 'blue': // 2. tase
      playersForGroup = sortedPlayers.slice(targetGroupSize, targetGroupSize * 2);
      break;
    case 'yellow': // 3. tase
      playersForGroup = sortedPlayers.slice(targetGroupSize * 2, targetGroupSize * 3);
      break;
    case 'pink': // 4. tase
      playersForGroup = sortedPlayers.slice(targetGroupSize * 3, targetGroupSize * 4);
      break;
  }
  
  // Tühjenda grupp
  const groupContainer = document.getElementById(`${groupColor}GroupPlayers`);
  groupContainer.innerHTML = '';
  
  // Lisa mängijad gruppi
  playersForGroup.forEach(player => {
    player.group = groupColor; // Määra mängija grupp
    const playerCard = this.createPlayerInGroup(player);
    groupContainer.appendChild(playerCard);
  });
  
  // Näita teadet
  Swal.fire({
    title: 'Group Updated',
    text: `Players have been automatically assigned to ${groupColor} group based on ratings.`,
    icon: 'success',
    timer: 2000,
    showConfirmButton: false
  });
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
  
  // Group Assignments Section Functions
  showGroupAssignmentsSection() {
    const groupAssignmentsSection = document.getElementById('groupAssignmentsSection');
    if (groupAssignmentsSection) {
      groupAssignmentsSection.style.display = 'block';
      
      // Initialize controls
      const saveGroupsBtn = document.getElementById('saveGroups');
      const resetGroupsBtn = document.getElementById('resetGroups');
      
      if (saveGroupsBtn) {
        saveGroupsBtn.addEventListener('click', () => this.saveGroups());
      }
      
      if (resetGroupsBtn) {
        resetGroupsBtn.addEventListener('click', () => this.resetGroups());
      }
    }
  }
  
  initializeGroupAssignments() {
    // Check if players have groupOrder property - this indicates groups were manually arranged
    const hasGroupOrder = this.tournamentPlayers.some(p => typeof p.groupOrder === 'number');
    
    // Clear group containers
    document.getElementById('greenGroupPlayers').innerHTML = '';
    document.getElementById('blueGroupPlayers').innerHTML = '';
    document.getElementById('yellowGroupPlayers').innerHTML = '';
    document.getElementById('pinkGroupPlayers').innerHTML = '';
    
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
      console.log("Some groups are empty, assigning players by rating");
      
      // Reset groups
      groupedPlayers.green = [];
      groupedPlayers.blue = [];
      groupedPlayers.yellow = [];
      groupedPlayers.pink = [];
      
      // Sort players by rating
      const sortedPlayers = [...this.tournamentPlayers].sort((a, b) => b.ranking - a.ranking);
      
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
    Object.keys(groupedPlayers).forEach(color => {
      if (hasGroupOrder) {
        // Sort by groupOrder if available
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
    groupedPlayers.green.forEach(player => {
      const playerCard = this.createPlayerInGroup(player);
      document.getElementById('greenGroupPlayers').appendChild(playerCard);
    });
    
    groupedPlayers.blue.forEach(player => {
      const playerCard = this.createPlayerInGroup(player);
      document.getElementById('blueGroupPlayers').appendChild(playerCard);
    });
    
    groupedPlayers.yellow.forEach(player => {
      const playerCard = this.createPlayerInGroup(player);
      document.getElementById('yellowGroupPlayers').appendChild(playerCard);
    });
    
    groupedPlayers.pink.forEach(player => {
      const playerCard = this.createPlayerInGroup(player);
      document.getElementById('pinkGroupPlayers').appendChild(playerCard);
    });
    
    console.log("Groups initialized:", {
      green: groupedPlayers.green.map(p => `${p.name} (${p.groupOrder !== undefined ? 'order:' + p.groupOrder : 'rating:' + p.ranking})`),
      blue: groupedPlayers.blue.map(p => `${p.name} (${p.groupOrder !== undefined ? 'order:' + p.groupOrder : 'rating:' + p.ranking})`),
      yellow: groupedPlayers.yellow.map(p => `${p.name} (${p.groupOrder !== undefined ? 'order:' + p.groupOrder : 'rating:' + p.ranking})`),
      pink: groupedPlayers.pink.map(p => `${p.name} (${p.groupOrder !== undefined ? 'order:' + p.groupOrder : 'rating:' + p.ranking})`)
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
    const groupContainers = [
      document.getElementById('greenGroupPlayers'),
      document.getElementById('blueGroupPlayers'),
      document.getElementById('yellowGroupPlayers'),
      document.getElementById('pinkGroupPlayers')
    ];
    
    groupContainers.forEach(container => {
      if (container) {
        this.setupGroupDropZone(container);
      }
    });
  }
  
  setupGroupDropZone(element) {
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      element.classList.add('drag-over');
      
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
          element.appendChild(newCard);
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
  
  handleGroupDrop(e, dropZone) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    try {
      const playerData = JSON.parse(e.dataTransfer.getData('application/json'));
      const existingCard = document.getElementById(`group-${playerData.id}`);
      
      if (existingCard) {
        existingCard.remove();
      }
      
      // Determine which group the player is being dropped into
      let newGroup;
      if (dropZone.id === 'greenGroupPlayers') {
        newGroup = 'green';
      } else if (dropZone.id === 'blueGroupPlayers') {
        newGroup = 'blue';
      } else if (dropZone.id === 'yellowGroupPlayers') {
        newGroup = 'yellow';
      } else if (dropZone.id === 'pinkGroupPlayers') {
        newGroup = 'pink';
      }
      
      // Update player's group
      playerData.group = newGroup;
      
      // Create new player card in the group
      const playerCard = this.createPlayerInGroup(playerData);
      dropZone.appendChild(playerCard);
      
    } catch (error) {
      console.error('Error handling group drop:', error);
    }
  }
  
  async saveGroups() {
    try {
      // Show loading
      Swal.fire({
        title: 'Saving groups...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Collect all players from groups
      const groupedPlayers = [];
      
      // Green group
      document.querySelectorAll('#greenGroupPlayers .player-in-group').forEach((card, index) => {
        try {
          const player = JSON.parse(card.dataset.player);
          player.group = 'green';
          player.groupOrder = index; // Save the order within the group
          groupedPlayers.push(player);
        } catch (error) {
          console.warn('Error parsing player data:', error);
        }
      });
      
      // Blue group
      document.querySelectorAll('#blueGroupPlayers .player-in-group').forEach((card, index) => {
        try {
          const player = JSON.parse(card.dataset.player);
          player.group = 'blue';
          player.groupOrder = index; // Save the order within the group
          groupedPlayers.push(player);
        } catch (error) {
          console.warn('Error parsing player data:', error);
        }
      });
      
      // Yellow group
      document.querySelectorAll('#yellowGroupPlayers .player-in-group').forEach((card, index) => {
        try {
          const player = JSON.parse(card.dataset.player);
          player.group = 'yellow';
          player.groupOrder = index; // Save the order within the group
          groupedPlayers.push(player);
        } catch (error) {
          console.warn('Error parsing player data:', error);
        }
      });
      
      // Pink group
      document.querySelectorAll('#pinkGroupPlayers .player-in-group').forEach((card, index) => {
        try {
          const player = JSON.parse(card.dataset.player);
          player.group = 'pink';
          player.groupOrder = index; // Save the order within the group
          groupedPlayers.push(player);
        } catch (error) {
          console.warn('Error parsing player data:', error);
        }
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
      await firebaseService.updateTournamentPlayers(
        this.selectedTournamentId,
        this.tournamentPlayers
      );
      
      Swal.close();
      
      // Ask if user wants to go directly to the bracket view
      const result = await Swal.fire({
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
      Swal.close();
      console.error('Error saving groups:', error);
      Swal.fire('Error', 'Failed to save group assignments. Please try again.', 'error');
    }
  }
  
  resetGroups() {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will reset all group assignments!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset it!',
      cancelButtonText: 'No, keep it',
    }).then((result) => {
      if (result.isConfirmed) {
        this.initializeGroupAssignments();
        Swal.fire('Reset!', 'Group assignments have been reset.', 'success');
      }
    });
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
