CREATE TABLE IF NOT EXISTS runtime_envelopes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
