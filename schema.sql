CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rooms_updated_at ON rooms(updated_at);
