-- Canonical public shell: editorial content in the SAME Quranically D1 database.
-- All regions use fixed templates; editors control structured copy and links, not HTML/CSS.
CREATE TABLE IF NOT EXISTS site_panels (
 id TEXT PRIMARY KEY CHECK(id IN ('header','homepage','footer')),
 kicker TEXT NOT NULL DEFAULT '',
 heading TEXT NOT NULL DEFAULT '',
 subtitle TEXT NOT NULL DEFAULT '',
 body TEXT NOT NULL DEFAULT '',
 image_url TEXT NOT NULL DEFAULT '',
 image_alt TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','archived')),
 sort_order INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS site_links (
 id TEXT PRIMARY KEY,
 section TEXT NOT NULL CHECK(section IN ('header','footer_explore','footer_resources','footer_about','footer_legal')),
 label TEXT NOT NULL,
 href TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 sort_order INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_site_links_public ON site_links(section,status,sort_order);

INSERT OR IGNORE INTO site_panels (id,kicker,heading,subtitle,body,sort_order) VALUES
('header','THE ISLAMIC REFERENCE ENCYCLOPEDIA','Quranically','Qur’an · Sunnah · Seerah · Knowledge','',1),
('homepage','KNOWLEDGE WITH PROVENANCE','Authentic knowledge, with context.','Explore the Qur’an, Hadith, Seerah, Prophetic Medicine and Islamic guidance through source-linked research.','Answers distinguish revelation, transmitted reports, scholarly interpretation and modern medical evidence.',2),
('footer','KNOWLEDGE · EVIDENCE · CONTEXT','Quranically','The Islamic Reference Encyclopedia','An evolving independent reference library. Publication does not imply independent scholarly or clinical approval.',3);

INSERT OR IGNORE INTO site_links(id,section,label,href,status,sort_order) VALUES
('nav-home','header','Home','/','published',1),
('nav-quran','header','Qur’an','/study.html','published',2),
('nav-hadith','header','Hadith & Sunnah','/encyclopedia?domain=sunnah','published',3),
('nav-seerah','header','Seerah','/encyclopedia?domain=seerah','published',4),
('nav-medicine','header','Prophetic Medicine','/encyclopedia?domain=prophetic_medicine','published',5),
('nav-guidance','header','Living Guidance','/guidance','published',6),
('nav-az','header','A–Z','/encyclopedia','published',7),
('foot-quran','footer_explore','Qur’an Reader','/study.html','published',1),
('foot-hadith','footer_explore','Hadith & Sunnah','/encyclopedia?domain=sunnah','published',2),
('foot-seerah','footer_explore','Seerah','/encyclopedia?domain=seerah','published',3),
('foot-tibb','footer_explore','Prophetic Medicine','/encyclopedia?domain=prophetic_medicine','published',4),
('foot-guidance','footer_explore','Living Guidance','/guidance','published',5),
('foot-index','footer_resources','Encyclopedia A–Z','/encyclopedia','published',1),
('foot-methodology','footer_resources','Editorial Methodology','/encyclopedia#methodology','published',2),
('foot-qthemes','footer_resources','Qur’anic Themes','/encyclopedia?domain=quranic_themes','published',3),
('foot-about','footer_about','About the Encyclopedia','/encyclopedia#methodology','published',1),
('foot-desk','footer_about','Editorial Desk','/admin','published',2);
