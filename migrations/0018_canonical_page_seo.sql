-- Shared metadata managed by the same canonical Admin and D1.
-- Detail articles retain their article-specific server-rendered SEO.
CREATE TABLE IF NOT EXISTS page_seo(
 id TEXT PRIMARY KEY CHECK(id IN ('home','encyclopedia','quran-reader','guidance','quran-themes','hadith','seerah','tibb','living-guidance')),
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 social_image_url TEXT NOT NULL DEFAULT '',
 social_image_alt TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','archived')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO page_seo(id,title,description) VALUES
('home','Quranically — The Islamic Reference Encyclopedia','Explore the Qur’an, Sunnah, Seerah, Prophetic Medicine and living Islamic guidance with accountable sources and context.'),
('encyclopedia','Encyclopedia A–Z | Quranically','Search the Quranically indexed reference encyclopedia across five disciplines.'),
('quran-reader','Qur’an Reader | Quranically','Read Qur’anic chapters, translations and listen to recitation from attributed source providers.'),
('guidance','Living Guidance | Quranically','Explore source-linked Islamic guidance and understanding for questions of daily life.'),
('quran-themes','Qur’an & Tafsir | Quranically','Find Quranic themes, contextual readings and related sources.'),
('hadith','Hadith & Sunnah | Quranically','Explore narrations, transmission sources, explanations and review status.'),
('seerah','Seerah & Biography | Quranically','Explore the Prophet’s life through traceable historical accounts and context.'),
('tibb','Prophetic Medicine | Quranically','Study Prophetic Medicine, traditional ingredient sources, historical context, evidence and safety.'),
('living-guidance','Living Islamic Guidance | Quranically','Research worship, faith, family, society and ethical questions in context.');
