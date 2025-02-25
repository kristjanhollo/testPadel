document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registrationForm');
  const ratingValue = document.getElementById('ratingValue');
  const ratingDescription = document.getElementById('ratingDescription');

  // Track trial match inputs for live preview
  const trialInputs = [
    ...document.querySelectorAll('select[name^="match"]'),
    ...document.querySelectorAll('select[name^="opponent"]')
  ];

  trialInputs.forEach(input => {
    input.addEventListener('change', updateRatingPreview);
  });

  function getTrialMatches() {
    const matches = [];
    for (let i = 1; i <= 3; i++) {
      const result = document.querySelector(`select[name="match${i}"]`).value;
      const opponentRating = parseFloat(document.querySelector(`select[name="opponent${i}"]`).value);
            
      if (result && !isNaN(opponentRating)) {
        matches.push({
          won: result === 'win',
          opponentRating
        });
      }
    }
    return matches;
  }

  function updateRatingPreview() {
    const matches = getTrialMatches();
        
    // Only preview if all matches are filled out
    if (matches.length === 3) {
      try {
        const initialRating = calculateInitialRating(matches);
        ratingValue.textContent = initialRating.toFixed(1);
        ratingDescription.textContent = RatingService.getRatingDescription(initialRating);
      } catch (error) {
        ratingValue.textContent = '-';
        ratingDescription.textContent = error.message;
      }
    } else {
      ratingValue.textContent = '-';
      ratingDescription.textContent = 'Complete assessment to see initial rating';
    }
  }

  function calculateInitialRating(matches) {
    // Start with base rating of 1.5
    let rating = 1.5;
        
    matches.forEach(match => {
      const ratingDiff = match.opponentRating - rating;
            
      if (match.won) {
        // Winning against higher rated opponent gives bigger boost
        if (ratingDiff > 0) {
          rating += 0.5;
        } else {
          rating += 0.3;
        }
      } else {
        // Losing to lower rated opponent reduces more
        if (ratingDiff < 0) {
          rating -= 0.3;
        } else {
          rating -= 0.2;
        }
      }
    });

    // Ensure rating stays within 0-3 range for new players
    return Math.max(0, Math.min(3, rating));
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const matches = getTrialMatches();
    if (matches.length !== 3) {
      alert('Please complete all trial matches');
      return;
    }

    // Calculate initial rating
    const initialRating = calculateInitialRating(matches);

    // Create player object
    const player = {
      id: `player-${Date.now()}`,
      name: document.getElementById('playerName').value,
      rating: initialRating,
      ratingHistory: [{
        date: new Date().toISOString(),
        rating: initialRating,
        type: 'initial'
      }],
      matches: matches.map((match, index) => ({
        date: new Date().toISOString(),
        type: 'trial',
        number: index + 1,
        won: match.won,
        opponentRating: match.opponentRating
      })),
      stats: {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        tournamentsPlayed: 0,
        tournamentWins: 0
      },
      achievements: [],
      registeredAt: new Date().toISOString()
    };

    // Save player
    const players = JSON.parse(localStorage.getItem('players') || '[]');
    players.push(player);
    localStorage.setItem('players', JSON.stringify(players));

    // Show success message with initial rating
    alert(`Player registered successfully!\nInitial Rating: ${initialRating.toFixed(1)} (${RatingService.getRatingDescription(initialRating)})`);

    // Reset form
    form.reset();
    ratingValue.textContent = '-';
    ratingDescription.textContent = 'Complete assessment to see initial rating';
  });

  // Initialize preview
  updateRatingPreview();
});
