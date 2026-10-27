-- Quranically dedicated Tibb an-Nabawi v1. All records are educational, not clinically approved.
CREATE TABLE IF NOT EXISTS tibb_entries(
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  arabic_name TEXT NOT NULL DEFAULT '',
  scientific_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK(category IN ('food','care','practice','spiritual')),
  tags TEXT NOT NULL DEFAULT '',
  tradition_summary TEXT NOT NULL DEFAULT '',
  reference_label TEXT NOT NULL DEFAULT '',
  reference_url TEXT NOT NULL DEFAULT '',
  health_context TEXT NOT NULL DEFAULT '',
  safety_note TEXT NOT NULL DEFAULT '',
  availability_note TEXT NOT NULL DEFAULT '',
  seller_eligible TEXT NOT NULL DEFAULT 'no' CHECK(seller_eligible IN ('yes','no')),
  review_stage TEXT NOT NULL DEFAULT 'pending' CHECK(review_stage IN ('pending','source_reviewed','clinical_reviewed','dual_reviewed')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS tibb_offers(
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES tibb_entries(id),
  seller_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  offer_url TEXT NOT NULL,
  price_note TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending','verified','rejected')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tibb_status ON tibb_entries(status,category,sort_order);
CREATE INDEX IF NOT EXISTS idx_tibb_offers ON tibb_offers(entry_id,status,verification_status);
