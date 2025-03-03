// public/scripts/handle-404.js
import { routingService } from './services/routing-service.js';

/**
 * Handles 404 errors and attempts to recover with intelligent routing
 */
class Handle404Page {
  constructor() {
    this.init();
  }
  
  init() {
    // Get the tournament ID from URL parameters if available
    const params = new URLSearchParams(window.location.search);
    const tournamentId = params.get('tournamentId') || localStorage.getItem('selectedTournament');
    
    // If we have a tournament ID, try to route the user to the correct page
    if (tournamentId) {
      this.setupRecoveryUI(tournamentId);
    } else {
      this.setupDefaultUI();
    }
  }
  
  /**
   * Sets up a recovery UI for a specific tournament
   * @param {string} tournamentId - The tournament ID
   */
  setupRecoveryUI(tournamentId) {
    const message = document.getElementById('message');
    if (!message) return;
    
    // Update the message to show we're trying to recover
    message.innerHTML = `
      <h2>Page Not Found</h2>
      <h1>Trying to recover your tournament...</h1>
      <p>We're redirecting you to the correct tournament page.</p>
      <div id="loading-spinner" style="text-align: center; margin: 20px 0;">
        <div class="spinner" style="display: inline-block; width: 40px; height: 40px; border: 4px solid rgba(0,0,0,0.1); border-radius: 50%; border-top-color: #039be5; animation: spin 1s ease-in-out infinite;"></div>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    
    // Attempt to route to the tournament
    setTimeout(() => {
      routingService.routeToTournament(tournamentId)
        .catch(error => {
          console.error('Failed to recover tournament route:', error);
          this.showErrorMessage();
        });
    }, 1000);
  }
  
  /**
   * Sets up the default 404 UI
   */
  setupDefaultUI() {
    const message = document.getElementById('message');
    if (!message) return;
    
    // Add a button to go back to the home page
    const homeButton = document.createElement('a');
    homeButton.href = 'index.html';
    homeButton.className = 'home-button';
    homeButton.textContent = 'Go to Homepage';
    homeButton.style.cssText = `
      display: block;
      text-align: center;
      background: #039be5;
      text-transform: uppercase;
      text-decoration: none;
      color: white;
      padding: 16px;
      border-radius: 4px;
      margin-top: 20px;
    `;
    
    message.appendChild(homeButton);
  }
  
  /**
   * Shows an error message when recovery fails
   */
  showErrorMessage() {
    const message = document.getElementById('message');
    if (!message) return;
    
    message.innerHTML = `
      <h2>Recovery Failed</h2>
      <h1>We couldn't find your tournament</h1>
      <p>The tournament you're looking for might have been removed or is no longer available.</p>
      <a href="tournament-list.html" style="display: block; text-align: center; background: #039be5; text-transform: uppercase; text-decoration: none; color: white; padding: 16px; border-radius: 4px; margin-top: 20px;">View All Tournaments</a>
    `;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Handle404Page();
});

export default Handle404Page;