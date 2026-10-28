-- Canonical Admin-managed official category shelves; one provider, real identifiers.
-- Category totals remain live publisher metadata, not articles owned by Quranically.
CREATE TABLE IF NOT EXISTS source_shelves(
 id TEXT PRIMARY KEY,
 domain TEXT NOT NULL CHECK(domain IN ('sunnah','seerah','prophetic_medicine','living_guidance')),
 heading TEXT NOT NULL,
 provider_category_id INTEGER NOT NULL CHECK(provider_category_id BETWEEN 1 AND 9999),
 status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','archived')),
 sort_order INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_source_shelves_published ON source_shelves(domain,status,sort_order);
INSERT OR IGNORE INTO source_shelves(id,domain,heading,provider_category_id,status,sort_order) VALUES('sunnah-virtues','sunnah','Virtues & Manners',5,'published',1);
INSERT OR IGNORE INTO source_shelves(id,domain,heading,provider_category_id,status,sort_order) VALUES('sunnah-hadith-sciences','sunnah','Hadith Sciences',2,'published',2);
INSERT OR IGNORE INTO source_shelves(id,domain,heading,provider_category_id,status,sort_order) VALUES('sunnah-worship','sunnah','Acts of Worship',121,'published',3);
INSERT OR IGNORE INTO source_shelves(id,domain,heading,provider_category_id,status,sort_order) VALUES('sunnah-trade','sunnah','Commercial Transactions',122,'published',4);
INSERT OR IGNORE INTO source_shelves(id,domain,heading,provider_category_id,status,sort_order) VALUES('seerah-history','seerah','Seerah & History',7,'published',1);
INSERT OR IGNORE INTO source_shelves(id,domain,heading,provider_category_id,status,sort_order) VALUES('seerah-prophet','seerah','The Prophet Muhammad ﷺ',81,'published',2);
INSERT OR IGNORE INTO source_shelves(id,domain,heading,provider_category_id,status,sort_order) VALUES('seerah-companions','seerah','The Companions',66,'published',3);
INSERT OR IGNORE INTO source_shelves(id,domain,heading,provider_category_id,status,sort_order) VALUES('seerah-family','seerah','The Prophet’s Family',67,'published',4);
INSERT OR IGNORE INTO source_shelves(id,domain,heading,provider_category_id,status,sort_order) VALUES('tibb-remedies','prophetic_medicine','Spiritual & Physical Therapy',125,'published',1);
INSERT OR IGNORE INTO source_shelves(id,domain,heading,provider_category_id,status,sort_order) VALUES('tibb-foods','prophetic_medicine','Foods & Drinks',126,'published',2);
INSERT OR IGNORE INTO source_shelves(id,domain,heading,provider_category_id,status,sort_order) VALUES('guidance-virtues','living_guidance','Virtues & Manners',5,'published',1);
INSERT OR IGNORE INTO source_shelves(id,domain,heading,provider_category_id,status,sort_order) VALUES('guidance-worship','living_guidance','Acts of Worship',121,'published',2);
INSERT OR IGNORE INTO source_shelves(id,domain,heading,provider_category_id,status,sort_order) VALUES('guidance-family','living_guidance','Family Jurisprudence',124,'published',3);
INSERT OR IGNORE INTO source_shelves(id,domain,heading,provider_category_id,status,sort_order) VALUES('guidance-transactions','living_guidance','Commercial Transactions',122,'published',4);
