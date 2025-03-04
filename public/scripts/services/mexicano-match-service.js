// public/scripts/services/mexicano-match-service.js

import firebaseService from './firebase-service.js';
import tournamentStateManager from './tournament-state-manager.js';
import playerProfileService from './player-profile-service.js';

/**
 * Mexicano Match Service
 * Handles Mexicano-specific match creation, updates, and scoring
 */
class MexicanoMatchService {
  constructor() {
    // Constants
    this.COURT_ORDER = ['Padel Arenas', 'Coolbet', 'Lux Express', '3p Logistics'];
    
    // Bind methods to maintain 'this' context
    this.createMexicanoBracket = this.createMexicanoBracket.bind(this);
    this.generateFirstRound = this.generateFirstRound.bind(this);
    this.generateSubsequentRound = this.generateSubsequentRound.bind(this);
    this.updateMatchScore = this.updateMatchScore.bind(this);
    this.updateStandings = this.updateStandings.bind(this);
  }
  
  /**
   * Get bracket data from state manager
   * @returns {Object} Bracket data
   */
  getBracketData() {
    return tournamentStateManager.getState('bracketData');
  }
  
  /**
   * Get tournament ID from state manager
   * @returns {string} Tournament ID
   */
  getTournamentId() {
    const tournamentData = tournamentStateManager.getState('tournamentData');
    return tournamentData?.id;
  }
  
  /**
   * Create an initial bracket for Mexicano format
   * @param {Array} players - List of tournament players
   * @returns {Object} Generated bracket data
   */
  createMexicanoBracket(players) {
    // Initialize empty bracket structure
    const bracketData = {
      format: 'Mexicano',
      currentRound: 0,
      courts: this.COURT_ORDER.map(courtName => ({
        name: courtName,
        matches: [],
      })),
      completedMatches: [],
      standings: this.initializeStandings(players)
    };
    
    return bracketData;
  }
  
  /**
   * Generate first round matches for Mexicano format
   * @param {Object} bracketData - Current bracket data
   * @param {Array} players - Players sorted by rating
   * @returns {Object} Updated bracket data
   */
  generateFirstRound(bracketData, players) {
    // Make a copy of the bracket data to avoid modifying the original
    const updatedBracket = JSON.parse(JSON.stringify(bracketData));
    
    // Sort players by rating
    const sortedPlayers = [...players].sort((a, b) => (b.ranking || 0) - (a.ranking || 0));
    
    // Assign players to courts (4 players per court)
    this.COURT_ORDER.forEach((courtName, index) => {
      const courtPlayers = sortedPlayers.slice(index * 4, (index + 1) * 4);
      
      if (courtPlayers.length >= 4) {
        // Create team 1: Players 0 and 3 (highest and lowest rated)
        const team1 = [courtPlayers[0], courtPlayers[3]];
        
        // Create team 2: Players 1 and 2 (middle rated)
        const team2 = [courtPlayers[1], courtPlayers[2]];
        
        // Create match
        const match = {
          id: `match-${Date.now()}-${index}`,
          courtName: courtName,
          team1: team1,
          team2: team2,
          score1: null,
          score2: null,
          completed: false,
          round: 1
        };
        
        // Add match to court
        updatedBracket.courts[index].matches.push(match);
      }
    });
    
    // Update round number
    updatedBracket.currentRound = 1;
    
    return updatedBracket;
  }
  
  /**
   * Generate a subsequent round for Mexicano format
   * @param {Object} bracketData - Current bracket data
   * @returns {Object} Updated bracket data
   */
  generateSubsequentRound(bracketData) {
    // Make a copy of the bracket data to avoid modifying the original
    const updatedBracket = JSON.parse(JSON.stringify(bracketData));
    
    // Clear current matches
    updatedBracket.courts.forEach(court => {
      court.matches = [];
    });
    
    // Get player assignments based on previous round
    const playerAssignments = this.determineNextRoundAssignments(bracketData);
    
    // Assign players to courts
    this.COURT_ORDER.forEach((courtName, index) => {
      const courtPlayers = playerAssignments.filter(assignment => 
        assignment.nextCourt === courtName
      ).map(assignment => assignment.player);
      
      if (courtPlayers.length >= 4) {
        // Sort by game score or rating
        const sortedPlayers = this.sortPlayersByGameScore(courtPlayers, bracketData);
        
        // Create teams based on SNP pattern (1&4 vs 2&3)
        const team1 = [sortedPlayers[0], sortedPlayers[3]];
        const team2 = [sortedPlayers[1], sortedPlayers[2]];
        
        // Create match
        const match = {
          id: `match-${Date.now()}-${index}`,
          courtName: courtName,
          team1: team1,
          team2: team2,
          score1: null,
          score2: null,
          completed: false,
          round: bracketData.currentRound + 1
        };
        
        // Add match to court
        updatedBracket.courts[index].matches.push(match);
      }
    });
    
    // Update round number
    updatedBracket.currentRound++;
    
    return updatedBracket;
  }
  
  /**
   * Determines court assignments for the next round
   * @param {Object} bracketData - Current bracket data
   * @returns {Array} List of player assignments
   */
  determineNextRoundAssignments(bracketData) {
    const assignments = [];
    
    // Process completed matches from current round
    const currentRoundMatches = bracketData.completedMatches.filter(
      match => match.round === bracketData.currentRound
    );
    
    currentRoundMatches.forEach(match => {
      const team1Won = match.score1 > match.score2;
      const currentCourt = match.courtName;
      
      // Assign team 1 players
      match.team1.forEach(player => {
        assignments.push({
          player: player,
          nextCourt: this.determineNextCourt(
            currentCourt, 
            team1Won ? 'win' : 'loss'
          )
        });
      });
      
      // Assign team 2 players
      match.team2.forEach(player => {
        assignments.push({
          player: player,
          nextCourt: this.determineNextCourt(
            currentCourt, 
            team1Won ? 'loss' : 'win'
          )
        });
      });
    });
    
    return assignments;
  }
  
  /**
   * Determines the next court based on current court and result
   * @param {string} currentCourt - Current court name
   * @param {string} result - 'win' or 'loss'
   * @returns {string} Next court name
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
   * Sort players by game score from the last round or by rating
   * @param {Array} players - Players to sort
   * @param {Object} bracketData - Bracket data
   * @returns {Array} Sorted players
   */
  sortPlayersByGameScore(players, bracketData) {
    // Create player scores map
    const playerScores = new Map();
    
    // Calculate game scores for current round
    const currentRoundMatches = bracketData.completedMatches.filter(
      match => match.round === bracketData.currentRound
    );
    
    currentRoundMatches.forEach(match => {
      // Process team 1 players
      match.team1.forEach(player => {
        const gameScore = (match.score1 * 100) + (player.ranking || 0);
        playerScores.set(player.id, gameScore);
      });
      
      // Process team 2 players
      match.team2.forEach(player => {
        const gameScore = (match.score2 * 100) + (player.ranking || 0);
        playerScores.set(player.id, gameScore);
      });
    });
    
    // Sort players by game score or rating if no score
    return [...players].sort((a, b) => {
      const scoreA = playerScores.get(a.id) || a.ranking || 0;
      const scoreB = playerScores.get(b.id) || b.ranking || 0;
      return scoreB - scoreA;
    });
  }
  
  /**
   * Initialize standings for all players
   * @param {Array} players - List of players
   * @returns {Array} Initial standings
   */
  initializeStandings(players) {
    return players.map(player => ({
      id: player.id,
      name: player.name,
      points: 0,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
    }));
  }
  
  /**
   * Update match score and related data
   * @param {string} matchId - Match ID
   * @param {string} scoreType - Score type ('score1' or 'score2')
   * @param {number|null} score - Score value
   * @returns {Promise<boolean>} Success indicator
   */
  async updateMatchScore(matchId, scoreType, score) {
    // Get bracket data from state manager
    const bracketData = this.getBracketData();
    if (!bracketData) {
      throw new Error('Bracket data not found');
    }
    
    // Create a deep copy of bracket data
    const updatedBracket = JSON.parse(JSON.stringify(bracketData));
    
    // Find the match
    let matchFound = false;
    let foundMatch = null;

    // Look in current matches
    for (const court of updatedBracket.courts) {
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
          const existingMatchIndex = updatedBracket.completedMatches.findIndex(
            (m) => m.id === foundMatch.id
          );
          
          if (existingMatchIndex !== -1) {
            updatedBracket.completedMatches[existingMatchIndex] = { ...foundMatch };
          } else {
            updatedBracket.completedMatches.push({ ...foundMatch });
          }
          
          matchFound = true;
          
          // Update standings
          this.updateStandings(updatedBracket, foundMatch);
          
          // Record match results for players (async, don't wait)
          this.recordMatchResultForPlayers(foundMatch, this.getTournamentId())
            .catch(error => console.error('Error recording match results:', error));
        }
        
        break;
      }
    }
    
    // If match not found or not updated, return the original data
    if (!foundMatch) {
      throw new Error('Match not found');
    }
    
    // Save updated bracket data
    try {
      const tournamentId = this.getTournamentId();
      if (!tournamentId) {
        throw new Error('Tournament ID not found');
      }
      
      await firebaseService.saveTournamentBracket(tournamentId, updatedBracket);
      
      // Update state manager with new bracket data
      tournamentStateManager.setState('bracketData', updatedBracket);
      
      return true;
    } catch (error) {
      console.error('Error saving bracket data:', error);
      throw error;
    }
  }
  
  /**
   * Update standings after a match result
   * @param {Object} bracketData - Current bracket data
   * @param {Object} match - Match with scores
   */
  updateStandings(bracketData, match) {
    // Create deep copy of bracket data
    if (!bracketData.standings) {
      bracketData.standings = this.initializeStandings(
        [...match.team1, ...match.team2]
      );
    }
    
    const team1Won = match.score1 > match.score2;
    const winningTeam = team1Won ? match.team1 : match.team2;
    const losingTeam = team1Won ? match.team2 : match.team1;
    
    // Update standings for all players
    [...winningTeam, ...losingTeam].forEach(player => {
      const standing = bracketData.standings.find(s => s.id === player.id);
      
      if (standing) {
        standing.gamesPlayed++;
        
        if (winningTeam.some(p => p.id === player.id)) {
          standing.wins++;
          standing.points += match.score1 > match.score2 ? match.score1 : match.score2;
        } else {
          standing.losses++;
          standing.points += match.score1 > match.score2 ? match.score2 : match.score1;
        }
      }
    });
  }
  
  /**
   * Record match result for players' profiles
   * @param {Object} match - Match data
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<void>}
   */
  async recordMatchResultForPlayers(match, tournamentId) {
    if (!match || !match.completed) return;
    
    try {
      const tournamentData = tournamentStateManager.getState('tournamentData');
      if (!tournamentData) {
        console.warn('Tournament data not available for match recording');
        return;
      }
      
      // Determine winner and loser teams
      const team1Won = match.score1 > match.score2;
      const winningTeam = team1Won ? match.team1 : match.team2;
      const losingTeam = team1Won ? match.team2 : match.team1;
      
      // Format the match data for saving
      const matchData = {
        date: new Date().toISOString(),
        tournament: tournamentData.name || 'Tournament',
        tournamentId,
        round: match.round,
        courtName: match.courtName,
        score1: match.score1,
        score2: match.score2,
        points: team1Won ? match.score1 : match.score2 // Points are the score they got
      };
      
      // Record match for winning team players
      for (const player of winningTeam) {
        if (!player || !player.id) continue;
        
        // Create opponent names string from losing team
        const opponents = losingTeam.map(p => p.name).join(' & ');
        
        // Create player-specific match record
        const playerMatchData = {
          ...matchData,
          won: true,
          result: 'win',
          opponent: opponents,
          vs: losingTeam.map(p => ({ id: p.id, name: p.name })), // Store opponent details
          score: `${match.score1}-${match.score2}`
        };
        
        // Save match to player profile
        await playerProfileService.addMatchToPlayer(player.id, playerMatchData);
      }
      
      // Record match for losing team players
      for (const player of losingTeam) {
        if (!player || !player.id) continue;
        
        // Create opponent names string from winning team
        const opponents = winningTeam.map(p => p.name).join(' & ');
        
        // Create player-specific match record
        const playerMatchData = {
          ...matchData,
          won: false,
          result: 'loss',
          opponent: opponents,
          vs: winningTeam.map(p => ({ id: p.id, name: p.name })), // Store opponent details
          score: `${match.score2}-${match.score1}`
        };
        
        // Save match to player profile
        await playerProfileService.addMatchToPlayer(player.id, playerMatchData);
      }
      
      console.log('Match results recorded for all players');
    } catch (error) {
      console.error('Error recording match results for players:', error);
      throw error;
    }
  }
  
  /**
   * Check if all matches in the current round are completed
   * @param {Object} bracketData - Current bracket data
   * @returns {boolean} Whether all matches are completed
   */
  canAdvanceToNextRound(bracketData) {
    return bracketData.courts.every(court =>
      court.matches.every(match => match.completed)
    );
  }
  
  /**
   * Checks if a tournament is completed (all 4 rounds completed)
   * @param {Object} bracketData - Current bracket data
   * @returns {boolean} Whether the tournament is completed
   */
  isTournamentCompleted(bracketData) {
    return bracketData.currentRound >= 4 && this.canAdvanceToNextRound(bracketData);
  }
  
  /**
   * Prepares the final standings for a completed tournament
   * @param {Object} bracketData - Current bracket data
   * @returns {Array} Final standings sorted by points and wins
   */
  prepareFinalStandings(bracketData) {
    if (!bracketData.standings) {
      return [];
    }
    
    // Sort by points (highest first), then by wins, then by name
    const finalStandings = [...bracketData.standings].sort((a, b) => {
      // Sort by points
      if (b.points !== a.points) return b.points - a.points;
      
      // If points are equal, sort by wins
      if (b.wins !== a.wins) return b.wins - a.wins;
      
      // If all else is equal, sort alphabetically
      return a.name.localeCompare(b.name);
    });
    
    // Add final rank to each player
    finalStandings.forEach((standing, index) => {
      standing.finalRank = index + 1;
    });
    
    return finalStandings;
  }
  
  /**
   * Save bracket data to Firebase
   * @param {string} tournamentId - Tournament ID
   * @param {Object} bracketData - Bracket data to save
   * @returns {Promise<boolean>} Success indicator
   */
  async saveBracketData(tournamentId, bracketData) {
    try {
      await firebaseService.saveTournamentBracket(tournamentId, bracketData);
      return true;
    } catch (error) {
      console.error('Error saving Mexicano bracket data:', error);
      throw error;
    }
  }
  
  /**
   * Complete a tournament and prepare final standings
   * @param {Object} bracketData - Current bracket data
   * @returns {Object} Updated bracket data with final standings
   */
  completeTournament(bracketData) {
    // Check if the tournament is completed
    if (!this.isTournamentCompleted(bracketData)) {
      throw new Error('Not all rounds are completed');
    }
    
    // Create deep copy of bracket data
    const updatedBracket = JSON.parse(JSON.stringify(bracketData));
    
    // Prepare final standings
    const finalStandings = this.prepareFinalStandings(bracketData);
    
    // Update bracket data with final standings
    updatedBracket.finalStandings = finalStandings;
    updatedBracket.completed = true;
    
    return updatedBracket;
  }
}

// Create and export a singleton instance
const mexicanoMatchService = new MexicanoMatchService();
export default mexicanoMatchService;