document.addEventListener('DOMContentLoaded', async () => {
  // Get player ID from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const playerId = urlParams.get('id');

  if (!playerId) {
    window.location.href = 'player-management.html';
    return;
  }

  // Firebase service should be loaded
  if (typeof firebaseService === 'undefined') {
    console.error('Firebase service is not loaded');
    return;
  }

  // State variables
  let playerData = null;
  let matchHistory = [];
  let tournamentHistory = [];
  let groupHistory = [];
  let ratingHistory = [];

  try {
    // Load player data from Firebase
    playerData = await firebaseService.getPlayer(playerId);
    
    if (!playerData) {
      console.error('Player not found');
      window.location.href = 'player-management.html';
      return;
    }

    // Initialize UI with player data
    initializePlayerUI();
    
    // Load match history and other data
    await loadPlayerHistory();
    
    // Render all sections
    renderRatingChart();
    renderMatchHistory();
    renderTournamentHistory();
    renderGroupHistory();
    updateStats();
  } catch (error) {
    console.error('Error loading player data:', error);
    alert('Error loading player data. Please try again later.');
  }

  function initializePlayerUI() {
    // Basic player info
    document.getElementById('playerName').textContent = playerData.name || 'Unknown Player';
    document.getElementById('playerRating').textContent = (playerData.ranking || 0).toFixed(1);
    
    // Member since date
    const memberSinceEl = document.getElementById('memberSince');
    if (playerData.created_at) {
      const date = new Date(playerData.created_at);
      memberSinceEl.textContent = `Member since: ${date.toLocaleDateString()}`;
    } else {
      memberSinceEl.textContent = 'Member since: Unknown';
    }

    // Default group 
    const playerGroup = document.getElementById('playerGroup');
    const groupName = playerData.group || 'Hot'; // Default to Hot group if not specified
    playerGroup.innerHTML = `<span class="group-badge group-${groupName.toLowerCase()}">${groupName} Group</span>`;
  }

  async function loadPlayerHistory() {
    try {
      // In a real implementation, these would be loaded from Firebase or another data source
      // For now, we'll create sample data
      
      // Sample match history
      matchHistory = generateSampleMatches(15); // Last 15 matches
      
      // Sample tournament history
      tournamentHistory = generateSampleTournaments(5);
      
      // Sample group history
      groupHistory = [
        { group: 'Warm', date: '2025-01-10' },
        { group: 'Hot', date: '2025-02-15' }
      ];
      
      // Sample rating history (for the chart)
      ratingHistory = generateSampleRatingHistory(6);
      
    } catch (error) {
      console.error('Error loading player history:', error);
    }
  }

  function updateStats() {
    const wins = matchHistory.filter(m => m.result === 'win').length;
    const totalMatches = matchHistory.length;
    const winRate = totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : 0;

    // Update stats
    document.getElementById('matchesPlayed').textContent = totalMatches;
    document.getElementById('totalWins').textContent = wins;
    document.getElementById('totalLosses').textContent = totalMatches - wins;
    document.getElementById('winRate').textContent = `${winRate}%`;
    document.getElementById('tournamentsPlayed').textContent = tournamentHistory.length;
    
    // Set default ranking (#15)
    document.getElementById('playerRanking').textContent = '#15';
  }

  function renderRatingChart() {
    const chartCanvas = document.getElementById('ratingChart');
    if (!chartCanvas) return;
    
    // Only proceed if we have rating history
    if (ratingHistory.length === 0) {
      chartCanvas.parentElement.innerHTML = '<p class="no-data">No rating history available</p>';
      return;
    }

    // Format data for Chart.js
    const dates = ratingHistory.map(item => new Date(item.date).toLocaleDateString());
    const ratings = ratingHistory.map(item => item.rating);

    // Create chart
    new Chart(chartCanvas, {
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
            displayColors: false,
            callbacks: {
              title: function(tooltipItems) {
                return dates[tooltipItems[0].dataIndex];
              },
              label: function(context) {
                return `Rating: ${context.raw}`;
              }
            }
          }
        }
      }
    });
  }

  function renderMatchHistory() {
    const matchesList = document.getElementById('matchesList');
    if (!matchesList) return;
    
    matchesList.innerHTML = '';

    if (matchHistory.length === 0) {
      matchesList.innerHTML = '<tr><td colspan="6" class="no-data">No match history available</td></tr>';
      return;
    }

    matchHistory.forEach(match => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${new Date(match.date).toLocaleDateString()}</td>
        <td>${match.tournament}</td>
        <td>${match.opponent}</td>
        <td>${match.score}</td>
        <td><span class="result-${match.result}">${match.result === 'win' ? 'Win' : 'Loss'}</span></td>
        <td>${match.points}</td>
      `;
      matchesList.appendChild(row);
    });
  }

  function renderTournamentHistory() {
    const tournamentsList = document.getElementById('tournamentsList');
    if (!tournamentsList) return;
    
    tournamentsList.innerHTML = '';

    if (tournamentHistory.length === 0) {
      tournamentsList.innerHTML = '<div class="no-data">No tournament history available</div>';
      return;
    }

    tournamentHistory.forEach(tournament => {
      const card = document.createElement('div');
      card.className = 'tournament-card';
      card.innerHTML = `
        <div class="tournament-header">
          <div>
            <div class="tournament-name">${tournament.name}</div>
            <div class="tournament-group">${tournament.group} Session</div>
          </div>
          <div class="tournament-date">${new Date(tournament.date).toLocaleDateString()}</div>
        </div>
        <div class="tournament-stats">
          <div class="tournament-stat">
            <div class="tournament-stat-label">Final Position</div>
            <div class="tournament-stat-value">#${tournament.position} of ${tournament.totalPlayers}</div>
          </div>
          <div class="tournament-stat">
            <div class="tournament-stat-label">Points</div>
            <div class="tournament-stat-value">${tournament.points}</div>
          </div>
          <div class="tournament-stat">
            <div class="tournament-stat-label">Games W/L</div>
            <div class="tournament-stat-value">${tournament.gamesWon}/${tournament.gamesLost}</div>
          </div>
        </div>
      `;
      tournamentsList.appendChild(card);
    });
  }

  function renderGroupHistory() {
    const groupHistoryEl = document.getElementById('groupHistory');
    if (!groupHistoryEl) return;
    
    groupHistoryEl.innerHTML = '';

    if (groupHistory.length === 0) {
      groupHistoryEl.innerHTML = '<div class="no-data">No group history available</div>';
      return;
    }

    // Sort by date
    groupHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Create timeline
    groupHistory.forEach((item, index) => {
      const groupEl = document.createElement('span');
      groupEl.className = `timeline-group group-${item.group.toLowerCase()}`;
      groupEl.textContent = `${item.group} (${new Date(item.date).toLocaleDateString()})`;
      groupHistoryEl.appendChild(groupEl);

      // Add arrow if not the last item
      if (index < groupHistory.length - 1) {
        const arrowEl = document.createElement('span');
        arrowEl.className = 'timeline-arrow';
        arrowEl.textContent = '→';
        groupHistoryEl.appendChild(arrowEl);
      }
    });

    // Add current group if different from last
    if (playerData.group && (groupHistory.length === 0 || groupHistory[groupHistory.length - 1].group !== playerData.group)) {
      const arrowEl = document.createElement('span');
      arrowEl.className = 'timeline-arrow';
      arrowEl.textContent = '→';
      groupHistoryEl.appendChild(arrowEl);

      const groupEl = document.createElement('span');
      groupEl.className = `timeline-group group-${playerData.group.toLowerCase()}`;
      groupEl.textContent = `${playerData.group} (Current)`;
      groupHistoryEl.appendChild(groupEl);
    }
  }

  // Helper function to generate sample match data
  function generateSampleMatches(count) {
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
        points: points
      });
    }
    
    // Sort by date (newest first)
    return matches.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Helper function to generate sample tournament data
  function generateSampleTournaments(count) {
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

  // Helper function to generate sample rating history
  function generateSampleRatingHistory(count) {
    const history = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - count);
    
    const startRating = (playerData.ranking || 20) - Math.random() * 5;
    
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
});