import {
  ValidationUtils,
  PlayerSortUtils,
  ConflictUtils,
  GameScoreUtils,
} from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements

  loadTournamentData();
});

const timerDisplay = document.getElementById("gameTimer");
const generateBtn = document.getElementById("generateBracket");
const startTimerBtn = document.getElementById("startTimer");
const resetRoundBtn = document.getElementById("resetRound");
const playerCountEl = document.getElementById("playerCount");
const roundCountEl = document.getElementById("roundCount");
const currentMatches = document.getElementById("currentMatches");
const standings = document.getElementById("standings");
const registeredPlayersContainer = document.getElementById("registeredPlayers");
const playersGrid = registeredPlayersContainer.querySelector(".players-grid");
const selectedTournamentId = localStorage.getItem("selectedTournament");

let tournamentPlayers = JSON.parse(
  localStorage.getItem(`tournament_${selectedTournamentId}_players`) || "[]"
);
//
let tournament = null;
let players = [];
let bracketData = null;
let unassignedPlayers = [];
let incompleteCourts = [];
let playerAssignments = new Map();
const COURT_ORDER = ["Padel Arenas", "Coolbet", "Lux Express", "3p Logistics"];

players = tournamentPlayers;
loadPlayers();

async function fetchTournamentData(tournamentId) {
  try {
    const response = await fetch(
      `${window.config.API_URL}/tournaments/${tournamentId}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch tournament data");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching tournament data:", error);
    return null;
  }
}
bracketData = JSON.parse(
  localStorage.getItem(`tournament_${selectedTournamentId}_bracket`) || "null"
);
roundCountEl.textContent = `Round ${bracketData.currentRound}/4`;
async function loadTournamentData() {
  const selectedTournamentId = localStorage.getItem("selectedTournament");
  if (!selectedTournamentId) {
    window.location.href = "tournament-list.html";
    return;
  }

  tournament = await fetchTournamentData(selectedTournamentId);

  if (!tournament) {
    handleDataError();
    return;
  }

  renderMatches();
  renderStandings();
  renderRegisteredPlayers();
  renderGameScores();
}

function renderRegisteredPlayers() {
  playersGrid.innerHTML = "";

  const sortedPlayers = [...players].sort((a, b) => b.ranking - a.ranking);
  const numColumns = 4;
  const numRows = Math.ceil(players.length / numColumns);

  const columns = Array.from({ length: numColumns }, () => []);

  sortedPlayers.forEach((player, index) => {
    const columnIndex = Math.floor(index / numRows);
    columns[columnIndex].push(player);
  });

  columns.forEach((column) => {
    const columnDiv = document.createElement("div");
    columnDiv.className = "player-column";

    column.forEach((player) => {
      const playerCard = document.createElement("div");
      playerCard.className = "player-card";
      playerCard.innerHTML = `
              <div class="player-info">
                  <span class="player-name">${player.name}</span>
                  <span class="player-rating">${player.ranking || 0}</span>
              </div>
          `;
      columnDiv.appendChild(playerCard);
    });

    playersGrid.appendChild(columnDiv);
  });
}

// Helper Functions
function getTeamNames(team) {
  return team.map((player) => player.name).join(" & ");
}

function generateNextRound() {
  if (!ValidationUtils.canStartNewRound(bracketData)) {
      Swal.fire({
          title: "Cannot Start New Round",
          text: "Previous round incomplete!",
          icon: "warning",
          confirmButtonText: "OK"
      });
      return;
  }


  bracketData.courts.forEach((court) => {
      court.matches = [];
  });

  generateMexicanoMatches();
  
  roundCountEl.textContent = `Round ${bracketData.currentRound}/4`;
  registeredPlayersContainer.style.display = "none";

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

function renderGameScores() {
  // First remove existing table if any
  const existingTable = document.querySelector(".game-score-table");
  if (existingTable) {
    existingTable.remove();
  }

  const gameScoreTable = document.createElement("div");
  gameScoreTable.className = "game-score-table";

  // Header
  const header = document.createElement("h3");
  header.textContent = "GameScore Tracking";
  gameScoreTable.appendChild(header);

  // Create scores grid
  const scoreGrid = document.createElement("div");
  scoreGrid.className = "score-grid";

  players.forEach((player) => {
    const matchPoints = bracketData.completedMatches
      .filter((m) => m.round === bracketData.currentRound)
      .find(
        (m) =>
          m.team1.some((p) => p.id === player.id) ||
          m.team2.some((p) => p.id === player.id)
      );

    let gameScore = player.rating; // Base score is player's rating
    if (matchPoints) {
      const score = matchPoints.team1.some((p) => p.id === player.id)
        ? matchPoints.score1
        : matchPoints.score2;
      gameScore = score * 100 + player.rating;
    }

    const scoreRow = document.createElement("div");
    scoreRow.className = "score-row";
    scoreRow.innerHTML = `
                <span class="player-name">${player.name}</span>
                <span class="game-score">${gameScore}</span>
            `;
    scoreGrid.appendChild(scoreRow);
  });

  gameScoreTable.appendChild(scoreGrid);

  // Add the table after standings
  const standings = document.getElementById("standings");
  if (standings) {
    standings.parentNode.insertBefore(gameScoreTable, standings.nextSibling);
  }
}

function generateSubsequentRound() {
  playerAssignments.clear();

  const previousMatches = bracketData.completedMatches.filter(
    (m) => m.round === bracketData.currentRound
  );

  console.log("--currentround--", bracketData.currentRound);
  console.log("--previousMatches--", previousMatches);
  console.log("--playerAssignments--", playerAssignments);
  console.log("--bracketdate", bracketData);

  previousMatches.forEach((match) => {
    const { score1, score2, courtName, team1, team2 } = match;

    if (score1 !== score2) {
      const [winningTeam, losingTeam] =
        score1 > score2 ? [team1, team2] : [team2, team1];

      winningTeam.forEach((player) =>
        playerAssignments.set(player.id, determineNextCourt(courtName, "win"))
      );

      losingTeam.forEach((player) =>
        playerAssignments.set(player.id, determineNextCourt(courtName, "loss"))
      );
    } else {
      const assignTieBreaker = (team, baseScore) => {
        const [playerA, playerB] = team;
        const scoreA = baseScore * 100 + playerA.rating;
        const scoreB = baseScore * 100 + playerB.rating;

        playerAssignments.set(
          playerA.id,
          determineNextCourt(courtName, scoreA > scoreB ? "win" : "loss")
        );
        playerAssignments.set(
          playerB.id,
          determineNextCourt(courtName, scoreA > scoreB ? "loss" : "win")
        );
      };

      assignTieBreaker(team1, score1);
      assignTieBreaker(team2, score2);
    }
  });
  bracketData.currentRound++;
  createMatchesForRound();
}

function determineNextCourt(currentCourt, result) {
  const courtMovement = {
    "Padel Arenas": {
      win: "Padel Arenas",
      loss: "Coolbet",
    },
    Coolbet: {
      win: "Padel Arenas",
      loss: "Lux Express",
    },
    "Lux Express": {
      win: "Coolbet",
      loss: "3p Logistics",
    },
    "3p Logistics": {
      win: "Lux Express",
      loss: "3p Logistics",
    },
  };

  return courtMovement[currentCourt][result];
}

function createMatchesForRound() {
  COURT_ORDER.forEach((courtName, index) => {
    const courtPlayers = players
      .filter((p) => playerAssignments.get(p.id) === courtName)
      .sort((a, b) =>
        PlayerSortUtils.byGameScore(
          a,
          b,
          bracketData.completedMatches,
          bracketData.currentRound
        )
      );

    if (courtPlayers.length >= 4) {
      // Create teams by GameScore: highest with lowest, second highest with second lowest
      const team1 = [courtPlayers[0], courtPlayers[3]];
      const team2 = [courtPlayers[1], courtPlayers[2]];
      createMatch(courtName, team1, team2, index);
    }
  });
}



function showConflictResolution(courtAssignments = null) {
  const conflictSection = document.getElementById("conflictResolution");
  const unassignedList = document.getElementById("unassignedPlayersList");
  const incompleteList = document.getElementById("incompleteCourtsList");

  conflictSection.style.display = "block";
  unassignedList.innerHTML = "";
  incompleteList.innerHTML = "";

  // Use provided court assignments or calculate them
  const assignments =
    courtAssignments ||
    ConflictUtils.calculateCourtAssignments(players, playerAssignments);

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
  const card = document.createElement("div");
  card.className = "player-card draggable";
  card.draggable = true;
  card.dataset.playerId = player.id;
  card.innerHTML = `
        <div class="player-info">
            <span class="player-name">${player.name}</span>
            <span class="player-rating">${player.ranking}</span>
        </div>
    `;

  card.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("application/json", JSON.stringify(player));
    card.classList.add("dragging");
  });

  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
  });

  return card;
}

function createCourtElement(court) {
  const courtEl = document.createElement("div");
  courtEl.className = "court-container";
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
              .join("")}
        </div>
        <div class="court-slot" data-court="${court.name}">
            <span>Drop Player Here (${court.neededPlayers} needed)</span>
        </div>
    `;

  setupDropZone(courtEl.querySelector(".court-slot"), court.name);
  return courtEl;
}

function setupDropZone(element, courtName) {
  element.addEventListener("dragover", (e) => {
    e.preventDefault();
    element.classList.add("drag-over");
  });

  element.addEventListener("dragleave", () => {
    element.classList.remove("drag-over");
  });

  element.addEventListener("drop", (e) => {
    e.preventDefault();
    element.classList.remove("drag-over");

    const playerData = JSON.parse(e.dataTransfer.getData("application/json"));
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
    document.getElementById("conflictResolution").style.display = "none";
    COURT_ORDER.forEach((courtName, index) => {
      const courtPlayers = courtAssignments.get(courtName);
      if (courtPlayers && courtPlayers.length === 4) {
        courtPlayers.sort(PlayerSortUtils.byRating);
        const team1 = [courtPlayers[0], courtPlayers[3]];
        const team2 = [courtPlayers[1], courtPlayers[2]];
        createMatch(courtName, team1, team2, index);
      }
    });

    roundCountEl.textContent = `Round ${bracketData.currentRound}/4`;
    saveBracketData();
  } else {
    // Update conflict resolution display
    showConflictResolution(courtAssignments);
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
    round: bracketData.currentRound,
  };
  bracketData.courts[courtIndex].matches.push(match);
}

function updateMatchScore(matchId, scoreType, score) {
  let matchUpdated = false;

  // Find the match
  const match = bracketData.courts
    .flatMap((court) => court.matches)
    .find((m) => m.id === matchId);
  if (!match) return; // Exit if no match found

  const currentScore = parseInt(score, 10);
  const otherScore = scoreType === "score1" ? match.score2 : match.score1;

  // Validate score if both scores are set
  if (currentScore !== null && otherScore !== null) {
    if (!ValidationUtils.isValidScore(currentScore, otherScore)) {
      Swal.fire("Invalid Score", "Scores must be between 0-10.", "error");
      return;
    }
  }

  // Update the score
  match[scoreType] = currentScore;

  // Allow updating the match even after completion
  match.completed = match.score1 !== null && match.score2 !== null;
  matchUpdated = true;

  // Ensure completed match is updated instead of duplicated
  const existingMatchIndex = bracketData.completedMatches.findIndex(
    (m) => m.id === match.id
  );
  if (existingMatchIndex !== -1) {
    bracketData.completedMatches[existingMatchIndex] = { ...match };
  } else if (match.completed) {
    bracketData.completedMatches.push({ ...match });
  }

  // Update standings and UI if a match was updated
  if (matchUpdated) {
    recalculateStandings();
    saveBracketData();
    renderStandings();
    renderGameScores();
    checkRoundCompletion();
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
  currentMatches.innerHTML = "";

  bracketData.courts.forEach((court) => {
    court.matches.forEach((match) => {
      if (!match.completed) {
        const matchElement = document.createElement("div");

        matchElement.className = "match";
        matchElement.innerHTML = `
                        <div class="match-info">
                            <span class="court-name">${court.name}</span>
                            <div class="team">
                                <span class="team-name">${getTeamNames(
                                  match.team1
                                )}</span>
                                <span class="score" onclick="makeScoreEditable(this, '${
                                  match.id
                                }', 'score1')">${match.score1 ?? "-"}</span>
                            </div>
                            <div class="team">
                                <span class="team-name">${getTeamNames(
                                  match.team2
                                )}</span>
                                <span class="score" onclick="makeScoreEditable(this, '${
                                  match.id
                                }', 'score2')">${match.score2 ?? "-"}</span>
                            </div>
                        </div>
                    `;
        currentMatches.appendChild(matchElement);
      }
    });
  });
}

function renderStandings() {
  standings.innerHTML = "";

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
    const standingElement = document.createElement("div");
    standingElement.className = "standing-item";
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
  if (!document.getElementById("endTournament")) {
    const endTournamentBtn = document.createElement("button");
    endTournamentBtn.id = "endTournament";
    endTournamentBtn.className = "btn-primary";
    endTournamentBtn.textContent = "End Tournament";
    endTournamentBtn.onclick = endTournament;
    generateBtn.disabled = true;
    resetRoundBtn.disabled = true;
    startTimerBtn.disabled = true;
    document.querySelector(".control-buttons").appendChild(endTournamentBtn);
  }
}

function endTournament() {
  Swal.fire({
    title: "Are you sure?",
    text: "This will finalize all standings.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, end it!",
    cancelButtonText: "No, keep it",
  }).then((result) => {
    if (!result.isConfirmed) return;

    tournament.status = "completed";
    tournament.completedDate = new Date().toISOString();
    tournament.finalStandings = bracketData.standings
      .sort((a, b) => b.points - a.points || b.wins - a.wins)
      .map((player, index) => ({
        ...player,
        finalRank: index + 1,
      }));

    const tournaments = JSON.parse(localStorage.getItem("tournaments") || "[]");
    const tournamentIndex = tournaments.findIndex((t) => t.id === tournament.id);
    if (tournamentIndex !== -1) {
      tournaments[tournamentIndex] = tournament;
      localStorage.setItem("tournaments", JSON.stringify(tournaments));
    }

    document.getElementById("endTournament").disabled = true;

    Swal.fire({
      title: "Tournament Completed!",
      text: "Final standings have been saved.",
      icon: "success",
    }).then(() => {
      window.location.href = "tournament-list.html";
    });
  });
}

function resetCurrentRound() {
  if (!bracketData || bracketData.currentRound === 0) {
    return;
  }

  if (!confirm("Are you sure you want to reset the current round?")) {
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
    registeredPlayersContainer.style.display = "block";
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

// Global Functions
window.makeScoreEditable = function (element, matchId, scoreType) {
  const input = document.createElement("input");
  input.type = "number";
  input.className = "score-input";
  input.value = element.textContent !== "-" ? element.textContent : "";
  input.min = 0;

  input.onblur = () => {
    const score = input.value ? parseInt(input.value) : null;
    updateMatchScore(matchId, scoreType, score);
    element.textContent = score ?? "-";
  };

  input.onkeypress = (e) => {
    if (e.key === "Enter") {
      input.blur();
    }
  };

  element.textContent = "";
  element.appendChild(input);
  input.focus();
};

// Event Listeners
generateBtn.addEventListener("click", generateNextRound);
startTimerBtn.addEventListener("click", () => {
  if (gameTimer.isRunning) {
    gameTimer.reset();
  } else {
    gameTimer.start();
  }
});
resetRoundBtn.addEventListener("click", resetCurrentRound);

const gameTimer = {
  time: 20 * 60,
  isRunning: false,
  interval: null,

  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      startTimerBtn.textContent = "Reset Timer";
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
    startTimerBtn.textContent = "Start Timer";
    clearInterval(this.interval);
    this.updateDisplay();
    timerDisplay.classList.remove("time-up");
  },

  updateDisplay() {
    const minutes = Math.floor(this.time / 60);
    const seconds = this.time % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  },

  timeUp() {
    clearInterval(this.interval);
    this.isRunning = false;
    startTimerBtn.textContent = "Start Timer";
    timerDisplay.classList.add("time-up");
    alert("Round time is up! Please enter final scores.");
  },
};

generateFirstRound();
renderRegisteredPlayers();