// public/scripts/services/routing-service.js
import firebaseService from './firebase-service.js';

/**
 * Tournament Routing Service
 * Handles intelligent routing between different views based on tournament state
 */
class TournamentRoutingService {
  constructor() {
    this.routes = {
      TOURNAMENT_LIST: 'tournament-list.html',
      TOURNAMENT_MANAGEMENT: 'tournament-management.html',
      TOURNAMENT_BRACKET_MEXICANO: 'tournament-bracket-M.html',
      TOURNAMENT_BRACKET_AMERICANO: 'tournament-bracket-Americano.html',
      TOURNAMENT_STATS: 'tournament-stats.html'
    };
    
    // Tournament status codes
    this.STATUS = {
      UPCOMING: 1,
      ONGOING: 2,
      COMPLETED: 3
    };
  }
  
  /**
   * Routes to the appropriate page based on tournament data
   * @param {string} tournamentId - The tournament ID to route to
   * @param {Object} tournamentData - Optional tournament data (if already loaded)
   * @returns {Promise<void>}
   */
  // In routing-service.js
/**
 * Routes to the appropriate page based on tournament data
 * @param {string} tournamentId - The tournament ID to route to
 * @param {Object} tournamentData - Optional tournament data (if already loaded)
 * @param {boolean} forceBracket - Force routing to bracket view
 * @returns {Promise<void>}
 */
async routeToTournament(tournamentId, tournamentData = null, forceBracket = false) {
  try {
    // Store the tournament ID for future reference
    localStorage.setItem('selectedTournament', tournamentId);
    
    // Fetch tournament data if not provided
    const tournament = tournamentData || await firebaseService.getTournament(tournamentId);
    
    if (!tournament) {
      console.error('Tournament not found:', tournamentId);
      this.redirectTo(this.routes.TOURNAMENT_LIST);
      return;
    }
    
    // Special case: Force bracket view if requested
    if (forceBracket) {
      return this.routeToTournamentBracket(tournament);
    }
    
    // Additional check: If tournament is marked as upcoming but has bracket data, check if we should
    // treat it as ongoing based on bracket status
    if (tournament.status_id === this.STATUS.UPCOMING) {
      try {
        // Check if bracket data exists for either format
        let bracketData = null;
        
        // Try Americano format first
        if (tournament.format?.toLowerCase() === 'americano') {
          bracketData = await firebaseService.getTournamentBracketAmericano(tournamentId);
        } else {
          // Try standard format
          bracketData = await firebaseService.getTournamentBracket(tournamentId);
        }
        
        // If we have bracket data with matches, treat it as ongoing
        if (bracketData) {
          const hasMatches = 
            (bracketData.rounds && bracketData.rounds.some(round => 
              round.matches && round.matches.length > 0
            )) || 
            (bracketData.completedMatches && bracketData.completedMatches.length > 0) ||
            (bracketData.courts && bracketData.courts.some(court => 
              court.matches && court.matches.length > 0
            ));
            
          if (hasMatches) {
            console.log('Tournament has matches but status is upcoming - treating as ongoing');
            // Route to bracket view but don't change the status here - bracket page will handle that
            return this.routeToTournamentBracket(tournament);
          }
        }
      } catch (err) {
        console.warn('Error checking bracket data in routing:', err);
        // Continue with normal routing if error occurs
      }
    }
    
    // Standard routing based on tournament status
    switch (tournament.status_id) {
      case this.STATUS.COMPLETED:
        // Completed tournaments go to stats view
        this.redirectTo(this.routes.TOURNAMENT_STATS);
        break;
        
      case this.STATUS.ONGOING:
        // Ongoing tournaments go to the appropriate bracket view
        this.routeToTournamentBracket(tournament);
        break;
        
      case this.STATUS.UPCOMING:
      default:
        // Upcoming tournaments go to management view
        this.redirectTo(this.routes.TOURNAMENT_MANAGEMENT);
        break;
    }
  } catch (error) {
    console.error('Error routing to tournament:', error);
    this.redirectTo(this.routes.TOURNAMENT_LIST);
  }
}
  
  /**
   * Routes to the appropriate tournament bracket based on format
   * @param {Object} tournament - The tournament data
   */
  async routeToTournamentBracket(tournament) {
    try {
      const format = tournament.format?.trim().toLowerCase() || '';
      
      if (format === 'americano') {
        // Load the bracket data first to ensure state persistence
        try {
          const bracketData = await firebaseService.getTournamentBracketAmericano(tournament.id);
          
          // Set current round in localStorage for state persistence
          if (bracketData && bracketData.currentRound) {
            localStorage.setItem('currentRound', bracketData.currentRound);
          }
        } catch (err) {
          console.warn('Could not load Americano bracket data for state persistence:', err);
        }
        
        this.redirectTo(this.routes.TOURNAMENT_BRACKET_AMERICANO);
      } else {
        // Default to Mexicano format
        try {
          const bracketData = await firebaseService.getTournamentBracket(tournament.id);
          
          // Set current round in localStorage for state persistence
          if (bracketData && bracketData.currentRound) {
            localStorage.setItem('currentRound', bracketData.currentRound);
          }
        } catch (err) {
          console.warn('Could not load bracket data for state persistence:', err);
        }
        
        this.redirectTo(this.routes.TOURNAMENT_BRACKET_MEXICANO);
      }
    } catch (error) {
      console.error('Error routing to tournament bracket:', error);
      this.redirectTo(this.routes.TOURNAMENT_MANAGEMENT);
    }
  }
  
  /**
   * Redirects to a URL, handling query parameters if provided
   * @param {string} url - The URL to redirect to
   * @param {Object} params - Optional query parameters
   */
  redirectTo(url, params = null) {
    if (params) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      
      window.location.href = `${url}?${queryString}`;
    } else {
      window.location.href = url;
    }
  }
  
  /**
   * Handles the initial routing on the bracket pages to restore state
   * @param {Object} options - Options for the routing
   * @param {function} options.onRoundLoad - Callback when round is loaded
   */
  handleBracketPageLoad(options = {}) {
    // Get current round from query params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const roundParam = urlParams.get('round');
    const storedRound = localStorage.getItem('currentRound');
    
    let currentRound;
    
    // URL parameter takes precedence over stored state
    if (roundParam && !isNaN(parseInt(roundParam))) {
      currentRound = parseInt(roundParam);
    } else if (storedRound && !isNaN(parseInt(storedRound))) {
      currentRound = parseInt(storedRound);
    }
    
    // If we have a round to load, call the callback
    if (currentRound && options.onRoundLoad) {
      options.onRoundLoad(currentRound);
    }
    
    // Clear the stored round to avoid persistence issues
    localStorage.removeItem('currentRound');
  }
}

// Create and export a singleton instance
const routingService = new TournamentRoutingService();

// Export as both default and named export for flexibility
export default routingService;
export { routingService };