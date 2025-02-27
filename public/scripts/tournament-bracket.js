document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements

  loadTournamentData();
 
});
  
const timerDisplay = document.getElementById('gameTimer');
const generateBtn = document.getElementById('generateBracket');
const startTimerBtn = document.getElementById('startTimer');
const resetRoundBtn = document.getElementById('resetRound');
const playerCountEl = document.getElementById('playerCount');
const roundCountEl = document.getElementById('roundCount');
const currentMatches = document.getElementById('currentMatches');
const standings = document.getElementById('standings');
const registeredPlayersContainer =
    document.getElementById('registeredPlayers');
const playersGrid = registeredPlayersContainer.querySelector('.players-grid');
const formatSelect = document.getElementById('formatSelect');
const selectedTournamentId = localStorage.getItem('selectedTournament');

let tournamentPlayers = JSON.parse(
  localStorage.getItem(`tournament_${selectedTournamentId}_players`) || '[]'
);


   
let tournament = null;
let players = [];
let bracketData = null;
let unassignedPlayers = [];
let incompleteCourts = [];
let playerAssignments = new Map();
let playerPartnerships = new Map();
const COURT_ORDER = [
  'Padel Arenas',
  'Coolbet',
  'Lux Express',
  '3p Logistics',
];
players = tournamentPlayers;
loadPlayers();
// Utility Objectsw
const GameScoreUtils = {
  calculateGameScore(player, match) {
    const baseRating = player.ranking;
    const isTeam1 = match.team1.some((p) => p.id === player.id);
    const points = isTeam1 ? match.score1 : match.score2;
    return points * 100 + baseRating;
  },

  getLatestGameScore(player, completedMatches, currentRound) {
    const lastMatch = completedMatches
      .filter((m) => m.round === currentRound)
      .find(
        (m) =>
          m.team1.some((p) => p.id === player.id) ||
            m.team2.some((p) => p.id === player.id)
      );

    return lastMatch
      ? this.calculateGameScore(player, lastMatch)
      : player.ranking;
  },

  calculateAveragePoints(player, completedMatches) {
    const playerMatches = completedMatches.filter((match) =>
      [...match.team1, ...match.team2].some((p) => p.id === player.id)
    );

    if (!playerMatches.length) return 0;

    const totalPoints = playerMatches.reduce((sum, match) => {
      const isTeam1 = match.team1.some((p) => p.id === player.id);
      return sum + (isTeam1 ? match.score1 : match.score2);
    }, 0);

    return totalPoints / playerMatches.length;
  },
};

const PlayerSortUtils = {
  byRating(a, b) {
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }
    return a.name.localeCompare(b.name);
  },

  byGameScore(a, b, completedMatches, currentRound) {
    const aScore = GameScoreUtils.getLatestGameScore(
      a,
      completedMatches,
      currentRound
    );
    const bScore = GameScoreUtils.getLatestGameScore(
      b,
      completedMatches,
      currentRound
    );
    if (bScore !== aScore) {
      return bScore - aScore;
    }
    return a.name.localeCompare(b.name);
  },

  byStandings(a, b, standings) {
    const aStanding = standings.find((s) => s.id === a.id);
    const bStanding = standings.find((s) => s.id === b.id);
    const pointsDiff = (bStanding?.points || 0) - (aStanding?.points || 0);
    if (pointsDiff !== 0) return pointsDiff;
    return (bStanding?.wins || 0) - (aStanding?.wins || 0);
  },
};

const ValidationUtils = {
  isValidScore(score1, score2) {
    if (score1 === null || score2 === null) return true; // Allow unset scores
    if (!Number.isInteger(score1) || !Number.isInteger(score2)) return false;
    if (score1 < 0 || score2 < 0) return false;
    if (score1 > 10 || score2 > 10) return false;
    return true;
  },

  canStartNewRound(bracketData) {
    if (!bracketData) return false;
    if (bracketData.currentRound >= 4) return false;

    return !bracketData.courts.some((court) =>
      court.matches.some((match) => !match.completed)
    );
  },

  hasValidPlayerCount(players) {
    return players.length >= 4 && players.length % 4 === 0;
  },

  hasValidFormat(format) {
    return ['Mexicano', 'Americano'].includes(format);
  },
};

const ConflictUtils = {
  calculateCourtAssignments() {
    const assignments = new Map();
    COURT_ORDER.forEach((court) => {
      assignments.set(
        court,
        players.filter((p) => playerAssignments.get(p.id) === court)
      );
    });
    return assignments;
  },

  findIncompleteCourts(assignments) {
    return Array.from(assignments.entries())
      .filter(([_, players]) => players.length > 0 && players.length < 4)
      .map(([court, currentPlayers]) => ({
        name: court,
        currentPlayers,
        neededPlayers: 4 - currentPlayers.length,
      }));
  },
};

// Timer Management
const gameTimer = {
  time: 20 * 60,
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
    startTimerBtn.textContent = 'Start Timer';
    clearInterval(this.interval);
    this.updateDisplay();
    timerDisplay.classList.remove('time-up');
  },

  updateDisplay() {
    const minutes = Math.floor(this.time / 60);
    const seconds = this.time % 60;
    timerDisplay.textContent = `${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  },

  timeUp() {
    clearInterval(this.interval);
    this.isRunning = false;
    startTimerBtn.textContent = 'Start Timer';
    timerDisplay.classList.add('time-up');
    alert('Round time is up! Please enter final scores.');
  },
};

// Helper Functions
function getTeamNames(team) {
  return team.map((player) => player.name).join(' & ');
}

function generateNextRound() {
  if (!ValidationUtils.hasValidPlayerCount(players)) {
    alert('Invalid number of players. Need multiple of 4 players.');
    return;
  }

  if (!ValidationUtils.canStartNewRound(bracketData)) {
    alert(
      'Cannot start new round. Previous round incomplete or maximum rounds reached.'
    );
    return;
  }

  // Clear previous matches
  bracketData.courts.forEach((court) => {
    court.matches = [];
  });
    
  // Generate matches based on format
  if (tournament.format === 'Mexicano') {
    generateMexicanoMatches();
    if (checkForConflicts()) {
      return; // Stop if there are conflicts
    }
  } else if (tournament.format === 'Americano') {
    generateAmericanoMatches();
  } else {
    alert('Invalid tournament format');
    return;
  }

  // Update round and display
  bracketData.currentRound++;
  roundCountEl.textContent = `Round ${bracketData.currentRound}/4`;
  registeredPlayersContainer.style.display = 'none';

  // Update displays
  renderGameScores();
  saveBracketData();
  renderMatches();
  gameTimer.reset();
}

function generateFirstRound() {
  const sortedPlayers = [...players].sort(PlayerSortUtils.byRating);
  COURT_ORDER.forEach((courtName, index) => {
    const courtPlayers = sortedPlayers.slice(index * 4, (index + 1) * 4);
    if (courtPlayers.length >= 4) {
      const team1 = [courtPlayers[0], courtPlayers[3]];
      const team2 = [courtPlayers[1], courtPlayers[2]];
      createMatch(courtName, team1, team2, index);
    }
  });
}

function generateMexicanoMatches() {
  if (bracketData.currentRound === 0) {
    generateFirstRound();
  } else {
    generateSubsequentRound();
  }
}
function loadAmericanoView(container) {
  // HTML struktuuri loomine
  document.querySelector('.tournament-content').style.display = 'none';
  container.innerHTML = `
    <div class="rounds-container">
        ${Array(4)
    .fill(0)
    .map(
      (_, i) => `
            <div class="round">
                <div class="round-header">
                    <div>Round ${i + 1}/4</div>
                    <div class="round-status status-${i === 0 ? 'progress' : 'upcoming'}">
                        ${i === 0 ? 'In Progress' : 'Upcoming'}
                    </div>
                </div>
                
                ${COURT_ORDER.map(
    (court) => `
                    <div class="match-container" id="match-${i + 1}-${court.replace(/\s+/g, '-')}">
                        <div class="team ${getTeamColor(court)}">
                            <div class="player-row">
                                <span data-player-slot="team1-p1"></span>
                                <span class="score">-</span>
                            </div>
                            <div class="player-row">
                                <span data-player-slot="team1-p2"></span>
                            </div>
                        </div>
                        <div class="court-name">${court}</div>
                        <div class="team ${getTeamColor(court)}">
                            <div class="player-row">
                                <span data-player-slot="team2-p1"></span>
                                <span class="score">-</span>
                            </div>
                            <div class="player-row">
                                <span data-player-slot="team2-p2"></span>
                            </div>
                        </div>
                    </div>
                `
  ).join('')}
            </div>
        `
    )
    .join('')}
    </div>


            
            <div class="groups-container">
                <div class="group green">
                    <div class="group-title">Green Group</div>
                    <!-- Green group stats -->
                </div>
                <div class="group blue">
                    <div class="group-title">Blue Group</div>
                    <!-- Blue group stats -->
                </div>
                <div class="group yellow">
                    <div class="group-title">Yellow Group</div>
                    <!-- Yellow group stats -->
                </div>
                <div class="group purple">
                    <div class="group-title">Purple Group</div>
                    <!-- Purple group stats -->
                </div>
            </div>
        `;

  // Helper funktsioonid
  function getTeamColor(court) {
    const colorMap = {
      'Padel Arenas': 'green',
      'Coolbet': 'blue',
      'Lux Express': 'yellow',
      '3p Logistics': 'purple',
    };
    return colorMap[court] || '';
  }

  // Laeme andmed ja renderdame need
  loadAmericanoData();
}

function loadAmericanoData() {
  const bracketData = JSON.parse(
    localStorage.getItem(`tournament_${selectedTournamentId}_bracket`)
  );
  console.log(bracketData);
  if (!bracketData) {
    initializeAmericanoBracket();
    return;
  }

  if (bracketData.currentRound === 1) {
    const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);
    bracketData.courts.forEach((court, courtIndex) => {
      const startIndex = courtIndex * 4;
      const courtPlayers = sortedPlayers.slice(startIndex, startIndex + 4);
      console.log(courtPlayers[0].name);
      console.log('-courtPlayers-');
      console.log(courtIndex);
        

      const matchContainer = document.getElementById(`match-1-${court.name.replace(/\s+/g, '-')}`);

      if (!matchContainer) {
        console.error(`Match container not found for court: ${court.name}`);
        return;
      }


      matchContainer.querySelector('[data-player-slot="team1-p1"]').textContent = courtPlayers[0]?.name || '';
      matchContainer.querySelector('[data-player-slot="team1-p2"]').textContent = courtPlayers[3]?.name || '';


      matchContainer.querySelector('[data-player-slot="team2-p1"]').textContent = courtPlayers[1]?.name || '';
      matchContainer.querySelector('[data-player-slot="team2-p2"]').textContent = courtPlayers[2]?.name || '';
    });
  }

  // Update groups
  updateAmericanoGroups();
}
function initializeAmericanoBracket() {
  const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);
  console.log(sortedPlayers);
  bracketData = {
    format: 'Americano',
    currentRound: 1,
    courts: COURT_ORDER.map((court, index) => {
      const startIndex = index * 4;
      const courtPlayers = sortedPlayers.slice(startIndex, startIndex + 4);
      return {
        name: court,
        matches: [
          {
            id: `match-${Date.now()}-${court}`,
            team1: [courtPlayers[0], courtPlayers[3]],
            team2: [courtPlayers[1], courtPlayers[2]],
            score1: null,
            score2: null,
            completed: false,
            round: 1,
            courtName: court,
          },
        ],
      };
    }),
    completedMatches: [],
    groups: {
      green: sortedPlayers.slice(0, 4),
      blue: sortedPlayers.slice(4, 8),
      yellow: sortedPlayers.slice(8, 12),
      purple: sortedPlayers.slice(12, 16),
    },
  };
  console.log(bracketData);

  saveBracketData();
}

function updateAmericanoGroups() {
  const groups = document.querySelectorAll('.groups-container .group');
  const groupColors = ['green', 'blue', 'yellow', 'purple'];

  groups.forEach((groupEl, index) => {
    const color = groupColors[index];
    const groupPlayers = bracketData.groups[color];

    groupEl.innerHTML = `
                <div class="group-title">${
  color.charAt(0).toUpperCase() + color.slice(1)
} Group</div>
                ${groupPlayers
    .map(
      (player) => `
                    <div class="group-player">
                        <div>${player.name}</div>
                        <div class="record">${getPlayerRecord(player)}</div>
                        <div class="points">${getPlayerPoints(player)}</div>
                    </div>
                `
    )
    .join('')}
            `;
  });
}

function getPlayerRecord(player) {
  const matches = bracketData.completedMatches.filter(
    (m) =>
      m.team1.some((p) => p.id === player.id) ||
        m.team2.some((p) => p.id === player.id)
  );

  const wins = matches.filter((m) => {
    const isTeam1 = m.team1.some((p) => p.id === player.id);
    return isTeam1 ? m.score1 > m.score2 : m.score2 > m.score1;
  }).length;

  return `${wins}-${matches.length - wins}`;
}

function getPlayerPoints(player) {
  const matches = bracketData.completedMatches.filter(
    (m) =>
      m.team1.some((p) => p.id === player.id) ||
        m.team2.some((p) => p.id === player.id)
  );

  return matches.reduce((total, m) => {
    const isTeam1 = m.team1.some((p) => p.id === player.id);
    return total + (isTeam1 ? m.score1 : m.score2);
  }, 0);
}

function renderGameScores() {
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

    let gameScore = player.ranking; // Base score is player's rating
    if (matchPoints) {
      const score = matchPoints.team1.some((p) => p.id === player.id)
        ? matchPoints.score1
        : matchPoints.score2;
      gameScore = score * 100 + player.ranking;
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
  const standings = document.getElementById('standings');
  if (standings) {
    standings.parentNode.insertBefore(gameScoreTable, standings.nextSibling);
  }
}

// Funktsioon, mis määrab kuhu mängija järgmises ringis liigub
function determineNextCourt(currentCourt, result) {
  const courtMovement = {
      'Padel Arenas': {
          'win': 'Padel Arenas',
          'loss': 'Coolbet'
      },
      'Coolbet': {
          'win': 'Padel Arenas',
          'loss': 'Lux Express'
      },
      'Lux Express': {
          'win': 'Coolbet',
          'loss': '3p Logistics'
      },
      '3p Logistics': {
          'win': 'Lux Express',
          'loss': '3p Logistics'
      }
  };
  
  return courtMovement[currentCourt][result];
}

// Järgmise ringi mängude genereerimise funktsioon
function generateSubsequentRound() {
  console.log("===== ALUSTAME UUESTI JÄRGMISE RINGI GENEREERIMIST =====");
  playerAssignments.clear();
  
  // 1. SAMM: Arvuta GameScore'id kõigile mängijatele
  const playerGameScores = new Map();
  const previousMatches = bracketData.completedMatches
      .filter(m => m.round === bracketData.currentRound);
  
  previousMatches.forEach(match => {
      match.team1.forEach(player => {
          const gameScore = (match.score1 * 100) + (player.ranking || player.rating || 0);
          playerGameScores.set(player.id, gameScore);
      });
      
      match.team2.forEach(player => {
          const gameScore = (match.score2 * 100) + (player.ranking || player.rating || 0);
          playerGameScores.set(player.id, gameScore);
      });
  });
  
  console.log("GameScore'id arvutatud:", 
      [...playerGameScores.entries()].map(([id, score]) => 
          `${players.find(p => p.id === id)?.name}: ${score}`).join(", "));
  
  // 2. SAMM: Töötle KÕIGEPEALT viigilised mängud
  console.log("\n===== VIIKIDE TÖÖTLEMINE =====");
  const viigilisedMängud = previousMatches.filter(m => m.score1 === m.score2);
  
  viigilisedMängud.forEach(match => {
      console.log(`VIIK väljakul ${match.courtName}: ${getTeamNames(match.team1)} (${match.score1}) vs ${getTeamNames(match.team2)} (${match.score2})`);
      
      // Tiim 1 võrdlus
      const player1 = match.team1[0];
      const player2 = match.team1[1];
      const score1 = playerGameScores.get(player1.id);
      const score2 = playerGameScores.get(player2.id);
      
      console.log(`  Tiim 1: ${player1.name} (${score1}) vs ${player2.name} (${score2})`);
      if (score1 > score2) {
          playerAssignments.set(player1.id, determineNextCourt(match.courtName, 'win'));
          playerAssignments.set(player2.id, determineNextCourt(match.courtName, 'loss'));
          console.log(`    ${player1.name} -> ${determineNextCourt(match.courtName, 'win')}`);
          console.log(`    ${player2.name} -> ${determineNextCourt(match.courtName, 'loss')}`);
      } else {
          playerAssignments.set(player1.id, determineNextCourt(match.courtName, 'loss'));
          playerAssignments.set(player2.id, determineNextCourt(match.courtName, 'win'));
          console.log(`    ${player1.name} -> ${determineNextCourt(match.courtName, 'loss')}`);
          console.log(`    ${player2.name} -> ${determineNextCourt(match.courtName, 'win')}`);
      }
      
      // Tiim 2 võrdlus
      const player3 = match.team2[0];
      const player4 = match.team2[1];
      const score3 = playerGameScores.get(player3.id);
      const score4 = playerGameScores.get(player4.id);
      
      console.log(`  Tiim 2: ${player3.name} (${score3}) vs ${player4.name} (${score4})`);
      if (score3 > score4) {
          playerAssignments.set(player3.id, determineNextCourt(match.courtName, 'win'));
          playerAssignments.set(player4.id, determineNextCourt(match.courtName, 'loss'));
          console.log(`    ${player3.name} -> ${determineNextCourt(match.courtName, 'win')}`);
          console.log(`    ${player4.name} -> ${determineNextCourt(match.courtName, 'loss')}`);
      } else {
          playerAssignments.set(player3.id, determineNextCourt(match.courtName, 'loss'));
          playerAssignments.set(player4.id, determineNextCourt(match.courtName, 'win'));
          console.log(`    ${player3.name} -> ${determineNextCourt(match.courtName, 'loss')}`);
          console.log(`    ${player4.name} -> ${determineNextCourt(match.courtName, 'win')}`);
      }
  });
  
  // 3. SAMM: Töötle mitteviigilised mängud
  console.log("\n===== VÕITUDE/KAOTUSTE TÖÖTLEMINE =====");
  const tavalised = previousMatches.filter(m => m.score1 !== m.score2);
  
  tavalised.forEach(match => {
      const winner = match.score1 > match.score2 ? 'team1' : 'team2';
      const loser = winner === 'team1' ? 'team2' : 'team1';
      
      console.log(`Mäng väljakul ${match.courtName}: ${getTeamNames(match[winner])} võitis ${getTeamNames(match[loser])}`);
      
      match[winner].forEach(player => {
          playerAssignments.set(player.id, determineNextCourt(match.courtName, 'win'));
          console.log(`  ${player.name} (võitja) -> ${determineNextCourt(match.courtName, 'win')}`);
      });
      
      match[loser].forEach(player => {
          playerAssignments.set(player.id, determineNextCourt(match.courtName, 'loss'));
          console.log(`  ${player.name} (kaotaja) -> ${determineNextCourt(match.courtName, 'loss')}`);
      });
  });
  
  // 4. SAMM: Kontrolli väljakute mängijate nimekirju
  console.log("\n===== LÕPLIKUD VÄLJAKUTE NIMEKIRJAD =====");
  COURT_ORDER.forEach(court => {
      const courtPlayers = players.filter(p => playerAssignments.get(p.id) === court);
      console.log(`${court}: ${courtPlayers.map(p => p.name).join(", ")}`);
  });
  
  // 5. SAMM: Loo paarid igal väljakul
  createMatchesForRound(playerGameScores);
}

// Funktsioon paaride moodustamiseks järgmiseks ringiks
function createMatchesForRound(playerGameScores) {
  // Logi ülevaade kõigist mängijatest väljakutel enne töötlemist
  console.log("===== MÄNGIJAD IGAL VÄLJAKUL ENNE PAARIDE MOODUSTAMIST =====");
  COURT_ORDER.forEach(court => {
      const courtPlayers = players.filter(p => playerAssignments.get(p.id) === court);
      console.log(`${court}: ${courtPlayers.map(p => p.name).join(", ")}`);
  });

  COURT_ORDER.forEach((courtName, index) => {
      console.log(`\n----- TÖÖTLEN VÄLJAKUT: ${courtName} -----`);
      
      // Leia mängijad sellel väljakul
      const courtPlayers = players.filter(p => playerAssignments.get(p.id) === courtName);
      console.log(`Leitud ${courtPlayers.length} mängijat: ${courtPlayers.map(p => p.name).join(", ")}`);
      
      // Kontrolli, kas väljakul on piisavalt mängijaid
      if (courtPlayers.length >= 4) {
          // Logi enne sorteerimist
          console.log("ENNE SORTEERIMIST:", 
              courtPlayers.map(p => `${p.name} (${playerGameScores.get(p.id) || p.ranking || 0})`).join(", "));
          
          // Sorteeri mängijad GameScore'i järgi (kõrgeimast madalaimale)
          courtPlayers.sort((a, b) => {
              const aGameScore = playerGameScores.get(a.id) || a.ranking || 0;
              const bGameScore = playerGameScores.get(b.id) || b.ranking || 0;
              return bGameScore - aGameScore;
          });
          
          // Logi pärast sorteerimist
          console.log("PÄRAST SORTEERIMIST:", 
              courtPlayers.map((p, i) => `${i+1}. ${p.name} (${playerGameScores.get(p.id) || p.ranking || 0})`).join(", "));
          
          // SNP sammud dokumendi kohaselt: 1&4 vs 2&3
          const team1 = [courtPlayers[0], courtPlayers[3]];  // 1. ja 4. mängija
          const team2 = [courtPlayers[1], courtPlayers[2]];  // 2. ja 3. mängija
          
          console.log(`PAARID ${courtName}:`);
          console.log(`TEAM1: ${team1.map(p => p.name).join(" & ")} (nr 1 & nr 4)`);
          console.log(`TEAM2: ${team2.map(p => p.name).join(" & ")} (nr 2 & nr 3)`);
          
          createMatch(courtName, team1, team2, index);
      } else {
          console.warn(`VIGA: Väljakul ${courtName} pole piisavalt mängijaid (${courtPlayers.length})`);
      }
  });
  
  // Logi ülevaade kõigist loodud paaridest
  console.log("===== LOODUD PAARID =====");
  COURT_ORDER.forEach((courtName) => {
      const matches = bracketData.courts.find(c => c.name === courtName)?.matches || [];
      const latestMatch = matches[matches.length - 1];
      if (latestMatch) {
          console.log(`${courtName}:`);
          console.log(`  TEAM1: ${latestMatch.team1.map(p => p.name).join(" & ")}`);
          console.log(`  TEAM2: ${latestMatch.team2.map(p => p.name).join(" & ")}`);
      }
  });
}

function checkForConflicts() {
  unassignedPlayers = [];
  incompleteCourts = [];

  COURT_ORDER.forEach((courtName) => {
    const courtPlayers = players.filter(
      (p) => playerAssignments.get(p.id) === courtName
    );

    if (courtPlayers.length > 0 && courtPlayers.length < 4) {
      incompleteCourts.push({
        name: courtName,
        currentPlayers: courtPlayers,
        neededPlayers: 4 - courtPlayers.length,
      });
    }
  });

  unassignedPlayers = players.filter((p) => !playerAssignments.has(p.id));

  if (incompleteCourts.length > 0 || unassignedPlayers.length > 0) {
    showConflictResolution();
    return true;
  }
  return false;
}

function showConflictResolution(courtAssignments = null) {
  const conflictSection = document.getElementById('conflictResolution');
  const unassignedList = document.getElementById('unassignedPlayersList');
  const incompleteList = document.getElementById('incompleteCourtsList');

  conflictSection.style.display = 'block';
  unassignedList.innerHTML = '';
  incompleteList.innerHTML = '';

  // Use provided court assignments or calculate them
  const assignments =
      courtAssignments || ConflictUtils.calculateCourtAssignments();

  // Find unassigned players
  unassignedPlayers = players.filter((p) => !playerAssignments.has(p.id));

  // Find incomplete courts
  incompleteCourts = ConflictUtils.findIncompleteCourts(assignments);

  // Render unassigned players
  unassignedPlayers.forEach((player) => {
    const playerCard = createDraggablePlayerCard(player);
    unassignedList.appendChild(playerCard);
  });

  // Render incomplete courts
  incompleteCourts.forEach((court) => {
    const courtElement = createCourtElement(court);
    incompleteList.appendChild(courtElement);
  });
}

function createDraggablePlayerCard(player) {
  const card = document.createElement('div');
  card.className = 'player-card draggable';
  card.draggable = true;
  card.dataset.playerId = player.id;
  card.innerHTML = `
        <div class="player-info">
            <span class="player-name">${player.name}</span>
            <span class="player-rating">${player.ranking}</span>
        </div>
    `;

  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('application/json', JSON.stringify(player));
    card.classList.add('dragging');
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
  });

  return card;
}

function createCourtElement(court) {
  const courtEl = document.createElement('div');
  courtEl.className = 'court-container';
  courtEl.innerHTML = `
        <h5>${court.name}</h5>
        <div class="current-players">
            ${court.currentPlayers
    .map(
      (p) => `
                <div class="player-card">
                    <div class="player-info">
                        <span class="player-name">${p.name}</span>
                        <span class="player-rating">${p.ranking.toFixed(
    1
  )}</span>
                    </div>
                </div>
            `
    )
    .join('')}
        </div>
        <div class="court-slot" data-court="${court.name}">
            <span>Drop Player Here (${court.neededPlayers} needed)</span>
        </div>
    `;

  setupDropZone(courtEl.querySelector('.court-slot'), court.name);
  return courtEl;
}

function setupDropZone(element, courtName) {
  element.addEventListener('dragover', (e) => {
    e.preventDefault();
    element.classList.add('drag-over');
  });

  element.addEventListener('dragleave', () => {
    element.classList.remove('drag-over');
  });

  element.addEventListener('drop', (e) => {
    e.preventDefault();
    element.classList.remove('drag-over');

    const playerData = JSON.parse(e.dataTransfer.getData('application/json'));
    handlePlayerAssignment(playerData, courtName);
  });
}

function handlePlayerAssignment(player, courtName) {
  playerAssignments.set(player.id, courtName);

  // Check if all conflicts are resolved
  const courtAssignments = new Map();
  COURT_ORDER.forEach((court) => {
    courtAssignments.set(court, []);
  });

  players.forEach((p) => {
    const court = playerAssignments.get(p.id);
    if (court) {
      courtAssignments.get(court).push(p);
    }
  });

  let hasConflicts = false;
  courtAssignments.forEach((courtPlayers, court) => {
    if (courtPlayers.length > 0 && courtPlayers.length !== 4) {
      hasConflicts = true;
    }
  });

  if (!hasConflicts) {
    // All conflicts resolved, create matches
    document.getElementById('conflictResolution').style.display = 'none';
    COURT_ORDER.forEach((courtName, index) => {
      const courtPlayers = courtAssignments.get(courtName);
      if (courtPlayers && courtPlayers.length === 4) {
        courtPlayers.sort(PlayerSortUtils.byRating);
        const team1 = [courtPlayers[0], courtPlayers[3]];
        const team2 = [courtPlayers[1], courtPlayers[2]];
        createMatch(courtName, team1, team2, index);
      }
    });

    bracketData.currentRound++;
    roundCountEl.textContent = `Round ${bracketData.currentRound}/4`;
    saveBracketData();
  } else {
    // Update conflict resolution display
    showConflictResolution(courtAssignments);
  }
}

function generateAmericanoMatches() {
  const availablePlayers = [...players];
  if (bracketData.currentRound < 3) {
    availablePlayers.sort(() => Math.random() - 0.5);
  } else {
    availablePlayers.sort((a, b) =>
      PlayerSortUtils.byStandings(a, b, bracketData.standings)
    );
  }

  while (availablePlayers.length >= 4) {
    const team1 = availablePlayers.splice(0, 2);
    const team2 = availablePlayers.splice(0, 2);
    const courtIndex = Math.floor(
      bracketData.courts[0].matches.length % COURT_ORDER.length
    );
    createMatch(COURT_ORDER[courtIndex], team1, team2, courtIndex);
  }
}

function createMatch(courtName, team1, team2, courtIndex) {
  const match = {
    id: `match-${Date.now()}-${courtIndex}`,
    courtName,
    team1,
    team2,
    score1: null,
    score2: null,
    completed: false,
    round: 1,
  };
  bracketData.courts[courtIndex].matches.push(match);
}

function updateMatchScore(matchId, scoreType, score) {
  let matchUpdated = false;

  for (const court of bracketData.courts) {
    const match = court.matches.find((m) => m.id === matchId);
    if (match) {
      const currentScore = score;
      const otherScore = scoreType === 'score1' ? match.score2 : match.score1;

      if (currentScore !== null && otherScore !== null) {
        if (
          !ValidationUtils.isValidScore(
            scoreType === 'score1' ? currentScore : otherScore,
            scoreType === 'score2' ? currentScore : otherScore
          )
        ) {
          alert('Invalid score. Scores must be between 0-10.');
          return;
        }
      }

      match[scoreType] = score;

      if (match.score1 !== null && match.score2 !== null) {
        match.completed = true;
        matchUpdated = true;

        const existingMatch = bracketData.completedMatches.find(
          (m) => m.id === match.id
        );
        if (!existingMatch) {
          bracketData.completedMatches.push({ ...match });
        }
      }

      if (matchUpdated) {
        recalculateStandings();
        saveBracketData();
        renderStandings();
        renderGameScores();
        checkRoundCompletion();
      }
      break;
    }
  }
}

function recalculateStandings() {
  bracketData.standings = players.map((player) => ({
    id: player.id,
    name: player.name,
    points: 0,
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
  }));

  bracketData.completedMatches.forEach((match) => {
    const team1Points = match.score1 || 0;
    const team2Points = match.score2 || 0;

    match.team1.forEach((player) => {
      const standing = bracketData.standings.find((s) => s.id === player.id);
      if (standing) {
        standing.points += team1Points;
        if (team1Points > team2Points) standing.wins++;
        else standing.losses++;
        standing.gamesPlayed++;
      }
    });

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

async function fetchTournamentData(tournamentId) {
  try {
    const response = await fetch(
      `${window.config.API_URL}/tournaments/${tournamentId}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch tournament data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching tournament data:', error);
    return null;
  }
}
bracketData = JSON.parse(
  localStorage.getItem(`tournament_${selectedTournamentId}_bracket`) || 'null'
);

async function loadTournamentData() {
  const selectedTournamentId = localStorage.getItem('selectedTournament');
  if (!selectedTournamentId) {
    window.location.href = 'tournament-list.html';
    return;
  }

  const tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');
  tournament = await fetchTournamentData(selectedTournamentId);

  if (!tournament) {
    handleDataError();
    return;
  }


  if (tournament.format === 'Americano') {
    document.querySelector('.tournament-content').style.display = 'none';
    const americanoContainer = document.createElement('div');
    americanoContainer.className = 'americano-container';
    document.querySelector('.container').appendChild(americanoContainer);
    loadAmericanoView(americanoContainer);
    return; // Early return Americano formaadi puhul
  }
    

  //document.getElementById('tournamentName').textContent = tournament.name;
  formatSelect.value = tournament.format;

  if (bracketData) {
    roundCountEl.textContent = `Round ${bracketData.currentRound}/4`;
    renderMatches();
    renderStandings();
  } else {
    roundCountEl.textContent = 'Round 0/4';
    initializeBracket();
  }

  renderRegisteredPlayers();
  renderGameScores();
}

function loadPlayers() {

  let allPlayers = players;
  tournamentPlayers = players;
  players = tournamentPlayers
    .map((tournamentPlayer) => {
      const fullPlayer = allPlayers.find((p) => p.id === tournamentPlayer.id);
      if (!fullPlayer) {
        console.error(
          `Player ${tournamentPlayer.id} not found in players database`
        );
        return null;
      }
      // Ensure rating exists
      //       if (typeof fullPlayer.ranking !== "number") {
      //         console.error(`Player ${fullPlayer.name} has invalid rating`);
      //         return null;
      //       }
      return {
        ...tournamentPlayer,
        ...fullPlayer,
        rating: fullPlayer.ranking, // Explicitly set rating
      };
    })
    .filter((p) => p !== null); // Remove any invalid players

  playerCountEl.textContent = `${players.length} Players`;
}



function renderMatches() {
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
                                <span class="team-name">${getTeamNames(
    match.team1
  )}</span>
                                <span class="score" onclick="makeScoreEditable(this, '${
  match.id
}', 'score1')">${match.score1 ?? '-'}</span>
                            </div>
                            <div class="team">
                                <span class="team-name">${getTeamNames(
    match.team2
  )}</span>
                                <span class="score" onclick="makeScoreEditable(this, '${
  match.id
}', 'score2')">${match.score2 ?? '-'}</span>
                            </div>
                        </div>
                    `;
        currentMatches.appendChild(matchElement);
      }
    });
  });
}

function renderStandings() {
  standings.innerHTML = '';

  if (!bracketData?.standings?.length) {
    standings.innerHTML =
        '<div class="empty-standings">No standings available</div>';
    return;
  }

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
                <span class="record">${player.wins || 0}-${
  player.losses || 0
}</span>
            `;
    standings.appendChild(standingElement);
  });
}
function initializeBracket() {
  bracketData = {
    format: tournament.format,
    currentRound: 0,
    courts: COURT_ORDER.map((courtName) => ({
      name: courtName,
      matches: [],
    })),
    completedMatches: [],
    standings: players.map((player) => ({
      id: player.id,
      name: player.name,
      points: 0,
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
    })),
  };
  saveBracketData();
}

function checkRoundCompletion() {
  const allMatchesCompleted = bracketData.courts.every((court) =>
    court.matches.every((m) => m.completed)
  );

  if (allMatchesCompleted) {
    if (bracketData.currentRound >= 4) {
      showTournamentEndOption();
    }
  }
}

function showTournamentEndOption() {
  if (!document.getElementById('endTournament')) {
    const endTournamentBtn = document.createElement('button');
    endTournamentBtn.id = 'endTournament';
    endTournamentBtn.className = 'btn-primary';
    endTournamentBtn.textContent = 'End Tournament';
    endTournamentBtn.onclick = endTournament;
    document.querySelector('.control-buttons').appendChild(endTournamentBtn);
  }
}

function endTournament() {
  if (
    !confirm(
      'Are you sure you want to end the tournament? This will finalize all standings.'
    )
  ) {
    return;
  }

  tournament.status = 'completed';
  tournament.completedDate = new Date().toISOString();
  tournament.finalStandings = bracketData.standings
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
    .map((player, index) => ({
      ...player,
      finalRank: index + 1,
    }));

  const tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');
  const tournamentIndex = tournaments.findIndex(
    (t) => t.id === tournament.id
  );
  if (tournamentIndex !== -1) {
    tournaments[tournamentIndex] = tournament;
    localStorage.setItem('tournaments', JSON.stringify(tournaments));
  }

  generateBtn.disabled = true;
  resetRoundBtn.disabled = true;
  document.getElementById('endTournament').disabled = true;

  alert('Tournament completed! Final standings have been saved.');
  window.location.href = 'tournament-list.html';
}

function resetCurrentRound() {
  if (!bracketData || bracketData.currentRound === 0) {
    return;
  }

  if (!confirm('Are you sure you want to reset the current round?')) {
    return;
  }

  bracketData.courts.forEach((court) => {
    court.matches = [];
  });

  if (bracketData.completedMatches) {
    bracketData.completedMatches = bracketData.completedMatches.filter(
      (match) => match.round !== bracketData.currentRound
    );
  }

  bracketData.currentRound--;
  roundCountEl.textContent = `Round ${bracketData.currentRound}/4`;

  if (bracketData.currentRound === 0) {
    registeredPlayersContainer.style.display = 'block';
  }

  recalculateStandings();
  renderMatches();
  gameTimer.reset();
  saveBracketData();
}

function saveBracketData() {
  localStorage.setItem(
    `tournament_${tournament.id}_bracket`,
    JSON.stringify(bracketData)
  );
}

function renderRegisteredPlayers() {
  playersGrid.innerHTML = '';
  players.forEach(player => {
    const playerCard = document.createElement('div');
    playerCard.className = 'player-card';
    playerCard.innerHTML = `
            <div class="player-info">
                <span class="player-name">${player.name}</span>
                <span class="player-rating">${player.ranking || 0}</span>
            </div>
            <button class="btn-delete" onclick="deletePlayer('${player.id}')">×</button>
        `;
    playersGrid.appendChild(playerCard);
  });
}

// Global Functions
window.makeScoreEditable = function (element, matchId, scoreType) {
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'score-input';
  input.value = element.textContent !== '-' ? element.textContent : '';
  input.min = 0;

  input.onblur = () => {
    const score = input.value ? parseInt(input.value) : null;
    updateMatchScore(matchId, scoreType, score);
    element.textContent = score ?? '-';
  };

  input.onkeypress = (e) => {
    if (e.key === 'Enter') {
      input.blur();
    }
  };

  element.textContent = '';
  element.appendChild(input);
  input.focus();
};

window.deletePlayer = function (playerId) {
  if (
    !confirm(
      'Are you sure you want to remove this player from the tournament?'
    )
  ) {
    return;
  }

  let tournamentPlayers  = JSON.parse(
    localStorage.getItem(`tournament_${selectedTournamentId}_players`) || '[]'
  );
  const updatedPlayers = tournamentPlayers.filter((p) => p.id !== playerId);
  localStorage.setItem(
    `tournament_${selectedTournamentId}_players`,
    JSON.stringify(updatedPlayers)
  );

  players = players.filter((p) => p.id !== playerId);
  playerCountEl.textContent = `${players.length} Players`;

  renderRegisteredPlayers();
  renderStandings();
};

// Event Listeners
generateBtn.addEventListener('click', generateNextRound);
startTimerBtn.addEventListener('click', () => {
  if (gameTimer.isRunning) {
    gameTimer.reset();
  } else {
    gameTimer.start();
  }
});
resetRoundBtn.addEventListener('click', resetCurrentRound);
formatSelect.addEventListener('change', (e) => {
  tournament.format = e.target.value;
  const tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');
  const tournamentIndex = tournaments.findIndex(
    (t) => t.id === tournament.id
  );
  if (tournamentIndex !== -1) {
    tournaments[tournamentIndex].format = e.target.value;
    localStorage.setItem('tournaments', JSON.stringify(tournaments));
  }
});

// Initialize on load

//generateFirstRound();
//renderRegisteredPlayers();

