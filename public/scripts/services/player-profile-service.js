import firebaseService from './firebase-service';
import playerProfileService from './player-profile-service';

/**
 * Player Profile class
 * Manages the display and interaction for individual player profiles
 */
class PlayerProfile {
  constructor() {
    // DOM Elements
    this.playerNameEl = document.getElementById('playerName');
    this.playerRatingEl = document.getElementById('playerRating');
    this.memberSinceEl = document.getElementById('memberSince');
    this.playerGroupEl = document.getElementById('playerGroup');
    this.matchesPlayedEl = document.getElementById('matchesPlayed');
    this.totalWinsEl = document.getElementById('totalWins');
    this.totalLossesEl = document.getElementById('totalLosses');
    this.winRateEl = document.getElementById('winRate');
    this.tournamentsPlayedEl = document.getElementById('tournamentsPlayed');
    this.playerRankingEl = document.getElementById('playerRanking');
    this.matchesListEl = document.getElementById('matchesList');
    this.tournamentsListEl = document.getElementById('tournamentsList');
    this.groupHistoryEl = document.getElementById('groupHistory');
    this.ratingChartContainer = document.getElementById('ratingChartContainer');
    
    // State variables
    this.playerId = null;
    this.playerData = null;
    this.matchHistory = [];
    this.tournamentHistory = [];
    this.groupHistory = [];
    this.ratingHistory = [];
    this.ratingChartInstance = null;
    
    // Initialize
    this.init();
  }
  
  async init() {
    console.log('Player profile service initialized');
  
    try {
      // Check if we're on the player profile page
      const isProfilePage = window.location.pathname.includes('player-profile.html');
      
      // Get player ID from URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      this.playerId = urlParams.get('id');
      console.log('Player ID from URL:', this.playerId);
      
      // Only require player ID on the profile page
      if (!this.playerId) {
        if (isProfilePage) {
          console.error('No player ID provided');
          alert('No player ID provided');
          window.location.href = 'player-management.html';
          return;
        } else {
          // On other pages, just log a debug message and continue
          console.debug('No player ID in URL (not on profile page)');
          return; // Exit early as no player data is needed
        }
      }
      
      // Continue only if we have a player ID (either on profile page or other pages)
      
      // Verify Firebase service is available
      if (typeof firebaseService === 'undefined') {
        console.error('Firebase service is not available');
        throw new Error('Firebase service not found. Please check your setup.');
      }
      
      // Show loading indicator
      if (isProfilePage) {
        Swal.fire({
          title: 'Loading player data...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
      }
      
      // Load player data from Firebase
      console.log('Fetching player data from Firebase...');
      this.playerData = await firebaseService.getPlayer(this.playerId);
      console.log('Player data received:', this.playerData);
      
      if (!this.playerData) {
        if (isProfilePage) {
          console.error('Player not found');
          alert('Player not found');
          window.location.href = 'player-management.html';
          return;
        } else {
          console.warn('Player not found, but not on profile page');
          return;
        }
      }
      
      // Only continue with UI updates if on profile page
      if (isProfilePage) {
        // Initialize UI with player data
        this.initializePlayerUI();
        
        // Load data for the player
        await this.loadPlayerData();
        
        // Render all sections
        this.renderRatingChart();
        this.renderMatchHistory();
        this.renderTournamentHistory();
        this.renderGroupHistory();
        this.updateStats();
        
        // Close loading indicator
        Swal.close();
      }
    } catch (error) {
      console.error('Error loading player profile:', error);
      
      // Only show error UI if on profile page
      if (window.location.pathname.includes('player-profile.html')) {
        try {
          Swal.close();
          Swal.fire({
            title: 'Error',
            text: 'Error loading player profile: ' + error.message,
            icon: 'error'
          });
        } catch (e) {
          // Fallback if Swal is not available
          alert('Error loading player profile: ' + error.message);
        }
      }
    }
  }
  
  initializePlayerUI() {
    console.log('Initializing UI with player data');
    
    // Basic player info
    if (this.playerNameEl) this.playerNameEl.textContent = this.playerData.name || 'Unknown Player';
    if (this.playerRatingEl) this.playerRatingEl.textContent = (this.playerData.ranking || 0).toFixed(1);
    
    // Member since date
    if (this.memberSinceEl && this.playerData.created_at) {
      // Format the date based on whether it's a Firestore timestamp or a string
      if (this.playerData.created_at.toDate) {
        // Firestore timestamp
        const date = this.playerData.created_at.toDate();
        this.memberSinceEl.textContent = `Member since: ${date.toLocaleDateString()}`;
      } else {
        // Regular date string
        const date = new Date(this.playerData.created_at);
        this.memberSinceEl.textContent = `Member since: ${date.toLocaleDateString()}`;
      }
    } else if (this.memberSinceEl) {
      this.memberSinceEl.textContent = 'Member since: -';
    }
    
    // Player group (defaulting to 'Hot' if not specified)
    if (this.playerGroupEl) {
      const groupName = this.playerData.group || 'Hot';
      this.playerGroupEl.innerHTML = `<span class="group-badge group-${groupName.toLowerCase()}">${groupName} Group</span>`;
    }
  }
  
  async loadPlayerData() {
    console.log('Loading player data from services');
    
    try {
      // Show loading spinner or indicator for this section
      if (this.matchesListEl) this.matchesListEl.innerHTML = '<tr><td colspan="6" class="loading">Loading match history...</td></tr>';
      if (this.tournamentsListEl) this.tournamentsListEl.innerHTML = '<div class="loading">Loading tournament history...</div>';
      
      // Load real data from Firebase using the player profile service
      const [matchHistory, tournamentHistory, ratingHistory, playerRanking, groupHistory] = await Promise.all([
        playerProfileService.getPlayerMatches(this.playerId),
        playerProfileService.getPlayerTournaments(this.playerId),
        playerProfileService.getPlayerRatingHistory(this.playerId),
        playerProfileService.getPlayerRanking(this.playerId),
        playerProfileService.getPlayerGroupHistory(this.playerId)
      ]);
      
      console.log('Player data loaded:', { 
        matches: matchHistory.length, 
        tournaments: tournamentHistory.length, 
        ratings: ratingHistory.length,
        ranking: playerRanking,
        groupHistory: groupHistory.length
      });
      
      // Update state with loaded data
      this.matchHistory = matchHistory;
      this.tournamentHistory = tournamentHistory;
      this.ratingHistory = ratingHistory;
      this.playerRanking = playerRanking;
      this.groupHistory = groupHistory;
      
      // If we have no real data yet, use sample data for demonstration
      if (this.matchHistory.length === 0) {
        console.log('No match history found, using sample data');
        this.matchHistory = this.generateSampleMatches(15);
      }
      
      if (this.tournamentHistory.length === 0) {
        console.log('No tournament history found, using sample data');
        this.tournamentHistory = this.generateSampleTournaments(5);
      }
      
      if (this.ratingHistory.length === 0) {
        console.log('No rating history found, using sample data');
        this.ratingHistory = this.generateSampleRatingHistory(6);
      }
      
      if (!this.playerRanking) {
        this.playerRanking = Math.floor(Math.random() * 20) + 1; // Random rank 1-20
      }
      
      if (this.groupHistory.length === 0) {
        console.log('No group history found, using sample data');
        this.groupHistory = [
          { group: 'Warm', date: '2025-01-10' },
          { group: this.playerData.group || 'Hot', date: '2025-02-15' }
        ];
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error loading player data:', error);
      
      // Fall back to sample data on error
      console.log('Using sample data due to error');
      this.matchHistory = this.generateSampleMatches(15);
      this.tournamentHistory = this.generateSampleTournaments(5);
      this.ratingHistory = this.generateSampleRatingHistory(6);
      this.groupHistory = [
        { group: 'Warm', date: '2025-01-10' },
        { group: this.playerData.group || 'Hot', date: '2025-02-15' }
      ];
      this.playerRanking = Math.floor(Math.random() * 20) + 1;
      
      return Promise.reject(error);
    }
  }

  async loadPlayerProfile(playerId) {
    if (!playerId) {
      console.warn('No player ID provided, skipping profile loading');
      return;
    }
    
    try {
      return await playerProfileService.getPlayerProfile(playerId);
    } catch (error) {
      console.error('Error loading player profile:', error);
    }
  }


  updateStats() {
    console.log('Updating player statistics display');
    
    // Get stats from player data or calculate from match history
    const stats = this.playerData.stats || {};
    const wins = stats.wins || this.matchHistory.filter(m => m.result === 'win' || m.won === true).length;
    const totalMatches = stats.matchesPlayed?.length || this.matchHistory.length;
    const winRate = totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : 0;
    const tournamentsPlayed = stats.tournamentsPlayed?.length || this.tournamentHistory.length;
    
    // Update stats in UI
    if (this.matchesPlayedEl) this.matchesPlayedEl.textContent = totalMatches;
    if (this.totalWinsEl) this.totalWinsEl.textContent = wins;
    if (this.totalLossesEl) this.totalLossesEl.textContent = totalMatches - wins;
    if (this.winRateEl) this.winRateEl.textContent = `${winRate}%`;
    if (this.tournamentsPlayedEl) this.tournamentsPlayedEl.textContent = tournamentsPlayed;
    
    // Set ranking
    if (this.playerRankingEl) this.playerRankingEl.textContent = `#${this.playerRanking || '-'}`;
  }
  
  renderRatingChart() {
    console.log('Rendering rating history chart');
    
    // Get the container element
    if (!this.ratingChartContainer) {
      console.error('Rating chart container not found');
      return;
    }
    
    // Only proceed if we have rating history
    if (this.ratingHistory.length === 0) {
      console.warn('No rating history data available');
      this.ratingChartContainer.innerHTML = '<p class="no-data">No rating history available</p>';
      return;
    }
    
    // Clean up any existing chart
    if (this.ratingChartInstance) {
      console.log('Destroying existing chart instance');
      this.ratingChartInstance.destroy();
      this.ratingChartInstance = null;
    }
    
    // Remove the old canvas and create a new one to avoid any Chart.js caching issues
    this.ratingChartContainer.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'ratingChart';
    this.ratingChartContainer.appendChild(canvas);
    
    // Format data for Chart.js
    const dates = this.ratingHistory.map(item => new Date(item.date).toLocaleDateString());
    const ratings = this.ratingHistory.map(item => item.rating);
    
    // Create chart and store the instance
    this.ratingChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Player Rating',
          data: ratings,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#2563eb'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: Math.max(0, Math.min(...ratings) - 5),
            max: Math.max(...ratings) + 5,
            title: {
              display: true,
              text: 'Rating'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#1e293b',
            bodyColor: '#1e293b',
            titleFont: {
              weight: 'bold'
            },
            bodyFont: {
              size: 14
            },
            borderColor: '#e2e8f0',
            borderWidth: 1,
            padding: 10,
            displayColors: false
          }
        }
      }
    });
  }
  
  renderMatchHistory() {
    console.log('Rendering match history');
    
    if (!this.matchesListEl) {
      console.error('Matches list element not found');
      return;
    }
    
    this.matchesListEl.innerHTML = '';
    
    if (this.matchHistory.length === 0) {
      this.matchesListEl.innerHTML = '<tr><td colspan="6" class="no-data">No match history available</td></tr>';
      return;
    }
    
    this.matchHistory.forEach(match => {
      const row = document.createElement('tr');
      
      // Format date
      const matchDate = match.date ? new Date(match.date).toLocaleDateString() : 'N/A';
      
      // Determine if the match was won or lost
      const result = match.won || match.result === 'win' ? 'win' : 'loss';
      
      // Format score (handles different data structures)
      let score = match.score || 'N/A';
      if (Array.isArray(match.score)) {
        score = match.score.join('-');
      } else if (match.score1 !== undefined && match.score2 !== undefined) {
        score = `${match.score1}-${match.score2}`;
      }
      
      row.innerHTML = `
        <td>${matchDate}</td>
        <td>${match.tournament || match.venue || 'Friendly Match'}</td>
        <td>${match.opponent || (match.vs ? match.vs.join(' & ') : 'Unknown')}</td>
        <td>${score}</td>
        <td><span class="result-${result}">${result === 'win' ? 'Win' : 'Loss'}</span></td>
        <td>${match.points || '-'}</td>
      `;
      this.matchesListEl.appendChild(row);
    });
  }
  
  renderTournamentHistory() {
    console.log('Rendering tournament history');
    
    if (!this.tournamentsListEl) {
      console.error('Tournaments list element not found');
      return;
    }
    
    this.tournamentsListEl.innerHTML = '';
    
    if (this.tournamentHistory.length === 0) {
      this.tournamentsListEl.innerHTML = '<div class="no-data">No tournament history available</div>';
      return;
    }
    
    this.tournamentHistory.forEach(tournament => {
      const card = document.createElement('div');
      card.className = 'tournament-card';
      
      // Format date
      const tournamentDate = tournament.date ? new Date(tournament.date).toLocaleDateString() : 'N/A';
      
      card.innerHTML = `
        <div class="tournament-header">
          <div>
            <div class="tournament-name">${tournament.name}</div>
            <div class="tournament-group">${tournament.group || 'Standard'} Session</div>
          </div>
          <div class="tournament-date">${tournamentDate}</div>
        </div>
        <div class="tournament-stats">
          <div class="tournament-stat">
            <div class="tournament-stat-label">Final Position</div>
            <div class="tournament-stat-value">#${tournament.position || tournament.finalRank || '-'} of ${tournament.totalPlayers || '-'}</div>
          </div>
          <div class="tournament-stat">
            <div class="tournament-stat-label">Points</div>
            <div class="tournament-stat-value">${tournament.points || '-'}</div>
          </div>
          <div class="tournament-stat">
            <div class="tournament-stat-label">Games W/L</div>
            <div class="tournament-stat-value">${tournament.gamesWon || 0}/${tournament.gamesLost || 0}</div>
          </div>
        </div>
      `;
      this.tournamentsListEl.appendChild(card);
    });
  }
  
  renderGroupHistory() {
    console.log('Rendering group history');
    
    if (!this.groupHistoryEl) {
      console.error('Group history element not found');
      return;
    }
    
    this.groupHistoryEl.innerHTML = '';
    
    if (this.groupHistory.length === 0) {
      this.groupHistoryEl.innerHTML = '<div class="no-data">No group history available</div>';
      return;
    }
    
    // Sort by date
    this.groupHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Create timeline
    this.groupHistory.forEach((item, index) => {
      const groupEl = document.createElement('span');
      groupEl.className = `timeline-group group-${item.group.toLowerCase()}`;
      groupEl.textContent = `${item.group} (${new Date(item.date).toLocaleDateString()})`;
      this.groupHistoryEl.appendChild(groupEl);
      
      // Add arrow if not the last item
      if (index < this.groupHistory.length - 1) {
        const arrowEl = document.createElement('span');
        arrowEl.className = 'timeline-arrow';
        arrowEl.textContent = '→';
        this.groupHistoryEl.appendChild(arrowEl);
      }
    });
    
    // Add current group if different from last
    if (this.playerData.group && (this.groupHistory.length === 0 || 
        this.groupHistory[this.groupHistory.length - 1].group !== this.playerData.group)) {
      const arrowEl = document.createElement('span');
      arrowEl.className = 'timeline-arrow';
      arrowEl.textContent = '→';
      this.groupHistoryEl.appendChild(arrowEl);
      
      const groupEl = document.createElement('span');
      groupEl.className = `timeline-group group-${this.playerData.group.toLowerCase()}`;
      groupEl.textContent = `${this.playerData.group} (Current)`;
      this.groupHistoryEl.appendChild(groupEl);
    }
  }
  
  // Helper functions for sample data generation in case real data isn't available yet
  generateSampleMatches(count) {
    const tournaments = ['Sunday Night Padel', 'Weekend Cup', 'Community League'];
    const opponents = [
      'Carlos Mendez & Antonio Carter',
      'Raul Gonzalez & Olivia Kim',
      'DaKrote Jackson & Grace Li',
      'Miguel Fernandez & Kasha Johnson'
    ];
    
    const matches = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    for (let i = 0; i < count; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i * 7); // One match per week
      
      const isWin = Math.random() > 0.4; // 60% win rate
      const points = (Math.random() * 5 + 20).toFixed(1); // Random points between 20-25
      
      matches.push({
        date: date.toISOString(),
        tournament: tournaments[i % tournaments.length],
        opponent: opponents[i % opponents.length],
        score: isWin ? '7-5' : '5-7',
        result: isWin ? 'win' : 'loss',
        won: isWin,
        points: points
      });
    }
    
    // Sort by date (newest first)
    return matches.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  
  generateSampleTournaments(count) {
    const tournamentNames = ['Sunday Night Padel', 'Weekend Cup', 'Community League'];
    const groups = ['Hot', 'Sweat', 'Warm', 'Star'];
    
    const tournaments = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    
    for (let i = 0; i < count; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      
      const position = Math.floor(Math.random() * 8) + 1; // Random position 1-8
      const totalPlayers = 16;
      const points = (Math.random() * 10 + 20).toFixed(1); // Random points between 20-30
      
      tournaments.push({
        id: `tour-${i}`,
        name: tournamentNames[i % tournamentNames.length],
        date: date.toISOString(),
        group: groups[i % groups.length],
        position: position,
        totalPlayers: totalPlayers,
        points: points,
        gamesWon: Math.floor(Math.random() * 15) + 5, // 5-20 games won
        gamesLost: Math.floor(Math.random() * 10) + 1 // 1-10 games lost
      });
    }
    
    // Sort by date (newest first)
    return tournaments.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  
  generateSampleRatingHistory(count) {
    const history = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - count);
    
    const startRating = (this.playerData.ranking || 20) - Math.random() * 5;
    
    for (let i = 0; i < count; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      
      // Gradually increase rating with some randomness
      const rating = startRating + (i * 0.5) + (Math.random() * 2 - 1);
      
      history.push({
        date: date.toISOString(),
        rating: Math.max(1, Math.min(40, rating)).toFixed(1)
      });
    }
    
    return history;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PlayerProfile();
});

export default PlayerProfile;