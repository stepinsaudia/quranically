-- Lightweight availability ledger, never a mirrored corpus or user-query log.
CREATE TABLE IF NOT EXISTS source_connector_checks(
 source_id TEXT PRIMARY KEY,
 last_checked_at TEXT NOT NULL,
 last_state TEXT NOT NULL CHECK(last_state IN ('healthy','unavailable','access_required','not_configured')),
 last_http_status INTEGER,
 notes TEXT NOT NULL DEFAULT ''
);
