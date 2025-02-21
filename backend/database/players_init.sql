CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    ranking DECIMAL(3,1) DEFAULT 0 CHECK (ranking >= 0 AND ranking <= 40),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data only if the table is empty

INSERT INTO players (name, ranking)
SELECT 'Mark Metsoja', 29
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Mark Metsoja');

INSERT INTO players (name, ranking)
SELECT 'Mikk Mihkel Nurges', 28
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Mikk Mihkel Nurges');

INSERT INTO players (name, ranking)
SELECT 'Taavi Midenbritt', 24.7
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Taavi Midenbritt');

INSERT INTO players (name, ranking)
SELECT 'Kristjan Hollo', 23
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Kristjan Hollo');

INSERT INTO players (name, ranking)
SELECT 'Dagmar Teppe', 21.8
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Dagmar Teppe');

INSERT INTO players (name, ranking)
SELECT 'Alar Tammik', 21.7
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Alar Tammik');

INSERT INTO players (name, ranking)
SELECT 'Roman Mihhailov', 21.5
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Roman Mihhailov');

INSERT INTO players (name, ranking)
SELECT 'Ingrid Viinapuu', 21
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Ingrid Viinapuu');

INSERT INTO players (name, ranking)
SELECT 'Nataly Pant', 21
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Nataly Pant');

INSERT INTO players (name, ranking)
SELECT 'Ragnar Karumaa', 20.5
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Ragnar Karumaa');

INSERT INTO players (name, ranking)
SELECT 'Aleksanda Sevoldajeva', 20.4
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Aleksanda Sevoldajeva');

INSERT INTO players (name, ranking)
SELECT 'Tõnu Naudi', 20
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Tõnu Naudi');

INSERT INTO players (name, ranking)
SELECT 'Ivar Ulmre', 19.5
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Ivar Ulmre');

INSERT INTO players (name, ranking)
SELECT 'Karl Randmäe', 19.4
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Karl Randmäe');

INSERT INTO players (name, ranking)
SELECT 'Trevor Õunapuu', 19.4
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Trevor Õunapuu');

INSERT INTO players (name, ranking)
SELECT 'Kristian Kajak', 19.3
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Kristian Kajak');

INSERT INTO players (name, ranking)
SELECT 'Mikk Varjas', 19.2
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Mikk Varjas');

INSERT INTO players (name, ranking)
SELECT 'Toomas Kalm', 19.2
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Toomas Kalm');

INSERT INTO players (name, ranking)
SELECT 'Andres Pihlak', 19
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Andres Pihlak');

INSERT INTO players (name, ranking)
SELECT 'Eleri Valliste', 19
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Eleri Valliste');

INSERT INTO players (name, ranking)
SELECT 'Kristjan-Julius Laak', 19
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Kristjan-Julius Laak');

INSERT INTO players (name, ranking)
SELECT 'Dmitri Zhukov', 19
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Dmitri Zhukov');

INSERT INTO players (name, ranking)
SELECT 'Aide Simson', 18.9
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Aide Simson');

INSERT INTO players (name, ranking)
SELECT 'Kristjan Tomson', 18.9
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Kristjan Tomson');

INSERT INTO players (name, ranking)
SELECT 'Raido Roostalu', 18.9
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Raido Roostalu');

INSERT INTO players (name, ranking)
SELECT 'Nils Tirs', 18.8
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Nils Tirs');

INSERT INTO players (name, ranking)
SELECT 'Konstantin Raimla', 18.8
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Konstantin Raimla');

INSERT INTO players (name, ranking)
SELECT 'Domas Abramavicius', 18.7
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Domas Abramavicius');

INSERT INTO players (name, ranking)
SELECT 'Tiit Toomas', 18.6
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Tiit Toomas');

INSERT INTO players (name, ranking)
SELECT 'Elis Armuand', 18.5
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Elis Armuand');

INSERT INTO players (name, ranking)
SELECT 'Kristiina Kukk', 18.5
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Kristiina Kukk');

INSERT INTO players (name, ranking)
SELECT 'Karel Kaarma', 18.4
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Karel Kaarma');

INSERT INTO players (name, ranking)
SELECT 'Silver Õunapuu', 18.4
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Silver Õunapuu');

INSERT INTO players (name, ranking)
SELECT 'Sigrit Keerd', 18.2
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Sigrit Keerd');

INSERT INTO players (name, ranking)
SELECT 'Helena Karpin', 18.2
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Helena Karpin');

INSERT INTO players (name, ranking)
SELECT 'Katriin Alasoo', 18.2
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Katriin Alasoo');

INSERT INTO players (name, ranking)
SELECT 'Eenok Pajanen', 18
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Eenok Pajanen');

INSERT INTO players (name, ranking)
SELECT 'Martin Kull', 18
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Martin Kull');

INSERT INTO players (name, ranking)
SELECT 'Säre Jaanson', 18
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Säre Jaanson');

INSERT INTO players (name, ranking)
SELECT 'Andero Õunpuu', 18
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Andero Õunpuu');

INSERT INTO players (name, ranking)
SELECT 'Nikolai Pavlov', 18
WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Nikolai Pavlov');

INSERT INTO players (name, ranking)
SELECT 'Karl Tamme', 20 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Karl Tamme');

INSERT INTO players (name, ranking)
SELECT 'Mikk Saar', 19 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Mikk Saar');

INSERT INTO players (name, ranking)
SELECT 'Tiit Tõnisson', 18 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Tiit Tõnisson');

INSERT INTO players (name, ranking)
SELECT 'Andres Kivisaar', 21 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Andres Kivisaar');

INSERT INTO players (name, ranking)
SELECT 'Jaanus Mets', 22 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Jaanus Mets');

INSERT INTO players (name, ranking)
SELECT 'Henrik Koppel', 17 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Henrik Koppel');

INSERT INTO players (name, ranking)
SELECT 'Robert Ilves', 19 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Robert Ilves');

INSERT INTO players (name, ranking)
SELECT 'Siim Parts', 18 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Siim Parts');

INSERT INTO players (name, ranking)
SELECT 'Eero Põld', 20 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Eero Põld');

INSERT INTO players (name, ranking)
SELECT 'Tarmo Oja', 23 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Tarmo Oja');

INSERT INTO players (name, ranking)
SELECT 'Meelis Kalju', 18 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Meelis Kalju');

INSERT INTO players (name, ranking)
SELECT 'Peeter Kask', 17 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Peeter Kask');

INSERT INTO players (name, ranking)
SELECT 'Ain Lember', 19 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Ain Lember');

INSERT INTO players (name, ranking)
SELECT 'Kristjan Õis', 21 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Kristjan Õis');

INSERT INTO players (name, ranking)
SELECT 'Madis Pärn', 20 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Madis Pärn');

INSERT INTO players (name, ranking)
SELECT 'Joosep Kalm', 18 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Joosep Kalm');

INSERT INTO players (name, ranking)
SELECT 'Mait Lõhmus', 22 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Mait Lõhmus');

INSERT INTO players (name, ranking)
SELECT 'Marek Saarniit', 19 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Marek Saarniit');

INSERT INTO players (name, ranking)
SELECT 'Toomas Kruus', 23 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Toomas Kruus');

INSERT INTO players (name, ranking)
SELECT 'Markus Rand', 20 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Markus Rand');

INSERT INTO players (name, ranking)
SELECT 'Rauno Talvik', 18 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Rauno Talvik');

INSERT INTO players (name, ranking)
SELECT 'Valter Kuusik', 21 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Valter Kuusik');

INSERT INTO players (name, ranking)
SELECT 'Raimond Vaher', 19 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Raimond Vaher');

INSERT INTO players (name, ranking)
SELECT 'Taavi Hallik', 22 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Taavi Hallik');

INSERT INTO players (name, ranking)
SELECT 'Janek Teder', 20 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Janek Teder');

INSERT INTO players (name, ranking)
SELECT 'Indrek Veskimägi', 18 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Indrek Veskimägi');

INSERT INTO players (name, ranking)
SELECT 'Rasmus Mägi', 17 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Rasmus Mägi');

INSERT INTO players (name, ranking)
SELECT 'Tanel Liiv', 21 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Tanel Liiv');

INSERT INTO players (name, ranking)
SELECT 'Kristofer Järve', 19 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Kristofer Järve');

INSERT INTO players (name, ranking)
SELECT 'Erik Laan', 23 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Erik Laan');

INSERT INTO players (name, ranking)
SELECT 'Ott Eensalu', 20 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Ott Eensalu');

INSERT INTO players (name, ranking)
SELECT 'Maarek Tamm', 18 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Maarek Tamm');

INSERT INTO players (name, ranking)
SELECT 'Aivar Kõiv', 22 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Aivar Kõiv');

INSERT INTO players (name, ranking)
SELECT 'Taago Roos', 21 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Taago Roos');

INSERT INTO players (name, ranking)
SELECT 'Juhan Kask', 19 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Juhan Kask');

INSERT INTO players (name, ranking)
SELECT 'Mart Veskimets', 23 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Mart Veskimets');

INSERT INTO players (name, ranking)
SELECT 'Lauri Kivi', 20 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Lauri Kivi');

INSERT INTO players (name, ranking)
SELECT 'Kaarel Saar', 18 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Kaarel Saar');

INSERT INTO players (name, ranking)
SELECT 'Tauri Jõgi', 22 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Tauri Jõgi');

INSERT INTO players (name, ranking)
SELECT 'Marko Sepp', 19 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Marko Sepp');

INSERT INTO players (name, ranking)
SELECT 'Oskar Laane', 21 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Oskar Laane');

INSERT INTO players (name, ranking)
SELECT 'Madis Allik', 18 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Madis Allik');

INSERT INTO players (name, ranking)
SELECT 'Siim Rõõmus', 17 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Siim Rõõmus');

INSERT INTO players (name, ranking)
SELECT 'Kaido Talu', 20 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Kaido Talu');

INSERT INTO players (name, ranking)
SELECT 'Priit Järv', 23 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Priit Järv');

INSERT INTO players (name, ranking)
SELECT 'Eerik Lepp', 19 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Eerik Lepp');

INSERT INTO players (name, ranking)
SELECT 'Karl Tamm', 21 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = 'Karl Tamm');

