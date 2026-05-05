CREATE TABLE IF NOT EXISTS better_auth_user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS better_auth_session (
  id TEXT PRIMARY KEY,
  expiresAt INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES better_auth_user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_better_auth_session_token
  ON better_auth_session(token);

CREATE INDEX IF NOT EXISTS idx_better_auth_session_userId
  ON better_auth_session(userId);

CREATE TABLE IF NOT EXISTS better_auth_account (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES better_auth_user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_better_auth_account_userId
  ON better_auth_account(userId);

CREATE UNIQUE INDEX IF NOT EXISTS idx_better_auth_account_provider_account
  ON better_auth_account(providerId, accountId);

CREATE TABLE IF NOT EXISTS better_auth_verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_better_auth_verification_identifier
  ON better_auth_verification(identifier);
