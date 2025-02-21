let players = [];
let currentPage = 1;
const playersPerPage = 25;

document.addEventListener("DOMContentLoaded", () => {
  loadPlayers();
  AddPlayer();
  setupQuickAdd();
});

document.getElementById("searchPlayers").addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filtered = players.filter((player) =>
    player.name.toLowerCase().includes(searchTerm)
  );
  renderPlayers(filtered);
});

async function loadPlayers() {
  try {
    const snapshot = await db.collection('players').get();
    players = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    renderPlayers(players);
    setupPagination();
    
  } catch (error) {
    console.error("Error loading players", error);
    Swal.fire("Error", "Failed to load players", "error");
  }
}

function renderPlayers(filteredList = null) {
  const tbody = document.getElementById("playersList");
  if (!tbody) return;
  tbody.innerHTML = "";

  const playersToShow = filteredList || players;
  const start = (currentPage - 1) * playersPerPage;
  const end = start + playersPerPage;
  const paginatedPlayers = playersToShow.slice(start, end);

  if (paginatedPlayers.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 20px;">
                    No players found. Add some players to get started!
                </td>
            </tr>`;
    return;
  }

  paginatedPlayers.forEach((player) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${player.name}</td>
            <td>${player.ranking}</td>
            <td>${formatDate(player.lastActive || player.created_at)}</td>
            <td class="actions">
                <button class="btn btn-outline-primary btn-sm" onclick="editPlayer('${
                  player.id
                }')">✏️ Edit</button>
                <button class="btn btn-outline-danger btn-sm" onclick="deletePlayer('${
                  player.id
                }')">🗑 Delete</button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function setupPagination() {
  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  pagination.innerHTML = "";
  const totalPages = Math.ceil(players.length / playersPerPage);
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button");
    pageButton.classList.add("btn", "btn-outline-primary", "m-1");
    pageButton.textContent = i;
    pageButton.addEventListener("click", () => {
      currentPage = i;
      loadPlayers();
    });
    pagination.appendChild(pageButton);
  }
}

async function AddPlayer() {
  const addPlayerButton = document.getElementById("addPlayer");
  if (!addPlayerButton) return;

  addPlayerButton.addEventListener("click", async () => {
    const { value: formValues } = await Swal.fire({
      title: "Add New Player",
      html:
        '<input id="swal-name" class="swal2-input" placeholder="Player Name">' +
        '<input id="swal-rating" type="decimal" class="swal2-input" placeholder="Ranking (0-40)" min="0" max="40">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Add Player",
      preConfirm: () => {
        const name = document.getElementById("swal-name").value;
        const rating = parseFloat(document.getElementById("swal-rating").value);

        if (!name || isNaN(rating) || rating < 0 || rating > 40) {
          Swal.showValidationMessage(
            "Please enter a valid name and ranking (0-40)."
          );
        }
        return { name, rating };
      },
    });

    if (formValues) {
      try {
        const newPlayer = {
          name: formValues.name,
          ranking: formValues.rating,
          created_at: new Date().toISOString(),
          lastActive: new Date().toISOString()
        };

        await db.collection('players').add(newPlayer);
        
        Swal.fire("Success", "Player added successfully!", "success");
        loadPlayers();
      } catch (error) {
        console.error("Error adding player:", error);
        Swal.fire("Error", "Could not add the player.", "error");
      }
    }
  });
}

function setupQuickAdd() {
  const quickAddButton = document.getElementById("quickAdd");
  if (!quickAddButton) return;

  quickAddButton.addEventListener("click", async () => {
    const { value: inputText } = await Swal.fire({
      title: "Quick Add Players",
      html: `
                <textarea id="swal-player-list" class="swal2-textarea" placeholder="Enter players (one per line, format: Name TAB Ranking)"></textarea>
            `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Add Players",
      preConfirm: () => {
        const text = document.getElementById("swal-player-list").value.trim();
        if (!text) {
          Swal.showValidationMessage("Please enter at least one player.");
        }
        return text;
      },
    });

    if (inputText) {
      const players = inputText.split("\n").map((line) => {
        const [name, ranking] = line.split("\t").map((cell) => cell.trim());
        return { name, ranking: parseFloat(ranking) };
      });

      const validPlayers = players.filter(
        (p) => p.name && !isNaN(p.ranking) && p.ranking >= 0 && p.ranking <= 40
      );
      if (validPlayers.length === 0) {
        Swal.fire(
          "Error",
          "No valid players found. Make sure the format is correct!",
          "error"
        );
        return;
      }

      try {
        const response = await fetch("http://localhost:5001/players/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ players: validPlayers }),
        });

        if (!response.ok) throw new Error("Failed to add players");
        Swal.fire(
          "Success",
          `${validPlayers.length} players added successfully!`,
          "success"
        );
        loadPlayers(); // Reload player list
      } catch (error) {
        console.error("Error adding players:", error);
        Swal.fire("Error", "Could not add the players.", "error");
      }
    }
  });
}

async function editPlayer(playerId) {
  const { value: newRating } = await Swal.fire({
    title: "Edit Player Rating",
    input: "number",
    inputLabel: "Enter new rating (0-40):",
    inputAttributes: {
      min: "0",
      max: "40",
      step: "0.1",
    },
    showCancelButton: true,
    confirmButtonText: "Update",
    cancelButtonText: "Cancel",
    preConfirm: (value) => {
      if (!value || isNaN(value) || value < 0 || value > 40) {
        Swal.showValidationMessage(
          "Please enter a valid rating between 0 and 40."
        );
      }
      return value;
    },
  });

  if (newRating !== undefined) {
    try {
      await db.collection('players').doc(playerId).update({
        ranking: parseFloat(newRating),
        lastActive: new Date().toISOString()
      });

      Swal.fire("Success", "Player rating updated!", "success");
      loadPlayers();
      setupPagination();
    } catch (error) {
      console.error("Error updating player:", error);
      Swal.fire("Error", "Could not update the player.", "error");
    }
  }
}

async function deletePlayer(playerId) {
  Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to undo this action!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await db.collection('players').doc(playerId).delete();

        Swal.fire("Deleted!", "The player has been removed.", "success");
        loadPlayers();
      } catch (error) {
        console.error("Error deleting player:", error);
        Swal.fire("Error", "Could not delete the player.", "error");
      }
    }
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (date == "Invalid Date") return "N/A";
  return (
    date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear()
  );
}
