-- Real, Admin-managed navigation rather than decorative search chips.
CREATE TABLE IF NOT EXISTS discipline_pathways(
 id TEXT PRIMARY KEY,
 domain TEXT NOT NULL CHECK(domain IN ('quranic_themes','sunnah','seerah','prophetic_medicine','living_guidance')),
 label TEXT NOT NULL,
 href TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 sort_order INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pathways_public ON discipline_pathways(domain,status,sort_order);
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('quranic_themes-read-the-qur-an','quranic_themes','Read the Qur’an','/study.html','published','1');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('quranic_themes-healing-in-the-qur-an','quranic_themes','Healing in the Qur’an','/encyclopedia/healing-shifa','published','2');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('quranic_themes-patience-sabr','quranic_themes','Patience & Sabr','/encyclopedia/patience-sabr','published','3');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('quranic_themes-trade-and-fair-dealing','quranic_themes','Trade and Fair Dealing','/encyclopedia/quran-commerce-ethics','published','4');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('sunnah-truthful-trade','sunnah','Truthful Trade','/encyclopedia/truthful-trade-sunnah','published','5');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('sunnah-supplication','sunnah','Supplication','/encyclopedia/supplication-dua','published','6');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('sunnah-all-hadith-entries','sunnah','All Hadith Entries','/encyclopedia?domain=sunnah','published','7');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('seerah-mercy-conduct','seerah','Mercy & Conduct','/encyclopedia/prophetic-mercy','published','8');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('seerah-men-s-clothing','seerah','Men’s Clothing','/encyclopedia/mens-clothing-prophetic-era','published','9');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('seerah-market-conduct','seerah','Market Conduct','/encyclopedia/prophetic-market-conduct','published','10');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('seerah-all-seerah-entries','seerah','All Seerah Entries','/encyclopedia?domain=seerah','published','11');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('prophetic_medicine-black-seed','prophetic_medicine','Black Seed','/encyclopedia/black-seed','published','12');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('prophetic_medicine-honey','prophetic_medicine','Honey','/encyclopedia/honey','published','13');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('prophetic_medicine-hijama-cupping','prophetic_medicine','Hijama & Cupping','/encyclopedia/hijama','published','14');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('prophetic_medicine-diabetes-traditions','prophetic_medicine','Diabetes & Traditions','/encyclopedia/diabetes-and-prophetic-medicine','published','15');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('prophetic_medicine-remedy-safety','prophetic_medicine','Remedy Safety','/encyclopedia/traditional-remedies-safety','published','16');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('living_guidance-practical-guidance','living_guidance','Practical Guidance','/guidance','published','17');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('living_guidance-business-ethics','living_guidance','Business Ethics','/encyclopedia/islamic-business-ethics','published','18');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('living_guidance-grief-and-bereavement','living_guidance','Grief and Bereavement','/encyclopedia/grief','published','19');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('living_guidance-worry-remembrance','living_guidance','Worry & Remembrance','/encyclopedia/worry-remembrance','published','20');
INSERT OR IGNORE INTO discipline_pathways(id,domain,label,href,status,sort_order) VALUES('living_guidance-debt-responsibility','living_guidance','Debt & Responsibility','/encyclopedia/debt-responsibility','published','21');
