export const ValidationUtils = {
  canStartNewRound(bracketData) {
    console.log('bracketData:', bracketData);
    if (!bracketData) return false;
    return bracketData.courts.every(court => 
      court.matches.every(match => match.completed)
    );
  },
  
  isValidScore(score1, score2) {
    return score1 >= 0 && score1 <= 10 && score2 >= 0 && score2 <= 10;
  }
};

export const PlayerSortUtils = {
  byRating(a, b) {
    return (b.ranking || 0) - (a.ranking || 0);
  },
  
  byGameScore(a, b, completedMatches, currentRound) {
    const aScore = calculateGameScore(a, completedMatches, currentRound);
    const bScore = calculateGameScore(b, completedMatches, currentRound);
    return bScore - aScore;
  }
};

export const ConflictUtils = {
  // Add conflict resolution utilities here
};

export const GameScoreUtils = {
  // Add game score utilities here
};

function calculateGameScore(player, completedMatches, currentRound) {
  const match = completedMatches
    .filter(m => m.round === currentRound)
    .find(m => 
      m.team1.some(p => p.id === player.id) || 
      m.team2.some(p => p.id === player.id)
    );

  if (!match) return player.ranking || 0;

  const score = match.team1.some(p => p.id === player.id) 
    ? match.score1 
    : match.score2;

  return score * 100 + (player.ranking || 0);
}
