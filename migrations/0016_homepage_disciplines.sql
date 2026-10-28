-- Structured homepage discovery: one card per discipline, no arbitrary card HTML.
CREATE TABLE IF NOT EXISTS homepage_disciplines (
 id TEXT PRIMARY KEY CHECK(id IN ('quranic_themes','sunnah','seerah','prophetic_medicine','living_guidance')),
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 image_url TEXT NOT NULL DEFAULT '',
 image_alt TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','archived')),
 sort_order INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO homepage_disciplines(id,title,description,status,sort_order) VALUES
('quranic_themes','Qur’an & Tafsir','Read the Qur’an, translations, themes and sourced commentary.','published',1),
('sunnah','Hadith & Sunnah','Explore transmitted narrations, their contexts and grading.','published',2),
('seerah','Seerah & Biography','Discover the Prophet’s ﷺ life, journeys and character.','published',3),
('prophetic_medicine','Prophetic Medicine','Investigate healing traditions, historical sources and modern evidence.','published',4),
('living_guidance','Living Islamic Guidance','Find sourced perspectives on faith, family, worship and ethics.','published',5);
