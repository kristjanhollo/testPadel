document.addEventListener('DOMContentLoaded', () => {
    // Get player ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('id');

    if (!playerId) {
        window.location.href = 'tournament-list.html';
        return;
    }

    // Initialize player data
    let playerData = null;
    let matchHistory = [];
    let tournamentHistory = [];
    let ratingHistory = [];

    function loadPlayerData() {
        // Load player profile
        const players = JSON.parse(localStorage.getItem('players') || '[]');
        playerData = players.find(p => p.id === playerId);

        if (!playerData) {
            window.location.href = 'tournament-list.html';
            return;
        }

        // Initialize if not exists
            if (!playerData.rating) {
                playerData.rating = 3.5; // Default starting rating
            }
            if (!playerData.ratingHistory) {
                playerData.ratingHistory = [{
                    date: new Date().toISOString(),
                    rating: playerData.rating
                }];
            }
            // Ensure rating is within 0-7 range
            playerData.rating = Math.max(0, Math.min(7, playerData.rating));

        document.getElementById('playerName').textContent = playerData.name;
        document.getElementById('playerRating').textContent = playerData.rating.toFixed(1);
    }

    function loadMatchHistory() {
        const tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');
        matchHistory = [];
        tournamentHistory = new Set();

        tournaments.forEach(tournament => {
            const bracket = JSON.parse(localStorage.getItem(`tournament_${tournament.id}_bracket`) || 'null');
            if (!bracket) return;

            bracket.rounds.forEach(round => {
                round.matches.forEach(match => {
                    if (match.status === 'completed') {
                        const playerInTeam1 = match.team1?.players.some(p => p.id === playerId);
                        const playerInTeam2 = match.team2?.players.some(p => p.id === playerId);

                        if (playerInTeam1 || playerInTeam2) {
                            tournamentHistory.add(tournament.id);
                            matchHistory.push({
                                date: match.completedDate || tournament.date,
                                tournament: tournament.name,
                                team1: match.team1.name,
                                team2: match.team2.name,
                                score: match.score,
                                isWinner: (playerInTeam1 && match.winner === 'team1') || 
                                         (playerInTeam2 && match.winner === 'team2')
                            });
                        }
                    }
                });
            });
        });

        // Sort matches by date
        matchHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        updateMatchHistory();
        updateStats();
    }

    function updateMatchHistory() {
        const matchesList = document.getElementById('matchesList');
        matchesList.innerHTML = '';

        matchHistory.forEach(match => {
            const matchEl = document.createElement('div');
            matchEl.className = `match-item ${match.isWinner ? 'win' : 'loss'}`;
            matchEl.innerHTML = `
                <div class="match-date">${new Date(match.date).toLocaleDateString()}</div>
                <div class="match-details">
                    <div class="match-tournament">${match.tournament}</div>
                    <div class="match-teams">${match.team1} vs ${match.team2}</div>
                </div>
                <div class="match-score">${match.score.team1}-${match.score.team2}</div>
            `;
            matchesList.appendChild(matchEl);
        });
    }

    function updateStats() {
        const wins = matchHistory.filter(m => m.isWinner).length;
        const totalMatches = matchHistory.length;
        const winRate = totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : 0;

        // Update stats
        document.getElementById('matchesPlayed').textContent = totalMatches;
        document.getElementById('totalWins').textContent = wins;
        document.getElementById('totalLosses').textContent = totalMatches - wins;
        document.getElementById('winRate').textContent = `${winRate}%`;
        document.getElementById('tournamentsPlayed').textContent = tournamentHistory.size;

        // Calculate tournament wins
        const tournamentWins = calculateTournamentWins();
        document.getElementById('tournamentWins').textContent = tournamentWins;

        // Calculate total sets won
        const setsWon = calculateSetsWon();
        document.getElementById('setsWon').textContent = setsWon;

        // Update player ranking
        updatePlayerRanking();
    }

    function calculateTournamentWins() {
        const tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');
        let wins = 0;

        tournaments.forEach(tournament => {
            const bracket = JSON.parse(localStorage.getItem(`tournament_${tournament.id}_bracket`) || 'null');
            if (bracket && bracket.rounds.length > 0) {
                const finalRound = bracket.rounds[bracket.rounds.length - 1];
                const finalMatch = finalRound.matches[0];
                
                if (finalMatch && finalMatch.status === 'completed') {
                    const winningTeam = finalMatch[finalMatch.winner];
                    if (winningTeam && winningTeam.players.some(p => p.id === playerId)) {
                        wins++;
                    }
                }
            }
        });

        return wins;
    }

    function calculateSetsWon() {
        return matchHistory.reduce((total, match) => {
            const isTeam1 = match.team1.includes(playerData.name);
            const score = isTeam1 ? match.score.team1 : match.score.team2;
            return total + score;
        }, 0);
    }

    function updatePlayerRanking() {
        const players = JSON.parse(localStorage.getItem('players') || '[]');
        const rankedPlayers = players
            .filter(p => p.rating)
            .sort((a, b) => b.rating - a.rating);
        
        const rank = rankedPlayers.findIndex(p => p.id === playerId) + 1;
        document.getElementById('playerRanking').textContent = `#${rank}`;
    }

    function updateRatingChart() {
        const ratingChart = document.getElementById('ratingChart');
        // For now, just show a placeholder
        // In a real implementation, you would use a charting library like Chart.js
        ratingChart.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #64748b;">
                Rating history visualization will be implemented with a charting library
            </div>
        `;
    }

    function updateTournamentHistory() {
        const tournamentsList = document.getElementById('tournamentsList');
        tournamentsList.innerHTML = '';

        const tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');
        const playerTournaments = Array.from(tournamentHistory).map(id => {
            const tournament = tournaments.find(t => t.id === id);
            const bracket = JSON.parse(localStorage.getItem(`tournament_${id}_bracket`) || 'null');
            
            let result = 'Participated';
            if (bracket) {
                const finalRound = bracket.rounds[bracket.rounds.length - 1];
                const finalMatch = finalRound.matches[0];
                if (finalMatch && finalMatch.status === 'completed') {
                    const winningTeam = finalMatch[finalMatch.winner];
                    if (winningTeam && winningTeam.players.some(p => p.id === playerId)) {
                        result = 'Winner';
                    } else {
                        const lastPlayerMatch = matchHistory.find(m => 
                            m.tournament === tournament.name
                        );
                        result = lastPlayerMatch ? `Eliminated in ${lastPlayerMatch.round}` : 'Participated';
                    }
                }
            }

            return {
                ...tournament,
                result
            };
        });

        playerTournaments.sort((a, b) => new Date(b.date) - new Date(a.date));

        playerTournaments.forEach(tournament => {
            const tournamentEl = document.createElement('div');
            tournamentEl.className = 'tournament-item';
            tournamentEl.innerHTML = `
                <div class="tournament-date">${new Date(tournament.date).toLocaleDateString()}</div>
                <div class="tournament-info">
                    <div class="tournament-name">${tournament.name}</div>
                    <div class="tournament-result">${tournament.result}</div>
                </div>
            `;
            tournamentsList.appendChild(tournamentEl);
        });
    }

    function updateAchievements() {
        const achievementsGrid = document.getElementById('achievementsGrid');
        const achievements = calculateAchievements();

        achievementsGrid.innerHTML = achievements.map(achievement => `
            <div class="achievement-item">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
            </div>
        `).join('');
    }

    function calculateAchievements() {
        const achievements = [];
        const wins = matchHistory.filter(m => m.isWinner).length;
        const tournamentWins = calculateTournamentWins();

        if (wins >= 10) {
            achievements.push({
                icon: '🏆',
                name: 'Victory Master',
                description: 'Won 10+ matches'
            });
        }

        if (tournamentWins >= 1) {
            achievements.push({
                icon: '👑',
                name: 'Tournament Champion',
                description: 'Won a tournament'
            });
        }

        if (matchHistory.length >= 20) {
            achievements.push({
                icon: '🎮',
                name: 'Dedicated Player',
                description: 'Played 20+ matches'
            });
        }

        if (playerData.rating >= 6.0) {
            achievements.push({
                icon: '⭐',
                name: 'Elite Player',
                description: 'Reached 6.0+ rating'
            });
        }

        return achievements;
    }

    // Initialize everything
    loadPlayerData();
    loadMatchHistory();
    updateRatingChart();
    updateTournamentHistory();
    updateAchievements();
});
