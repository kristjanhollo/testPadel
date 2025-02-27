document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const timerDisplay = document.getElementById('gameTimer');
    const startTimerBtn = document.getElementById('startTimer');
    const resetRoundBtn = document.getElementById('resetRound');
    const completeRoundBtn = document.getElementById('completeRound');
    const saveScoresBtn = document.getElementById('saveScores');
    const resetScoresBtn = document.getElementById('resetScores');
    const generateNextRoundBtn = document.getElementById('generateNextRound');
    
    const tournamentNameElement = document.getElementById('tournamentName');
    const round1Courts = document.getElementById('round1Courts');
    const round2Courts = document.getElementById('round2Courts');
    const round3Courts = document.getElementById('round3Courts');
    const round4Courts = document.getElementById('round4Courts');
    
    const greenGroupPlayers = document.getElementById('greenGroupPlayers');
    const blueGroupPlayers = document.getElementById('blueGroupPlayers');
    const yellowGroupPlayers = document.getElementById('yellowGroupPlayers');
    const pinkGroupPlayers = document.getElementById('pinkGroupPlayers');
    
    // Templates
    const courtCardTemplate = document.getElementById('courtCardTemplate');
    const playerRankingTemplate = document.getElementById('playerRankingTemplate');
    
    // State
    let tournament = null;
    let players = [];
    let bracketData = null;
    let currentRound = 1;
    let courtColors = {
        'Padel Arenas': 'green',
        'Coolbet': 'blue',
        'Lux Express': 'yellow',
        '3p Logistics': 'pink',
        'Mix Round': 'mix'
    };
    
    // Timer Management
    const gameTimer = {
        time: 20 * 60, // 20 minutes in seconds
        isRunning: false,
        interval: null,
        
        start() {
            if (!this.isRunning) {
                this.isRunning = true;
                startTimerBtn.textContent = 'Reset Timer';
                
                this.interval = setInterval(() => {
                    this.time--;
                    this.updateDisplay();
                    
                    if (this.time <= 0) {
                        this.timeUp();
                    }
                }, 1000);
            }
        },
        
        reset() {
            this.time = 20 * 60;
            this.isRunning = false;
            clearInterval(this.interval);
            startTimerBtn.textContent = 'Start Timer';
            this.updateDisplay();
            timerDisplay.classList.remove('time-up');
        },
        
        updateDisplay() {
            const minutes = Math.floor(this.time / 60);
            const seconds = this.time % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        },
        
        timeUp() {
            clearInterval(this.interval);
            this.isRunning = false;
            startTimerBtn.textContent = 'Start Timer';
            timerDisplay.classList.add('time-up');
            alert('Round time is up! Please enter final scores.');
        }
    };

    // Helper Functions
    function getTeamNames(team) {
        return team.map(player => player.name).join(' & ');
    }

    function sortPlayersByRating(playersArray) {
        return [...playersArray].sort((a, b) => {
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            // If ratings are equal, sort by name
            return a.name.localeCompare(b.name);
        });
    }

    function calculateGameScore(player, matchScore) {
        // GameScore = (Points × 100) + Rating
        return (matchScore * 100) + player.rating;
    }

    // Data Loading Functions
    function loadTournamentData() {
        const selectedTournamentId = localStorage.getItem('selectedTournament');
        if (!selectedTournamentId) {
            window.location.href = 'tournament-list.html';
            return;
        }

        const tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');
        tournament = tournaments.find(t => t.id === selectedTournamentId);
        
        if (!tournament) {
            alert('Tournament not found!');
            window.location.href = 'tournament-list.html';
            return;
        }

        tournamentNameElement.textContent = tournament.name + ' - Americano';
        
        loadPlayers();
        bracketData = JSON.parse(localStorage.getItem(`tournament_${tournament.id}_bracket`) || 'null');
        
        if (bracketData) {
            currentRound = bracketData.currentRound || 1;
            renderAllRounds();
            renderStandings();
        } else {
            initializeBracket();
        }

        // Update button states
        updateButtonStates();
    }

    function loadPlayers() {
        const tournamentPlayers = JSON.parse(localStorage.getItem(`tournament_${tournament.id}_players`) || '[]');
        const allPlayers = JSON.parse(localStorage.getItem('players') || '[]');
        
        players = tournamentPlayers.map(tournamentPlayer => {
            const fullPlayer = allPlayers.find(p => p.id === tournamentPlayer.id);
            if (!fullPlayer) return null;
            
            return {
                ...tournamentPlayer,
                ...fullPlayer,
                rating: fullPlayer.rating || 3.5 // Default rating if not set
            };
        }).filter(p => p !== null);
    }

    function initializeBracket() {
        bracketData = {
            format: 'Americano',
            currentRound: 1,
            rounds: [
                { number: 1, completed: false, matches: [] },
                { number: 2, completed: false, matches: [] },
                { number: 3, completed: false, matches: [] },
                { number: 4, completed: false, matches: [] }
            ],
            completedMatches: [],
            standings: players.map(player => ({
                id: player.id,
                name: player.name,
                group: determineInitialGroup(player),
                points: 0,
                gamesPlayed: 0,
                wins: 0,
                losses: 0
            }))
        };
        
        saveBracketData();
        renderAllRounds();
        renderStandings();
    }

    function determineInitialGroup(player) {
        // Sort all players by rating
        const sortedPlayers = sortPlayersByRating(players);
        
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
    
    // Round Generation Functions
    function generateNextRound() {
        if (!confirm(`Are you sure you want to generate Round ${currentRound + 1}?`)) {
            return;
        }
        
        if (currentRound >= 4) {
            alert('Tournament has reached maximum number of rounds.');
            return;
        }
        
        // Check if current round is completed
        const isCurrentRoundComplete = checkRoundCompletion(currentRound);
        if (!isCurrentRoundComplete) {
            alert('Please complete all matches in the current round before generating the next round.');
            return;
        }
        
        // Update standings based on current round results
        updateStandings();
        
        // Generate next round matches
        currentRound++;
        
        if (currentRound === 2) {
            generateRegularRound(currentRound);
        } else if (currentRound === 3) {
            generateMixRound();
        } else if (currentRound === 4) {
            generateRegularRound(currentRound);
        }
        
        bracketData.currentRound = currentRound;
        saveBracketData();
        renderAllRounds();
        
        // Reset timer
        gameTimer.reset();
    }
    
    function generateRegularRound(roundNumber) {
        const roundData = bracketData.rounds.find(r => r.number === roundNumber);
        if (!roundData) return;
        
        roundData.matches = [];
        
        // Group players by their group color
        const groupedPlayers = {
            green: players.filter(p => getPlayerGroupColor(p.id) === 'green'),
            blue: players.filter(p => getPlayerGroupColor(p.id) === 'blue'),
            yellow: players.filter(p => getPlayerGroupColor(p.id) === 'yellow'),
            pink: players.filter(p => getPlayerGroupColor(p.id) === 'pink')
        };
        
        // Generate matches for each group
        generateGroupMatches('green', 'Padel Arenas', groupedPlayers.green, roundData);
        generateGroupMatches('blue', 'Coolbet', groupedPlayers.blue, roundData);
        generateGroupMatches('yellow', 'Lux Express', groupedPlayers.yellow, roundData);
        generateGroupMatches('pink', '3p Logistics', groupedPlayers.pink, roundData);
    }
    
    function generateGroupMatches(groupColor, courtName, groupPlayers, roundData) {
        if (groupPlayers.length < 4) return;
        
        // Sort by rating within group
        const sortedPlayers = sortPlayersByRating(groupPlayers);
        
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
    
    function generateMixRound() {
        const roundData = bracketData.rounds.find(r => r.number === 3);
        if (!roundData) return;
        
        roundData.matches = [];
        
        // Group players by their group color
        const groupedPlayers = {
            green: players.filter(p => getPlayerGroupColor(p.id) === 'green'),
            blue: players.filter(p => getPlayerGroupColor(p.id) === 'blue'),
            yellow: players.filter(p => getPlayerGroupColor(p.id) === 'yellow'),
            pink: players.filter(p => getPlayerGroupColor(p.id) === 'pink')
        };
        
        // Sort each group by standings
        const sortedGroups = {
            green: sortPlayersByStandings(groupedPlayers.green),
            blue: sortPlayersByStandings(groupedPlayers.blue),
            yellow: sortPlayersByStandings(groupedPlayers.yellow),
            pink: sortPlayersByStandings(groupedPlayers.pink)
        };
        
        // Create mix matches according to SNP rules
        // Green + Blue mix
        if (sortedGroups.green.length >= 2 && sortedGroups.blue.length >= 2) {
            // Green 1 & Blue 6 vs Green 2 & Blue 5
            createMixMatch(
                roundData,
                [sortedGroups.green[0], sortedGroups.blue[5]],
                [sortedGroups.green[1], sortedGroups.blue[4]],
                'Mix Round',
                'mix'
            );
            
            // Green 3 & Blue 8 vs Green 4 & Blue 7
            createMixMatch(
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
            createMixMatch(
                roundData,
                [sortedGroups.yellow[0], sortedGroups.pink[3]],
                [sortedGroups.yellow[1], sortedGroups.pink[2]],
                'Mix Round',
                'mix'
            );
            
            // Yellow 11 & Pink 14 vs Yellow 12 & Pink 13
            createMixMatch(
                roundData,
                [sortedGroups.yellow[2], sortedGroups.pink[1]],
                [sortedGroups.yellow[3], sortedGroups.pink[0]],
                'Mix Round',
                'mix'
            );
        }
    }
    
    function createMixMatch(roundData, team1, team2, courtName, groupColor) {
        // Ensure we have complete teams
        if (team1.length !== 2 || team2.length !== 2) return;
        
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
    
    function sortPlayersByStandings(groupPlayers) {
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
    
    function getPlayerGroupColor(playerId) {
        const standing = bracketData.standings.find(s => s.id === playerId);
        return standing ? standing.group : determineInitialGroup(players.find(p => p.id === playerId));
    }
    
    // Rendering Functions
    function renderAllRounds() {
        if (!bracketData) return;
        
        renderRound(1, round1Courts);
        renderRound(2, round2Courts);
        renderRound(3, round3Courts);
        renderRound(4, round4Courts);
        
        // Update button states
        updateButtonStates();
    }
    
    function renderRound(roundNumber, container) {
        container.innerHTML = '';
        
        const roundData = bracketData.rounds.find(r => r.number === roundNumber);
        if (!roundData) return;
        
        roundData.matches.forEach(match => {
            const courtCard = createCourtCard(match);
            container.appendChild(courtCard);
        });
    }
    
    function createCourtCard(match) {
        const template = courtCardTemplate.content.cloneNode(true);
        const courtCard = template.querySelector('.court-card');
        
        // Set court color class
        const colorClass = match.groupColor || courtColors[match.court] || '';
        courtCard.classList.add(colorClass);
        
        // Set court name in header
        const courtHeader = courtCard.querySelector('.court-header');
        courtHeader.textContent = match.court;
        
        // Set team names and scores
        const teamRows = courtCard.querySelectorAll('.team-row');
        
        // Team 1
        const team1NameEl = teamRows[0].querySelector('.team-name');
        const team1ScoreEl = teamRows[0].querySelector('.score-input');
        team1NameEl.textContent = getTeamNames(match.team1);
        team1ScoreEl.value = match.score1 !== null ? match.score1 : '';
        team1ScoreEl.dataset.matchId = match.id;
        team1ScoreEl.dataset.team = 'team1';
        team1ScoreEl.addEventListener('change', handleScoreChange);
        
        // Team 2
        const team2NameEl = teamRows[1].querySelector('.team-name');
        const team2ScoreEl = teamRows[1].querySelector('.score-input');
        team2NameEl.textContent = getTeamNames(match.team2);
        team2ScoreEl.value = match.score2 !== null ? match.score2 : '';
        team2ScoreEl.dataset.matchId = match.id;
        team2ScoreEl.dataset.team = 'team2';
        team2ScoreEl.addEventListener('change', handleScoreChange);
        
        // If match is completed, disable inputs
        if (match.completed) {
            team1ScoreEl.disabled = true;
            team2ScoreEl.disabled = true;
        }
        
        return courtCard;
    }
    
    function renderStandings() {
        if (!bracketData) return;
        
        // Group players by group color
        const groupedStandings = {
            green: [],
            blue: [],
            yellow: [],
            pink: []
        };
        
        bracketData.standings.forEach(standing => {
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
        renderGroupStandings(groupedStandings.green, greenGroupPlayers);
        renderGroupStandings(groupedStandings.blue, blueGroupPlayers);
        renderGroupStandings(groupedStandings.yellow, yellowGroupPlayers);
        renderGroupStandings(groupedStandings.pink, pinkGroupPlayers);
    }
    
    function renderGroupStandings(groupStandings, container) {
        container.innerHTML = '';
        
        groupStandings.forEach((standing, index) => {
            const template = playerRankingTemplate.content.cloneNode(true);
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
    function handleScoreChange(event) {
        const input = event.target;
        const matchId = input.dataset.matchId;
        const team = input.dataset.team;
        const score = parseInt(input.value, 10);
        
        if (isNaN(score) || score < 0) {
            input.value = '';
            return;
        }
        
        updateMatchScore(matchId, team, score);
    }
    
    function updateMatchScore(matchId, team, score) {
        // Find the match in current rounds
        for (const round of bracketData.rounds) {
            const match = round.matches.find(m => m.id === matchId);
            if (match) {
                if (team === 'team1') {
                    match.score1 = score;
                } else if (team === 'team2') {
                    match.score2 = score;
                }
                
                // Auto-complete if both scores are set
                if (match.score1 !== null && match.score2 !== null) {
                    match.completed = true;
                }
                
                saveBracketData();
                updateButtonStates();
                break;
            }
        }
    }
    
    function saveScores() {
        saveBracketData();
        alert('Scores saved successfully!');
    }
    
    function resetScores() {
        if (!confirm('Are you sure you want to reset all scores for the current round?')) {
            return;
        }
        
        const currentRoundData = bracketData.rounds.find(r => r.number === currentRound);
        if (currentRoundData) {
            currentRoundData.matches.forEach(match => {
                match.score1 = null;
                match.score2 = null;
                match.completed = false;
            });
            
            saveBracketData();
            renderAllRounds();
        }
    }
    
    function completeRound() {
        if (!confirm(`Are you sure you want to complete Round ${currentRound}?`)) {
            return;
        }
        
        const isCurrentRoundComplete = checkRoundCompletion(currentRound);
        if (!isCurrentRoundComplete) {
            alert('Please enter scores for all matches in the current round before completing.');
            return;
        }
        
        const currentRoundData = bracketData.rounds.find(r => r.number === currentRound);
        if (currentRoundData) {
            currentRoundData.completed = true;
            
            // Add matches to completed matches
            currentRoundData.matches.forEach(match => {
                bracketData.completedMatches.push({...match});
            });
            
            updateStandings();
            saveBracketData();
            renderStandings();
            
            // Enable generate next round button if not last round
            if (currentRound < 4) {
                generateNextRoundBtn.disabled = false;
            } else {
                alert('Tournament completed successfully!');
                
                // Update tournament status
                tournament.status = 'completed';
                tournament.completedDate = new Date().toISOString();
                
                const tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');
                const tournamentIndex = tournaments.findIndex(t => t.id === tournament.id);
                if (tournamentIndex !== -1) {
                    tournaments[tournamentIndex] = tournament;
                    localStorage.setItem('tournaments', JSON.stringify(tournaments));
                }
            }
        }
    }
    
    function checkRoundCompletion(roundNumber) {
        const roundData = bracketData.rounds.find(r => r.number === roundNumber);
        if (!roundData) return false;
        
        return roundData.matches.every(match => match.completed);
    }
    
    function updateStandings() {
        const currentRoundData = bracketData.rounds.find(r => r.number === currentRound);
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
    
    function resetRound() {
        if (!confirm(`Are you sure you want to reset Round ${currentRound}?`)) {
            return;
        }
        
        const currentRoundData = bracketData.rounds.find(r => r.number === currentRound);
        if (currentRoundData) {
            currentRoundData.matches = [];
            currentRoundData.completed = false;
            
            // Remove completed matches for this round
            bracketData.completedMatches = bracketData.completedMatches.filter(
                match => match.round !== currentRound
            );
            
            // Reset standings (recalculate from scratch)
            resetStandings();
            
            saveBracketData();
            renderAllRounds();
            renderStandings();
        }
    }
    
    function resetStandings() {
        // Reset all standings
        bracketData.standings = players.map(player => {
            const existingStanding = bracketData.standings.find(s => s.id === player.id);
            return {
                id: player.id,
                name: player.name,
                group: existingStanding ? existingStanding.group : determineInitialGroup(player),
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
    
    function updateButtonStates() {
        const isRoundComplete = checkRoundCompletion(currentRound);
        completeRoundBtn.disabled = !isRoundComplete;
        
        const isLastRound = currentRound >= 4;
        generateNextRoundBtn.disabled = !isRoundComplete || isLastRound;
    }
    
    function saveBracketData() {
        localStorage.setItem(`tournament_${tournament.id}_bracket`, JSON.stringify(bracketData));
    }
    
    // Event Listeners
    startTimerBtn.addEventListener('click', () => {
        if (gameTimer.isRunning) {
            gameTimer.reset();
        } else {
            gameTimer.start();
        }
    });
    
    resetRoundBtn.addEventListener('click', resetRound);
    completeRoundBtn.addEventListener('click', completeRound);
    saveScoresBtn.addEventListener('click', saveScores);
    resetScoresBtn.addEventListener('click', resetScores);
    generateNextRoundBtn.addEventListener('click', generateNextRound);
    
    // Initialize
    loadTournamentData();
    gameTimer.updateDisplay();
});