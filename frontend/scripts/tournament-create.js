// Constants and configurations
const TOURNAMENT_FORMATS = {
  MEXICANO: 'Mexicano',
  AMERICANO: 'Americano'
};

const DEFAULT_COURTS = ['Padel Arenas', 'Coolbet', 'Lux Express', '3p Logistics'];

const CONSTRAINTS = {
  MIN_PLAYERS: 4,
  MEXICANO_MIN_PLAYERS: 16,
  MAX_COURTS: 4
};

class TournamentCreator {
  constructor() {
    this.form = document.getElementById('tournamentForm');
    this.dateInput = document.getElementById('date');
    this.courtsContainer = document.getElementById('courtsContainer');
    this.addCourtBtn = document.getElementById('addCourtBtn');
    this.formatSelect = document.getElementById('format');
    this.maxParticipantsInput = document.getElementById('maxParticipants');
    
    this.courtCount = 0;
    
    this.init();
  }

  init() {
    this.setMinDate();
    this.setupEventListeners();
    this.addInitialCourt();
    if (window.IsTest) this.preFillTestData();
  }

  setMinDate() {
    this.dateInput.min = new Date().toISOString().split('T')[0];
  }

  setupEventListeners() {
    this.addCourtBtn.addEventListener('click', () => this.addCourt());
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    this.formatSelect.addEventListener('change', () => this.handleFormatChange());
    this.maxParticipantsInput.addEventListener('change', () => this.validateParticipants());
  }

  addCourt() {
    this.courtCount++;
    const courtDiv = document.createElement('div');
    courtDiv.className = 'court-input';
    
    courtDiv.innerHTML = `
      <input type="text" 
             name="court${this.courtCount}" 
             placeholder="Court ${this.courtCount} Name" 
             required>
      <button type="button" class="btn-remove">×</button>
    `;

    courtDiv.querySelector('.btn-remove').addEventListener('click', 
      (e) => this.removeCourt(e.target));

    this.courtsContainer.appendChild(courtDiv);
    this.updateCourtControls();
  }

  removeCourt(button) {
    const courts = this.courtsContainer.querySelectorAll('.court-input');
    if (courts.length > 1) {
      button.closest('.court-input').remove();
      this.updateCourtControls();
    }
  }

  updateCourtControls() {
    const courts = this.courtsContainer.querySelectorAll('.court-input');
    
    // Update court numbers and names
    courts.forEach((court, index) => {
      const input = court.querySelector('input');
      input.name = `court${index + 1}`;
      input.placeholder = `Court ${index + 1} Name`;
    });

    // Handle remove buttons visibility
    courts.forEach((court, index) => {
      const removeBtn = court.querySelector('.btn-remove');
      removeBtn.style.display = index === 0 ? 'none' : 'inline-block';
    });

    // Toggle add court button visibility
    this.addCourtBtn.style.display = 
      courts.length === CONSTRAINTS.MAX_COURTS ? 'none' : 'inline-block';
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    const courts = Array.from(
      this.courtsContainer.getElementsByClassName('court-input')
    ).map(courtDiv => courtDiv.querySelector('input').value);

    if (!courts.length) {
      this.showError('At least one court is required');
      return;
    }

    const tournamentData = {
      name: document.getElementById('name').value,
      start_date: this.dateInput.value,
      location: document.getElementById('location').value,
      format: this.formatSelect.value,
      participants: parseInt(this.maxParticipantsInput.value, 10),
      courts,
      status_id: 1
    };

    try {
      const response = await this.createTournament(tournamentData);
      this.handleSuccessfulCreation(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  async createTournament(data) {
    const response = await fetch(`${window.config.API_URL}/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Failed to create tournament');
    return response.json();
  }

  handleSuccessfulCreation(tournament) {
    localStorage.setItem('selectedTournament', tournament.id);
    window.location.href = 'tournament-management.html';
  }

  handleFormatChange() {
    const format = this.formatSelect.value;
    
    if (format === TOURNAMENT_FORMATS.MEXICANO || 
        format === TOURNAMENT_FORMATS.AMERICANO) {
      this.setupFixedFormat();
    } else {
      this.setupFlexibleFormat();
    }
  }

  setupFixedFormat() {
    const minPlayers = CONSTRAINTS.MEXICANO_MIN_PLAYERS;
    this.maxParticipantsInput.min = minPlayers;
    if (this.maxParticipantsInput.value < minPlayers) {
      this.maxParticipantsInput.value = minPlayers;
    }

    this.courtsContainer.innerHTML = '';
    this.setupDefaultCourts();
    this.addCourtBtn.style.display = 'none';
  }

  setupFlexibleFormat() {
    this.maxParticipantsInput.min = CONSTRAINTS.MIN_PLAYERS;
    this.courtsContainer.innerHTML = '';
    this.addInitialCourt();
    this.addCourtBtn.style.display = 'inline-block';
  }

  setupDefaultCourts() {
    DEFAULT_COURTS.forEach(courtName => {
      const courtDiv = document.createElement('div');
      courtDiv.className = 'court-input';
      courtDiv.innerHTML = `
        <input type="text" 
               name="court" 
               value="${courtName}" 
               readonly>
      `;
      this.courtsContainer.appendChild(courtDiv);
    });
  }

  addInitialCourt() {
    this.courtCount = 1;
    const courtDiv = document.createElement('div');
    courtDiv.className = 'court-input';
    
    courtDiv.innerHTML = `
      <input type="text" 
             name="court1" 
             placeholder="Court 1 Name" 
             required>
      <button type="button" class="btn-remove">×</button>
    `;

    courtDiv.querySelector('.btn-remove').addEventListener('click', 
      (e) => this.removeCourt(e.target));

    this.courtsContainer.appendChild(courtDiv);
    this.updateCourtControls();
  }

  preFillTestData() {
    // Fill in basic tournament details
    document.getElementById('name').value = `Test Tournament ${Math.floor(Math.random() * 1000)}`;
    this.dateInput.value = '2025-12-31';
    document.getElementById('location').value = 'Tallinn';
    this.formatSelect.value = TOURNAMENT_FORMATS.MEXICANO;
    this.maxParticipantsInput.value = CONSTRAINTS.MEXICANO_MIN_PLAYERS;

    // Trigger format change to setup courts
    this.handleFormatChange();
  }

  handleError(error) {
    console.error('Error creating tournament:', error);
    alert('Failed to create tournament. Please try again.');
  }

  showError(message) {
    alert(message);
  }

  validateParticipants() {
    let value = parseInt(this.maxParticipantsInput.value);
    const format = this.formatSelect.value;

    // Ensure even number
    if (value % 2 !== 0) {
      value += 1;
    }

    // Apply format-specific minimums
    if (format === TOURNAMENT_FORMATS.MEXICANO && value < CONSTRAINTS.MEXICANO_MIN_PLAYERS) {
      value = CONSTRAINTS.MEXICANO_MIN_PLAYERS;
    } else if (value < CONSTRAINTS.MIN_PLAYERS) {
      value = CONSTRAINTS.MIN_PLAYERS;
    }

    this.maxParticipantsInput.value = value;
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new TournamentCreator();
});