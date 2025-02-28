
import firebaseService from './services/firebase-service';

// Check if SweetAlert is available globally, otherwise use basic alerts
const Swal = window.Swal || {
  fire: (options) => {
    if (options.icon === 'error' || options.icon === 'warning') {
      alert(options.title + '\n' + (options.text || ''));
      return Promise.reject();
    } else if (options.title && options.text) {
      alert(options.title + '\n' + options.text);
    } else {
      alert(options.title || options.text);
    }
    
    // Mock SweetAlert's returned Promise API
    return {
      then: (callback) => {
        if (options.showCancelButton) {
          if (confirm('Confirm this action?')) {
            callback({ isConfirmed: true });
          }
        } else {
          callback({ isConfirmed: true });
        }
        return { catch: () => {} };
      }
    };
  },
  close: () => {},
  showLoading: () => {}
};

/**
 * Tournament Bracket Americano class
 * Manages the Americano format tournament bracket display and interactions
 */
class TournamentBracketAmericano {
  constructor() {
    // DOM Elements
    this.timerDisplay = document.getElementById('gameTimer');
    this.startTimerBtn = document.getElementById('startTimer');
    
    this.tournamentNameElement = document.getElementById('tournamentName');
    this.round1Courts = document.getElementById('round1Courts');
    this.round2Courts = document.getElementById('round2Courts');
    this.round3Courts = document.getElementById('round3Courts');
    this.round4Courts = document.getElementById('round4Courts');
    
    this.greenGroupPlayers = document.getElementById('greenGroupPlayers');
    this.blueGroupPlayers = document.getElementById('blueGroupPlayers');
    this.yellowGroupPlayers = document.getElementById('yellowGroupPlayers');
    this.pinkGroupPlayers = document.getElementById('pinkGroupPlayers');
    
    // Templates
    this.courtCardTemplate = document.getElementById('courtCardTemplate');
    this.playerRankingTemplate = document.getElementById('playerRankingTemplate');
    
    // State
    this.selectedTournamentId = localStorage.getItem('selectedTournament');
    this.tournament = null;
    this.players = [];
    this.bracketData = null;
    this.currentRound = 1;
    this.courtColors = {
      'Padel Arenas': 'green',
      'Coolbet': 'blue',
      'Lux Express': 'yellow',
      '3p Logistics': 'pink',
      'Mix Round': 'mix'
    };
    this.unsubscribeFunctions = [];
    
    // Initialize game timer
    this.gameTimer = this.createGameTimer();
    
    // Initialize the bracket
    this.init();
  }
  
  async init() {
    if (!firebaseService) {
      console.error('Firebase service is not loaded! Make sure firebase-service.js is included before this script.');
      return;
    }
    
    try {
      console.log('Initializing tournament bracket...');
      
      // Show loading indication - either with Swal or console
      try {
        Swal.fire({
          title: 'Loading tournament data...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
      } catch (e) {
        console.log('Loading tournament data...');
      }
      
      // Set up listeners for data changes
      this.setupDataListeners();
      
      // Wait for initial data
      await this.waitForData();
      
      try { Swal.close(); } catch (e) {}
      
      if (this.tournament && this.tournamentNameElement) {
        this.tournamentNameElement.textContent = this.tournament.name + ' - Americano';
      }
      
      // Initialize bracket if needed
      if (!this.bracketData) {
        await this.initializeBracket();
      } else {
        this.currentRound = this.bracketData.currentRound || 1;
        
        // Check if all rounds have matches
        let needToCreateRounds = false;
        if (this.bracketData.rounds) {
          for (const round of this.bracketData.rounds) {
            if (!round.matches || round.matches.length === 0) {
              needToCreateRounds = true;
              break;
            }
          }
        } else {
          needToCreateRounds = true;
        }
        
        // Create rounds if needed
        if (needToCreateRounds) {
          // Tühjenda olemasolevad mängud
          this.bracketData.rounds.forEach(round => round.matches = []);
          
          // Group players by their group color
          const groupedPlayers = {
            green: this.players.filter(p => this.determineInitialGroup(p) === 'green'),
            blue: this.players.filter(p => this.determineInitialGroup(p) === 'blue'),
            yellow: this.players.filter(p => this.determineInitialGroup(p) === 'yellow'),
            pink: this.players.filter(p => this.determineInitialGroup(p) === 'pink')
          };
          
          // Create all rounds
          this.createAllRounds(this.bracketData);
          
          // Save updated bracket data
          await this.saveBracketData();
        }
        
        this.renderAllRounds();
        this.renderStandings();
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      console.log('Tournament bracket initialized successfully');
    } catch (error) {
      try { Swal.close(); } catch (e) {}
      
      console.error('Error initializing tournament bracket:', error);
      
      try {
        Swal.fire({
          title: 'Error',
          text: 'Failed to load tournament data. Please try again later.',
          icon: 'error',
          confirmButtonText: 'Go Back to List',
        }).then(() => {
          window.location.href = 'tournament-list.html';
        });
      } catch (e) {
        alert('Error: Failed to load tournament data.');
        window.location.href = 'tournament-list.html';
      }
    }
  }
  
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
            this.tournament = tournamentData;
            
            // Update tournament name if element exists
            if (this.tournamentNameElement && tournamentData.name) {
              this.tournamentNameElement.textContent = tournamentData.name + ' - Americano';
            }
          } else {
            console.error('Tournament not found');
          }
        }
      );
      
      // Listen for bracket data changes - USING AMERICANO SPECIFIC METHOD
      const unsubscribeBracket = firebaseService.listenToTournamentBracketAmericano(
        this.selectedTournamentId,
        (bracketData) => {
          if (bracketData) {
            console.log('Americano bracket data received. Current round:', bracketData.currentRound);
            this.bracketData = bracketData;
            this.currentRound = bracketData.currentRound || 1;
            
            // Only render if the bracket data has the expected structure
            if (bracketData.rounds) {
              this.renderAllRounds();
            } else {
              console.warn('Bracket data missing rounds property');
            }
            
            if (bracketData.standings) {
              this.renderStandings();
            } else {
              console.warn('Bracket data missing standings property');
            }
          } else {
            console.log('No Americano bracket data found, will need to initialize');
          }
        }
      );
      
      // Listen for tournament players changes
      const unsubscribePlayers = firebaseService.listenToTournamentPlayers(
        this.selectedTournamentId,
        (players) => {
          if (Array.isArray(players)) {
            console.log('Player data received. Count:', players.length);
            this.players = players;
          } else {
            console.warn('Received invalid players data:', players);
            this.players = [];
          }
        }
      );
      
      this.unsubscribeFunctions.push(unsubscribeTournament, unsubscribeBracket, unsubscribePlayers);
      console.log('Data listeners set up successfully');
    } catch (error) {
      console.error('Error setting up data listeners:', error);
    }
  }
  
  // Wait for initial data to be loaded
  waitForData() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.tournament && this.players) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Timeout after 15 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(); // Resolve anyway to continue flow
      }, 15000);
    });
  }
  
  setupEventListeners() {
    // Timer controls
    if (this.startTimerBtn) {
      this.startTimerBtn.addEventListener('click', () => {
        if (this.gameTimer.isRunning) {
          this.gameTimer.reset();
        } else {
          this.gameTimer.start();
        }
      });
    }
    
    // Global function for score changes
    window.handleScoreChange = (event) => this.handleScoreChange(event);
  }
  
  handleScoreChange(event) {
    const input = event.target;
    const matchId = input.dataset.matchId;
    const team = input.dataset.team;
    const score = parseInt(input.value, 10);
    
    if (isNaN(score) || score < 0) {
      input.value = '';
      return;
    }
    
    this.updateMatchScore(matchId, team, score);
  }
  
  // Create game timer
  createGameTimer() {
    return {
      time: 20 * 60, // 20 minutes in seconds
      isRunning: false,
      interval: null,
      
      start: () => {
        if (!this.gameTimer.isRunning) {
          this.gameTimer.isRunning = true;
          if (this.startTimerBtn) this.startTimerBtn.textContent = 'Reset Timer';
          
          this.gameTimer.interval = setInterval(() => {
            this.gameTimer.time--;
            this.gameTimer.updateDisplay();
            
            if (this.gameTimer.time <= 0) {
              this.gameTimer.timeUp();
            }
          }, 1000);
        }
      },
      
      reset: () => {
        this.gameTimer.time = 20 * 60;
        this.gameTimer.isRunning = false;
        clearInterval(this.gameTimer.interval);
        if (this.startTimerBtn) this.startTimerBtn.textContent = 'Start Timer';
        this.gameTimer.updateDisplay();
        if (this.timerDisplay) this.timerDisplay.classList.remove('time-up');
      },
      
      updateDisplay: () => {
        if (!this.timerDisplay) return;
        
        const minutes = Math.floor(this.gameTimer.time / 60);
        const seconds = this.gameTimer.time % 60;
        this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      },
      
      timeUp: () => {
        clearInterval(this.gameTimer.interval);
        this.gameTimer.isRunning = false;
        if (this.startTimerBtn) this.startTimerBtn.textContent = 'Start Timer';
        if (this.timerDisplay) this.timerDisplay.classList.add('time-up');
        try {
          Swal.fire({
            title: 'Time\'s Up!',
            text: 'Round time is up! Please enter final scores.',
            icon: 'info'
          });
        } catch (e) {
          alert('Time\'s Up! Please enter final scores.');
        }
      }
    };
  }
  
  // Helper Functions
  getTeamNames(team) {
    return team.map(player => player.name).join(' & ');
  }

  sortPlayersByRating(playersArray) {
    if (!Array.isArray(playersArray)) {
      console.warn('sortPlayersByRating received invalid input:', playersArray);
      return [];
    }
    
    return [...playersArray].sort((a, b) => {
      // Handle missing or invalid rating values
      const ratingA = typeof a?.rating === 'number' ? a.rating : 0;
      const ratingB = typeof b?.rating === 'number' ? b.rating : 0;
      
      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }
      
      // If ratings are equal, sort by name if available
      const nameA = a?.name || '';
      const nameB = b?.name || '';
      return nameA.localeCompare(nameB);
    });
  }

  async initializeBracket() {
    try {
      console.log('Initializing new Americano bracket data...');
      
      // Create player standings only if players exist
      const playerStandings = Array.isArray(this.players) ? 
        this.players.map(player => ({
          id: player.id,
          name: player.name,
          group: this.determineInitialGroup(player),
          points: 0,
          gamesPlayed: 0,
          wins: 0,
          losses: 0
        })) : [];
      
      // Create the bracket data with empty rounds
      const bracketData = {
        format: 'Americano',
        currentRound: 1,
        rounds: [
          { number: 1, completed: false, matches: [] },
          { number: 2, completed: false, matches: [] },
          { number: 3, completed: false, matches: [] },
          { number: 4, completed: false, matches: [] }
        ],
        completedMatches: [],
        standings: playerStandings
      };
      
      // Create matches for all rounds
      this.createAllRounds(bracketData);
      
      console.log('Saving initial Americano bracket data to Firebase...');
      // Save to Firebase using Americano specific method
      await firebaseService.saveTournamentBracketAmericano(this.selectedTournamentId, bracketData);
      
      console.log('Americano bracket data saved successfully');
      this.bracketData = bracketData;
      this.renderAllRounds();
      this.renderStandings();
    } catch (error) {
      console.error('Error initializing Americano bracket:', error);
      try {
        Swal.fire({
          title: 'Error',
          text: 'Failed to initialize Americano bracket. Please try again.',
          icon: 'error'
        });
      } catch (e) {
        alert('Error: Failed to initialize Americano bracket. Please try again.');
      }
    }
  }

  // Create all rounds at once
  createAllRounds(bracketData) {
    // Group players by their group color
    const groupedPlayers = {
      green: this.players.filter(p => this.determineInitialGroup(p) === 'green'),
      blue: this.players.filter(p => this.determineInitialGroup(p) === 'blue'),
      yellow: this.players.filter(p => this.determineInitialGroup(p) === 'yellow'),
      pink: this.players.filter(p => this.determineInitialGroup(p) === 'pink')
    };
    
    console.log("Player group counts:", {
      green: groupedPlayers.green.length,
      blue: groupedPlayers.blue.length,
      yellow: groupedPlayers.yellow.length,
      pink: groupedPlayers.pink.length
    });
    
    // Create Round 1 matches (Americano pattern according to table: 1&4 vs 2&3)
    console.log("Creating Round 1 with Americano pattern: 1&4 vs 2&3");
    this.createRoundWithPattern(bracketData, 1, groupedPlayers, [0, 3], [1, 2]);
    
    // Create Round 2 matches (Americano pattern according to table: 1&2 vs 3&4)
    console.log("Creating Round 2 with Americano pattern: 1&2 vs 3&4");
    this.createRoundWithPattern(bracketData, 2, groupedPlayers, [0, 1], [2, 3]);
    
    // Create Round 3 (mix round) - follows specific rules from the table
    this.createMixRound(bracketData, groupedPlayers);
    
    // Create Round 4 matches (Americano pattern according to table: 1&3 vs 2&4)
    console.log("Creating Round 4 with Americano pattern: 1&3 vs 2&4");
    this.createRoundWithPattern(bracketData, 4, groupedPlayers, [0, 2], [1, 3]);
  }
  
  renderAllRounds() {
    if (!this.bracketData || !this.bracketData.rounds) {
      console.warn('Cannot render rounds: bracketData or rounds is missing');
      return;
    }
    
    // Render each round to its container
    if (this.round1Courts) this.renderRound(1, this.round1Courts);
    if (this.round2Courts) this.renderRound(2, this.round2Courts);
    if (this.round3Courts) this.renderRound(3, this.round3Courts);
    if (this.round4Courts) this.renderRound(4, this.round4Courts);
  }

  renderRound(roundNumber, container) {
    if (!container) return;
    
    container.innerHTML = '';
    
    const roundData = this.bracketData.rounds.find(r => r.number === roundNumber);
    if (!roundData || !roundData.matches) return;
    
    roundData.matches.forEach(match => {
      const courtCard = this.createCourtCard(match);
      container.appendChild(courtCard);
    });
  }

  createCourtCard(match) {
    if (!this.courtCardTemplate) return document.createElement('div');
    
    const template = this.courtCardTemplate.content.cloneNode(true);
    const courtCard = template.querySelector('.court-card');
    
    // Set court color class
    const colorClass = match.groupColor || this.courtColors[match.court] || '';
    courtCard.classList.add(colorClass);
    
    // Set court name in header
    const courtHeader = courtCard.querySelector('.court-header');
    if (courtHeader) courtHeader.textContent = match.court;
    
    // Set team names and scores
    const teamRows = courtCard.querySelectorAll('.team-row');
    if (teamRows.length >= 2) {
      // Team 1
      const team1NameEl = teamRows[0].querySelector('.team-name');
      const team1ScoreEl = teamRows[0].querySelector('.score-input');
      if (team1NameEl) team1NameEl.textContent = this.getTeamNames(match.team1);
      if (team1ScoreEl) {
        team1ScoreEl.value = match.score1 !== null ? match.score1 : '';
        team1ScoreEl.dataset.matchId = match.id;
        team1ScoreEl.dataset.team = 'team1';
        team1ScoreEl.addEventListener('change', window.handleScoreChange);
      }
      
      // Team 2
      const team2NameEl = teamRows[1].querySelector('.team-name');
      const team2ScoreEl = teamRows[1].querySelector('.score-input');
      if (team2NameEl) team2NameEl.textContent = this.getTeamNames(match.team2);
      if (team2ScoreEl) {
        team2ScoreEl.value = match.score2 !== null ? match.score2 : '';
        team2ScoreEl.dataset.matchId = match.id;
        team2ScoreEl.dataset.team = 'team2';
        team2ScoreEl.addEventListener('change', window.handleScoreChange);
      }
    }
    
    return courtCard;
  }
  
  renderStandings() {
    if (!this.bracketData || !this.bracketData.standings) {
      console.warn('Cannot render standings: bracketData or standings is missing');
      return;
    }
    
    // Group players by group color
    const groupedStandings = {
      green: [],
      blue: [],
      yellow: [],
      pink: []
    };
    
    this.bracketData.standings.forEach(standing => {
      if (groupedStandings[standing.group]) {
        groupedStandings[standing.group].push(standing);
      }
    });
    
    // Sort each group by points
    for (const group in groupedStandings) {
      groupedStandings[group].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return 0;
      });
    }
    
    // Render each group
    if (this.greenGroupPlayers) this.renderGroupStandings(groupedStandings.green, this.greenGroupPlayers);
    if (this.blueGroupPlayers) this.renderGroupStandings(groupedStandings.blue, this.blueGroupPlayers);
    if (this.yellowGroupPlayers) this.renderGroupStandings(groupedStandings.yellow, this.yellowGroupPlayers);
    if (this.pinkGroupPlayers) this.renderGroupStandings(groupedStandings.pink, this.pinkGroupPlayers);
  }

  renderGroupStandings(groupStandings, container) {
    if (!container || !this.playerRankingTemplate) return;
    
    container.innerHTML = '';
    
    groupStandings.forEach((standing, index) => {
      const template = this.playerRankingTemplate.content.cloneNode(true);
      const playerRanking = template.querySelector('.player-ranking');
      
      const rankEl = playerRanking.querySelector('.player-rank');
      const nameEl = playerRanking.querySelector('.player-name');
      const pointsEl = playerRanking.querySelector('.player-points');
      
      if (rankEl) rankEl.textContent = `${index + 1}.`;
      if (nameEl) nameEl.textContent = standing.name;
      if (pointsEl) pointsEl.textContent = `${standing.points}p`;
      
      container.appendChild(playerRanking);
    });
  }
  
  determineInitialGroup(player) {
    // Sort all players by rating
    const sortedPlayers = this.sortPlayersByRating(this.players);
    
    // Split into 4 equal groups
    const groupSize = Math.ceil(sortedPlayers.length / 4);
    
    // Find player index in sorted array
    const playerIndex = sortedPlayers.findIndex(p => p.id === player.id);
    
    // Assign group based on index
    if (playerIndex < groupSize) {
      return 'green'; // Top group (Padel Arenas)
    } else if (playerIndex < groupSize * 2) {
      return 'blue'; // Second group (Coolbet)
    } else if (playerIndex < groupSize * 3) {
      return 'yellow'; // Third group (Lux Express)
    } else {
      return 'pink'; // Bottom group (3p Logistics)
    }
  }
  
  createRoundWithPattern(bracketData, roundNumber, groupedPlayers, team1Indices, team2Indices) {
    const roundData = bracketData.rounds.find(r => r.number === roundNumber);
    if (!roundData) return;
    
    console.log(`===== CREATING ROUND ${roundNumber} WITH PATTERN =====`);
    console.log(`Team 1 indices: [${team1Indices.join(', ')}], Team 2 indices: [${team2Indices.join(', ')}]`);
    
    // Generate matches for each group
    this.createGroupMatches(roundData, 'green', 'Padel Arenas', groupedPlayers.green, team1Indices, team2Indices);
    this.createGroupMatches(roundData, 'blue', 'Coolbet', groupedPlayers.blue, team1Indices, team2Indices);
    this.createGroupMatches(roundData, 'yellow', 'Lux Express', groupedPlayers.yellow, team1Indices, team2Indices);
    this.createGroupMatches(roundData, 'pink', '3p Logistics', groupedPlayers.pink, team1Indices, team2Indices);
  }

  createGroupMatches(roundData, groupColor, courtName, groupPlayers, team1Indices, team2Indices) {
    if (groupPlayers.length < 4) {
      console.log(`Not enough players in ${courtName} (${groupColor}) group: ${groupPlayers.length}`);
      return;
    }
    
    console.log(`\n----- Creating matches for ${courtName} (${groupColor}) -----`);
    
    // Sort by rating within group
    const sortedPlayers = this.sortPlayersByRating(groupPlayers);
    
    console.log("Players in group (sorted by rating):");
    sortedPlayers.forEach((player, idx) => {
      console.log(`  ${idx+1}. ${player.name} (${player.ranking || player.rating || 0})`);
    });
    
    // Create teams based on provided indices pattern
    for (let i = 0; i < Math.floor(sortedPlayers.length / 4); i++) {
      const baseIndex = i * 4;
      
      // Create teams using the provided indices pattern
      const team1 = team1Indices.map(idx => sortedPlayers[baseIndex + idx]).filter(Boolean);
      const team2 = team2Indices.map(idx => sortedPlayers[baseIndex + idx]).filter(Boolean);
      
      console.log(`\nCreating match ${i+1}:`);
      console.log(`  Team 1: ${team1.map(p => p.name).join(' & ')} (indices: ${team1Indices.join(', ')})`);
      console.log(`  Team 2: ${team2.map(p => p.name).join(' & ')} (indices: ${team2Indices.join(', ')})`);
      
      // Only create match if we have enough players for both teams
      if (team1.length === 2 && team2.length === 2) {
        const match = {
          id: `match-${Date.now()}-${roundData.number}-${groupColor}-${i}`,
          court: courtName,
          team1: team1,
          team2: team2,
          score1: null,
          score2: null,
          completed: false,
          round: roundData.number,
          groupColor: groupColor
        };
        
        roundData.matches.push(match);
        console.log(`  Match created successfully for round ${roundData.number}`);
      } else {
        console.warn(`  Not enough players to create complete teams: Team 1 (${team1.length}/2), Team 2 (${team2.length}/2)`);
      }
    }
  }
  
  createMixRound(bracketData, groupedPlayers) {
    const roundData = bracketData.rounds.find(r => r.number === 3);
    if (!roundData) return;
    
    // Sort each group by rating
    const sortedGroups = {
      green: this.sortPlayersByRating(groupedPlayers.green),
      blue: this.sortPlayersByRating(groupedPlayers.blue),
      yellow: this.sortPlayersByRating(groupedPlayers.yellow),
      pink: this.sortPlayersByRating(groupedPlayers.pink)
    };
    
    // Create mix matches according to rules
    // Green + Blue mix
    if (sortedGroups.green.length >= 2 && sortedGroups.blue.length >= 2) {
      // Green 1 & Blue 6 vs Green 2 & Blue 5
      this.createMixMatch(
        roundData,
        [sortedGroups.green[0], sortedGroups.blue[Math.min(5, sortedGroups.blue.length - 1)]],
        [sortedGroups.green[1], sortedGroups.blue[Math.min(4, sortedGroups.blue.length - 2)]],
        'Mix Round',
        'mix'
      );
      
      if (sortedGroups.green.length >= 4 && sortedGroups.blue.length >= 4) {
        // Green 3 & Blue 8 vs Green 4 & Blue 7
        this.createMixMatch(
          roundData,
          [sortedGroups.green[2], sortedGroups.blue[Math.min(7, sortedGroups.blue.length - 1)]],
          [sortedGroups.green[3], sortedGroups.blue[Math.min(6, sortedGroups.blue.length - 2)]],
          'Mix Round',
          'mix'
        );
      }
    }
    
    // Yellow + Pink mix
    if (sortedGroups.yellow.length >= 2 && sortedGroups.pink.length >= 2) {
      // Yellow 1 & Pink 4 vs Yellow 2 & Pink 3
      this.createMixMatch(
        roundData,
        [sortedGroups.yellow[0], sortedGroups.pink[Math.min(3, sortedGroups.pink.length - 1)]],
        [sortedGroups.yellow[1], sortedGroups.pink[Math.min(2, sortedGroups.pink.length - 2)]],
        'Mix Round',
        'mix'
      );
      
      if (sortedGroups.yellow.length >= 4 && sortedGroups.pink.length >= 4) {
        // Yellow 3 & Pink 2 vs Yellow 4 & Pink 1
        this.createMixMatch(
          roundData,
          [sortedGroups.yellow[2], sortedGroups.pink[1]],
          [sortedGroups.yellow[3], sortedGroups.pink[0]],
          'Mix Round',
          'mix'
        );
      }
    }
  }

  createMixMatch(roundData, team1, team2, courtName, groupColor) {
    // Filter out undefined players
    team1 = team1.filter(player => player);
    team2 = team2.filter(player => player);
    
    if (team1.length !== 2 || team2.length !== 2) return;
    
    const match = {
      id: `match-${Date.now()}-${roundData.number}-mix-${roundData.matches.length}`,
      court: courtName,
      team1: team1,
      team2: team2,
      score1: null,
      score2: null,
      completed: false,
      round: roundData.number,
      groupColor: groupColor
    };
    
    roundData.matches.push(match);
  }
  
  updateMatchScore(matchId, team, score) {
    if (!this.bracketData || !this.bracketData.rounds) return;
    
    // Find the match in current rounds
    for (const round of this.bracketData.rounds) {
      const match = round.matches.find(m => m.id === matchId);
      if (match) {
        if (team === 'team1') {
          match.score1 = score;
        } else if (team === 'team2') {
          match.score2 = score;
        }
        
        // Auto-complete if both scores are set
        if (match.score1 !== null && match.score2 !== null) {
          match.completed = true;
          
          // Update player standings
          this.updatePlayerStandings(match);
        }
        
        // Save changes to Firebase
        this.saveBracketData();
        break;
      }
    }
  }
  
  updatePlayerStandings(match) {
    if (!this.bracketData || !this.bracketData.standings) return;
    
    // Determine winner and loser
    const team1Won = match.score1 > match.score2;
    const winningTeam = team1Won ? match.team1 : match.team2;
    const losingTeam = team1Won ? match.team2 : match.team1;
    
    // Update standings for all players
    [...winningTeam, ...losingTeam].forEach(player => {
      const standing = this.bracketData.standings.find(s => s.id === player.id);
      if (standing) {
        standing.gamesPlayed++;
        
        // Update wins/losses
        if (winningTeam.some(p => p.id === player.id)) {
          standing.wins++;
          standing.points += match.score1 > match.score2 ? match.score1 : match.score2; // Add actual score points
        } else {
          standing.losses++;
          standing.points += match.score1 > match.score2 ? match.score2 : match.score1; // Add actual score points
        }
      }
    });
  }
  
  async saveBracketData() {
    if (!this.bracketData || !this.selectedTournamentId) return;
    
    try {
      await firebaseService.saveTournamentBracketAmericano(this.selectedTournamentId, this.bracketData);
    } catch (error) {
      console.error('Error saving bracket data:', error);
    }
  }
  
  cleanup() {
    // Unsubscribe from all Firebase listeners
    this.unsubscribeFunctions.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
  }
}


// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.bracketApp = new TournamentBracketAmericano();
  
  // Global function to make score editable (restore original behavior)
  window.handleScoreChange = function(event) {
    const input = event.target;
    const matchId = input.dataset.matchId;
    const team = input.dataset.team;
    const score = parseInt(input.value, 10);
    
    if (isNaN(score) || score < 0) {
      input.value = '';
      return;
    }
    
    if (window.bracketApp) {
      window.bracketApp.updateMatchScore(matchId, team, score);
    }
  };
  
  // Make score fields editable with keyboard navigation
  window.makeScoreEditable = function(element, matchId, team) {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'score-input';
    input.value = element.textContent !== '-' ? element.textContent : '';
    input.min = 0;
    input.dataset.matchId = matchId;
    input.dataset.team = team;
  
    input.onblur = () => {
      const score = input.value ? parseInt(input.value) : null;
      window.handleScoreChange({target: input});
      element.textContent = score ?? '-';
    };
  
    input.onkeypress = (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    };
  
    element.textContent = '';
    element.appendChild(input);
    input.focus();
  };
  
  // Set up cleanup on page unload
  window.addEventListener('beforeunload', () => {
    window.bracketApp.cleanup();
  });
});
