-- Canonical, source-agnostic searchable knowledge corpus. No fixed topic whitelist.
-- Ordinary tables and indexed terms deliberately preserve Wrangler D1 export/backup:
-- FTS5 virtual tables currently prevent a normal full D1 export.
CREATE TABLE IF NOT EXISTS knowledge_sources(
 id TEXT PRIMARY KEY,
 publisher TEXT NOT NULL,
 collection_title TEXT NOT NULL,
 domain_hint TEXT NOT NULL DEFAULT '',
 home_url TEXT NOT NULL,
 terms_url TEXT NOT NULL,
 rights_mode TEXT NOT NULL CHECK(rights_mode IN ('verified_verbatim','metadata_only','api_only','permission_pending')),
 attribution TEXT NOT NULL,
 publisher_notice TEXT NOT NULL DEFAULT '',
 version_label TEXT NOT NULL DEFAULT '',
 language TEXT NOT NULL DEFAULT 'en',
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','archived')),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS knowledge_passages(
 id TEXT PRIMARY KEY,
 source_id TEXT NOT NULL REFERENCES knowledge_sources(id),
 external_ref TEXT NOT NULL,
 title TEXT NOT NULL,
 domain TEXT NOT NULL CHECK(domain IN ('quranic_themes','sunnah','seerah','prophetic_medicine','living_guidance')),
 original_text TEXT NOT NULL DEFAULT '',
 translation_text TEXT NOT NULL DEFAULT '',
 explanation_text TEXT NOT NULL DEFAULT '',
 benefits_text TEXT NOT NULL DEFAULT '',
 grade_text TEXT NOT NULL DEFAULT '',
 takhrij_text TEXT NOT NULL DEFAULT '',
 normalized_search TEXT NOT NULL DEFAULT '',
 source_url TEXT NOT NULL,
 content_version TEXT NOT NULL,
 content_sha256 TEXT NOT NULL,
 language TEXT NOT NULL DEFAULT 'en',
 expert_review TEXT NOT NULL DEFAULT 'unreviewed' CHECK(expert_review IN ('unreviewed','source_checked','scholar_reviewed','clinical_reviewed')),
 status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','archived')),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now')),
 UNIQUE(source_id,external_ref)
);
CREATE INDEX IF NOT EXISTS idx_knowledge_passages_domain ON knowledge_passages(domain,status,source_id);
CREATE TABLE IF NOT EXISTS knowledge_terms(
 term TEXT NOT NULL,
 passage_id TEXT NOT NULL REFERENCES knowledge_passages(id) ON DELETE CASCADE,
 weight INTEGER NOT NULL DEFAULT 1 CHECK(weight BETWEEN 1 AND 6),
 PRIMARY KEY(term,passage_id)
);
CREATE INDEX IF NOT EXISTS idx_knowledge_terms_passage ON knowledge_terms(passage_id);
CREATE TABLE IF NOT EXISTS knowledge_ingest_audit(
 id TEXT PRIMARY KEY,
 source_id TEXT NOT NULL,
 passage_count INTEGER NOT NULL,
 token_count INTEGER NOT NULL,
 actor TEXT NOT NULL,
 result TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO knowledge_sources(id,publisher,collection_title,domain_hint,home_url,terms_url,rights_mode,attribution,version_label,language)
 VALUES('hadeethenc-en','HadeethEnc','Encyclopedia of Translated Prophetic Hadiths','sunnah','https://hadeethenc.com/en','https://hadeethenc.com/en','verified_verbatim','HadeethEnc.com — original unchanged publisher translation and explanation','publisher_version_required','en');
INSERT OR IGNORE INTO knowledge_sources(id,publisher,collection_title,domain_hint,home_url,terms_url,rights_mode,attribution,version_label,language)
 VALUES('opendua-en','OpenDua','Hisn al-Muslim supplications','living_guidance','https://api.opendua.org/','https://opendua.org/developers','verified_verbatim','OpenDua by Ihsan Labs; English/transliteration under CC BY 4.0; underlying religious texts separately credited','v0.0.4','en');
INSERT OR IGNORE INTO knowledge_sources(id,publisher,collection_title,domain_hint,home_url,terms_url,rights_mode,attribution,version_label,language)
 VALUES('tanzil-ar','Tanzil Project','Qur’an Arabic Uthmani','quranic_themes','https://tanzil.net/','https://tanzil.net/docs/Text_License','verified_verbatim','Tanzil Quran Text — CC BY 3.0; verbatim, no modifications','v1.1','ar');
INSERT OR IGNORE INTO knowledge_sources(id,publisher,collection_title,domain_hint,home_url,terms_url,rights_mode,attribution,version_label,language)
 VALUES('openiti','OpenITI','Classical Arabic and Persian Islamicate corpus','','https://openiti.org/','https://openiti.org/documentation/','permission_pending','OpenITI — CC BY-NC-SA 4.0; commercial reuse requires a rights review','','ar');
INSERT OR IGNORE INTO knowledge_sources(id,publisher,collection_title,domain_hint,home_url,terms_url,rights_mode,attribution,version_label,language)
 VALUES('quran-foundation','Quran Foundation','Tafsir and Qur’an content API','quranic_themes','https://api-docs.quran.com/','https://api-docs.quran.com/legal/developer-terms/','api_only','Quran Foundation; credentials, permitted sync and attribution required','','ar');
