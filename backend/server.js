import express from "express";
import cors from "cors";
import pool from "./db.js"; 

const app = express();
app.use(cors());
app.use(express.json()); // Allows parsing JSON data


app.get("/players", async (req, res) => {
    try {
        const result = await pool.query("SELECT id, name, ranking, created_at FROM players");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});


app.put("/players/:id", async (req, res) => {
    const { id } = req.params;
    const { ranking } = req.body;
    try {
        const result = await pool.query("UPDATE players SET ranking = $1 WHERE id = $2 RETURNING *", [ranking, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Player not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});


app.delete("/players/:id", async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: "Player ID is required" });
    }

    try {
        const result = await pool.query("DELETE FROM players WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Player not found" });
        }
        res.json({ message: "Player deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.post("/players", async (req, res) => {
    const { name, rating } = req.body;

    // Validate input
    if (!name || isNaN(rating) || rating < 0 || rating > 40) {
        return res.status(400).json({ message: "Invalid player data. Name and valid rating (0-40) required." });
    }

    try {
        const result = await pool.query(
            "INSERT INTO players (name, ranking) VALUES ($1, $2) RETURNING *",
            [name, rating]
        );
        res.status(201).json(result.rows[0]); // Return newly created player
    } catch (err) {
        console.error("Error adding player:", err);
        res.status(500).json({ message: "Server error while adding player." });
    }
});


app.post("/players/bulk", async (req, res) => {
    const { players } = req.body;

    if (!Array.isArray(players) || players.length === 0) {
        return res.status(400).json({ message: "Invalid data. Players array required." });
    }

    try {
        const values = players
            .map(({ name, ranking }) => `('${name}', ${ranking})`)
            .join(",");

        const query = `
            INSERT INTO players (name, ranking)
            VALUES ${values}
            ON CONFLICT (name) DO NOTHING
            RETURNING *;
        `;

        const result = await pool.query(query);
        res.status(201).json({ message: `${result.rowCount} players added.` });

    } catch (err) {
        console.error("Error adding players:", err);
        res.status(500).json({ message: "Server error while adding players." });
    }
});


app.post("/tournaments", async (req, res) => {
    const { name, start_date, location, format, participants, courts, status_id } = req.body;

    if (!name || !start_date || !location || !format || !participants || !courts || !status_id) {
        return res.status(400).json({ message: "Missing required tournament data" });
    }

    try {
        const result = await pool.query(
            "INSERT INTO tournament (name, start_date, location, format, participants, courts, status_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [name, start_date, location, format, participants, JSON.stringify(courts), status_id]
        );
        res.status(201).json(result.rows[0]); // Return newly created tournament
    } catch (err) {
        console.error("Error adding tournament:", err);
        res.status(500).json({ message: "Server error while adding tournament" });
    }
});

// ✅ 2️⃣ API to Update a Tournament
app.put("/tournaments/:id", async (req, res) => {
    const { id } = req.params;
    const { name, start_date, location, format, participants, courts } = req.body;

    try {
        const result = await pool.query(
            "UPDATE tournament SET name = $1, start_date = $2, location = $3, format = $4, participants = $5, courts = $6 WHERE id = $7 RETURNING *",
            [name, start_date, location, format, participants, JSON.stringify(courts), id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Tournament not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating tournament:", err);
        res.status(500).json({ message: "Server error while updating tournament" });
    }
});

// ✅ 3️⃣ API to Delete a Tournament
app.delete("/tournaments/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query("DELETE FROM tournament WHERE id = $1 RETURNING *", [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Tournament not found" });
        }

        res.json({ message: "Tournament deleted successfully" });
    } catch (err) {
        console.error("Error deleting tournament:", err);
        res.status(500).json({ message: "Server error while deleting tournament" });
    }
});

// ✅ 4️⃣ API to Get All Tournaments
app.get("/tournaments", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM tournament ORDER BY start_date ASC");
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching tournaments:", err);
        res.status(500).json({ message: "Server error while fetching tournaments" });
    }
});


app.get("/tournaments/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query("SELECT * FROM tournament WHERE id = $1", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Tournament not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching tournament:", err);
        res.status(500).json({ message: "Server error while fetching tournament" });
    }

});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
