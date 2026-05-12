CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  color_scheme TEXT NOT NULL DEFAULT 'fern',
  theme_mode TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES better_auth_user(id) ON DELETE CASCADE
);
