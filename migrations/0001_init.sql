-- Canonical source-backed evidence schema. No existing D1 bindings are used.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  organization TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('quran','hadith','seerah','tafsir','medical','classical')),
  license_notes TEXT NOT NULL DEFAULT '',
  use_policy TEXT NOT NULL DEFAULT 'link_only' CHECK(use_policy IN ('approved_import','api_only','link_only','research_only')),
  review_status TEXT NOT NULL DEFAULT 'review_needed' CHECK(review_status IN ('review_needed','reviewed')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS journeys (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  kicker TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Life Guidance',
  tags TEXT NOT NULL DEFAULT '',
  clinical_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  journey_id TEXT NOT NULL REFERENCES journeys(id),
  source_id TEXT NOT NULL REFERENCES sources(id),
  evidence_type TEXT NOT NULL CHECK(evidence_type IN ('quran','seerah','sunnah','dua','tibb','clinical')),
  title TEXT NOT NULL,
  reference TEXT NOT NULL,
  arabic TEXT NOT NULL DEFAULT '',
  transliteration TEXT NOT NULL DEFAULT '',
  meaning TEXT NOT NULL DEFAULT '',
  explanation TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  audio_url TEXT NOT NULL DEFAULT '',
  source_grade TEXT NOT NULL DEFAULT '',
  review_note TEXT NOT NULL DEFAULT '',
  review_status TEXT NOT NULL DEFAULT 'editorial_pending' CHECK(review_status IN ('editorial_pending','scholar_reviewed','medical_reviewed')),
  publish_status TEXT NOT NULL DEFAULT 'draft' CHECK(publish_status IN ('draft','published','archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS steps (
  id TEXT PRIMARY KEY,
  journey_id TEXT NOT NULL REFERENCES journeys(id),
  instruction TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'reflection',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  operation TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_journeys_status ON journeys(status);
CREATE INDEX IF NOT EXISTS idx_evidence_journey ON evidence(journey_id,publish_status,sort_order);
CREATE INDEX IF NOT EXISTS idx_steps_journey ON steps(journey_id,sort_order);
