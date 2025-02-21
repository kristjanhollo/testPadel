document.addEventListener('DOMContentLoaded', () => {
    const rankingsList = document.getElementById('rankingsList');
    const searchInput = document.getElementById('playerSearch');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    let players = [];
    let currentFilter = 'rating';

    function loadPlayers() {
        // Load all players
        players = JSON.parse(localStorage.getItem('players') || '[]');
        
        // Initialize ratings if not exists
        players.forEach(player => {
            if (!player.rating) {
                player.rating = 2.0; // Default starting rating
            }
            // Ensure rating is within 0-7 range
            player.rating = Math.max(0, Math.min(7, player.rating));
        });

        // Calculate additional stats for each player
        players = players.map(player => ({
            ...player,
            ...calculatePlayerStats(player)
        }));

        updateRankings();
    }

    function calculatePlayerStats(player) {
        const tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');
        let wins = 0;
        let totalMatches = 0;
        let tournamentsPlayed = new Set();

        tournaments.forEach(tournament => {
            const bracket = JSON.parse(localStorage.getItem(`tournament_${tournament.id}_bracket`) || 'null');
            if (!bracket) return;

            bracket.rounds.forEach(round => {
                round.matches.forEach(match => {
                    if (match.status === 'completed') {
                        const playerInTeam1 = match.team1?.players.some(p => p.id === player.id);
                        const playerInTeam2 = match.team2?.players.some(p => p.id === player.id);

                        if (playerInTeam1 || playerInTeam2) {
                            tournamentsPlayed.add(tournament.id);
                            totalMatches++;
                            if ((playerInTeam1 && match.winner === 'team1') || 
                                (playerInTeam2 && match.winner === 'team2')) {
                                wins++;
                            }
                        }
                    }
                });
            });
        });

        return {
            wins,
            totalMatches,
            winRate: totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : 0,
            tournamentsCount: tournamentsPlayed.size
        };
    }

    function updateRankings(searchTerm = '') {
        let filteredPlayers = [...players];

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredPlayers = filteredPlayers.filter(player =>
                player.name.toLowerCase().includes(term)
            );
        }

        // Apply sorting based on current filter
        filteredPlayers.sort((a, b) => {
            switch (currentFilter) {
                case 'rating':
                    return b.rating - a.rating;
                case 'wins':
                    return b.wins - a.wins;
                case 'tournaments':
                    return b.tournamentsCount - a.tournamentsCount;
                default:
                    return b.rating - a.rating;
            }
        });

        // Render rankings
        rankingsList.innerHTML = filteredPlayers.map((player, index) => `
            <div class="ranking-item" onclick="window.location.href='player-profile.html?id=${player.id}'">
                <div class="rank-col">#${index + 1}</div>
                <div class="player-col">
                    <span class="player-name">${player.name}</span>
                </div>
                <div class="rating-col">${player.rating.toFixed(1)}</div>
                <div class="player-stats">
                    <span>${player.wins}</span>
                    <span>${player.winRate}%</span>
                    <span>${player.tournamentsCount}</span>
                </div>
            </div>
        `).join('');

        // If no players found
        if (filteredPlayers.length === 0) {
            rankingsList.innerHTML = `
                <div class="ranking-item" style="text-align: center; color: #64748b;">
                    No players found
                </div>
            `;
        }
    }

    // Event Listeners
    searchInput.addEventListener('input', (e) => {
        updateRankings(e.target.value);
    });

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Apply filter
            currentFilter = btn.dataset.filter;
            updateRankings(searchInput.value);
        });
    });

    // Initialize
    loadPlayers();

    // Update rankings every minute to reflect any changes
    setInterval(loadPlayers, 60000);
});
