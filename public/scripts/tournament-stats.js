// Import Firebase service
import firebaseService from './services/firebase-service.js';

/**
 * Tournament Stats class
 * Displays stats for a completed tournament
 */
class TournamentStats {
  constructor() {
    // DOM Elements
    this.elements = {
      tournamentName: document.getElementById('tournamentName'),
      tournamentDate: document.getElementById('tournamentDate'),
      tournamentLocation: document.getElementById('tournamentLocation'),
      tournamentFormat: document.getElementById('tournamentFormat'),
      finalStandings: document.getElementById('finalStandings'),
      roundTabs: document.getElementById('roundTabs'),
      roundContent: document.getElementById('roundContent'),
      playerStats: document.getElementById('playerStats'),
      courtStats: document.getElementById('courtStats')
    };

    // State
    this.tournamentId = localStorage.getItem('selectedTournament');
    this.tournament = null;
    this.bracketData = null;
    this.players = [];
    this.activeRound = 1;

    this.init();
  }

  async init() {
    if (!this.tournamentId) {
      this.redirectToList('No tournament selected');
      return;
    }

    try {
      // Show loading state
      Swal.fire({
        title: 'Loading tournament data...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Load tournament data
      await this.loadTournamentData();

      // Check if tournament is completed
      if (this.tournament.status_id !== 3) { // 3 = completed
        this.redirectToList('This tournament is not completed yet');
        return;
      }

      // Render the tournament stats
      this.renderTournamentInfo();
      this.renderFinalStandings();
      this.renderRoundTabs();
      this.renderStatistics();

      Swal.close();
    } catch (error) {
      console.error('Error initializing tournament stats:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to load tournament data',
        icon: 'error',
        confirmButtonText: 'Go Back'
      }).then(() => {
        window.location.href = 'tournament-list.html';
      });
    }
  }

  async loadTournamentData() {
    // Load tournament details
    this.tournament = await firebaseService.getTournament(this.tournamentId);
    if (!this.tournament) {
      throw new Error('Tournament not found');
    }

    // Load bracket data based on tournament format
    if (this.tournament.format === 'Americano') {
      console.log('Loading Americano format bracket data');
      this.bracketData = await firebaseService.getTournamentBracketAmericano(this.tournamentId);
    } else {
      console.log('Loading standard format bracket data');
      this.bracketData = await firebaseService.getTournamentBracket(this.tournamentId);
    }
    
    if (!this.bracketData) {
      throw new Error('Bracket data not found');
    }

    // Load players
    this.players = await firebaseService.getTournamentPlayers(this.tournamentId);
  }

  redirectToList(message) {
    Swal.fire({
      title: 'Tournament Not Available',
      text: message,
      icon: 'warning',
      confirmButtonText: 'Go Back'
    }).then(() => {
      window.location.href = 'tournament-list.html';
    });
  }

  renderTournamentInfo() {
    // Update tournament info
    this.elements.tournamentName.textContent = this.tournament.name;
    
    // Format date
    let dateString = 'N/A';
    if (this.tournament.start_date) {
      const dateValue = this.tournament.start_date.toDate 
        ? this.tournament.start_date.toDate() 
        : new Date(this.tournament.start_date);
      dateString = dateValue.toLocaleDateString();
    }
    this.elements.tournamentDate.textContent = dateString;
    
    // Set location and format
    this.elements.tournamentLocation.textContent = this.tournament.location || 'N/A';
    this.elements.tournamentFormat.textContent = this.tournament.format || 'N/A';
  }

  renderFinalStandings() {
    if (!this.elements.finalStandings) return;

    // Clear previous content
    this.elements.finalStandings.innerHTML = '';

    // Get sorted standings from bracket data
    const sortedStandings = this.bracketData.finalStandings || 
                            this.getSortedStandings();

    // Render each standing item
    sortedStandings.forEach((player, index) => {
      const standingItem = document.createElement('div');
      standingItem.className = 'standing-item';

      // Calculate win rate
      const winRate = player.gamesPlayed > 0 
        ? ((player.wins / player.gamesPlayed) * 100).toFixed(1) 
        : 0;

      standingItem.innerHTML = `
        <div class="standing-rank">#${index + 1}</div>
        <div class="standing-player">${player.name}</div>
        <div class="standing-score">${player.points || 0} pts</div>
        <div class="standing-winrate">${winRate}% (${player.wins || 0}-${player.losses || 0})</div>
      `;

      this.elements.finalStandings.appendChild(standingItem);
    });

    // Display message if no standings
    if (sortedStandings.length === 0) {
      this.elements.finalStandings.innerHTML = `
        <div class="empty-section">No standings data available</div>
      `;
    }
  }

  getSortedStandings() {
    if (!this.bracketData.standings || this.bracketData.standings.length === 0) {
      return [];
    }

    return [...this.bracketData.standings].sort((a, b) => {
      // Sort by points first
      const pointsDiff = (b.points || 0) - (a.points || 0);
      if (pointsDiff !== 0) return pointsDiff;
      
      // Then by wins
      const winsDiff = (b.wins || 0) - (a.wins || 0);
      if (winsDiff !== 0) return winsDiff;
      
      // Then by losses (fewer is better)
      return (a.losses || 0) - (b.losses || 0);
    });
  }

  renderRoundTabs() {
    if (!this.elements.roundTabs || !this.elements.roundContent) return;

    // Clear previous content
    this.elements.roundTabs.innerHTML = '';
    
    // Determine total rounds
    const totalRounds = this.bracketData.currentRound || 4;
    
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
        
        // Update active round
        this.activeRound = parseInt(roundTab.dataset.round);
        
        // Render round content
        this.renderRoundContent(this.activeRound);
      });
      
      this.elements.roundTabs.appendChild(roundTab);
    }
    
    // Render first round by default
    this.renderRoundContent(this.activeRound);
  }

  renderRoundContent(roundNumber) {
    if (!this.elements.roundContent) return;

    // Clear previous content
    this.elements.roundContent.innerHTML = '';
    
    // Get matches for this round - handle different data structures
    let roundMatches = [];
    
    if (this.tournament.format === 'Americano' && this.bracketData.rounds) {
      // For Americano format, get matches from rounds array
      const roundData = this.bracketData.rounds.find(r => r.number === roundNumber);
      if (roundData && roundData.matches) {
        // Filter for completed matches only
        roundMatches = roundData.matches.filter(m => m.completed);
      }
    } else if (this.bracketData.completedMatches) {
      // For other formats, get from completedMatches array
      roundMatches = this.bracketData.completedMatches.filter(
        match => match.round === roundNumber
      );
    }
    
    if (roundMatches.length === 0) {
      this.elements.roundContent.innerHTML = `
        <div class="empty-section">No match data available for Round ${roundNumber}</div>
      `;
      return;
    }
    
    // Group matches by court
    const courtMatches = {};
    roundMatches.forEach(match => {
      // Handle different property names for court name
      const courtName = match.courtName || match.court || 'Unknown Court';
      
      if (!courtMatches[courtName]) {
        courtMatches[courtName] = [];
      }
      courtMatches[courtName].push(match);
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
            <div class="team-score">${match.score1}</div>
          </div>
          <div class="team-row ${!team1Won ? 'winner' : ''}">
            <div class="team-names">${this.getTeamNames(match.team2)}</div>
            <div class="team-score">${match.score2}</div>
          </div>
        `;
        
        matchesContainer.appendChild(matchCard);
      });
      
      courtSection.appendChild(matchesContainer);
      this.elements.roundContent.appendChild(courtSection);
    });
  }

  getTeamNames(team) {
    if (!team || !Array.isArray(team)) return 'Unknown Team';
    return team.map(player => player.name).join(' & ');
  }

  renderStatistics() {
    this.renderPlayerStats();
    this.renderCourtStats();
  }

  renderPlayerStats() {
    if (!this.elements.playerStats) return;

    // Clear previous content
    this.elements.playerStats.innerHTML = '';

    // Calculate player statistics
    const playerStats = this.calculatePlayerStats();
    
    // Most points
    if (playerStats.mostPoints) {
      const mostPointsItem = document.createElement('div');
      mostPointsItem.className = 'stat-item';
      mostPointsItem.innerHTML = `
        <span class="stat-label">Most Points</span>
        <span class="stat-value">${playerStats.mostPoints.name} (${playerStats.mostPoints.points})</span>
      `;
      this.elements.playerStats.appendChild(mostPointsItem);
    }
    
    // Best win rate
    if (playerStats.bestWinRate) {
      const bestWinRateItem = document.createElement('div');
      bestWinRateItem.className = 'stat-item';
      bestWinRateItem.innerHTML = `
        <span class="stat-label">Best Win Rate</span>
        <span class="stat-value">${playerStats.bestWinRate.name} (${playerStats.bestWinRate.winRate}%)</span>
      `;
      this.elements.playerStats.appendChild(bestWinRateItem);
    }
    
    // Most games played
    if (playerStats.mostGamesPlayed) {
      const mostGamesItem = document.createElement('div');
      mostGamesItem.className = 'stat-item';
      mostGamesItem.innerHTML = `
        <span class="stat-label">Most Games Played</span>
        <span class="stat-value">${playerStats.mostGamesPlayed.name} (${playerStats.mostGamesPlayed.gamesPlayed})</span>
      `;
      this.elements.playerStats.appendChild(mostGamesItem);
    }
    
    // Average points per player
    const avgPointsItem = document.createElement('div');
    avgPointsItem.className = 'stat-item';
    avgPointsItem.innerHTML = `
      <span class="stat-label">Avg Points Per Player</span>
      <span class="stat-value">${playerStats.averagePoints.toFixed(1)}</span>
    `;
    this.elements.playerStats.appendChild(avgPointsItem);
  }

  calculatePlayerStats() {
    const stats = {
      mostPoints: null,
      bestWinRate: null,
      mostGamesPlayed: null,
      averagePoints: 0
    };
    
    if (!this.bracketData.standings || this.bracketData.standings.length === 0) {
      return stats;
    }
    
    let totalPoints = 0;
    let playersWithGames = 0;
    
    this.bracketData.standings.forEach(player => {
      const points = player.points || 0;
      const wins = player.wins || 0;
      const gamesPlayed = player.gamesPlayed || 0;
      const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;
      
      // Track total points for average calculation
      if (gamesPlayed > 0) {
        totalPoints += points;
        playersWithGames++;
      }
      
      // Most points
      if (!stats.mostPoints || points > stats.mostPoints.points) {
        stats.mostPoints = {
          name: player.name,
          points: points
        };
      }
      
      // Best win rate (minimum 2 games played)
      if (gamesPlayed >= 2 && (!stats.bestWinRate || winRate > stats.bestWinRate.winRate)) {
        stats.bestWinRate = {
          name: player.name,
          winRate: winRate.toFixed(1)
        };
      }
      
      // Most games played
      if (!stats.mostGamesPlayed || gamesPlayed > stats.mostGamesPlayed.gamesPlayed) {
        stats.mostGamesPlayed = {
          name: player.name,
          gamesPlayed: gamesPlayed
        };
      }
    });
    
    // Calculate average points
    stats.averagePoints = playersWithGames > 0 ? totalPoints / playersWithGames : 0;
    
    return stats;
  }

  renderCourtStats() {
    if (!this.elements.courtStats) return;

    // Clear previous content
    this.elements.courtStats.innerHTML = '';

    // Calculate court statistics
    const courtStats = this.calculateCourtStats();
    
    // Court with most points
    if (courtStats.mostPoints) {
      const mostPointsItem = document.createElement('div');
      mostPointsItem.className = 'stat-item';
      mostPointsItem.innerHTML = `
        <span class="stat-label">Highest Scoring Court</span>
        <span class="stat-value">${courtStats.mostPoints.name} (${courtStats.mostPoints.points})</span>
      `;
      this.elements.courtStats.appendChild(mostPointsItem);
    }
    
    // Court with closest matches
    if (courtStats.closestMatches) {
      const closestMatchesItem = document.createElement('div');
      closestMatchesItem.className = 'stat-item';
      closestMatchesItem.innerHTML = `
        <span class="stat-label">Most Competitive Court</span>
        <span class="stat-value">${courtStats.closestMatches.name} (${courtStats.closestMatches.avgDiff.toFixed(1)})</span>
      `;
      this.elements.courtStats.appendChild(closestMatchesItem);
    }
    
    // Total matches
    const totalMatchesItem = document.createElement('div');
    totalMatchesItem.className = 'stat-item';
    totalMatchesItem.innerHTML = `
      <span class="stat-label">Total Matches</span>
      <span class="stat-value">${courtStats.totalMatches}</span>
    `;
    this.elements.courtStats.appendChild(totalMatchesItem);
    
    // Average score
    const avgScoreItem = document.createElement('div');
    avgScoreItem.className = 'stat-item';
    avgScoreItem.innerHTML = `
      <span class="stat-label">Average Score</span>
      <span class="stat-value">${courtStats.averageScore.toFixed(1)}</span>
    `;
    this.elements.courtStats.appendChild(avgScoreItem);
  }

  calculateCourtStats() {
    const stats = {
      mostPoints: null,
      closestMatches: null,
      totalMatches: 0,
      averageScore: 0
    };
    
    // Get completed matches based on tournament format
    let completedMatches = [];
    
    if (this.tournament.format === 'Americano' && this.bracketData.rounds) {
      // For Americano format, get completed matches from all rounds
      this.bracketData.rounds.forEach(round => {
        if (round.matches) {
          const roundCompletedMatches = round.matches.filter(m => m.completed);
          completedMatches = completedMatches.concat(roundCompletedMatches);
        }
      });
    } else if (this.bracketData.completedMatches) {
      // For other formats, use completedMatches array
      completedMatches = this.bracketData.completedMatches;
    }
    
    if (completedMatches.length === 0) {
      return stats;
    }
    
    const courtData = {};
    let totalScore = 0;
    
    completedMatches.forEach(match => {
      // Handle different property names for court name
      const courtName = match.courtName || match.court || 'Unknown Court';
      
      // Initialize court data if needed
      if (!courtData[courtName]) {
        courtData[courtName] = {
          name: courtName,
          matches: 0,
          totalPoints: 0,
          scoreDiffs: []
        };
      }
      
      const court = courtData[courtName];
      const score1 = match.score1 || 0;
      const score2 = match.score2 || 0;
      const totalMatchPoints = score1 + score2;
      const scoreDiff = Math.abs(score1 - score2);
      
      // Update court stats
      court.matches++;
      court.totalPoints += totalMatchPoints;
      court.scoreDiffs.push(scoreDiff);
      
      // Update global stats
      stats.totalMatches++;
      totalScore += totalMatchPoints;
    });
    
    // Find court with most points
    Object.values(courtData).forEach(court => {
      if (!stats.mostPoints || court.totalPoints > stats.mostPoints.points) {
        stats.mostPoints = {
          name: court.name,
          points: court.totalPoints
        };
      }
      
      // Calculate average score difference (lower is more competitive)
      const totalDiffs = court.scoreDiffs.reduce((sum, diff) => sum + diff, 0);
      const avgDiff = court.matches > 0 ? totalDiffs / court.matches : 0;
      
      if (court.matches >= 2 && (!stats.closestMatches || avgDiff < stats.closestMatches.avgDiff)) {
        stats.closestMatches = {
          name: court.name,
          avgDiff: avgDiff
        };
      }
    });
    
    // Calculate average score per match
    stats.averageScore = stats.totalMatches > 0 ? totalScore / stats.totalMatches : 0;
    
    return stats;
  }
}

// Initialize the tournament stats page
document.addEventListener('DOMContentLoaded', () => {
  new TournamentStats();
});

export default TournamentStats;
