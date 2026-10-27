-- Native admin sessions store hashed random tokens, never passwords or cookies.
CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS admin_auth_attempts (fingerprint TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_admin_auth_attempts_expires_at ON admin_auth_attempts(expires_at);
