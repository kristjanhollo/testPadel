// public/scripts/controllers/mexicano-bracket-controller.js

import BaseTournamentBracketController from './base-tournament-bracket-controller.js';
import firebaseService from '../services/firebase-service.js';
import tournamentStateManager from '../services/tournament-state-manager.js';
import mexicanoMatchService from '../services/mexicano-match-service.js';
import timerService from '../services/timer-service.js';
import { ValidationUtils, PlayerSortUtils } from '../utils/utils.js';

/**
 * Mexicano Tournament Bracket Controller
 * Handles Mexicano format tournament bracket display and interactions
 */
class MexicanoBracketController extends BaseTournamentBracketController {
  constructor() {
    // Get DOM elements
    const elements = {
      tournamentName: document.getElementById('tournamentName'),
      timerDisplay: document.getElementById('gameTimer'),
      startTimerBtn: document.getElementById('startTimer'),
      generateBtn: document.getElementById('generateBracket'),
      resetRoundBtn: document.getElementById('resetRound'),
      playerCountEl: document.getElementById('playerCount'),
      roundCountEl: document.getElementById('roundCount'),
      currentMatches: document.getElementById('currentMatches'),
      standings: document.getElementById('standings'),
      registeredPlayersContainer: document.getElementById('registeredPlayers'),
      playersGrid: document.getElementById('registeredPlayers')?.querySelector('.players-grid'),
      roundTabs: document.getElementById('roundTabs'),
      roundContent: document.getElementById('roundContent')
    };
    
    // Initialize base controller
    super({ format: 'Mexicano', elements });
    
    // Mexicano-specific state
    this.activeRound = 1;
    this.COURT_ORDER = ['Padel Arenas', 'Coolbet', 'Lux Express', '3p Logistics'];
    this.playerAssignments = new Map();
    
    // Initialize the controller
    this.init();
  }
  
  /**
   * Set up bracket listener for Mexicano format
   * @returns {Function} Unsubscribe function
   */
  setupBracketListener() {
    return firebaseService.listenToTournamentBracket(
      this.selectedTournamentId,
      (bracketData) => {
        if (bracketData) {
          console.log('Mexicano bracket data received:', bracketData.currentRound);
          this.stateManager.setState('bracketData', bracketData);
        } else {
          console.log('No Mexicano bracket data found');
        }
      }
    );
  }
  
  /**
   * Initialize format-specific UI and behavior
   */
  initializeFormatSpecific() {
    // Set up round tabs if they exist
    this.renderRoundTabs();
    
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
  }
  
  /**
   * Set up event listeners specific to Mexicano format
   */
  setupEventListeners() {
    // Call base class implementation
    super.setupEventListeners();
    
    // Generate next round button
    if (this.elements.generateBtn) {
      this.elements.generateBtn.addEventListener('click', () => this.generateNextRound());
    }
    
    // Reset round button
    if (this.elements.resetRoundBtn) {
      this.elements.resetRoundBtn.addEventListener('click', () => this.resetCurrentRound());
    }
  }
  
  /**
   * Handle tournament data changes
   * @param {Object} tournamentData - Updated tournament data
   */
  onTournamentDataChanged(tournamentData) {
    super.onTournamentDataChanged(tournamentData);
    
    // Update tournament status if needed
    this.updateTournamentStatus();
  }
  
  /**
   * Handle bracket data changes
   * @param {Object} bracketData - Updated bracket data
   */
  onBracketDataChanged(bracketData) {
    super.onBracketDataChanged(bracketData);
    
    if (!bracketData) return;
    
    // Update UI components
    this.updateDisplay();
  }
  
  /**
   * Update the display when bracket data changes
   */
  updateDisplay() {
    const bracketData = this.stateManager.getState('bracketData');
    if (!bracketData) return;
    
    // Update round display
    if (this.elements.roundCountEl) {
      this.elements.roundCountEl.textContent = `Round ${bracketData.currentRound}/4`;
    }
    
    // Update player count
    const players = this.stateManager.getState('players');
    if (this.elements.playerCountEl && players) {
      this.elements.playerCountEl.textContent = `${players.length} Players`;
    }
    
    // Set the active round to the current round in bracket data
    this.activeRound = bracketData.currentRound;
    
    // Render all components
    this.renderRoundTabs();
    this.renderMatches();
    this.renderStandings();
    this.renderRegisteredPlayers();
    this.renderGameScores();
    
    // Check for completed tournament
    this.checkRoundCompletion();
  }
  
  /**
   * Updates tournament status to "ongoing" if it's currently "upcoming"
   */
  async updateTournamentStatus() {
    const tournamentData = this.stateManager.getState('tournamentData');
    const bracketData = this.stateManager.getState('bracketData');
    
    // Only update if tournament and bracketData are loaded
    if (!tournamentData || !bracketData) return;
    
    // Only update if status is "upcoming" (status_id = 1)
    if (tournamentData.status_id !== 1) return;
    
    // Check if bracket has any matches or completed matches
    const hasMatches = 
      (bracketData.completedMatches && bracketData.completedMatches.length > 0) ||
      (bracketData.courts && bracketData.courts.some(court => 
        court.matches && court.matches.length > 0
      ));
    
    if (!hasMatches) {
      console.log('Not updating tournament status - no matches found in bracket');
      return;
    }
    
    console.log('Updating tournament status from upcoming to ongoing');
    
    // Update status to "ongoing" (status_id = 2)
    await firebaseService.updateTournament(
      this.selectedTournamentId, 
      { status_id: 2 }
    );
    
    console.log('Tournament status updated successfully');
  }
  
  /**
   * Render round tabs for navigation
   */
  renderRoundTabs() {
    const roundTabs = this.elements.roundTabs;
    if (!roundTabs) return;
    
    const bracketData = this.stateManager.getState('bracketData');
    if (!bracketData) return;
    
    // Clear existing tabs
    roundTabs.innerHTML = '';
    
    // Determine total rounds
    const totalRounds = bracketData.currentRound || 4;
    
    // Create tab for each round
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
        if (i < bracketData.currentRound && i !== this.activeRound) {
          this.confirmPreviousRoundEdit(i);
        } else {
          // Update active round normally
          this.activeRound = parseInt(roundTab.dataset.round);
          this.renderRoundContent(this.activeRound);
        }
      });
      
      roundTabs.appendChild(roundTab);
    }
    
    // Render content for active round
    this.renderRoundContent(this.activeRound);
  }
  
  /**
   * Render content for a specific round
   * @param {number} roundNumber - Round number to render
   */
  renderRoundContent(roundNumber) {
    const roundContent = this.elements.roundContent;
    if (!roundContent) return;
    
    const bracketData = this.stateManager.getState('bracketData');
    if (!bracketData) return;
  
    // Clear previous content
    roundContent.innerHTML = '';
    
    // Get matches for this round
    const roundMatches = bracketData.completedMatches.filter(
      match => match.round === roundNumber
    );
    
    if (roundMatches.length === 0) {
      roundContent.innerHTML = `
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
      roundContent.appendChild(courtSection);
    });
  }
  
  /**
   * Confirm editing a previous round
   * @param {number} roundNumber - Round number to edit
   */
  async confirmPreviousRoundEdit(roundNumber) {
    // Ask user to confirm they want to edit a previous round
    const result = await this.showAlert({
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
      this.showLoading('Resetting subsequent rounds...');
      
      const bracketData = this.stateManager.getState('bracketData');
      if (!bracketData) throw new Error('Bracket data not found');
      
      // Create a deep copy of bracket data to modify
      const updatedBracketData = JSON.parse(JSON.stringify(bracketData));
      
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
      
      this.hideLoading();
      
      // Success message
      await this.showAlert({
        title: 'Round Reset',
        text: `Successfully reset to Round ${roundNumber}. You can now edit the results.`,
        icon: 'success',
        timer: 2000
      });
      
      // Show registered players if going back to round 0
      if (roundNumber === 0 && this.elements.registeredPlayersContainer) {
        this.elements.registeredPlayersContainer.style.display = 'block';
      }
    } catch (error) {
      this.hideLoading();
      console.error('Error resetting rounds:', error);
      this.showAlert({
        title: 'Error',
        text: 'Failed to reset rounds. Please try again.',
        icon: 'error'
      });
    }
  }
  
  /**
   * Recalculate standings based on completed matches
   * @param {Object} bracketData - Bracket data to update
   */
  recalculateStandings(bracketData) {
    const players = this.stateManager.getState('players');
    if (!players || !bracketData) return;
    
    // Initialize standings for all players
    bracketData.standings = players.map((player) => ({
      id: player.id,
      name: player.name,
      points: 0,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
    }));

    // Update standings based on completed matches
    bracketData.completedMatches.forEach((match) => {
      const team1Points = match.score1 || 0;
      const team2Points = match.score2 || 0;

      // Update team 1 players
      match.team1.forEach((player) => {
        const standing = bracketData.standings.find((s) => s.id === player.id);
        if (standing) {
          standing.points += team1Points;
          if (team1Points > team2Points) standing.wins++;
          else standing.losses++;
          standing.gamesPlayed++;
        }
      });

      // Update team 2 players
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
  
  /**
   * Render active matches for the current round
   */
  renderMatches() {
    const currentMatches = this.elements.currentMatches;
    const bracketData = this.stateManager.getState('bracketData');
    
    if (!currentMatches || !bracketData) return;
    
    currentMatches.innerHTML = '';
  
    bracketData.courts.forEach((court) => {
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
          currentMatches.appendChild(matchElement);
        }
      });
    });
    
    // If no matches are found, show a message
    if (currentMatches.children.length === 0) {
      currentMatches.innerHTML = `
        <div class="no-matches-message">
          <p>No active matches found for this round.</p>
          <button class="btn-primary" id="generateRoundBtn">Generate Matches for Round ${bracketData.currentRound + 1}</button>
        </div>
      `;
      
      // Add event listener to the generate button
      const generateBtn = document.getElementById('generateRoundBtn');
      if (generateBtn) {
        generateBtn.addEventListener('click', () => this.generateNextRound());
      }
    }
  }
  
  /**
   * Render standings
   */
  renderStandings() {
    const standings = this.elements.standings;
    const bracketData = this.stateManager.getState('bracketData');
    
    if (!standings || !bracketData?.standings?.length) {
      if (standings) {
        standings.innerHTML = '<div class="empty-standings">No standings available</div>';
      }
      return;
    }

    standings.innerHTML = '';

    const sortedStandings = [...bracketData.standings].sort((a, b) => {
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
      standings.appendChild(standingElement);
    });
  }
  
  /**
   * Render registered players (shown before first round)
   */
  renderRegisteredPlayers() {
    const playersGrid = this.elements.playersGrid;
    const registeredPlayersContainer = this.elements.registeredPlayersContainer;
    const bracketData = this.stateManager.getState('bracketData');
    const players = this.stateManager.getState('players');
    
    if (!playersGrid || !players) return;
    
    // Hide registered players section if we're past round 0
    if (bracketData && bracketData.currentRound > 0 && registeredPlayersContainer) {
      registeredPlayersContainer.style.display = 'none';
      return;
    }
    
    // Show the container if we're at round 0
    if (registeredPlayersContainer) {
      registeredPlayersContainer.style.display = 'block';
    }
    
    playersGrid.innerHTML = '';

    const sortedPlayers = [...players].sort((a, b) => (b.ranking || 0) - (a.ranking || 0));
    const numColumns = 4;
    const numRows = Math.ceil(sortedPlayers.length / numColumns);

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

      playersGrid.appendChild(columnDiv);
    });
  }
  
  /**
   * Render game scores for all players
   */
  renderGameScores() {
    const standings = this.elements.standings;
    const bracketData = this.stateManager.getState('bracketData');
    const players = this.stateManager.getState('players');
    
    if (!bracketData || !standings || !players) return;

    // First remove existing table if any
    const existingTable = document.querySelector('.game-score-table');
    if (existingTable) {
      existingTable.remove();
    }

    const gameScoreTable = document.createElement('div');
    gameScoreTable.className = 'game-score-table';

    // Header
    const header = document.createElement('h3');
    header.textContent = 'GameScore Tracking';
    gameScoreTable.appendChild(header);

    // Create scores grid
    const scoreGrid = document.createElement('div');
    scoreGrid.className = 'score-grid';

    players.forEach((player) => {
      const matchPoints = bracketData.completedMatches
        .filter((m) => m.round === bracketData.currentRound)
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
        gameScore = score * 100 + (player.ranking || 0);
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
    if (standings) {
      standings.parentNode.insertBefore(gameScoreTable, standings.nextSibling);
    }
  }
  
  /**
   * Check if all matches in the current round are completed and show tournament end option if appropriate
   */
  checkRoundCompletion() {
    const bracketData = this.stateManager.getState('bracketData');
    if (!bracketData) return;
    
    const allMatchesCompleted = bracketData.courts.every((court) =>
      court.matches.every((m) => m.completed)
    );

    if (allMatchesCompleted && bracketData.currentRound >= 4) {
      this.showTournamentEndOption();
    }
  }
  
  /**
   * Show the option to end the tournament
   */
  showTournamentEndOption() {
    if (document.getElementById('endTournament')) return;
    
    const endTournamentBtn = document.createElement('button');
    endTournamentBtn.id = 'endTournament';
    endTournamentBtn.className = 'btn-primary';
    endTournamentBtn.textContent = 'End Tournament';
    endTournamentBtn.onclick = () => this.endTournament();
    
    // Disable other buttons
    if (this.elements.generateBtn) {
      this.elements.generateBtn.disabled = true;
    }
    
    if (this.elements.resetRoundBtn) {
      this.elements.resetRoundBtn.disabled = true;
    }
    
    if (this.elements.startTimerBtn) {
      this.elements.startTimerBtn.disabled = true;
    }
    
    // Add button to controls
    document.querySelector('.control-buttons')?.appendChild(endTournamentBtn);
  }
  
  /**
   * End the tournament and mark as completed
   */
  async endTournament() {
    const result = await this.showAlert({
      title: 'Are you sure?',
      text: 'This will finalize all standings and complete the tournament.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, end it!',
      cancelButtonText: 'No, keep it',
    });
    
    if (!result.isConfirmed) return;
    
    try {
      this.showLoading('Finalizing tournament...');
      
      const bracketData = this.stateManager.getState('bracketData');
      if (!bracketData) throw new Error('Bracket data not found');
      
      // Update tournament status to completed
      await firebaseService.updateTournament(
        this.selectedTournamentId,
        { 
          status_id: 3, // 3 = completed
          completedDate: new Date().toISOString()
        }
      );
      
      // Add final standings to tournament data
      const finalStandings = bracketData.standings
        .sort((a, b) => b.points - a.points || b.wins - a.wins)
        .map((player, index) => ({
          ...player,
          finalRank: index + 1,
        }));
      
      // Update bracket data with final results
      const updatedBracketData = {
        ...bracketData,
        completed: true,
        finalStandings
      };
      
      await firebaseService.saveTournamentBracket(
        this.selectedTournamentId,
        updatedBracketData
      );
      
      this.hideLoading();
      
      await this.showAlert({
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
      this.hideLoading();
      console.error('Error ending tournament:', error);
      this.showAlert({
        title: 'Error',
        text: 'Failed to end tournament. Please try again.',
        icon: 'error'
      });
    }
  }
  
  /**
   * Generate the next round of matches
   */
  async generateNextRound() {
    const bracketData = this.stateManager.getState('bracketData');
    if (!bracketData) return;
    
    if (!ValidationUtils.canStartNewRound(bracketData)) {
      this.showAlert({
        title: 'Cannot Start New Round',
        text: 'Previous round is not complete! All matches must have scores.',
        icon: 'warning'
      });
      return;
    }

    try {
      // Show loading
      this.showLoading('Generating next round...');
      
      // Clear previous matches
      const updatedBracketData = JSON.parse(JSON.stringify(bracketData));
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
      if (this.elements.registeredPlayersContainer) {
        this.elements.registeredPlayersContainer.style.display = 'none';
      }
      
      this.hideLoading();
      
      // Reset timer
      timerService.reset();
    } catch (error) {
      this.hideLoading();
      console.error('Error generating next round:', error);
      this.showAlert({
        title: 'Error',
        text: 'Failed to generate next round. Please try again.',
        icon: 'error'
      });
    }
  }
  
  /**
   * Generate Mexicano format matches
   * @param {Object} bracketData - Bracket data to update
   */
  async generateMexicanoMatches(bracketData) {
    const players = this.stateManager.getState('players');
    if (!players || !bracketData) return;
    
    if (bracketData.currentRound === 0) {
      await this.generateFirstRound(bracketData, players);
    } else {
      await this.generateSubsequentRound(bracketData);
    }
  }
  
  /**
   * Generate first round matches
   * @param {Object} bracketData - Bracket data to update
   * @param {Array} players - Player list
   */
  async generateFirstRound(bracketData, players) {
    const sortedPlayers = [...players].sort(PlayerSortUtils.byRating);
    
    this.COURT_ORDER.forEach((courtName, index) => {
      const courtPlayers = sortedPlayers.slice(index * 4, (index + 1) * 4);
      if (courtPlayers.length >= 4) {
        const team1 = [courtPlayers[0], courtPlayers[3]];
        const team2 = [courtPlayers[1], courtPlayers[2]];
        this.createMatch(bracketData, courtName, team1, team2, index);
      }
    });
  }
  
  /**
   * Generate matches for subsequent rounds
   * @param {Object} bracketData - Bracket data to update
   */
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
          const scoreA = baseScore * 100 + (playerA.rating || playerA.ranking || 0);
          const scoreB = baseScore * 100 + (playerB.rating || playerB.ranking || 0);

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
  
  /**
   * Check if there are unassigned players
   * @returns {boolean} Whether there are unassigned players
   */
  hasUnassignedPlayers() {
    const players = this.stateManager.getState('players');
    return players.some(p => !this.playerAssignments.has(p.id));
  }
  
  /**
   * Handle conflict resolution for player assignments
   * @param {Object} bracketData - Bracket data to update
   * @returns {Object} Updated bracket data
   */
  async handleConflictResolution(bracketData) {
    // Auto-assign unassigned players
    const players = this.stateManager.getState('players');
    const unassignedPlayers = players.filter(p => !this.playerAssignments.has(p.id));
    
    // Distribute unassigned players to courts that need players
    const courtNeeds = new Map();
    this.COURT_ORDER.forEach(court => {
      const assigned = players.filter(p => this.playerAssignments.get(p.id) === court);
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

  /**
   * Determine the next court based on current court and match result
   * @param {string} currentCourt - Current court
   * @param {string} result - 'win' or 'loss'
   * @returns {string} Next court assignment
   */
  determineNextCourt(currentCourt, result) {
    const courtMovement = {
      'Padel Arenas': {
        win: 'Padel Arenas',
        loss: 'Coolbet',
      },
      'Coolbet': {
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

  /**
   * Create matches for the next round
   * @param {Object} bracketData - Bracket data to update
   */
  createMatchesForRound(bracketData) {
    const players = this.stateManager.getState('players');
    
    this.COURT_ORDER.forEach((courtName, index) => {
      const courtPlayers = players
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
  
  /**
   * Create a match and add it to the bracket data
   * @param {Object} bracketData - Bracket data
   * @param {string} courtName - Court name
   * @param {Array} team1 - Team 1 players
   * @param {Array} team2 - Team 2 players
   * @param {number} courtIndex - Court index
   */
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
  
  /**
   * Reset the current round
   */
  async resetCurrentRound() {
    const bracketData = this.stateManager.getState('bracketData');
    if (!bracketData || bracketData.currentRound === 0) {
      return;
    }

    const result = await this.showAlert({
      title: 'Reset Current Round?',
      text: 'Are you sure you want to reset the current round? This will clear all match scores and standings for this round.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      this.showLoading('Resetting round...');
      
      // Create a deep copy of bracket data to modify
      const updatedBracketData = JSON.parse(JSON.stringify(bracketData));
      
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
      if (updatedBracketData.currentRound === 0 && this.elements.registeredPlayersContainer) {
        this.elements.registeredPlayersContainer.style.display = 'block';
      }

      // Recalculate standings
      this.recalculateStandings(updatedBracketData);
      
      // Save updated bracket data
      await firebaseService.saveTournamentBracket(
        this.selectedTournamentId,
        updatedBracketData
      );
      
      this.hideLoading();
      
      // Reset timer
      timerService.reset();
      
      await this.showAlert({
        title: 'Round Reset',
        text: 'The current round has been reset successfully.',
        icon: 'success',
        timer: 1500
      });
    } catch (error) {
      this.hideLoading();
      console.error('Error resetting round:', error);
      this.showAlert({
        title: 'Error',
        text: 'Failed to reset round. Please try again.',
        icon: 'error'
      });
    }
  }
  
  /**
   * Update match score - implementation from base class
   * @param {string} matchId - Match ID
   * @param {string} scoreType - Score type ('score1' or 'score2')
   * @param {number|null} score - Score value
   * @returns {Promise<boolean>} Success indicator
   */
  async updateMatchScore(matchId, scoreType, score) {
    try {
      const bracketData = this.stateManager.getState('bracketData');
      if (!bracketData) throw new Error('Bracket data not found');
      
      // Create a deep copy of bracket data
      const updatedBracketData = JSON.parse(JSON.stringify(bracketData));
      
      // Find the match
      let matchUpdated = false;
      let foundMatch = null;

      // Look in current matches
      for (const court of updatedBracketData.courts) {
        const matchIndex = court.matches.findIndex((m) => m.id === matchId);
        
        if (matchIndex !== -1) {
          foundMatch = court.matches[matchIndex];
          
          // Update the score
          foundMatch[scoreType] = score;
          
          // Check if match is completed
          foundMatch.completed = foundMatch.score1 !== null && 
                               foundMatch.score2 !== null;
          
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
          
          break;
        }
      }
      
      // If match not found in current matches, check completed matches
      if (!foundMatch) {
        const completedMatchIndex = updatedBracketData.completedMatches.findIndex(
          (m) => m.id === matchId
        );
        
        if (completedMatchIndex !== -1) {
          foundMatch = updatedBracketData.completedMatches[completedMatchIndex];
          foundMatch[scoreType] = score;
          matchUpdated = true;
        }
      }

      // If match not found, return error
      if (!foundMatch) {
        throw new Error(`Match with ID ${matchId} not found`);
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
      
      return true;
    } catch (error) {
      console.error('Error updating match score:', error);
      throw error;
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.tournamentBracket = new MexicanoBracketController();
});

export default MexicanoBracketController;