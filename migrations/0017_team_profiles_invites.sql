ALTER TABLE teams ADD COLUMN display_name TEXT;
ALTER TABLE teams ADD COLUMN logo_url TEXT;
ALTER TABLE teams ADD COLUMN profile_summary TEXT;

UPDATE teams
SET display_name = name
WHERE display_name IS NULL;

UPDATE teams
SET name = LOWER(slug)
WHERE slug IS NOT NULL AND slug != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_name
  ON teams(name);

CREATE TABLE IF NOT EXISTS team_invites (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role_key TEXT NOT NULL,
  token_prefix TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by_user_id TEXT,
  accepted_by_user_id TEXT,
  accepted_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (accepted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_team_invites_team_status
  ON team_invites(team_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_team_invites_token_prefix
  ON team_invites(token_prefix);
