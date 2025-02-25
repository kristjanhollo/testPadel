export const PlayerSortUtils = {
  byRating(a, b) {
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }
    return a.name.localeCompare(b.name);
  },

  byGameScore(a, b, completedMatches, currentRound) {
    if (!completedMatches || completedMatches.length === 0) return 0;

    const aScore =
      GameScoreUtils?.getLatestGameScore?.(a, completedMatches, currentRound) ||
      0;
    const bScore =
      GameScoreUtils?.getLatestGameScore?.(b, completedMatches, currentRound) ||
      0;

    if (bScore !== aScore) {
      return bScore - aScore;
    }
    return a.name.localeCompare(b.name);
  },

  byStandings(a, b, standings) {
    if (!standings || standings.length === 0) return 0;

    const aStanding = standings.find((s) => s.id === a.id) || {};
    const bStanding = standings.find((s) => s.id === b.id) || {};

    const pointsDiff = (bStanding.points || 0) - (aStanding.points || 0);
    if (pointsDiff !== 0) return pointsDiff;

    return (bStanding.wins || 0) - (aStanding.wins || 0);
  },
};

export const GameScoreUtils = {
  calculateGameScore(player, match) {
    if (!player || !match) return 0;
    const baseRating = player.ranking || 0;
    const isTeam1 = match.team1?.some((p) => p.id === player.id);
    const points = isTeam1 ? match.score1 || 0 : match.score2 || 0;
    return points * 100 + baseRating;
  },

  getLatestGameScore(player, completedMatches, currentRound) {
    if (!player || !completedMatches || completedMatches.length === 0)
      return player?.ranking || 0;

    const lastMatch = completedMatches
      .filter((m) => m.round === currentRound)
      .find(
        (m) =>
          m.team1?.some((p) => p.id === player.id) ||
          m.team2?.some((p) => p.id === player.id)
      );

    return lastMatch
      ? this.calculateGameScore(player, lastMatch)
      : player.ranking;
  },

  calculateAveragePoints(player, completedMatches) {
    if (!player || !completedMatches || completedMatches.length === 0) return 0;

    const playerMatches = completedMatches.filter((match) =>
      [...(match.team1 || []), ...(match.team2 || [])].some(
        (p) => p.id === player.id
      )
    );

    if (!playerMatches.length) return 0;

    const totalPoints = playerMatches.reduce((sum, match) => {
      const isTeam1 = match.team1?.some((p) => p.id === player.id);
      return sum + (isTeam1 ? match.score1 || 0 : match.score2 || 0);
    }, 0);

    return totalPoints / playerMatches.length;
  },
};

export const ValidationUtils = {
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

export const ConflictUtils = {
    
  calculateCourtAssignments(players, playerAssignments) {
    const COURT_ORDER = ['Padel Arenas', 'Coolbet', 'Lux Express', '3p Logistics'];
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
