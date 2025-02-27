// Import dependencies and styles
import '../styles/tournament-bracket-Americano.css';
import firebaseService from './services/firebase-service';

// Import utility modules
import {
  ValidationUtils,
  PlayerSortUtils,
  ConflictUtils,
  GameScoreUtils,
} from './utils.js';

/**
 * Tournament Bracket Americano class
 * Manages the Americano format tournament bracket display and interactions
 */
class TournamentBracketAmericano {
  constructor() {
    // DOM Elements
    this.timerDisplay = document.getElementById('gameTimer');
    this.startTimerBtn = document.getElementById('startTimer');
    this.resetRoundBtn = document.getElementById('resetRound');
    this.completeRoundBtn = document.getElementById('completeRound');
    this.saveScoresBtn = document.getElementById('saveScores');
    this.resetScoresBtn = document.getElementById('resetScores');
    this.generateNextRoundBtn = document.getElementById('generateNextRound');
    
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
      
      if (this.tournament) {
        this.tournamentNameElement.textContent = this.tournament.name + ' - Americano';
      }
      
      // Initialize bracket if needed
      if (!this.bracketData) {
        await this.initializeBracket();
      } else {
        this.currentRound = this.bracketData.currentRound || 1;
        this.renderAllRounds();
        this.renderStandings();
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Update button states
      this.updateButtonStates();
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
          this.currentRound = bracketData.currentRound || 1;
          this.renderAllRounds();
          this.renderStandings();
          this.updateButtonStates();
        }
      }
    );
    
    // Listen for tournament players changes
    const unsubscribePlayers = firebaseService.listenToTournamentPlayers(
      this.selectedTournamentId,
      (players) => {
        this.players = players;
      }
    );
    
    this.unsubscribeFunctions.push(unsubscribeTournament, unsubscribeBracket, unsubscribePlayers);
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
    this.startTimerBtn.addEventListener('click', () => {
      if (this.gameTimer.isRunning) {
        this.gameTimer.reset();
      } else {
        this.gameTimer.start();
      }
    });
    
    // Round management
    this.resetRoundBtn.addEventListener('click', () => this.resetRound());
    this.completeRoundBtn.addEventListener('click', () => this.completeRound());
    this.saveScoresBtn.addEventListener('click', () => this.saveScores());
    this.resetScoresBtn.addEventListener('click', () => this.resetScores());
    this.generateNextRoundBtn.addEventListener('click', () => this.generateNextRound());
    
    // Global function for score changes
    window.handleScoreChange = (event) => this.handleScoreChange(event);
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
        clearInterval(this.gameTimer.interval);
        this.startTimerBtn.textContent = 'Start Timer';
        this.gameTimer.updateDisplay();
        this.timerDisplay.classList.remove('time-up');
      },
      
      updateDisplay: () => {
        const minutes = Math.floor(this.gameTimer.time / 60);
        const seconds = this.gameTimer.time % 60;
        this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
    return team.map(player => player.name).join(' & ');
  }

  sortPlayersByRating(playersArray) {
    return [...playersArray].sort((a, b) => {
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      // If ratings are equal, sort by name
      return a.name.localeCompare(b.name);
    });
  }

  async initializeBracket() {
    try {
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
        standings: this.players.map(player => ({
          id: player.id,
          name: player.name,
          group: this.determineInitialGroup(player),
          points: 0,
          gamesPlayed: 0,
          wins: 0,
          losses: 0
        }))
      };
      
      // Save to Firebase
      await firebaseService.saveTournamentBracket(this.selectedTournamentId, bracketData);
      
      this.bracketData = bracketData;
      this.renderAllRounds();
      this.renderStandings();
    } catch (error) {
      console.error('Error initializing bracket:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to initialize bracket. Please try again.',
        icon: 'error'
      });
    }
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
  
  // Render Functions
  renderAllRounds() {
    if (!this.bracketData) return;
    
    this.renderRound(1, this.round1Courts);
    this.renderRound(2, this.round2Courts);
    this.renderRound(3, this.round3Courts);
    this.renderRound(4, this.round4Courts);
  }
  
  renderRound(roundNumber, container) {
    container.innerHTML = '';
    
    const roundData = this.bracketData.rounds.find(r => r.number === roundNumber);
    if (!roundData) return;
    
    roundData.matches.forEach(match => {
      const courtCard = this.createCourtCard(match);
      container.appendChild(courtCard);
    });
  }
  
  createCourtCard(match) {
    const template = this.courtCardTemplate.content.cloneNode(true);
    const courtCard = template.querySelector('.court-card');
    
    // Set court color class
    const colorClass = match.groupColor || this.courtColors[match.court] || '';
    courtCard.classList.add(colorClass);
    
    // Set court name in header
    const courtHeader = courtCard.querySelector('.court-header');
    courtHeader.textContent = match.court;
    
    // Set team names and scores
    const teamRows = courtCard.querySelectorAll('.team-row');
    
    // Team 1
    const team1NameEl = teamRows[0].querySelector('.team-name');
    const team1ScoreEl = teamRows[0].querySelector('.score-input');
    team1NameEl.textContent = this.getTeamNames(match.team1);
    team1ScoreEl.value = match.score1 !== null ? match.score1 : '';
    team1ScoreEl.dataset.matchId = match.id;
    team1ScoreEl.dataset.team = 'team1';
    team1ScoreEl.addEventListener('change', window.handleScoreChange);
    
    // Team 2
    const team2NameEl = teamRows[1].querySelector('.team-name');
    const team2ScoreEl = teamRows[1].querySelector('.score-input');
    team2NameEl.textContent = this.getTeamNames(match.team2);
    team2ScoreEl.value = match.score2 !== null ? match.score2 : '';
    team2ScoreEl.dataset.matchId = match.id;
    team2ScoreEl.dataset.team = 'team2';
    team2ScoreEl.addEventListener('change', window.handleScoreChange);
    
    // If match is completed, disable inputs
    if (match.completed) {
      team1ScoreEl.disabled = true;
      team2ScoreEl.disabled = true;
    }
    
    return courtCard;
  }
  
  renderStandings() {
    if (!this.bracketData) return;
    
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
    this.renderGroupStandings(groupedStandings.green, this.greenGroupPlayers);
    this.renderGroupStandings(groupedStandings.blue, this.blueGroupPlayers);
    this.renderGroupStandings(groupedStandings.yellow, this.yellowGroupPlayers);
    this.renderGroupStandings(groupedStandings.pink, this.pinkGroupPlayers);
  }
  
  renderGroupStandings(groupStandings, container) {
    container.innerHTML = '';
    
    groupStandings.forEach((standing, index) => {
      const template = this.playerRankingTemplate.content.cloneNode(true);
      const playerRanking = template.querySelector('.player-ranking');
      
      const rankEl = playerRanking.querySelector('.player-rank');
      const nameEl = playerRanking.querySelector('.player-name');
      const pointsEl = playerRanking.querySelector('.player-points');
      
      rankEl.textContent = `${index + 1}.`;
      nameEl.textContent = standing.name;
      pointsEl.textContent = `${standing.points}p`;
      
      container.appendChild(playerRanking);
    });
  }
  
  // Score and Match Functions
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
  
  async updateMatchScore(matchId, team, score) {
    try {
      // Create a deep copy of bracket data to modify
      const updatedBracketData = JSON.parse(JSON.stringify(this.bracketData));
      
      // Find the match in current rounds
      let matchUpdated = false;
      
      for (const round of updatedBracketData.rounds) {
        const matchIndex = round.matches.findIndex(m => m.id === matchId);
        if (matchIndex !== -1) {
          if (team === 'team1') {
            round.matches[matchIndex].score1 = score;
          } else if (team === 'team2') {
            round.matches[matchIndex].score2 = score;
          }
          
          // Auto-complete if both scores are set
          if (round.matches[matchIndex].score1 !== null && round.matches[matchIndex].score2 !== null) {
            round.matches[matchIndex].completed = true;
          }
          
          matchUpdated = true;
          break;
        }
      }
      
      if (matchUpdated) {
        // Save to Firebase
        await firebaseService.saveTournamentBracket(
          this.selectedTournamentId,
          updatedBracketData
        );
        
        this.updateButtonStates();
      }
    } catch (error) {
      console.error('Error updating match score:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to update score. Please try again.',
        icon: 'error'
      });
    }
  }
  
  async saveScores() {
    try {
      await firebaseService.saveTournamentBracket(
        this.selectedTournamentId,
        this.bracketData
      );
      
      Swal.fire({
        title: 'Scores Saved',
        text: 'Scores saved successfully!',
        icon: 'success',
        timer: 1500
      });
    } catch (error) {
      console.error('Error saving scores:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to save scores. Please try again.',
        icon: 'error'
      });
    }
  }
  
  async resetScores() {
    const result = await Swal.fire({
      title: 'Reset Scores?',
      text: 'Are you sure you want to reset all scores for the current round?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset scores',
      cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) return;
    
    try {
      // Create a deep copy of bracket data to modify
      const updatedBracketData = JSON.parse(JSON.stringify(this.bracketData));
      
      const currentRoundData = updatedBracketData.rounds.find(r => r.number === this.currentRound);
      if (currentRoundData) {
        currentRoundData.matches.forEach(match => {
          match.score1 = null;
          match.score2 = null;
          match.completed = false;
        });
        
        // Save to Firebase
        await firebaseService.saveTournamentBracket(
          this.selectedTournamentId,
          updatedBracketData
        );
      }
    } catch (error) {
      console.error('Error resetting scores:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to reset scores. Please try again.',
        icon: 'error'
      });
    }
  }
  
  async completeRound() {
    const result = await Swal.fire({
      title: 'Complete Round?',
      text: `Are you sure you want to complete Round ${this.currentRound}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, complete round',
      cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) return;
    
    const isCurrentRoundComplete = this.checkRoundCompletion(this.currentRound);
    if (!isCurrentRoundComplete) {
      Swal.fire({
        title: 'Incomplete Round',
        text: 'Please enter scores for all matches in the current round before completing.',
        icon: 'warning'
      });
      return;
    }
    
    try {
      // Create a deep copy of bracket data to modify
      const updatedBracketData = JSON.parse(JSON.stringify(this.bracketData));
      
      const currentRoundData = updatedBracketData.rounds.find(r => r.number === this.currentRound);
      if (currentRoundData) {
        currentRoundData.completed = true;
        
        // Add matches to completed matches
        currentRoundData.matches.forEach(match => {
          updatedBracketData.completedMatches.push({...match});
        });
        
        this.updateStandings(updatedBracketData);
        
        // Save to Firebase
        await firebaseService.saveTournamentBracket(
          this.selectedTournamentId,
          updatedBracketData
        );
        
        // Update tournament status if last round
        if (this.currentRound >= 4) {
          await firebaseService.updateTournament(
            this.selectedTournamentId, 
            {
              status_id: 3, // Completed status
              completedDate: firebaseService.timestamp()
            }
          );
          
          Swal.fire({
            title: 'Tournament Completed',
            text: 'Tournament has been successfully completed!',
            icon: 'success'
          });
        }
      }
    } catch (error) {
      console.error('Error completing round:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to complete round. Please try again.',
        icon: 'error'
      });
    }
  }
  
  checkRoundCompletion(roundNumber) {
    const roundData = this.bracketData.rounds.find(r => r.number === roundNumber);
    if (!roundData) return false;
    
    return roundData.matches.every(match => match.completed);
  }
  
  updateStandings(bracketData) {
    const currentRoundData = bracketData.rounds.find(r => r.number === this.currentRound);
    if (!currentRoundData) return;
    
    currentRoundData.matches.forEach(match => {
      if (!match.completed) return;
      
      // Determine winner
      const team1Won = match.score1 > match.score2;
      const isDraw = match.score1 === match.score2;
      
      // Update team1 players
      match.team1.forEach(player => {
        const standing = bracketData.standings.find(s => s.id === player.id);
        if (standing) {
          standing.gamesPlayed++;
          standing.points += match.score1;
          
          if (team1Won) {
            standing.wins++;
          } else if (!isDraw) {
            standing.losses++;
          }
        }
      });
      
      // Update team2 players
      match.team2.forEach(player => {
        const standing = bracketData.standings.find(s => s.id === player.id);
        if (standing) {
          standing.gamesPlayed++;
          standing.points += match.score2;
          
          if (!team1Won && !isDraw) {
            standing.wins++;
          } else if (!isDraw) {
            standing.losses++;
          }
        }
      });
    });
  }
  
  async resetRound() {
    const result = await Swal.fire({
      title: 'Reset Round?',
      text: `Are you sure you want to reset Round ${this.currentRound}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset round',
      cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) return;
    
    try {
      // Create a deep copy of bracket data to modify
      const updatedBracketData = JSON.parse(JSON.stringify(this.bracketData));
      
      const currentRoundData = updatedBracketData.rounds.find(r => r.number === this.currentRound);
      if (currentRoundData) {
        currentRoundData.matches = [];
        currentRoundData.completed = false;
        
        // Remove completed matches for this round
        updatedBracketData.completedMatches = updatedBracketData.completedMatches.filter(
          match => match.round !== this.currentRound
        );
        
        // Reset standings (recalculate from scratch)
        this.resetStandings(updatedBracketData);
        
        // Save to Firebase
        await firebaseService.saveTournamentBracket(
          this.selectedTournamentId,
          updatedBracketData
        );
      }
    } catch (error) {
      console.error('Error resetting round:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to reset round. Please try again.',
        icon: 'error'
      });
    }
  }
  
  resetStandings(bracketData) {
    // Reset all standings
    bracketData.standings = this.players.map(player => {
      const existingStanding = bracketData.standings.find(s => s.id === player.id);
      return {
        id: player.id,
        name: player.name,
        group: existingStanding ? existingStanding.group : this.determineInitialGroup(player),
        points: 0,
        gamesPlayed: 0,
        wins: 0,
        losses: 0
      };
    });
    
    // Recalculate based on completed matches from previous rounds
    bracketData.completedMatches.forEach(match => {
      // Determine winner
      const team1Won = match.score1 > match.score2;
      const isDraw = match.score1 === match.score2;
      
      // Update team1 players
      match.team1.forEach(player => {
        const standing = bracketData.standings.find(s => s.id === player.id);
        if (standing) {
          standing.gamesPlayed++;
          standing.points += match.score1;
          
          if (team1Won) {
            standing.wins++;
          } else if (!isDraw) {
            standing.losses++;
          }
        }
      });
      
      // Update team2 players
      match.team2.forEach(player => {
        const standing = bracketData.standings.find(s => s.id === player.id);
        if (standing) {
          standing.gamesPlayed++;
          standing.points += match.score2;
          
          if (!team1Won && !isDraw) {
            standing.wins++;
          } else if (!isDraw) {
            standing.losses++;
          }
        }
      });
    });
  }
  
  updateButtonStates() {
    if (!this.bracketData) return;
    
    const isRoundComplete = this.checkRoundCompletion(this.currentRound);
    if (this.completeRoundBtn) {
      this.completeRoundBtn.disabled = !isRoundComplete;
    }
    
    const isLastRound = this.currentRound >= 4;
    if (this.generateNextRoundBtn) {
      this.generateNextRoundBtn.disabled = !isRoundComplete || isLastRound;
    }
  }

  async generateNextRound() {
    const result = await Swal.fire({
      title: 'Generate Next Round?',
      text: `Are you sure you want to generate Round ${this.currentRound + 1}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, generate next round',
      cancelButtonText: 'Cancel'
    });
    
    if (!result.isConfirmed) return;
    
    if (this.currentRound >= 4) {
      Swal.fire({
        title: 'Tournament Complete',
        text: 'Tournament has reached maximum number of rounds.',
        icon: 'info'
      });
      return;
    }
    
    // Check if current round is completed
    const isCurrentRoundComplete = this.checkRoundCompletion(this.currentRound);
    if (!isCurrentRoundComplete) {
      Swal.fire({
        title: 'Incomplete Round',
        text: 'Please complete all matches in the current round before generating the next round.',
        icon: 'warning'
      });
      return;
    }
    
    try {
      Swal.fire({
        title: 'Generating next round...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      // Create a deep copy of bracket data to modify
      const updatedBracketData = JSON.parse(JSON.stringify(this.bracketData));
      
      // Update standings based on current round results
      this.updateStandings(updatedBracketData);
      
      // Increment the current round
      updatedBracketData.currentRound++;
      this.currentRound = updatedBracketData.currentRound;
      
      // Generate next round matches
      if (this.currentRound === 2) {
        this.generateRegularRound(updatedBracketData, this.currentRound);
      } else if (this.currentRound === 3) {
        this.generateMixRound(updatedBracketData);
      } else if (this.currentRound === 4) {
        this.generateRegularRound(updatedBracketData, this.currentRound);
      }
      
      // Save to Firebase
      await firebaseService.saveTournamentBracket(
        this.selectedTournamentId,
        updatedBracketData
      );
      
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
  
  generateRegularRound(bracketData, roundNumber) {
    const roundData = bracketData.rounds.find(r => r.number === roundNumber);
    if (!roundData) return;
    
    roundData.matches = [];
    
    // Group players by their group color
    const groupedPlayers = {
      green: this.players.filter(p => this.getPlayerGroupColor(p.id, bracketData) === 'green'),
      blue: this.players.filter(p => this.getPlayerGroupColor(p.id, bracketData) === 'blue'),
      yellow: this.players.filter(p => this.getPlayerGroupColor(p.id, bracketData) === 'yellow'),
      pink: this.players.filter(p => this.getPlayerGroupColor(p.id, bracketData) === 'pink')
    };
    
    // Generate matches for each group
    this.generateGroupMatches('green', 'Padel Arenas', groupedPlayers.green, roundData);
    this.generateGroupMatches('blue', 'Coolbet', groupedPlayers.blue, roundData);
    this.generateGroupMatches('yellow', 'Lux Express', groupedPlayers.yellow, roundData);
    this.generateGroupMatches('pink', '3p Logistics', groupedPlayers.pink, roundData);
  }
  
  generateGroupMatches(groupColor, courtName, groupPlayers, roundData) {
    if (groupPlayers.length < 4) return;
    
    // Sort by rating within group
    const sortedPlayers = this.sortPlayersByRating(groupPlayers);
    
    // Create teams: best + worst, 2nd best + 2nd worst, etc.
    for (let i = 0; i < Math.floor(sortedPlayers.length / 4); i++) {
      const team1 = [
        sortedPlayers[i * 4],
        sortedPlayers[i * 4 + 3]
      ];
      
      const team2 = [
        sortedPlayers[i * 4 + 1],
        sortedPlayers[i * 4 + 2]
      ];
      
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
    }
  }
  
  generateMixRound(bracketData) {
    const roundData = bracketData.rounds.find(r => r.number === 3);
    if (!roundData) return;
    
    roundData.matches = [];
    
    // Group players by their group color
    const groupedPlayers = {
      green: this.players.filter(p => this.getPlayerGroupColor(p.id, bracketData) === 'green'),
      blue: this.players.filter(p => this.getPlayerGroupColor(p.id, bracketData) === 'blue'),
      yellow: this.players.filter(p => this.getPlayerGroupColor(p.id, bracketData) === 'yellow'),
      pink: this.players.filter(p => this.getPlayerGroupColor(p.id, bracketData) === 'pink')
    };
    
    // Sort each group by standings
    const sortedGroups = {
      green: this.sortPlayersByStandings(groupedPlayers.green, bracketData),
      blue: this.sortPlayersByStandings(groupedPlayers.blue, bracketData),
      yellow: this.sortPlayersByStandings(groupedPlayers.yellow, bracketData),
      pink: this.sortPlayersByStandings(groupedPlayers.pink, bracketData)
    };
    
    // Create mix matches according to SNP rules
    // Green + Blue mix
    if (sortedGroups.green.length >= 2 && sortedGroups.blue.length >= 2) {
      // Green 1 & Blue 6 vs Green 2 & Blue 5
      this.createMixMatch(
        roundData,
        [sortedGroups.green[0], sortedGroups.blue[5]],
        [sortedGroups.green[1], sortedGroups.blue[4]],
        'Mix Round',
        'mix'
      );
      
      // Green 3 & Blue 8 vs Green 4 & Blue 7
      this.createMixMatch(
        roundData,
        [sortedGroups.green[2], sortedGroups.blue[7]],
        [sortedGroups.green[3], sortedGroups.blue[6]],
        'Mix Round',
        'mix'
      );
    }
    
    // Yellow + Pink mix
    if (sortedGroups.yellow.length >= 2 && sortedGroups.pink.length >= 2) {
      // Yellow 9 & Pink 16 vs Yellow 10 & Pink 15
      this.createMixMatch(
        roundData,
        [sortedGroups.yellow[0], sortedGroups.pink[3]],
        [sortedGroups.yellow[1], sortedGroups.pink[2]],
        'Mix Round',
        'mix'
      );
      
      // Yellow 11 & Pink 14 vs Yellow 12 & Pink 13
      this.createMixMatch(
        roundData,
        [sortedGroups.yellow[2], sortedGroups.pink[1]],
        [sortedGroups.yellow[3], sortedGroups.pink[0]],
        'Mix Round',
        'mix'
      );
    }
  }
  
  createMixMatch(roundData, team1, team2, courtName, groupColor) {
    // Ensure we have complete teams
    if (!team1 || !team2 || team1.length !== 2 || team2.length !== 2) return;
    
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
  
  sortPlayersByStandings(groupPlayers, bracketData) {
    // Get current standings for these players
    return [...groupPlayers].sort((a, b) => {
      const aStanding = bracketData.standings.find(s => s.id === a.id);
      const bStanding = bracketData.standings.find(s => s.id === b.id);
      
      if (!aStanding || !bStanding) return 0;
      
      // Sort by points, then wins
      if (bStanding.points !== aStanding.points) {
        return bStanding.points - aStanding.points;
      }
      
      if (bStanding.wins !== aStanding.wins) {
        return bStanding.wins - aStanding.wins;
      }
      
      // If all else is equal, sort by rating
      return b.rating - a.rating;
    });
  }
  
  getPlayerGroupColor(playerId, bracketData) {
    const standing = bracketData.standings.find(s => s.id === playerId);
    return standing ? standing.group : this.determineInitialGroup(this.players.find(p => p.id === playerId));
  }
  
  // Add tournament end functionality
  async endTournament() {
    const result = await Swal.fire({
      title: 'End Tournament?',
      text: 'This will finalize the tournament results and mark it as completed. Continue?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, end tournament',
      cancelButtonText: 'Cancel'
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
      
      // Update tournament status
      await firebaseService.updateTournament(
        this.selectedTournamentId,
        {
          status_id: 3, // Completed status
          completedDate: firebaseService.timestamp()
        }
      );
      
      // Create a deep copy of bracket data to modify
      const updatedBracketData = JSON.parse(JSON.stringify(this.bracketData));
      
      // Add final standings information
      updatedBracketData.completed = true;
      updatedBracketData.completedDate = new Date().toISOString();
      
      // Save to Firebase
      await firebaseService.saveTournamentBracket(
        this.selectedTournamentId,
        updatedBracketData
      );
      
      Swal.close();
      
      Swal.fire({
        title: 'Tournament Completed',
        text: 'The tournament has been successfully completed!',
        icon: 'success',
        confirmButtonText: 'Return to Tournament List'
      }).then(() => {
        window.location.href = 'tournament-list.html';
      });
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
  
  // Cleanup when leaving the page
  cleanup() {
    // Unsubscribe from all Firebase listeners
    this.unsubscribeFunctions.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    
    // Clear timers
    if (this.gameTimer && this.gameTimer.interval) {
      clearInterval(this.gameTimer.interval);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const bracketApp = new TournamentBracketAmericano();
  
  // Set up cleanup on page unload
  window.addEventListener('beforeunload', () => {
    bracketApp.cleanup();
  });
});