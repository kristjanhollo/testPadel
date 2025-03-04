// public/scripts/tournament-management.js

import tournamentService from './services/tournament-service.js';
import routingService from './services/routing-service.js';

/**
 * Tournament Management Router
 * This script checks the tournament format and redirects to the appropriate management page
 */
class TournamentManagementRouter {
  constructor() {
    this.init();
  }
  
  async init() {
    try {
      // Show loading
      this.showLoading('Loading tournament data...');
      
      // Get tournament ID from localStorage
      const tournamentId = localStorage.getItem('selectedTournament');
      if (!tournamentId) {
        throw new Error('No tournament selected');
      }
      
      // Get tournament data
      const tournamentData = await tournamentService.getTournament(tournamentId);
      
      if (!tournamentData) {
        throw new Error('Tournament not found');
      }
      
      // Check if tournament is completed
      if (tournamentData.status_id === 3) { // 3 = completed
        // Redirect to tournament stats page
        this.showAlert({
          title: 'Tournament Completed',
          text: 'This tournament is already completed. Redirecting to results page.',
          icon: 'info',
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          routingService.redirectTo('tournament-stats.html');
        });
        return;
      }
      
      // Check format and redirect
      const format = tournamentData.format;
      
      if (format === 'Americano') {
        routingService.redirectTo('tournament-management-americano.html');
      } else if (format === 'Mexicano') {
        routingService.redirectTo('tournament-management-mexicano.html');
      } else {
        throw new Error('Unsupported tournament format: ' + format);
      }
    } catch (error) {
      console.error('Error routing tournament management:', error);
      
      this.showAlert({
        title: 'Error',
        text: error.message || 'Failed to load tournament data',
        icon: 'error',
        confirmButtonText: 'Go Back to List',
      }).then(() => {
        routingService.redirectTo('tournament-list.html');
      });
    }
  }
  
  showLoading(message) {
    try {
      Swal.fire({
        title: message || 'Loading...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    } catch (e) {
      console.log(message || 'Loading...');
    }
  }
  
  showAlert(options) {
    try {
      return Swal.fire(options);
    } catch (e) {
      console.log(options.title + ': ' + options.text);
      
      if (options.showCancelButton) {
        const confirmed = confirm(options.title + '\n' + options.text);
        return Promise.resolve({ isConfirmed: confirmed });
      } else {
        alert(options.title + '\n' + options.text);
        return Promise.resolve({ isConfirmed: true });
      }
    }
  }
}

// Initialize the router when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new TournamentManagementRouter();
});

export default TournamentManagementRouter;