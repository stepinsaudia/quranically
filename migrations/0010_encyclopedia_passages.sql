-- Original text excerpt layer: distinguishes transmitted Arabic from our editorial summary.
CREATE TABLE IF NOT EXISTS encyclopedia_passages(
 id TEXT PRIMARY KEY,
 article_id TEXT NOT NULL REFERENCES encyclopedia_articles(id),
 citation_id TEXT NOT NULL REFERENCES encyclopedia_citations(id),
 passage_type TEXT NOT NULL CHECK(passage_type IN ('quran','hadith')),
 arabic_excerpt TEXT NOT NULL,
 editorial_meaning TEXT NOT NULL DEFAULT '',
 context_note TEXT NOT NULL DEFAULT '',
 review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending','source_checked','scholar_reviewed')),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_encyclopedia_passages ON encyclopedia_passages(article_id,status,sort_order);
INSERT OR IGNORE INTO encyclopedia_passages(id,article_id,citation_id,passage_type,arabic_excerpt,editorial_meaning,context_note,review_status,status,sort_order)
SELECT 'passage-'||t.id,t.id,t.id||'-r1',CASE WHEN t.id IN ('honey','olive') THEN 'quran' ELSE 'hadith' END,t.source_arabic,t.source_meaning,
 'Short original excerpt only; examine the full cited text and its context. Exact-text independent scholarly review pending.','pending','published',1
FROM tibb_entries t WHERE t.id IN ('honey','black-seed','talbina','ajwa-dates','olive','miswak','hijama','ruqyah') AND t.source_arabic<>'';
INSERT OR IGNORE INTO encyclopedia_passages(id,article_id,citation_id,passage_type,arabic_excerpt,editorial_meaning,context_note,status,sort_order) VALUES
('passage-healing-shifa','healing-shifa','healing-shifa-r1','quran','وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ','Ibrahim attributes healing to Allah in the setting of illness.','Quran 26:80. Short excerpt; consult complete passage and scholarly tafsir.','published',1),
('passage-patience-sabr','patience-sabr','patience-sabr-r1','quran','اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ','Believers are told to seek help through patience and prayer.','Quran 2:153. Short excerpt; full wording and interpretive context require review.','published',1),
('passage-worry-remembrance','worry-remembrance','worry-remembrance-r1','quran','أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ','The verse associates remembrance of Allah with tranquility of the heart.','Quran 13:28. Clinical treatment claims cannot be inferred.','published',1),
('passage-grief','grief','grief-r1','quran','وَبَشِّرِ الصَّابِرِينَ','Good news is announced for the patient in the context of trials.','Quran 2:155. Short excerpt; read the passage in context.','published',1),
('passage-debt-responsibility','debt-responsibility','debt-responsibility-r1','quran','وَإِنْ كَانَ ذُو عُسْرَةٍ فَنَظِرَةٌ إِلَىٰ مَيْسَرَةٍ','The passage directs forbearance when a debtor faces hardship.','Quran 2:280. Juristic implications require qualified scholarship.','published',1),
('passage-supplication-dua','supplication-dua','supplication-dua-r2','quran','ادْعُونِي أَسْتَجِبْ لَكُمْ','The verse calls people to invoke Allah.','Quran 40:60. This is an excerpt, not a fixed-result ritual formula.','published',1);
