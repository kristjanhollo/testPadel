document.addEventListener('DOMContentLoaded', () => {
  const tournamentForm = document.getElementById('tournamentForm');
  const courtsContainer = document.getElementById('courtsContainer');
  const addCourtBtn = document.getElementById('addCourtBtn');
  let courtCount = 0;
    
  // Validate tournament date
  const startDate = document.getElementById('startDate');

  function validateDate() {
    const start = new Date(startDate.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Reset custom validity
    startDate.setCustomValidity('');

    // Validate start date
    if (start < today) {
      startDate.setCustomValidity('Tournament date cannot be in the past');
    }
  }

  startDate.addEventListener('change', validateDate);

  // Court management
  function createCourtElement() {
    const courtId = `court-${++courtCount}`;
    const courtDiv = document.createElement('div');
    courtDiv.className = 'court-item';
    courtDiv.dataset.courtId = courtId;

    const input = document.createElement('input');
    input.type = 'text';
    input.name = `court-${courtId}`;
    input.placeholder = 'Enter court name';
    input.required = true;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => courtDiv.remove();

    courtDiv.appendChild(input);
    courtDiv.appendChild(removeBtn);
    return courtDiv;
  }

  addCourtBtn.addEventListener('click', () => {
    courtsContainer.appendChild(createCourtElement());
  });

  // Add first court by default
  courtsContainer.appendChild(createCourtElement());

  // Form submission handler
  tournamentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    validateDate();

    if (tournamentForm.checkValidity()) {
      // Collect courts data
      const courts = Array.from(courtsContainer.getElementsByClassName('court-item'))
        .map(court => ({
          id: court.dataset.courtId,
          name: court.querySelector('input').value
        }));

      const formData = {
        tournamentName: document.getElementById('tournamentName').value,
        startDate: startDate.value,
        location: document.getElementById('location').value,
        maxParticipants: document.getElementById('maxParticipants').value,
        tournamentFormat: document.getElementById('tournamentFormat').value,
        courts: courts
      };

      // For now, just log the data and show success message
      console.log('Tournament Registration Data:', formData);
      alert('Tournament registration successful!');
      tournamentForm.reset();
            
      // Reset courts
      courtsContainer.innerHTML = '';
      courtCount = 0;
      courtsContainer.appendChild(createCourtElement());
    } else {
      // Find the first invalid field and focus it
      const invalidField = tournamentForm.querySelector(':invalid');
      if (invalidField) {
        invalidField.focus();
      }
    }
  });

  // Set minimum date for tournament date input to today
  const today = new Date().toISOString().split('T')[0];
  startDate.min = today;
});
