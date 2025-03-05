// public/scripts/services/americano-match-service.js

import firebaseService from './firebase-service.js';
import tournamentStateManager from './tournament-state-manager.js';
import playerProfileService from './player-profile-service.js';

/**
 * Americano Match Service
 * Handles Americano-specific match creation, updates, and scoring
 */
class AmericanoMatchService {
  constructor() {
    // Constants
    this.GROUP_COLORS = ['green', 'blue', 'yellow', 'pink'];
    this.COURT_NAMES = ['Padel Arenas', 'Coolbet', 'Lux Express', '3p Logistics'];
    
    // Bind methods to maintain 'this' context
    this.createAmericanoMatches = this.createAmericanoMatches.bind(this);
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
   * Create matches for Americano tournament format
   * @param {Object} groups - Players grouped by color
   * @returns {Object} Generated bracket data
   */
  createAmericanoMatches(groups) {
    const rounds = this.initializeAmericanoRounds();
    
    // Create Round 1 (Americano pattern: 1&4 vs 2&3)
    this.GROUP_COLORS.forEach((color, index) => {
      if (groups[color] && groups[color].length >= 4) {
        // Sort players by rating (or groupOrder if available)
        const sortedPlayers = this.sortPlayersByRating(groups[color]);
        
        // Team 1: Player 1 & Player 4
        const team1 = [sortedPlayers[0], sortedPlayers[3]];
        
        // Team 2: Player 2 & Player 3
        const team2 = [sortedPlayers[1], sortedPlayers[2]];
        
        // Create match
        const match = this.createMatch(
          `match-r1-${color}`,
          this.COURT_NAMES[index],
          team1,
          team2,
          1,
          color
        );
        
        rounds[0].matches.push(match);
      }
    });
    
    // Create Round 2 (Americano pattern: 1&2 vs 3&4)
    this.GROUP_COLORS.forEach((color, index) => {
      if (groups[color] && groups[color].length >= 4) {
        const sortedPlayers = this.sortPlayersByRating(groups[color]);
        
        // Team 1: Player 1 & Player 2
        const team1 = [sortedPlayers[0], sortedPlayers[1]];
        
        // Team 2: Player 3 & Player 4
        const team2 = [sortedPlayers[2], sortedPlayers[3]];
        
        // Create match
        const match = this.createMatch(
          `match-r2-${color}`,
          this.COURT_NAMES[index],
          team1,
          team2,
          2,
          color
        );
        
        rounds[1].matches.push(match);
      }
    });
    
    // Create Round 3 (Mix round)
    this.createMixRound(rounds[2], groups);
    
    // Create Round 4 (Americano pattern: 1&3 vs 2&4)
    this.GROUP_COLORS.forEach((color, index) => {
      if (groups[color] && groups[color].length >= 4) {
        const sortedPlayers = this.sortPlayersByRating(groups[color]);
        
        // Team 1: Player 1 & Player 3
        const team1 = [sortedPlayers[0], sortedPlayers[2]];
        
        // Team 2: Player 2 & Player 4
        const team2 = [sortedPlayers[1], sortedPlayers[3]];
        
        // Create match
        const match = this.createMatch(
          `match-r4-${color}`,
          this.COURT_NAMES[index],
          team1,
          team2,
          4,
          color
        );
        
        rounds[3].matches.push(match);
      }
    });
    
    // Create initial standings from players
    const allPlayers = Object.values(groups).flat();
    const standings = this.initializeStandings(allPlayers);
    
    return {
      format: 'Americano',
      currentRound: 1,
      rounds,
      completedMatches: [],
      standings
    };
  }
  
  /**
   * Create Round 3 mix matches for Americano format
   * @param {Object} roundData - Round 3 data object
   * @param {Object} groups - Players grouped by color
   */
  createMixRound(roundData, groups) {
    // Green + Blue mix (Padel Arenas + Coolbet)
    if (groups.green?.length >= 2 && groups.blue?.length >= 2) {
      const greenSorted = this.sortPlayersByRating(groups.green);
      const blueSorted = this.sortPlayersByRating(groups.blue);
      
      // Green 1 & Blue 2 vs Green 2 & Blue 1
      const match1 = this.createMatch(
        'match-r3-green-blue-1',
        'Mix Round',
        [greenSorted[0], blueSorted[1]],
        [greenSorted[1], blueSorted[0]],
        3,
        'mix'
      );
      
      roundData.matches.push(match1);
      
      // If enough players, create second match
      if (greenSorted.length >= 4 && blueSorted.length >= 4) {
        // Green 3 & Blue 4 vs Green 4 & Blue 3
        const match2 = this.createMatch(
          'match-r3-green-blue-2',
          'Mix Round',
          [greenSorted[2], blueSorted[3]],
          [greenSorted[3], blueSorted[2]],
          3,
          'mix'
        );
        
        roundData.matches.push(match2);
      }
    }
    
    // Yellow + Pink mix (Lux Express + 3p Logistics)
    if (groups.yellow?.length >= 2 && groups.pink?.length >= 2) {
      const yellowSorted = this.sortPlayersByRating(groups.yellow);
      const pinkSorted = this.sortPlayersByRating(groups.pink);
      
      // Yellow 1 & Pink 2 vs Yellow 2 & Pink 1
      const match1 = this.createMatch(
        'match-r3-yellow-pink-1',
        'Mix Round',
        [yellowSorted[0], pinkSorted[1]],
        [yellowSorted[1], pinkSorted[0]],
        3,
        'mix'
      );
      
      roundData.matches.push(match1);
      
      // If enough players, create second match
      if (yellowSorted.length >= 4 && pinkSorted.length >= 4) {
        // Yellow 3 & Pink 4 vs Yellow 4 & Pink 3
        const match2 = this.createMatch(
          'match-r3-yellow-pink-2',
          'Mix Round',
          [yellowSorted[2], pinkSorted[3]],
          [yellowSorted[3], pinkSorted[2]],
          3,
          'mix'
        );
        
        roundData.matches.push(match2);
      }
    }
  }
  
  /**
   * Create a match object
   * @param {string} id - Match ID
   * @param {string} court - Court name
   * @param {Array} team1 - Team 1 players
   * @param {Array} team2 - Team 2 players
   * @param {number} round - Round number
   * @param {string} groupColor - Group color
   * @returns {Object} Match object
   */
  createMatch(id, court, team1, team2, round, groupColor) {
    return {
      id,
      court,
      team1,
      team2,
      score1: null,
      score2: null,
      completed: false,
      round,
      groupColor
    };
  }
  
  /**
   * Initialize rounds structure for Americano format
   * @returns {Array} Array of round objects
   */
  initializeAmericanoRounds() {
    return [
      { number: 1, completed: false, matches: [] },
      { number: 2, completed: false, matches: [] },
      { number: 3, completed: false, matches: [] },
      { number: 4, completed: false, matches: [] }
    ];
  }
  
  /**
   * Sort players by rating or group order
   * @param {Array} players - Players to sort
   * @returns {Array} Sorted players
   */
  sortPlayersByRating(players) {
    // Check if players have groupOrder property
    const hasGroupOrder = players.some(p => typeof p.groupOrder === 'number');
    
    if (hasGroupOrder) {
      // Sort by groupOrder
      return [...players].sort((a, b) => {
        if (typeof a.groupOrder === 'number' && typeof b.groupOrder === 'number') {
          return a.groupOrder - b.groupOrder;
        }
        // Fall back to rating if groupOrder is missing
        return (b.ranking || 0) - (a.ranking || 0);
      });
    } else {
      // Sort by rating
      return [...players].sort((a, b) => (b.ranking || 0) - (a.ranking || 0));
    }
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
      group: player.group || 'unknown',
      points: 0,
      gamesPlayed: 0,
      wins: 0,
      losses: 0
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
    let match = null;
    let matchRound = null;
    
    // Look in current rounds
    for (const round of updatedBracket.rounds) {
      const foundMatch = round.matches.find(m => m.id === matchId);
      if (foundMatch) {
        match = foundMatch;
        matchRound = round;
        break;
      }
    }
    
    if (!match) {
      throw new Error(`Match with ID ${matchId} not found`);
    }
    
    // Update the score
    match[scoreType] = score;
    
    // If one score is valid, check if both scores are now valid
    if (match.score1 !== null && match.score2 !== null) {
      // Mark as completed
      match.completed = true;
      
      // Add to completedMatches if not already there
      const existingMatch = updatedBracket.completedMatches.find(m => m.id === matchId);
      if (existingMatch) {
        // Update existing entry
        Object.assign(existingMatch, match);
      } else {
        // Add new entry
        updatedBracket.completedMatches.push({ ...match });
      }
      
      // Check if all matches in the round are completed
      if (this.isRoundCompleted(updatedBracket, match.round)) {
        if (matchRound) {
          matchRound.completed = true;
        }
      }
      
      // Update standings
      this.updateStandings(updatedBracket, match);
      
      // Record match results for players (async, don't wait)
      this.recordMatchResultForPlayers(match, this.getTournamentId())
        .catch(error => console.error('Error recording match results:', error));
    }
    
    // Save updated bracket data
    try {
      const tournamentId = this.getTournamentId();
      if (!tournamentId) {
        throw new Error('Tournament ID not found');
      }
      
      await firebaseService.saveTournamentBracketAmericano(tournamentId, updatedBracket);
      
      // Update state manager with new bracket data
      tournamentStateManager.setState('bracketData', updatedBracket);
      
      return true;
    } catch (error) {
      console.error('Error saving bracket data:', error);
      throw error;
    }
  }
  
  /**
   * Check if a round is completed
   * @param {Object} bracketData - Bracket data
   * @param {number} roundNumber - Round number
   * @returns {boolean} Whether the round is completed
   */
  isRoundCompleted(bracketData, roundNumber) {
    const round = bracketData.rounds.find(r => r.number === roundNumber);
    if (!round || !round.matches.length) {
      return false;
    }
    
    return round.matches.every(match => match.completed);
  }
  
  /**
   * Update standings based on match results
   * @param {Object} bracketData - Current bracket data
   * @param {Object} match - The match with updated scores
   */
  updateStandings(bracketData, match) {
    if (!bracketData.standings || !match.score1 || !match.score2) {
      return;
    }
    
    const team1Won = match.score1 > match.score2;
    const winningTeam = team1Won ? match.team1 : match.team2;
    const losingTeam = team1Won ? match.team2 : match.team1;
    
    // Update standings for all players in the match
    [...winningTeam, ...losingTeam].forEach(player => {
      const standing = bracketData.standings.find(s => s.id === player.id);
      if (standing) {
        standing.gamesPlayed++;
        
        if (winningTeam.some(p => p.id === player.id)) {
          standing.wins++;
          standing.points += team1Won ? match.score1 : match.score2; // Add actual score points
        } else {
          standing.losses++;
          standing.points += team1Won ? match.score2 : match.score1; // Add actual score points
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
        courtName: match.courtName || match.court,
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
   * Generate the next round in an Americano tournament
   * @param {Object} bracketData - Current bracket data
   * @returns {Object} Updated bracket data with next round
   */
  generateNextRound(bracketData) {
    // Check if current round is completed
    const currentRound = bracketData.currentRound;
    if (!this.isRoundCompleted(bracketData, currentRound)) {
      throw new Error('Current round is not completed');
    }
    
    // Check if we've reached the maximum number of rounds
    if (currentRound >= 4) {
      throw new Error('Maximum number of rounds reached');
    }
    
    // Create deep copy of bracket data
    const updatedBracket = JSON.parse(JSON.stringify(bracketData));
    
    // Update current round
    updatedBracket.currentRound = currentRound + 1;
    
    return updatedBracket;
  }
  
  /**
   * Complete an Americano tournament and prepare final standings
   * @param {Object} bracketData - Current bracket data
   * @returns {Object} Updated bracket data with final standings
   */
  completeTournament(bracketData) {
    // Check if all rounds are completed
    if (!this.isRoundCompleted(bracketData, 4)) {
      throw new Error('Not all rounds are completed');
    }
    
    // Create deep copy of bracket data
    const updatedBracket = JSON.parse(JSON.stringify(bracketData));
    
    // Sort standings by points and wins
    const finalStandings = [...updatedBracket.standings].sort((a, b) => {
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
    
    // Set final standings and mark as completed
    updatedBracket.finalStandings = finalStandings;
    updatedBracket.completed = true;
    
    return updatedBracket;
  }
  
  /**
   * Save bracket data to Firebase
   * @param {string} tournamentId - Tournament ID
   * @param {Object} bracketData - Bracket data to save
   * @returns {Promise<boolean>} Success indicator
   */
  async saveBracketData(tournamentId, bracketData) {
    try {
      await firebaseService.saveTournamentBracketAmericano(tournamentId, bracketData);
      return true;
    } catch (error) {
      console.error('Error saving Americano bracket data:', error);
      throw error;
    }
  }
  
  /**
   * Group players by their color group
   * @param {Array} players - List of players
   * @returns {Object} Players grouped by color
   */
  groupPlayersByColor(players) {
    const groups = {
      green: [],
      blue: [],
      yellow: [],
      pink: []
    };
    
    players.forEach(player => {
      if (player.group && groups[player.group]) {
        groups[player.group].push(player);
      }
    });
    
    // If any group is empty, distribute players based on rating
    const hasEmptyGroups = Object.values(groups).some(group => group.length === 0);
    
    if (hasEmptyGroups) {
      // Reset groups
      this.GROUP_COLORS.forEach(color => {
        groups[color] = [];
      });
      
      // Sort players by rating
      const sortedPlayers = [...players].sort((a, b) => (b.ranking || 0) - (a.ranking || 0));
      
      // Distribute evenly across groups
      const groupSize = Math.ceil(sortedPlayers.length / 4);
      
      sortedPlayers.forEach((player, index) => {
        if (index < groupSize) {
          groups.green.push({...player, group: 'green'});
        } else if (index < groupSize * 2) {
          groups.blue.push({...player, group: 'blue'});
        } else if (index < groupSize * 3) {
          groups.yellow.push({...player, group: 'yellow'});
        } else {
          groups.pink.push({...player, group: 'pink'});
        }
      });
    }
    
    return groups;
  }
}

// Create and export a singleton instance
const americanoMatchService = new AmericanoMatchService();
export default americanoMatchService;