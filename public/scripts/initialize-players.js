// Initialize players based on game results
const gameResults = [
    {
        venue: "Padel Arenas",
        team1: ["Steven Saal", "Allan Lullu"],
        team2: ["Marten Raudsepp", "Edward Soon"],
        score: [4, 6]
    },
    {
        venue: "Coolbet",
        team1: ["Taivo Sillaste", "Dagmar Teppe"],
        team2: ["Tanel Erm", "Richard Tuhk"],
        score: [5, 6]
    },
    {
        venue: "Lux Express",
        team1: ["Anna-Liisa Väär", "Hero Särg"],
        team2: ["Kaspar Kivistik", "Marek Armulik"],
        score: [3, 6]
    },
    {
        venue: "3p",
        team1: ["Zaven Sarkisjan", "Andres Pihlak"],
        team2: ["Hendrik Lepik", "Mark Metsoja"],
        score: [6, 3]
    },
    {
        venue: "Padel Arenas",
        team1: ["Steven Saal", "Marten Raudsepp"],
        team2: ["Edward Soon", "Allan Lullu"],
        score: [2, 8]
    },
    {
        venue: "Coolbet",
        team1: ["Taivo Sillaste", "Tanel Erm"],
        team2: ["Richard Tuhk", "Dagmar Teppe"],
        score: [5, 6]
    },
    {
        venue: "Lux Express",
        team1: ["Anna-Liisa Väär", "Kaspar Kivistik"],
        team2: ["Marek Armulik", "Hero Särg"],
        score: [4, 7]
    },
    {
        venue: "3p",
        team1: ["Zaven Sarkisjan", "Hendrik Lepik"],
        team2: ["Mark Metsoja", "Andres Pihlak"],
        score: [5, 3]
    },
    {
        venue: "Padel Arenas",
        team1: ["Steven Saal", "Tanel Erm"],
        team2: ["Marten Raudsepp", "Taivo Sillaste"],
        score: [8, 3]
    },
    {
        venue: "Coolbet",
        team1: ["Edward Soon", "Dagmar Teppe"],
        team2: ["Allan Lullu", "Richard Tuhk"],
        score: [2, 8]
    },
    {
        venue: "Lux Express",
        team1: ["Anna-Liisa Väär", "Hendrik Lepik"],
        team2: ["Kaspar Kivistik", "Zaven Sarkisjan"],
        score: [3, 6]
    },
    {
        venue: "3p",
        team1: ["Marek Armulik", "Andres Pihlak"],
        team2: ["Hero Särg", "Mark Metsoja"],
        score: [3, 6]
    },
    {
        venue: "Padel Arenas",
        team1: ["Steven Saal", "Edward Soon"],
        team2: ["Marten Raudsepp", "Allan Lullu"],
        score: [9, 3]
    },
    {
        venue: "Coolbet",
        team1: ["Taivo Sillaste", "Richard Tuhk"],
        team2: ["Tanel Erm", "Dagmar Teppe"],
        score: [6, 6]
    },
    {
        venue: "Lux Express",
        team1: ["Anna-Liisa Väär", "Marek Armulik"],
        team2: ["Kaspar Kivistik", "Hero Särg"],
        score: [7, 3]
    },
    {
        venue: "3p",
        team1: ["Zaven Sarkisjan", "Mark Metsoja"],
        team2: ["Hendrik Lepik", "Andres Pihlak"],
        score: [8, 6]
    }
];

// List of players to set rating 2.0
const playersWithDefaultRating = new Set([
    "Steven Saal",
    "Richard Tuhk",
    "Tanel Erm",
    "Taivo Sillaste",
    "Indrek Pajula",
    "Dagmar Teppe",
    "Marek Armulik",
    "Dmitri Zhukov",
    "Aleksandra Sevoldajeva",
    "Hero Särg",
    "Zaven Sarkisjan",
    "Imre Reinhaus",
    "Andres Pihlak",
    "Hendrik Lepik",
    "Kristjan Hollo",
    "Oscar Tirman"
]);

// Get unique players and initialize their stats
const players = new Map();

// First initialize all players from the provided list with rating 2.0
playersWithDefaultRating.forEach(name => {
    players.set(name, {
        id: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        name: name,
        matches: [],
        wins: 0,
        rating: 2.0, // Set default rating
        ratingHistory: [{
            date: new Date().toISOString(),
            rating: 2.0
        }]
    });
});

gameResults.forEach(game => {
    const allPlayers = [...game.team1, ...game.team2];
    allPlayers.forEach(name => {
        if (!players.has(name)) {
            if (!players.has(name)) {
                players.set(name, {
                    id: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
                    name: name,
                    matches: [],
                    wins: 0,
                    rating: 3.5, // Start with average recreational rating for others
                    ratingHistory: []
                });
            }
        }
        
        const player = players.get(name);
        const isTeam1 = game.team1.includes(name);
        const team1Won = game.score[0] > game.score[1];
        const won = (isTeam1 && team1Won) || (!isTeam1 && !team1Won);
        
        player.matches.push({
            venue: game.venue,
            score: game.score,
            won: won
        });
        
        if (won) player.wins++;
    });
});

// Calculate ratings based on performance only for players not in the default list
players.forEach((player, name) => {
    if (!playersWithDefaultRating.has(name)) {
        const winRate = player.wins / player.matches.length;
        
        // Adjust rating based on win rate
        if (winRate > 0.7) player.rating += 1;
        else if (winRate > 0.5) player.rating += 0.5;
        else if (winRate < 0.3) player.rating -= 1;
        else if (winRate < 0.5) player.rating -= 0.5;
        
        // Ensure rating stays within limits
        player.rating = Math.max(0, Math.min(7, player.rating));
        
        // Add initial rating to history
        player.ratingHistory.push({
            date: new Date().toISOString(),
            rating: player.rating
        });
    }
});

// Save players to localStorage
localStorage.setItem('players', JSON.stringify(Array.from(players.values())));

console.log('Players initialized with ratings based on game results');
