-- Curated, bounded WebP images stored in existing D1 (no R2/card requirement).
-- This is for limited editorial hero/card media only: max 450 KB/file, 100 active.
CREATE TABLE IF NOT EXISTS media_assets(
 id TEXT PRIMARY KEY,
 alt_text TEXT NOT NULL DEFAULT '',
 mime_type TEXT NOT NULL CHECK(mime_type='image/webp'),
 byte_size INTEGER NOT NULL CHECK(byte_size>0 AND byte_size<=450000),
 payload BLOB NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON media_assets(status,created_at);
