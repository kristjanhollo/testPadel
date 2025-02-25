// Import dependencies and styles
import '../styles/tournament-bracket-Mexicano.css';
import firebaseService from './services/firebase-service';

// Import utility modules
import {
  ValidationUtils,
  PlayerSortUtils,
  ConflictUtils,
  GameScoreUtils,
} from './utils.js';

/**
 * Tournament Bracket Mexicano class
 * Manages the Mexicano format tournament bracket display and interactions
 */
class TournamentBracketMexicano {
  constructor() {
    // DOM Elements
    this.timerDisplay = document.getElementById('gameTimer');
    this.generateBtn = document.getElementById('generateBracket');
    this.startTimerBtn = document.getElementById('startTimer');
    this.resetRoundBtn = document.getElementById('resetRound');
    this.playerCountEl = document.getElementById('playerCount');
    this.roundCountEl = document.getElementById('roundCount');
    this.currentMatches = document.getElementById('currentMatches');
    this.standings = document.getElementById('standings');
    this.registeredPlayersContainer = document.getElementById('registeredPlayers');
    this.playersGrid = this.registeredPlayersContainer?.querySelector('.players-grid');
    this.roundTabs = document.getElementById('roundTabs');
    this.roundContent = document.getElementById('roundContent');
    
    // State
    this.selectedTournamentId = localStorage.getItem('selectedTournament');
    this.tournament = null;
    this.players = [];
    this.bracketData = null;
    this.unassignedPlayers = [];
    this.incompleteCourts = [];
    this.playerAssignments = new Map();
    this.unsubscribeFunctions = [];
    
    // Constants
    this.COURT_ORDER = ['Padel Arenas', 'Coolbet', 'Lux Express', '3p Logistics'];
    
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
      // Show loading
      Swal.fire({
        title: 'Loading tournament data...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Set up listeners for data changes
      this.setupDataListeners();
      
      // Wait for initial data
      await this.waitForData();
      
      Swal.close();
      
      // Render initial state
      this.updateDisplay();
      
      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      Swal.close();
      console.error('Error initializing tournament bracket:', error);
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
  
  setupDataListeners() {
    // Listen for tournament data changes
    const unsubscribeTournament = firebaseService.listenToTournament(
      this.selectedTournamentId,
      (tournamentData) => {
        if (tournamentData) {
          this.tournament = tournamentData;
        } else {
          console.error('Tournament not found');
        }
      }
    );
    
    // Listen for bracket data changes
    const unsubscribeBracket = firebaseService.listenToTournamentBracket(
      this.selectedTournamentId,
      (bracketData) => {
        if (bracketData) {
          this.bracketData = bracketData;
          this.updateDisplay();
        } else {
          console.error('Bracket data not found');
        }
      }
    );
    
    // Listen for tournament players changes
    const unsubscribePlayers = firebaseService.listenToTournamentPlayers(
      this.selectedTournamentId,
      (players) => {
        this.players = players;
        this.updateDisplay();
      }
    );
    
    this.unsubscribeFunctions.push(unsubscribeTournament, unsubscribeBracket, unsubscribePlayers);
  }
  
  // Wait for initial data to be loaded
  waitForData() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.tournament && this.bracketData && this.players) {
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
  
  updateDisplay() {
    if (!this.bracketData) return;
    
    // Update round display
    if (this.roundCountEl) {
      this.roundCountEl.textContent = `Round ${this.bracketData.currentRound}/4`;
    }
    
    // Update player count
    if (this.playerCountEl && this.players) {
      this.playerCountEl.textContent = `${this.players.length} Players`;
    }
    
    // Set the active round to the current round in bracket data
    this.activeRound = this.bracketData.currentRound;
    
   
    
    // Render matches for the current round
    this.renderMatches();
    
    // Render standings
    this.renderStandings();
    
    // Render registered players
    this.renderRegisteredPlayers();
    
    // Render game scores
    this.renderGameScores();
    
    // Check for completed tournament
    this.checkRoundCompletion();

     // Render round tabs for navigation
     this.renderRoundTabs();
  }
  
  setupEventListeners() {
    // Generate next round button
    if (this.generateBtn) {
      this.generateBtn.addEventListener('click', () => this.generateNextRound());
    }
    
    // Start/reset timer button
    if (this.startTimerBtn) {
      this.startTimerBtn.addEventListener('click', () => {
        if (this.gameTimer.isRunning) {
          this.gameTimer.reset();
        } else {
          this.gameTimer.start();
        }
      });
    }
    
    // Reset round button
    if (this.resetRoundBtn) {
      this.resetRoundBtn.addEventListener('click', () => this.resetCurrentRound());
    }
    
    // Set global functions for HTML event handlers
    window.makeScoreEditable = (element, matchId, scoreType) => {
      this.makeScoreEditable(element, matchId, scoreType);
    };
    
    window.deletePlayer = (playerId) => {
      this.deletePlayer(playerId);
    };
  }

  async confirmPreviousRoundEdit(roundNumber) {
    // Ask user to confirm they want to edit a previous round
    const result = await Swal.fire({
      title: 'Edit Previous Round?',
      text: `Going back to edit Round ${roundNumber} will clear all results from subsequent rounds. Are you sure?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, edit round',
      cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) {
      // Reset tab selection to current round
      document.querySelectorAll('.round-tab').forEach(tab => {
        tab.classList.remove('active');
        if (parseInt(tab.dataset.round) === this.activeRound) {
          tab.classList.add('active');
        }
      });
      return;
    }
    
    try {
      // Show loading indicator
      Swal.fire({
        title: 'Resetting subsequent rounds...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Create a deep copy of bracket data to modify
      const updatedBracketData = JSON.parse(JSON.stringify(this.bracketData));
      
      // Keep only the matches from rounds up to the selected round
      updatedBracketData.completedMatches = updatedBracketData.completedMatches.filter(
        match => match.round <= roundNumber
      );
      
      // Clear all existing matches in courts
      updatedBracketData.courts.forEach(court => {
        court.matches = [];
      });
      
      // Set current round to the selected round
      updatedBracketData.currentRound = roundNumber;
      
      // Recalculate standings based on remaining matches
      this.recalculateStandings(updatedBracketData);
      
      // Save updated bracket data
      await firebaseService.saveTournamentBracket(
        this.selectedTournamentId,
        updatedBracketData
      );
      
      // Update active round
      this.activeRound = roundNumber;
      
      Swal.close();
      
      // Success message
      await Swal.fire({
        title: 'Round Reset',
        text: `Successfully reset to Round ${roundNumber}. You can now edit the results.`,
        icon: 'success',
        timer: 2000
      });
      
      // Show registered players if going back to round 0
      if (roundNumber === 0 && this.registeredPlayersContainer) {
        this.registeredPlayersContainer.style.display = 'block';
      }
    } catch (error) {
      Swal.close();
      console.error('Error resetting rounds:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to reset rounds. Please try again.',
        icon: 'error'
      });
    }
  }
  renderRoundTabs() {
    if (!this.roundTabs) {
      console.warn('Round tabs element not found in the DOM. Make sure you have added the HTML element with id "roundTabs".');
      return; // Exit the function if the element doesn't exist
    }
  
    // Clear previous content
    this.roundTabs.innerHTML = '';
    
    // Determine total rounds
    const totalRounds = this.bracketData.currentRound || 4;
    
    // Create tab for each round (including past rounds)
    for (let i = 1; i <= totalRounds; i++) {
      const roundTab = document.createElement('div');
      roundTab.className = `round-tab ${i === this.activeRound ? 'active' : ''}`;
      roundTab.textContent = `Round ${i}`;
      roundTab.dataset.round = i;
      
      // Add click event
      roundTab.addEventListener('click', () => {
        // Update active tab
        document.querySelectorAll('.round-tab').forEach(tab => {
          tab.classList.remove('active');
        });
        roundTab.classList.add('active');
        
        // If selecting a past round that isn't the current active one, confirm with user
        if (i < this.bracketData.currentRound && i !== this.activeRound) {
          this.confirmPreviousRoundEdit(i);
        } else {
          // Update active round normally
          this.activeRound = parseInt(roundTab.dataset.round);
          this.renderRoundContent(this.activeRound);
        }
      });
      
      this.roundTabs.appendChild(roundTab);
    }
    
    // Render first round by default
    this.renderRoundContent(this.activeRound);
  }

  // Add this method to your TournamentBracketMexicano class
renderRoundContent(roundNumber) {
  if (!this.roundContent) return;

  // Clear previous content
  this.roundContent.innerHTML = '';
  
  // Get matches for this round
  const roundMatches = this.bracketData.completedMatches.filter(
    match => match.round === roundNumber
  );
  
  if (roundMatches.length === 0) {
    this.roundContent.innerHTML = `
      <div class="empty-section">No match data available for Round ${roundNumber}</div>
    `;
    return;
  }
  
  // Group matches by court
  const courtMatches = {};
  roundMatches.forEach(match => {
    if (!courtMatches[match.courtName]) {
      courtMatches[match.courtName] = [];
    }
    courtMatches[match.courtName].push(match);
  });
  
  // Create section for each court
  Object.keys(courtMatches).forEach(courtName => {
    const courtSection = document.createElement('div');
    courtSection.className = 'court-section';
    courtSection.innerHTML = `<h4>${courtName}</h4>`;
    
    const matchesContainer = document.createElement('div');
    matchesContainer.className = 'matches-container';
    
    // Add each match
    courtMatches[courtName].forEach(match => {
      const team1Won = (match.score1 > match.score2);
      const matchCard = document.createElement('div');
      matchCard.className = 'match-card';
      matchCard.innerHTML = `
        <div class="team-row ${team1Won ? 'winner' : ''}">
          <div class="team-names">${this.getTeamNames(match.team1)}</div>
          <div class="team-score" 
               data-match-id="${match.id}" 
               data-score-type="score1"
               onclick="makeScoreEditable(this, '${match.id}', 'score1')">
            ${match.score1}
          </div>
        </div>
        <div class="team-row ${!team1Won ? 'winner' : ''}">
          <div class="team-names">${this.getTeamNames(match.team2)}</div>
          <div class="team-score"
               data-match-id="${match.id}" 
               data-score-type="score2"
               onclick="makeScoreEditable(this, '${match.id}', 'score2')">
            ${match.score2}
          </div>
        </div>
      `;
      
      matchesContainer.appendChild(matchCard);
    });
    
    courtSection.appendChild(matchesContainer);
    this.roundContent.appendChild(courtSection);
  });
}
  
  makeScoreEditable(element, matchId, scoreType) {
    // Check if we're already editing this score
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
  
  // Create game timer
  createGameTimer() {
    return {
      time: 20 * 60,
      isRunning: false,
      interval: null,

      start: () => {
        if (!this.gameTimer.isRunning) {
          this.gameTimer.isRunning = true;
          this.startTimerBtn.textContent = 'Reset Timer';
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
        this.startTimerBtn.textContent = 'Start Timer';
        clearInterval(this.gameTimer.interval);
        this.gameTimer.updateDisplay();
        this.timerDisplay.classList.remove('time-up');
      },

      updateDisplay: () => {
        const minutes = Math.floor(this.gameTimer.time / 60);
        const seconds = this.gameTimer.time % 60;
        this.timerDisplay.textContent = `${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      },

      timeUp: () => {
        clearInterval(this.gameTimer.interval);
        this.gameTimer.isRunning = false;
        this.startTimerBtn.textContent = 'Start Timer';
        this.timerDisplay.classList.add('time-up');
        Swal.fire({
          title: 'Time\'s Up!',
          text: 'Round time is up! Please enter final scores.',
          icon: 'info'
        });
      }
    };
  }
  
  // Helper Functions
  getTeamNames(team) {
    return team.map((player) => player.name).join(' & ');
  }

  async generateNextRound() {
    if (!ValidationUtils.canStartNewRound(this.bracketData)) {
      Swal.fire({
        title: 'Cannot Start New Round',
        text: 'Previous round incomplete!',
        icon: 'warning'
      });
      return;
    }

    try {
      // Show loading
      Swal.fire({
        title: 'Generating next round...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Clear previous matches
      const updatedBracketData = JSON.parse(JSON.stringify(this.bracketData));
      updatedBracketData.courts.forEach((court) => {
        court.matches = [];
      });
      
      // Generate matches based on format
      await this.generateMexicanoMatches(updatedBracketData);
      
      // Update round
      updatedBracketData.currentRound++;
      
      // Save updated bracket data
      await firebaseService.saveTournamentBracket(
        this.selectedTournamentId,
        updatedBracketData
      );
      
      // Hide registered players
      if (this.registeredPlayersContainer) {
        this.registeredPlayersContainer.style.display = 'none';
      }
      
      Swal.close();
      
      // Reset timer
      this.gameTimer.reset();
    } catch (error) {
      Swal.close();
      console.error('Error generating next round:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to generate next round. Please try again.',
        icon: 'error'
      });
    }
  }

  async generateMexicanoMatches(bracketData) {
    if (bracketData.currentRound === 0) {
      await this.generateFirstRound(bracketData);
    } else {
      await this.generateSubsequentRound(bracketData);
    }
  }

  async generateFirstRound(bracketData) {
    const sortedPlayers = [...this.players].sort(PlayerSortUtils.byRating);
    console.log(sortedPlayers);
    this.COURT_ORDER.forEach((courtName, index) => {
      const courtPlayers = sortedPlayers.slice(index * 4, (index + 1) * 4);
      if (courtPlayers.length >= 4) {
        const team1 = [courtPlayers[0], courtPlayers[3]];
        const team2 = [courtPlayers[1], courtPlayers[2]];
        this.createMatch(bracketData, courtName, team1, team2, index);
      }
    });
  }
  
  async generateSubsequentRound(bracketData) {
    this.playerAssignments.clear();

    const previousMatches = bracketData.completedMatches.filter(
      (m) => m.round === bracketData.currentRound
    );

    previousMatches.forEach((match) => {
      const { score1, score2, courtName, team1, team2 } = match;

      if (score1 !== score2) {
        const [winningTeam, losingTeam] =
          score1 > score2 ? [team1, team2] : [team2, team1];

        winningTeam.forEach((player) =>
          this.playerAssignments.set(player.id, this.determineNextCourt(courtName, 'win'))
        );

        losingTeam.forEach((player) =>
          this.playerAssignments.set(player.id, this.determineNextCourt(courtName, 'loss'))
        );
      } else {
        const assignTieBreaker = (team, baseScore) => {
          const [playerA, playerB] = team;
          const scoreA = baseScore * 100 + playerA.rating;
          const scoreB = baseScore * 100 + playerB.rating;

          this.playerAssignments.set(
            playerA.id,
            this.determineNextCourt(courtName, scoreA > scoreB ? 'win' : 'loss')
          );
          this.playerAssignments.set(
            playerB.id,
            this.determineNextCourt(courtName, scoreA > scoreB ? 'loss' : 'win')
          );
        };

        assignTieBreaker(team1, score1);
        assignTieBreaker(team2, score2);
      }
    });
    
    if (this.hasUnassignedPlayers()) {
      return this.handleConflictResolution(bracketData);
    } else {
      return this.createMatchesForRound(bracketData);
    }
  }
  
  hasUnassignedPlayers() {
    return this.players.some(p => !this.playerAssignments.has(p.id));
  }
  
  async handleConflictResolution(bracketData) {
    // This function would handle conflict resolution UI
    // For simplicity, we'll just auto-assign unassigned players
    const unassignedPlayers = this.players.filter(p => !this.playerAssignments.has(p.id));
    
    // Distribute unassigned players to courts that need players
    const courtNeeds = new Map();
    this.COURT_ORDER.forEach(court => {
      const assigned = this.players.filter(p => this.playerAssignments.get(p.id) === court);
      const needed = 4 - assigned.length;
      if (needed > 0) {
        courtNeeds.set(court, needed);
      }
    });
    
    // Sort courts by need
    const sortedCourts = [...courtNeeds.entries()].sort((a, b) => b[1] - a[1]);
    
    // Assign players to courts
    unassignedPlayers.forEach(player => {
      if (sortedCourts.length > 0) {
        const [court, needed] = sortedCourts[0];
        this.playerAssignments.set(player.id, court);
        
        if (needed === 1) {
          sortedCourts.shift(); // Remove this court from the list
        } else {
          sortedCourts[0][1] = needed - 1; // Update needed count
          // Re-sort if needed
          sortedCourts.sort((a, b) => b[1] - a[1]);
        }
      }
    });
    
    return this.createMatchesForRound(bracketData);
  }

  determineNextCourt(currentCourt, result) {
    const courtMovement = {
      'Padel Arenas': {
        win: 'Padel Arenas',
        loss: 'Coolbet',
      },
      Coolbet: {
        win: 'Padel Arenas',
        loss: 'Lux Express',
      },
      'Lux Express': {
        win: 'Coolbet',
        loss: '3p Logistics',
      },
      '3p Logistics': {
        win: 'Lux Express',
        loss: '3p Logistics',
      },
    };

    return courtMovement[currentCourt][result];
  }

  createMatchesForRound(bracketData) {
    this.COURT_ORDER.forEach((courtName, index) => {
      const courtPlayers = this.players
        .filter((p) => this.playerAssignments.get(p.id) === courtName)
        .sort((a, b) =>
          PlayerSortUtils.byGameScore(
            a,
            b,
            bracketData.completedMatches,
            bracketData.currentRound
          )
        );

      if (courtPlayers.length >= 4) {
        // Create teams by GameScore: highest with lowest, second highest with second lowest
        const team1 = [courtPlayers[0], courtPlayers[3]];
        const team2 = [courtPlayers[1], courtPlayers[2]];
        this.createMatch(bracketData, courtName, team1, team2, index);
      }
    });
  }

  createMatch(bracketData, courtName, team1, team2, courtIndex) {
    const match = {
      id: `match-${Date.now()}-${courtIndex}`,
      courtName,
      team1,
      team2,
      score1: null,
      score2: null,
      completed: false,
      round: bracketData.currentRound + 1, // Next round
    };
    bracketData.courts[courtIndex].matches.push(match);
  }

  async updateMatchScore(matchId, scoreType, score) {
    try {
      // Create a deep copy of bracket data to modify
      const updatedBracketData = JSON.parse(JSON.stringify(this.bracketData));
      
      // Find the match
      let matchUpdated = false;
      let foundMatch = null;

      // Look in current matches
      for (const court of updatedBracketData.courts) {
        const match = court.matches.find((m) => m.id === matchId);
        if (match) {
          foundMatch = match;
          break;
        }
      }

      if (!foundMatch) {
        throw new Error('Match not found');
      }

      const currentScore = score !== null ? parseInt(score, 10) : null;
      const otherScore = scoreType === 'score1' ? foundMatch.score2 : foundMatch.score1;

      // Validate score if both scores are set
      if (currentScore !== null && otherScore !== null) {
        if (!ValidationUtils.isValidScore(
          scoreType === 'score1' ? currentScore : otherScore,
          scoreType === 'score2' ? currentScore : otherScore
        )) {
          Swal.fire({
            title: 'Invalid Score',
            text: 'Scores must be between 0-10.',
            icon: 'error'
          });
          return;
        }
      }

      // Update the score
      foundMatch[scoreType] = currentScore;
      
      // Check if match is completed
      foundMatch.completed = foundMatch.score1 !== null && foundMatch.score2 !== null;
      
      if (foundMatch.completed) {
        // Add to completed matches if not already there
        const existingMatchIndex = updatedBracketData.completedMatches.findIndex(
          (m) => m.id === foundMatch.id
        );
        
        if (existingMatchIndex !== -1) {
          updatedBracketData.completedMatches[existingMatchIndex] = { ...foundMatch };
        } else {
          updatedBracketData.completedMatches.push({ ...foundMatch });
        }
        
        matchUpdated = true;
      }

      // Recalculate standings if needed
      if (matchUpdated) {
        this.recalculateStandings(updatedBracketData);
      }
      
      // Save updated bracket data
      await firebaseService.saveTournamentBracket(
        this.selectedTournamentId,
        updatedBracketData
      );
    } catch (error) {
      console.error('Error updating match score:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to update match score. Please try again.',
        icon: 'error'
      });
    }
  }

  recalculateStandings(bracketData) {
    bracketData.standings = this.players.map((player) => ({
      id: player.id,
      name: player.name,
      points: 0,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
    }));

    bracketData.completedMatches.forEach((match) => {
      const team1Points = match.score1 || 0;
      const team2Points = match.score2 || 0;

      match.team1.forEach((player) => {
        const standing = bracketData.standings.find((s) => s.id === player.id);
        if (standing) {
          standing.points += team1Points;
          if (team1Points > team2Points) standing.wins++;
          else standing.losses++;
          standing.gamesPlayed++;
        }
      });

      match.team2.forEach((player) => {
        const standing = bracketData.standings.find((s) => s.id === player.id);
        if (standing) {
          standing.points += team2Points;
          if (team2Points > team1Points) standing.wins++;
          else standing.losses++;
          standing.gamesPlayed++;
        }
      });
    });
  }

  async handleScoreUpdate(element, input, matchId, scoreType, originalText) {
    const score = input.value ? parseInt(input.value) : null;
    
    try {
      // Update the score in the database
      await this.updateMatchScore(matchId, scoreType, score);
      
      // Remove input and show updated score with visual feedback
      element.classList.remove('editing');
      element.classList.add('score-updated');
      element.textContent = score ?? '-';
      
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
      Swal.fire({
        title: 'Error',
        text: 'Failed to update score',
        icon: 'error',
        timer: 2000
      });
    }
  }

  renderMatches() {
    if (!this.currentMatches || !this.bracketData) return;
    
    this.currentMatches.innerHTML = '';
  
    this.bracketData.courts.forEach((court) => {
      court.matches.forEach((match) => {
        if (!match.completed) {
          const matchElement = document.createElement('div');
          matchElement.className = 'match';
          matchElement.innerHTML = `
            <div class="match-info">
              <span class="court-name">${court.name}</span>
              <div class="team">
                <span class="team-name">${this.getTeamNames(match.team1)}</span>
                <span class="score" onclick="makeScoreEditable(this, '${match.id}', 'score1')">${match.score1 ?? '-'}</span>
              </div>
              <div class="team">
                <span class="team-name">${this.getTeamNames(match.team2)}</span>
                <span class="score" onclick="makeScoreEditable(this, '${match.id}', 'score2')">${match.score2 ?? '-'}</span>
              </div>
            </div>
          `;
          this.currentMatches.appendChild(matchElement);
        }
      });
    });
    
    // If no matches are found, show a message
    if (this.currentMatches.children.length === 0) {
      this.currentMatches.innerHTML = `
        <div class="no-matches-message">
          <p>No active matches found for this round.</p>
          <button class="btn-primary" id="generateRoundBtn">Generate Matches for Round ${this.bracketData.currentRound + 1}</button>
        </div>
      `;
      
      // Add event listener to the generate button
      const generateBtn = document.getElementById('generateRoundBtn');
      if (generateBtn) {
        generateBtn.addEventListener('click', () => this.generateNextRound());
      }
    }
  }

  renderStandings() {
    if (!this.standings || !this.bracketData?.standings?.length) {
      if (this.standings) {
        this.standings.innerHTML = '<div class="empty-standings">No standings available</div>';
      }
      return;
    }

    this.standings.innerHTML = '';

    const sortedStandings = [...this.bracketData.standings].sort((a, b) => {
      const pointsDiff = (b.points || 0) - (a.points || 0);
      if (pointsDiff !== 0) return pointsDiff;
      return (b.wins || 0) - (a.wins || 0);
    });
    
    sortedStandings.forEach((player, index) => {
      const standingElement = document.createElement('div');
      standingElement.className = 'standing-item';
      standingElement.innerHTML = `
        <span class="rank">#${index + 1}</span>
        <span class="team-name">${player.name}</span>
        <span class="points">${player.points || 0}p</span>
        <span class="record">${player.wins || 0}-${player.losses || 0}</span>
      `;
      this.standings.appendChild(standingElement);
    });
  }

  renderRegisteredPlayers() {
    if (!this.playersGrid) return;
    
    this.playersGrid.innerHTML = '';

    const sortedPlayers = [...this.players].sort((a, b) => b.ranking - a.ranking);
    const numColumns = 4;
    const numRows = Math.ceil(this.players.length / numColumns);

    const columns = Array.from({ length: numColumns }, () => []);

    sortedPlayers.forEach((player, index) => {
      const columnIndex = Math.floor(index / numRows);
      columns[columnIndex].push(player);
    });

    columns.forEach((column) => {
      const columnDiv = document.createElement('div');
      columnDiv.className = 'player-column';

      column.forEach((player) => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.innerHTML = `
          <div class="player-info">
            <span class="player-name">${player.name}</span>
            <span class="player-rating">${player.ranking || 0}</span>
          </div>
        `;
        columnDiv.appendChild(playerCard);
      });

      this.playersGrid.appendChild(columnDiv);
    });
  }

  renderGameScores() {
    // First remove existing table if any
    const existingTable = document.querySelector('.game-score-table');
    if (existingTable) {
      existingTable.remove();
    }

    if (!this.bracketData || !this.standings) return;

    const gameScoreTable = document.createElement('div');
    gameScoreTable.className = 'game-score-table';

    // Header
    const header = document.createElement('h3');
    header.textContent = 'GameScore Tracking';
    gameScoreTable.appendChild(header);

    // Create scores grid
    const scoreGrid = document.createElement('div');
    scoreGrid.className = 'score-grid';

    this.players.forEach((player) => {
      const matchPoints = this.bracketData.completedMatches
        .filter((m) => m.round === this.bracketData.currentRound)
        .find(
          (m) =>
            m.team1.some((p) => p.id === player.id) ||
            m.team2.some((p) => p.id === player.id)
        );

      let gameScore = player.ranking || 0; // Base score is player's rating
      if (matchPoints) {
        const score = matchPoints.team1.some((p) => p.id === player.id)
          ? matchPoints.score1
          : matchPoints.score2;
        gameScore = score * 100 + player.ranking;
      }

      const scoreRow = document.createElement('div');
      scoreRow.className = 'score-row';
      scoreRow.innerHTML = `
        <span class="player-name">${player.name}</span>
        <span class="game-score">${gameScore}</span>
      `;
      scoreGrid.appendChild(scoreRow);
    });

    gameScoreTable.appendChild(scoreGrid);

    // Add the table after standings
    if (this.standings) {
      this.standings.parentNode.insertBefore(gameScoreTable, this.standings.nextSibling);
    }
  }

  checkRoundCompletion() {
    if (!this.bracketData) return;
    
    const allMatchesCompleted = this.bracketData.courts.every((court) =>
      court.matches.every((m) => m.completed)
    );

    if (allMatchesCompleted && this.bracketData.currentRound >= 4) {
      this.showTournamentEndOption();
    }
  }

  showTournamentEndOption() {
    if (!document.getElementById('endTournament')) {
      const endTournamentBtn = document.createElement('button');
      endTournamentBtn.id = 'endTournament';
      endTournamentBtn.className = 'btn-primary';
      endTournamentBtn.textContent = 'End Tournament';
      endTournamentBtn.onclick = () => this.endTournament();
      
      if (this.generateBtn) {
        this.generateBtn.disabled = true;
      }
      
      if (this.resetRoundBtn) {
        this.resetRoundBtn.disabled = true;
      }
      
      if (this.startTimerBtn) {
        this.startTimerBtn.disabled = true;
      }
      
      document.querySelector('.control-buttons')?.appendChild(endTournamentBtn);
    }
  }

  async endTournament() {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will finalize all standings and complete the tournament.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, end it!',
      cancelButtonText: 'No, keep it',
    });
    
    if (!result.isConfirmed) return;
    
    try {
      Swal.fire({
        title: 'Finalizing tournament...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Update tournament status to completed
      await firebaseService.updateTournament(
        this.selectedTournamentId,
        { 
          status_id: 3, // 3 = completed
          completedDate: new Date().toISOString()
        }
      );
      
      // Add final standings to tournament data
      const finalStandings = this.bracketData.standings
        .sort((a, b) => b.points - a.points || b.wins - a.wins)
        .map((player, index) => ({
          ...player,
          finalRank: index + 1,
        }));
      
      // Update bracket data with final results
      const updatedBracketData = {
        ...this.bracketData,
        completed: true,
        finalStandings
      };
      
      await firebaseService.saveTournamentBracket(
        this.selectedTournamentId,
        updatedBracketData
      );
      
      Swal.close();
      
      await Swal.fire({
        title: 'Tournament Completed!',
        text: 'Final standings have been saved.',
        icon: 'success'
      });
      
      // Disable all controls
      if (document.getElementById('endTournament')) {
        document.getElementById('endTournament').disabled = true;
      }
      
      // Redirect to tournament list
      window.location.href = 'tournament-list.html';
    } catch (error) {
      Swal.close();
      console.error('Error ending tournament:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to end tournament. Please try again.',
        icon: 'error'
      });
    }
  }

  async resetCurrentRound() {
    if (!this.bracketData || this.bracketData.currentRound === 0) {
      return;
    }

    const result = await Swal.fire({
      title: 'Reset Current Round?',
      text: 'Are you sure you want to reset the current round? This will clear all match scores and standings for this round.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: 'Resetting round...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Create a deep copy of bracket data to modify
      const updatedBracketData = JSON.parse(JSON.stringify(this.bracketData));
      
      // Clear current matches
      updatedBracketData.courts.forEach((court) => {
        court.matches = [];
      });

      // Remove completed matches for this round
      if (updatedBracketData.completedMatches) {
        updatedBracketData.completedMatches = updatedBracketData.completedMatches.filter(
          (match) => match.round !== updatedBracketData.currentRound
        );
      }

      // Decrement round counter
      updatedBracketData.currentRound--;
      
      // Show registered players if going back to round 0
      if (updatedBracketData.currentRound === 0 && this.registeredPlayersContainer) {
        this.registeredPlayersContainer.style.display = 'block';
      }

      // Recalculate standings
      this.recalculateStandings(updatedBracketData);
      
      // Save updated bracket data
      await firebaseService.saveTournamentBracket(
        this.selectedTournamentId,
        updatedBracketData
      );
      
      Swal.close();
      
      // Reset timer
      this.gameTimer.reset();
      
      await Swal.fire({
        title: 'Round Reset',
        text: 'The current round has been reset successfully.',
        icon: 'success',
        timer: 1500
      });
    } catch (error) {
      Swal.close();
      console.error('Error resetting round:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to reset round. Please try again.',
        icon: 'error'
      });
    }
  } catch (error) {}}
  
document.addEventListener('DOMContentLoaded', () => {
  new TournamentBracketMexicano();
});



export default TournamentBracketMexicano;