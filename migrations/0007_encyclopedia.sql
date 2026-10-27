-- Quranically Reference Encyclopedia: structural, editorial and citation records.
-- Separate religious-source integrity from clinical-evidence assessment.
CREATE TABLE IF NOT EXISTS encyclopedia_articles(
 id TEXT PRIMARY KEY,
 slug TEXT NOT NULL UNIQUE,
 title TEXT NOT NULL,
 arabic_title TEXT NOT NULL DEFAULT '',
 subtitle TEXT NOT NULL DEFAULT '',
 domain TEXT NOT NULL CHECK(domain IN ('prophetic_medicine','quranic_themes','sunnah','seerah','living_guidance')),
 entry_type TEXT NOT NULL CHECK(entry_type IN ('ingredient','practice','devotion','concept','historical','guidance')),
 abstract TEXT NOT NULL DEFAULT '',
 identity_text TEXT NOT NULL DEFAULT '',
 alternate_names TEXT NOT NULL DEFAULT '',
 editorial_note TEXT NOT NULL DEFAULT '',
 review_status TEXT NOT NULL DEFAULT 'editorial_draft' CHECK(review_status IN ('editorial_draft','source_checked','scholar_reviewed','dual_reviewed')),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 sort_order INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL DEFAULT(datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_encyclopedia_articles ON encyclopedia_articles(status,domain,title);

CREATE TABLE IF NOT EXISTS encyclopedia_sections(
 id TEXT PRIMARY KEY,
 article_id TEXT NOT NULL REFERENCES encyclopedia_articles(id),
 heading TEXT NOT NULL,
 section_type TEXT NOT NULL CHECK(section_type IN ('overview','scripture','transmission','historical','interpretation','science','safety','practice','methodology')),
 body TEXT NOT NULL,
 sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_encyclopedia_sections ON encyclopedia_sections(article_id,sort_order);

CREATE TABLE IF NOT EXISTS encyclopedia_citations(
 id TEXT PRIMARY KEY,
 article_id TEXT NOT NULL REFERENCES encyclopedia_articles(id),
 citation_type TEXT NOT NULL CHECK(citation_type IN ('quran','hadith','clinical','reference','classical')),
 source_title TEXT NOT NULL,
 citation_ref TEXT NOT NULL,
 source_url TEXT NOT NULL,
 source_note TEXT NOT NULL DEFAULT '',
 verification_status TEXT NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending','source_checked','expert_checked')),
 sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_encyclopedia_citations ON encyclopedia_citations(article_id,sort_order);

CREATE TABLE IF NOT EXISTS encyclopedia_links(
 id TEXT PRIMARY KEY,
 article_id TEXT NOT NULL REFERENCES encyclopedia_articles(id),
 target_article_id TEXT NOT NULL REFERENCES encyclopedia_articles(id),
 relation_label TEXT NOT NULL DEFAULT 'Related topic',
 sort_order INTEGER NOT NULL DEFAULT 0,
 CHECK(article_id <> target_article_id),
 UNIQUE(article_id,target_article_id)
);
CREATE INDEX IF NOT EXISTS idx_encyclopedia_links ON encyclopedia_links(article_id,sort_order);
