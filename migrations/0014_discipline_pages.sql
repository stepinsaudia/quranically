-- One Admin-managed public-facing page configuration record per discipline.
-- Article content remains in the original canonical encyclopedia tables.
CREATE TABLE IF NOT EXISTS discipline_pages (
 id TEXT PRIMARY KEY CHECK(id IN ('quranic_themes','sunnah','seerah','prophetic_medicine','living_guidance')),
 eyebrow TEXT NOT NULL DEFAULT '',
 heading TEXT NOT NULL DEFAULT '',
 introduction TEXT NOT NULL DEFAULT '',
 pathway_labels TEXT NOT NULL DEFAULT '',
 hero_image_url TEXT NOT NULL DEFAULT '',
 hero_image_alt TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','archived')),
 sort_order INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO discipline_pages(id,eyebrow,heading,introduction,pathway_labels,status,sort_order) VALUES
('quranic_themes','01 / REVELATION','Divine guidance, for every step.','Explore Quranic themes, verse-linked commentary, and identifiable sources.','Surah Index|Tafsir|Themes|Translations|Recitations','published',1),
('sunnah','02 / TRANSMISSION','The Prophet’s Sunnah, carefully sourced.','Read narrations with collection, grading attribution and clear explanations.','Collections|Topics|Authenticity|Daily Sunnah|Scholars','published',2),
('seerah','03 / HISTORY','A remarkable life. A lasting legacy.','Explore the life and legacy of Prophet Muhammad ﷺ through carefully contextualized accounts.','Timeline|Key Events|Places|People|Daily Life','published',3),
('prophetic_medicine','04 / HEALING TRADITIONS','Prophetic Medicine, understood in context.','Explore traditional foods, ingredients and healing narrations alongside modern evidence and safety.','Ingredients|Health Concerns|Traditional Practices|Research|Safety','published',4),
('living_guidance','05 / APPLICATION','Islamic knowledge for everyday life.','Understand faith, worship, family and ethics through documented sources and scholarly perspectives.','Faith|Worship|Family|Business|Character','published',5);
