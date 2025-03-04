// public/scripts/services/americano-service.js

import firebaseService from './firebase-service.js';

/**
 * AmericanoService
 * Handles all Americano format-specific tournament logic
 */
class AmericanoService {
  constructor() {
    // Constants
    this.GROUP_COLORS = ['green', 'blue', 'yellow', 'pink'];
    this.COURT_NAMES = ['Padel Arenas', 'Coolbet', 'Lux Express', '3p Logistics'];
  }

  /**
   * Creates group-based teams according to Americano format rules
   * @param {Array} groups - Object containing players grouped by color
   * @returns {Object} Generated matches
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
    
    return {
      format: 'Americano',
      currentRound: 1,
      rounds: rounds,
      completedMatches: [],
      standings: this.initializeStandings(groups)
    };
  }
  
  /**
   * Creates the mix round (Round 3) for Americano format
   * @param {Object} roundData - The round data object
   * @param {Object} groups - Object containing players grouped by color
   */
  createMixRound(roundData, groups) {
    // Green + Blue mix (Padel Arenas + Coolbet)
    if (groups.green?.length >= 2 && groups.blue?.length >= 2) {
      const greenSorted = this.sortPlayersByRating(groups.green);
      const blueSorted = this.sortPlayersByRating(groups.blue);
      
      // Green 1 & Blue 2 vs Green 2 & Blue 1
      const match1 = this.createMatch(
        `match-r3-green-blue-1`,
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
          `match-r3-green-blue-2`,
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
        `match-r3-yellow-pink-1`,
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
          `match-r3-yellow-pink-2`,
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
   * Creates a match object
   */
  createMatch(id, court, team1, team2, round, groupColor) {
    return {
      id: id,
      court: court,
      team1: team1,
      team2: team2,
      score1: null,
      score2: null,
      completed: false,
      round: round,
      groupColor: groupColor
    };
  }
  
  /**
   * Initializes the rounds structure for Americano format
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
   * Sorts players by rating or group order
   * @param {Array} players - The players to sort
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
   * @param {Object} groups - Object containing players grouped by color
   * @returns {Array} Initial standings
   */
  initializeStandings(groups) {
    const standings = [];
    
    Object.keys(groups).forEach(color => {
      groups[color].forEach(player => {
        standings.push({
          id: player.id,
          name: player.name,
          group: color,
          points: 0,
          gamesPlayed: 0,
          wins: 0,
          losses: 0
        });
      });
    });
    
    return standings;
  }
  
  /**
   * Updates standings based on match results
   * @param {Object} bracketData - Current bracket data
   * @param {Object} match - The match with updated scores
   * @returns {Object} Updated bracket data
   */
  updateStandings(bracketData, match) {
    if (!bracketData.standings || !match.score1 || !match.score2) {
      return bracketData;
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
    
    return bracketData;
  }
  
  /**
   * Saves Americano format bracket data
   * @param {string} tournamentId - Tournament ID
   * @param {Object} bracketData - Bracket data to save
   */
  async saveBracketData(tournamentId, bracketData) {
    try {
      return await firebaseService.saveTournamentBracketAmericano(tournamentId, bracketData);
    } catch (error) {
      console.error('AmericanoService: Error saving bracket data:', error);
      throw error;
    }
  }
  
  /**
   * Gets bracket data for Americano format
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Object>} Bracket data
   */
  async getBracketData(tournamentId) {
    try {
      return await firebaseService.getTournamentBracketAmericano(tournamentId);
    } catch (error) {
      console.error('AmericanoService: Error getting bracket data:', error);
      throw error;
    }
  }
  
  /**
   * Create and save initial bracket data for a new tournament
   * @param {string} tournamentId - Tournament ID
   * @param {Array} players - Tournament players
   */
  async createInitialBracket(tournamentId, players) {
    try {
      // Group players by their assigned group
      const groups = this.groupPlayersByColor(players);
      
      // Generate matches
      const bracketData = this.createAmericanoMatches(groups);
      
      // Save to Firebase
      await this.saveBracketData(tournamentId, bracketData);
      
      return bracketData;
    } catch (error) {
      console.error('AmericanoService: Error creating initial bracket:', error);
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
const americanoService = new AmericanoService();
export default americanoService;