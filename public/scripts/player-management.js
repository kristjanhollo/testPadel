// Import dependencies and styles
import firebaseService from './services/firebase-service';

/**
 * Player Management class
 * Manages player listing, filtering, and CRUD operations
 */
class PlayerManagement {
  constructor() {
    // State variables
    this.players = [];
    this.currentPage = 1;
    this.playersPerPage = 25;
    
    // DOM Elements
    this.playersList = document.getElementById('playersList');
    this.pagination = document.getElementById('pagination');
    this.searchInput = document.getElementById('searchPlayers');
    this.addPlayerButton = document.getElementById('addPlayer');
    this.quickAddButton = document.getElementById('quickAdd');
    
    // Initialize the page
    this.init();
  }
  
  async init() {
    try {
      // Load players data
      await this.loadPlayers();
      
      // Setup event listeners
      this.setupAddPlayer();
      this.setupQuickAdd();
      this.setupSearchFiltering();
      
      // Make functions available globally
      window.editPlayer = (playerId) => this.editPlayer(playerId);
      window.deletePlayer = (playerId) => this.deletePlayer(playerId);
    } catch (error) {
      console.error('Error initializing player management:', error);
      Swal.fire('Error', 'Failed to initialize player management.', 'error');
    }
  }
  
  async loadPlayers() {
    try {
      // Using Firebase service to get players
      this.players = await firebaseService.getAllPlayers();
      
      this.renderPlayers(this.players);
      this.setupPagination();
    } catch (error) {
      console.error('Error loading players:', error);
      Swal.fire('Error', 'Failed to load players', 'error');
    }
  }
  
  renderPlayers(filteredList = null) {
    if (!this.playersList) return;
    this.playersList.innerHTML = '';
    
    const playersToShow = filteredList || this.players;
    const start = (this.currentPage - 1) * this.playersPerPage;
    const end = start + this.playersPerPage;
    const paginatedPlayers = playersToShow.slice(start, end);
    
    if (paginatedPlayers.length === 0) {
      this.playersList.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 20px;">
            No players found. Add some players to get started!
          </td>
        </tr>`;
      return;
    }
    
    paginatedPlayers.forEach((player) => {
      const row = document.createElement('tr');
      // Add clickable style and function for entire row
      row.style.cursor = 'pointer';
      row.addEventListener('click', (e) => {
        // Don't navigate to profile if clicked on buttons
        if (!e.target.closest('.btn')) {
          window.location.href = `player-profile.html?id=${player.id}`;
        }
      });
      
      row.innerHTML = `
        <td>${player.name}</td>
        <td>${player.ranking || 'N/A'}</td>
        <td>${this.formatDate(player.lastActive || player.created_at)}</td>
        <td class="actions">
          <button class="btn btn-outline-primary btn-sm" onclick="editPlayer('${player.id}')">✏️ Edit</button>
          <button class="btn btn-outline-danger btn-sm" onclick="deletePlayer('${player.id}')">🗑 Delete</button>
        </td>
      `;
      this.playersList.appendChild(row);
    });
  }
  
  setupPagination() {
    if (!this.pagination) return;
    
    this.pagination.innerHTML = '';
    const totalPages = Math.ceil(this.players.length / this.playersPerPage);
    
    for (let i = 1; i <= totalPages; i++) {
      const pageItem = document.createElement('li');
      pageItem.className = `page-item ${i === this.currentPage ? 'active' : ''}`;
      
      const pageLink = document.createElement('a');
      pageLink.className = 'page-link';
      pageLink.href = '#';
      pageLink.textContent = i;
      pageLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.currentPage = i;
        this.renderPlayers();
        this.setupPagination(); // Update active page
      });
      
      pageItem.appendChild(pageLink);
      this.pagination.appendChild(pageItem);
    }
  }
  
  setupSearchFiltering() {
    if (!this.searchInput) return;
    
    this.searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      
      if (!searchTerm.trim()) {
        this.renderPlayers(this.players);
        return;
      }
      
      const filtered = this.players.filter((player) =>
        player.name.toLowerCase().includes(searchTerm)
      );
      
      this.currentPage = 1; // Reset to first page on new search
      this.renderPlayers(filtered);
      this.setupPagination();
    });
  }
  
  setupAddPlayer() {
    if (!this.addPlayerButton) return;
    
    this.addPlayerButton.addEventListener('click', async () => {
      const { value: formValues } = await Swal.fire({
        title: 'Add New Player',
        html:
          '<input id="swal-name" class="swal2-input" placeholder="Player Name">' +
          '<input id="swal-rating" type="number" step="0.1" class="swal2-input" placeholder="Ranking (0-40)" min="0" max="40">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Add Player',
        preConfirm: () => {
          const name = document.getElementById('swal-name').value;
          const rating = parseFloat(document.getElementById('swal-rating').value);
          
          if (!name || name.trim() === '') {
            Swal.showValidationMessage('Player name is required');
            return false;
          }
          
          if (isNaN(rating) || rating < 0 || rating > 40) {
            Swal.showValidationMessage('Please enter a valid ranking between 0 and 40');
            return false;
          }
          
          return { name, rating };
        },
      });
      
      if (formValues) {
        try {
          const newPlayer = {
            name: formValues.name,
            ranking: formValues.rating
          };
          
          await firebaseService.addPlayer(newPlayer);
          
          await Swal.fire({
            title: 'Success!',
            text: 'Player added successfully!',
            icon: 'success',
            timer: 1500
          });
          
          await this.loadPlayers(); // Refresh the player list
        } catch (error) {
          console.error('Error adding player:', error);
          Swal.fire('Error', 'Could not add the player.', 'error');
        }
      }
    });
  }
  
  setupQuickAdd() {
    if (!this.quickAddButton) return;
    
    this.quickAddButton.addEventListener('click', async () => {
      const { value: inputText } = await Swal.fire({
        title: 'Quick Add Players',
        html: `
          <textarea id="swal-player-list" class="swal2-textarea" placeholder="Enter players (one per line, format: Name TAB Ranking)"></textarea>
          <div style="text-align: left; margin-top: 10px; font-size: 12px; color: #666;">
            Example:<br>
            John Smith	5.6<br>
            Jane Doe	4.2
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Add Players',
        preConfirm: () => {
          const text = document.getElementById('swal-player-list').value.trim();
          if (!text) {
            Swal.showValidationMessage('Please enter at least one player.');
            return false;
          }
          return text;
        },
      });
      
      if (inputText) {
        try {
          const playersToAdd = inputText.split('\n').map((line) => {
            const [name, ranking] = line.split('\t').map((cell) => cell.trim());
            return {
              name,
              ranking: parseFloat(ranking)
            };
          });
          
          const validPlayers = playersToAdd.filter(
            (p) => p.name && !isNaN(p.ranking) && p.ranking >= 0 && p.ranking <= 40
          );
          
          if (validPlayers.length === 0) {
            Swal.fire(
              'Error',
              'No valid players found. Make sure the format is correct!',
              'error'
            );
            return;
          }
          
          // Add all players at once using batch
          await firebaseService.addMultiplePlayers(validPlayers);
          
          await Swal.fire(
            'Success',
            `${validPlayers.length} players added successfully!`,
            'success'
          );
          
          await this.loadPlayers(); // Refresh list
        } catch (error) {
          console.error('Error adding players:', error);
          Swal.fire('Error', 'Could not add the players.', 'error');
        }
      }
    });
  }
  
  async editPlayer(playerId) {
    try {
      // Get the current player data
      const player = this.players.find(p => p.id === playerId);
      
      if (!player) {
        throw new Error('Player not found');
      }
      
      const { value: newRating } = await Swal.fire({
        title: 'Edit Player Rating',
        input: 'number',
        inputLabel: 'Enter new rating (0-40):',
        inputValue: player.ranking || 0,
        inputAttributes: {
          min: '0',
          max: '40',
          step: '0.1',
        },
        showCancelButton: true,
        confirmButtonText: 'Update',
        cancelButtonText: 'Cancel',
        preConfirm: (value) => {
          const rating = parseFloat(value);
          if (isNaN(rating) || rating < 0 || rating > 40) {
            Swal.showValidationMessage(
              'Please enter a valid rating between 0 and 40.'
            );
            return false;
          }
          return rating;
        },
      });
      
      if (newRating !== undefined) {
        await firebaseService.updatePlayer(playerId, {
          ranking: parseFloat(newRating)
        });
        
        Swal.fire({
          title: 'Success!',
          text: 'Player rating updated!',
          icon: 'success',
          timer: 1500
        });
        
        await this.loadPlayers(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating player:', error);
      Swal.fire('Error', 'Could not update the player.', 'error');
    }
  }
  
  async deletePlayer(playerId) {
    const player = this.players.find(p => p.id === playerId);
    
    if (!player) {
      Swal.fire('Error', 'Player not found', 'error');
      return;
    }
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${player.name}. This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    });
    
    if (result.isConfirmed) {
      try {
        await firebaseService.deletePlayer(playerId);
        
        Swal.fire({
          title: 'Deleted!',
          text: 'The player has been removed.',
          icon: 'success',
          timer: 1500
        });
        
        await this.loadPlayers(); // Refresh data
      } catch (error) {
        console.error('Error deleting player:', error);
        Swal.fire('Error', 'Could not delete the player.', 'error');
      }
    }
  }
  
  // Helper function to format dates
  formatDate(dateValue) {
    if (!dateValue) return 'N/A';
    
    try {
      // Check if it's a Firestore timestamp
      if (dateValue.toDate) {
        return dateValue.toDate().toLocaleDateString();
      }
      
      // Handle ISO strings
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString();
    } catch (error) {
      return 'N/A';
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PlayerManagement();
});

export default PlayerManagement;