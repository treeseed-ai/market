DROP INDEX IF EXISTS idx_better_auth_session_token;
DROP INDEX IF EXISTS idx_better_auth_session_userId;
DROP INDEX IF EXISTS idx_better_auth_account_userId;
DROP INDEX IF EXISTS idx_better_auth_account_provider_account;
DROP INDEX IF EXISTS idx_better_auth_verification_identifier;

ALTER TABLE better_auth_user RENAME TO better_auth_user_legacy_text_dates;

CREATE TABLE better_auth_user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

INSERT INTO better_auth_user (id, name, email, emailVerified, image, createdAt, updatedAt)
SELECT
  id,
  name,
  email,
  emailVerified,
  image,
  CASE WHEN typeof(createdAt) = 'integer' THEN createdAt ELSE CAST(createdAt AS INTEGER) END,
  CASE WHEN typeof(updatedAt) = 'integer' THEN updatedAt ELSE CAST(updatedAt AS INTEGER) END
FROM better_auth_user_legacy_text_dates;

DROP TABLE better_auth_user_legacy_text_dates;

ALTER TABLE better_auth_session RENAME TO better_auth_session_legacy_text_dates;

CREATE TABLE better_auth_session (
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

INSERT INTO better_auth_session (id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId)
SELECT
  id,
  CASE WHEN typeof(expiresAt) = 'integer' THEN expiresAt ELSE CAST(expiresAt AS INTEGER) END,
  token,
  CASE WHEN typeof(createdAt) = 'integer' THEN createdAt ELSE CAST(createdAt AS INTEGER) END,
  CASE WHEN typeof(updatedAt) = 'integer' THEN updatedAt ELSE CAST(updatedAt AS INTEGER) END,
  ipAddress,
  userAgent,
  userId
FROM better_auth_session_legacy_text_dates;

DROP TABLE better_auth_session_legacy_text_dates;

CREATE INDEX IF NOT EXISTS idx_better_auth_session_token
  ON better_auth_session(token);

CREATE INDEX IF NOT EXISTS idx_better_auth_session_userId
  ON better_auth_session(userId);

ALTER TABLE better_auth_account RENAME TO better_auth_account_legacy_text_dates;

CREATE TABLE better_auth_account (
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

INSERT INTO better_auth_account (
  id,
  accountId,
  providerId,
  userId,
  accessToken,
  refreshToken,
  idToken,
  accessTokenExpiresAt,
  refreshTokenExpiresAt,
  scope,
  password,
  createdAt,
  updatedAt
)
SELECT
  id,
  accountId,
  providerId,
  userId,
  accessToken,
  refreshToken,
  idToken,
  CASE
    WHEN accessTokenExpiresAt IS NULL THEN NULL
    WHEN typeof(accessTokenExpiresAt) = 'integer' THEN accessTokenExpiresAt
    ELSE CAST(accessTokenExpiresAt AS INTEGER)
  END,
  CASE
    WHEN refreshTokenExpiresAt IS NULL THEN NULL
    WHEN typeof(refreshTokenExpiresAt) = 'integer' THEN refreshTokenExpiresAt
    ELSE CAST(refreshTokenExpiresAt AS INTEGER)
  END,
  scope,
  password,
  CASE WHEN typeof(createdAt) = 'integer' THEN createdAt ELSE CAST(createdAt AS INTEGER) END,
  CASE WHEN typeof(updatedAt) = 'integer' THEN updatedAt ELSE CAST(updatedAt AS INTEGER) END
FROM better_auth_account_legacy_text_dates;

DROP TABLE better_auth_account_legacy_text_dates;

CREATE INDEX IF NOT EXISTS idx_better_auth_account_userId
  ON better_auth_account(userId);

CREATE UNIQUE INDEX IF NOT EXISTS idx_better_auth_account_provider_account
  ON better_auth_account(providerId, accountId);

ALTER TABLE better_auth_verification RENAME TO better_auth_verification_legacy_text_dates;

CREATE TABLE better_auth_verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

INSERT INTO better_auth_verification (id, identifier, value, expiresAt, createdAt, updatedAt)
SELECT
  id,
  identifier,
  value,
  CASE WHEN typeof(expiresAt) = 'integer' THEN expiresAt ELSE CAST(expiresAt AS INTEGER) END,
  CASE WHEN typeof(createdAt) = 'integer' THEN createdAt ELSE CAST(createdAt AS INTEGER) END,
  CASE WHEN typeof(updatedAt) = 'integer' THEN updatedAt ELSE CAST(updatedAt AS INTEGER) END
FROM better_auth_verification_legacy_text_dates;

DROP TABLE better_auth_verification_legacy_text_dates;

CREATE INDEX IF NOT EXISTS idx_better_auth_verification_identifier
  ON better_auth_verification(identifier);
