-- Database schema for AI Dubbing Service
-- Using Turso (SQLite-compatible database)

CREATE TABLE IF NOT EXISTS allowed_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert example allowed users (replace with actual emails)
INSERT OR IGNORE INTO allowed_users (email) VALUES
  ('admin@example.com'),
  ('user@example.com');