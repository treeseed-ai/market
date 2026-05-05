ALTER TABLE users ADD COLUMN username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
  ON users(username);

ALTER TABLE better_auth_user ADD COLUMN username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_better_auth_user_username
  ON better_auth_user(username);
