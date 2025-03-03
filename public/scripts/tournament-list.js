// public/scripts/tournament-list.js
import firebaseService from './services/firebase-service.js';
import { routingService } from './services/routing-service.js';

class TournamentList {
  constructor() {
    // DOM Elements
    this.elements = {
      tournamentsGrid: document.getElementById('tournamentsGrid'),
      emptyState: document.getElementById('emptyState'),
      searchInput: document.getElementById('tournamentSearch'),
      filterButtons: document.querySelectorAll('.filter-btn')
    };

    // State
    this.tournaments = [];
    this.currentFilter = 'all';

    this.init();
  }

  async init() {
    await this.fetchTournaments();
    this.setupEventListeners();
    this.renderTournaments();
  }

  setupEventListeners() {
    // Search input listener
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('input', (e) => 
        this.filterTournaments(e.target.value)
      );
    }

    // Filter buttons listeners
    this.elements.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.elements.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.filterTournaments(this.elements.searchInput?.value || '');
      });
    });
  }

  async fetchTournaments() {
    try {
      // Use Firebase service to get tournaments
      this.tournaments = await firebaseService.getAllTournaments();
      console.log('Fetched tournaments:', this.tournaments);

      if (this.tournaments.length === 0) {
        console.warn('No tournaments found.');
        this.toggleEmptyState(true);
      } else {
        this.toggleEmptyState(false);
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      this.showError('Failed to load tournaments');
      this.toggleEmptyState(true);
    }
  }

  toggleEmptyState(show) {
    if (this.elements.emptyState) {
      this.elements.emptyState.style.display = show ? 'block' : 'none';
    }
    
    if (this.elements.tournamentsGrid) {
      this.elements.tournamentsGrid.style.display = show ? 'none' : 'grid';
    }
  }

  getTournamentStatus(tournament) {
    const statusMap = {
      1: 'upcoming',
      2: 'ongoing',
      3: 'completed'
    };
    return statusMap[tournament.status_id] || 'upcoming';
  }

  createTournamentCard(tournament) {
    console.log(`Tournament "${tournament.name}" data:`, {
        participants: tournament.participants,
        maxParticipants: tournament.maxParticipants,
        participants_type: typeof tournament.participants,
        status: tournament.status_id
    });
    
    const card = document.createElement('div');
    card.className = 'tournament-card';
    let date = 'N/A';
    try {
      // Parse date from string or Firestore timestamp
      if (tournament.start_date) {
        if (typeof tournament.start_date === 'string') {
          date = new Date(tournament.start_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } else if (tournament.start_date.toDate) {
          date = tournament.start_date.toDate().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      }
    } catch (error) {
      console.warn('Error formatting date:', error);
      date = tournament.start_date || 'N/A';
    }
    const status = this.getTournamentStatus(tournament);
    const courtCount = Array.isArray(tournament.courts) ? tournament.courts.length : 0;
    
    // Calculate player count information
    const registeredPlayers = tournament.participants || 0;
    
    // Determine maxPlayers value, accounting for the possibility it might be undefined
    let maxPlayers = tournament.maxParticipants;
    
    // Display logic - show status correctly based on actual data
    let playersText;
    let playersClass = '';
    
    if (typeof maxPlayers === 'undefined') {
      // If maxParticipants is undefined, just show the player count
      playersText = String(registeredPlayers);
    } else {
      // If maximum is known, check if tournament is full
      maxPlayers = Number(maxPlayers) || 16; // Default to 16 if can't convert to number
      const isFullyBooked = maxPlayers > 0 && 
                           registeredPlayers > 0 && 
                           registeredPlayers >= maxPlayers;
                           
      playersText = isFullyBooked ? 'FULL' : `${registeredPlayers}/${maxPlayers}`;
      if (isFullyBooked) {
        playersClass = 'fully-booked';
      }
    }
    
    card.innerHTML = `
      <span class="tournament-status status-${status}">
        ${status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
      <h3 class="tournament-name">${tournament.name}</h3>
      <div class="tournament-info">📅 ${date}</div>
      <div class="tournament-info">📍 ${tournament.location}</div>
      <div class="tournament-info">🎮 ${tournament.format}</div>
      <div class="tournament-stats">
        <div class="stat-item">
          <span class="${playersClass}">${playersText}</span>
          <span>Players</span>
        </div>
        <div class="stat-item">
          <span>${courtCount}</span>
          <span>Courts</span>
        </div>
        <div class="stat-item">
          <span>${status === 'completed' ? 'Finished' : status === 'ongoing' ? 'In Progress' : 'Open'}</span>
          <span>Status</span>
        </div>
      </div>
      <div class="tournament-actions">
        <button class="btn-view" onclick="TournamentList.viewTournament('${tournament.id}')">
          ${status === 'completed' ? 'View Results' : 'View Tournament'}
        </button>
      </div>
    `;
    return card;
  }

  static viewTournament(tournamentId) {
    // Use the routing service instead of direct navigation
    routingService.routeToTournament(tournamentId);
  }

  renderTournaments(tournamentList = this.tournaments) {
    if (!this.elements.tournamentsGrid) {
      console.error('Tournament container not found!');
      return;
    }

    this.elements.tournamentsGrid.innerHTML = '';

    if (tournamentList.length === 0) {
      this.toggleEmptyState(true);
      return;
    }

    this.toggleEmptyState(false);
    tournamentList.forEach(tournament => {
      const card = this.createTournamentCard(tournament);
      this.elements.tournamentsGrid.appendChild(card);
    });
  }

  filterTournaments(searchTerm = '', status = this.currentFilter) {
    let filtered = this.tournaments;

    if (status !== 'all') {
      filtered = filtered.filter(tournament => {
        const tournamentStatus = this.getTournamentStatus(tournament);
        return tournamentStatus === status;
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(tournament =>
        tournament.name.toLowerCase().includes(term) ||
        tournament.location?.toLowerCase().includes(term) ||
        tournament.format?.toLowerCase().includes(term)
      );
    }

    this.renderTournaments(filtered);
  }

  showError(message) {
    console.error(message);
    Swal.fire({
      title: 'Error',
      text: message,
      icon: 'error'
    });
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Ensure Firebase service is loaded
  if (!firebaseService) {
    console.error('Firebase service is not loaded! Make sure firebase-service.js is included before this script.');
    return;
  }
  
  window.tournamentList = new TournamentList();
});

// Expose the static function for HTML onclick
window.TournamentList = {
  viewTournament: TournamentList.viewTournament
};