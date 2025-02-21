console.log("JS file loaded");

class TournamentList {
  constructor() {
    // DOM Elements
    this.elements = {
      tournamentsGrid: document.getElementById("tournamentsGrid"),
      emptyState: document.querySelector(".empty-state"),
      searchInput: document.getElementById("tournamentSearch"),
      filterButtons: document.querySelectorAll(".filter-btn"),
      modal: document.getElementById("registrationModal"),
      closeModal: document.querySelector(".close-modal")
    };

    // State
    this.tournaments = [];
    this.currentFilter = "all";

    this.init();
  }

  async init() {
    await this.fetchTournaments();
    this.setupEventListeners();
    this.renderTournaments();
  }

  setupEventListeners() {
    // Search input listener
    this.elements.searchInput.addEventListener("input", (e) => 
      this.filterTournaments(e.target.value)
    );

    // Filter buttons listeners
    this.elements.filterButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        this.elements.filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentFilter = btn.dataset.filter;
        this.filterTournaments(this.elements.searchInput.value);
      });
    });

    // Modal close on outside click
    window.addEventListener("click", (e) => {
      if (e.target === this.elements.modal) {
        this.elements.modal.style.display = "none";
      }
    });
  }

  async fetchTournaments() {
    try {
      const response = await fetch(`${window.config.API_URL}/tournaments`);
      if (!response.ok) {
        throw new Error("Failed to load tournaments");
      }
      this.tournaments = await response.json();
      console.log("Fetched tournaments:", this.tournaments);

      if (this.tournaments.length === 0) {
        console.warn("No tournaments found.");
      }
    } catch (err) {
      console.error("Error fetching tournaments:", err);
      this.showError("Failed to load tournaments");
    }
  }

  getTournamentStatus(tournament) {
    const statusMap = {
      1: "upcoming",
      2: "ongoing",
      3: "completed"
    };
    return statusMap[tournament.status_id] || "unknown";
  }

  createTournamentCard(tournament) {
    const card = document.createElement("div");
    card.className = "tournament-card";

    const date = new Date(tournament.start_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const status = this.getTournamentStatus(tournament);

    card.innerHTML = `
      <span class="tournament-status status-${status}">
        ${status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
      <h3>${tournament.name}</h3>
      <div class="tournament-info">📅 ${date}</div>
      <div class="tournament-info">📍 ${tournament.location}</div>
      <div class="tournament-info">🎮 ${tournament.format}</div>
      <div class="tournament-stats">
        <div class="stat-item">
          <span>👥</span>
          <span>${tournament.participants} players</span>
        </div>
        <div class="stat-item">
          <span>🎾</span>
          <span>${tournament.courts || 0} courts</span>
        </div>
      </div>
      <div class="tournament-actions">
        <button class="btn-view" onclick="TournamentList.viewTournament('${tournament.id}')">
          View Tournament
        </button>
      </div>
    `;
    return card;
  }

  static viewTournament(tournamentId) {
    localStorage.setItem("selectedTournament", tournamentId);
    window.location.href = "tournament-management.html";
  }

  renderTournaments(tournamentList = this.tournaments) {
    if (!this.elements.tournamentsGrid) {
      console.error("Tournament container not found!");
      return;
    }

    this.elements.tournamentsGrid.innerHTML = "";
    this.elements.tournamentsGrid.style.removeProperty('display');

    tournamentList.forEach(tournament => {
      const card = this.createTournamentCard(tournament);
      this.elements.tournamentsGrid.appendChild(card);
    });
  }

  filterTournaments(searchTerm = "", status = this.currentFilter) {
    let filtered = this.tournaments;

    if (status !== "all") {
      filtered = filtered.filter(
        tournament => this.getTournamentStatus(tournament) === status
      );
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(tournament =>
        tournament.name.toLowerCase().includes(term) ||
        tournament.location.toLowerCase().includes(term) ||
        tournament.format.toLowerCase().includes(term)
      );
    }

    this.updateTournamentsList(filtered);
  }

  updateTournamentsList(filteredTournaments) {
    if (!this.elements.tournamentsGrid) {
      console.error("Tournament container not found!");
      return;
    }

    this.elements.tournamentsGrid.innerHTML = "";

    if (filteredTournaments.length === 0) {
      this.elements.emptyState.style.display = "block";
      this.elements.tournamentsGrid.style.display = "none";
    } else {
      this.elements.emptyState.style.display = "none";
      this.elements.tournamentsGrid.style.display = "grid";
      filteredTournaments.forEach(tournament => {
        const card = this.createTournamentCard(tournament);
        this.elements.tournamentsGrid.appendChild(card);
      });
    }
  }

  showError(message) {
    // You can implement a more sophisticated error handling here
    console.error(message);
    alert(message);
  }

  sortTournaments() {
    this.tournaments.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  window.tournamentList = new TournamentList();
});
