CREATE TABLE IF NOT EXISTS tournament_status (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Insert predefined statuses
INSERT INTO tournament_status (name) 
VALUES 
('Upcoming'),
('Ongoing'),
('Finished')
ON CONFLICT DO NOTHING; -- Avoid duplicates

CREATE TABLE IF NOT EXISTS tournament (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    location TEXT NOT NULL,
    format TEXT NOT NULL,
    participants INTEGER NOT NULL,
    courts JSONB NOT NULL,
    status_id INTEGER NOT NULL DEFAULT 1, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (status_id) REFERENCES tournament_status(id) ON DELETE CASCADE
);

INSERT INTO tournament (name, start_date, location, format, participants, courts, status_id)
VALUES 
('Mexicano', '2025-02-12', 'Padel Arenas', 'Mexicano', 32, '["Padel Arenas", "Coolbet", "Lux Express", "3p Logistics"]'::JSONB, 1),
('Americano', '2025-02-13', 'Cool Padel', 'Americano', 32, '["Padel Arenas", "Coolbet", "Lux Express", "3p Logistics"]'::JSONB, 2), 
('AmericanoX', '2025-02-14', 'Cool Padel', 'Americano', 32, '["Padel Arenas", "Coolbet", "Lux Express", "3p Logistics"]'::JSONB, 3); 
