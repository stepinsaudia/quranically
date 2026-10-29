-- Lossless OpenDua publisher v0.0.4 contextual entry preservation.
-- Searchable extract is separate from the original JSON and never rewrites it.
ALTER TABLE knowledge_passages ADD COLUMN publisher_record_json TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_knowledge_passages_external ON knowledge_passages(source_id,external_ref,status);
