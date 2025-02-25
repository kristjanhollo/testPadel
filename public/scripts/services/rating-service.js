class RatingService {
  static RATING_LIMITS = {
    MIN: 0,
    MAX: 7,
    DAILY_MAX_INCREASE: 0.3,
    DAILY_MAX_DECREASE: -0.3
  };

  static RATING_CHANGES = {
    WIN_VS_HIGHER: 0.15,
    WIN_VS_SAME: 0.1,
    WIN_VS_LOWER: 0.05,
    LOSS_VS_HIGHER: -0.05,
    LOSS_VS_SAME: -0.1,
    LOSS_VS_LOWER: -0.15
  };

  static RATING_LEVELS = {
    COMPLETE_BEGINNER: 0,
    BEGINNER: 1,
    ADVANCED_BEGINNER: 2,
    AVERAGE_RECREATIONAL: 3,
    GOOD_RECREATIONAL: 4,
    ADVANCED_RECREATIONAL: 5,
    SEMI_PROFESSIONAL: 6,
    PROFESSIONAL: 7
  };

  constructor() {
    this.dailyChanges = new Map(); // Track daily rating changes
  }

  // Initialize a new player's rating based on trial matches
  initializePlayerRating(trialMatchResults) {
    // Require exactly 3 trial matches
    if (!Array.isArray(trialMatchResults) || trialMatchResults.length !== 3) {
      throw new Error('Exactly 3 trial matches are required for initial rating');
    }

    // Calculate base rating from 0-3 based on performance
    let baseRating = 1.5; // Start at middle of beginner range
        
    // Adjust based on trial match results
    trialMatchResults.forEach(result => {
      if (result.won) baseRating += 0.5;
      else baseRating -= 0.25;
    });

    // Ensure rating is between 0-3 for new players
    return Math.max(0, Math.min(3, baseRating));
  }

  // Calculate rating change for a match
  calculateRatingChange(playerRating, opponentRating, won) {
    let change = 0;
    const ratingDiff = opponentRating - playerRating;

    if (won) {
      if (ratingDiff > 0) change = this.RATING_CHANGES.WIN_VS_HIGHER;
      else if (ratingDiff === 0) change = this.RATING_CHANGES.WIN_VS_SAME;
      else change = this.RATING_CHANGES.WIN_VS_LOWER;
    } else {
      if (ratingDiff > 0) change = this.RATING_CHANGES.LOSS_VS_HIGHER;
      else if (ratingDiff === 0) change = this.RATING_CHANGES.LOSS_VS_SAME;
      else change = this.RATING_CHANGES.LOSS_VS_LOWER;
    }

    return this._applyDailyLimit(playerRating, change);
  }

  // Update player's rating after a match
  updatePlayerRating(playerId, currentRating, ratingChange) {
    // Get current daily changes for player
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `${playerId}_${today}`;
    const currentDailyChange = this.dailyChanges.get(dailyKey) || 0;

    // Check if change exceeds daily limits
    const totalDailyChange = currentDailyChange + ratingChange;
    if (totalDailyChange > this.RATING_LIMITS.DAILY_MAX_INCREASE) {
      ratingChange = this.RATING_LIMITS.DAILY_MAX_INCREASE - currentDailyChange;
    } else if (totalDailyChange < this.RATING_LIMITS.DAILY_MAX_DECREASE) {
      ratingChange = this.RATING_LIMITS.DAILY_MAX_DECREASE - currentDailyChange;
    }

    // Update daily changes tracker
    this.dailyChanges.set(dailyKey, currentDailyChange + ratingChange);

    // Calculate new rating
    let newRating = currentRating + ratingChange;

    // Ensure rating stays within global limits
    newRating = Math.max(this.RATING_LIMITS.MIN, Math.min(this.RATING_LIMITS.MAX, newRating));

    return {
      newRating,
      actualChange: newRating - currentRating
    };
  }

  // Update ratings for all players in a match
  updateMatchRatings(match) {
    const team1Avg = this._calculateTeamAverageRating(match.team1.players);
    const team2Avg = this._calculateTeamAverageRating(match.team2.players);

    // Update ratings for winning team
    const winningTeam = match[match.winner];
    const losingTeam = match[match.winner === 'team1' ? 'team2' : 'team1'];
    const winningTeamAvg = match.winner === 'team1' ? team1Avg : team2Avg;
    const losingTeamAvg = match.winner === 'team1' ? team2Avg : team1Avg;

    // Update winners
    winningTeam.players.forEach(player => {
      const ratingChange = this.calculateRatingChange(player.rating, losingTeamAvg, true);
      const update = this.updatePlayerRating(player.id, player.rating, ratingChange);
      player.rating = update.newRating;
      this._updatePlayerRatingHistory(player.id, update.newRating);
    });

    // Update losers
    losingTeam.players.forEach(player => {
      const ratingChange = this.calculateRatingChange(player.rating, winningTeamAvg, false);
      const update = this.updatePlayerRating(player.id, player.rating, ratingChange);
      player.rating = update.newRating;
      this._updatePlayerRatingHistory(player.id, update.newRating);
    });
  }

  // Helper: Calculate average rating for a team
  _calculateTeamAverageRating(players) {
    const sum = players.reduce((total, player) => total + player.rating, 0);
    return sum / players.length;
  }

  // Helper: Update player's rating history
  _updatePlayerRatingHistory(playerId, newRating) {
    const players = JSON.parse(localStorage.getItem('players') || '[]');
    const player = players.find(p => p.id === playerId);
        
    if (player) {
      if (!player.ratingHistory) {
        player.ratingHistory = [];
      }
            
      player.ratingHistory.push({
        date: new Date().toISOString(),
        rating: newRating
      });

      localStorage.setItem('players', JSON.stringify(players));
    }
  }

  // Helper: Apply daily rating change limits
  _applyDailyLimit(currentRating, change) {
    const projectedRating = currentRating + change;
        
    if (projectedRating > this.RATING_LIMITS.MAX) {
      return this.RATING_LIMITS.MAX - currentRating;
    }
    if (projectedRating < this.RATING_LIMITS.MIN) {
      return this.RATING_LIMITS.MIN - currentRating;
    }
        
    return change;
  }

  // Get rating level description
  static getRatingDescription(rating) {
    if (rating <= 0) return 'Complete Beginner';
    if (rating <= 1) return 'Beginner';
    if (rating <= 2) return 'Advanced Beginner';
    if (rating <= 3) return 'Average Recreational';
    if (rating <= 4) return 'Good Recreational';
    if (rating <= 5) return 'Advanced Recreational';
    if (rating <= 6) return 'Semi-Professional';
    return 'Professional';
  }

  // Instance method that calls the static method
  getRatingDescription(rating) {
    return RatingService.getRatingDescription(rating);
  }
}

// Export as global service and class
window.ratingService = new RatingService();
window.RatingService = RatingService;
