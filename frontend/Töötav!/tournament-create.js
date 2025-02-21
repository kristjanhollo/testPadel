document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('tournamentForm');
    const courtsContainer = document.getElementById('courtsContainer');
    const addCourtBtn = document.getElementById('addCourtBtn');
    let courtCount = 0;

    // Add initial court
    addCourt();

    // Event Listeners
    addCourtBtn.addEventListener('click', addCourt);
    form.addEventListener('submit', handleSubmit);

    function addCourt() {
        courtCount++;
        const courtDiv = document.createElement('div');
        courtDiv.className = 'court-input';
        courtDiv.innerHTML = `
            <input type="text" 
                   name="court${courtCount}" 
                   placeholder="Court ${courtCount} Name" 
                   required>
            <button type="button" class="btn-remove" onclick="this.parentElement.remove()">×</button>
        `;
        courtsContainer.appendChild(courtDiv);
    }

    function handleSubmit(e) {
        e.preventDefault();

        // Validate participant count is even
        const maxParticipants = parseInt(document.getElementById('maxParticipants').value);
        if (maxParticipants % 2 !== 0) {
            alert('Maximum participants must be an even number for doubles teams');
            return;
        }

        // Get all courts
        const courts = Array.from(courtsContainer.getElementsByClassName('court-input'))
            .map((courtDiv, index) => ({
                id: `court-${Date.now()}-${index}`,
                name: courtDiv.querySelector('input').value
            }));

        if (courts.length === 0) {
            alert('At least one court is required');
            return;
        }

        // Create tournament object
        const tournament = {
            id: `tournament-${Date.now()}`,
            name: document.getElementById('name').value,
            date: document.getElementById('date').value,
            location: document.getElementById('location').value,
            format: document.getElementById('format').value,
            maxParticipants: maxParticipants,
            courts: courts,
            status: 'upcoming',
            matches: [],
            createdAt: new Date().toISOString()
        };

        // Add format-specific properties
        if (tournament.format === 'Mexicano') {
            tournament.groupStage = {
                groups: [], // Will be populated when bracket is generated
                completed: false
            };
            tournament.playoffStage = {
                rounds: [], // Will be populated when group stage completes
                completed: false
            };
        } else if (tournament.format === 'Americano') {
            tournament.standings = []; // Will be populated with teams when bracket is generated
        }

        // Save tournament
        const tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');
        tournaments.push(tournament);
        localStorage.setItem('tournaments', JSON.stringify(tournaments));

        // Initialize empty players array for this tournament
        localStorage.setItem(`tournament_${tournament.id}_players`, '[]');

        // Redirect to tournament management
        localStorage.setItem('selectedTournament', tournament.id);
        window.location.href = 'tournament-management.html';
    }

    // Set minimum date to today
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;

    // Format-specific validations
    const formatSelect = document.getElementById('format');
    const maxParticipantsInput = document.getElementById('maxParticipants');

    formatSelect.addEventListener('change', () => {
        const format = formatSelect.value;
        if (format === 'Mexicano') {
            // Mexicano format requires at least 8 players for 2 groups
            maxParticipantsInput.min = 8;
            if (maxParticipantsInput.value < 8) {
                maxParticipantsInput.value = 8;
            }
        } else {
            // Americano format requires at least 4 players
            maxParticipantsInput.min = 4;
        }
    });

    maxParticipantsInput.addEventListener('change', () => {
        const value = parseInt(maxParticipantsInput.value);
        const format = formatSelect.value;

        // Ensure even number
        if (value % 2 !== 0) {
            maxParticipantsInput.value = value + 1;
        }

        // Format-specific minimums
        if (format === 'Mexicano' && value < 8) {
            maxParticipantsInput.value = 8;
        } else if (value < 4) {
            maxParticipantsInput.value = 4;
        }
    });
});
