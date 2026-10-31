-- Practical Tibb knowledge is separate from primary-source provenance and commercial offers.
-- One canonical guide per ingredient/practice, governed by protected Admin.
-- The initial published guide is explicitly provisional and does NOT provide treatment doses.
CREATE TABLE IF NOT EXISTS tibb_use_guides (
 id TEXT PRIMARY KEY,
 entry_id TEXT NOT NULL UNIQUE REFERENCES tibb_entries(id),
 daily_life_use TEXT NOT NULL DEFAULT '',
 reported_method TEXT NOT NULL DEFAULT '',
 method_attribution TEXT NOT NULL DEFAULT '',
 schedule_or_dose TEXT NOT NULL DEFAULT '',
 medical_evidence TEXT NOT NULL DEFAULT '',
 safety_boundaries TEXT NOT NULL DEFAULT '',
 primary_url TEXT NOT NULL DEFAULT '',
 supporting_url TEXT NOT NULL DEFAULT '',
 clinical_url TEXT NOT NULL DEFAULT '',
 safety_url TEXT NOT NULL DEFAULT '',
 religious_review TEXT NOT NULL DEFAULT 'pending' CHECK(religious_review IN ('pending','source_checked','scholar_reviewed')),
 medical_review TEXT NOT NULL DEFAULT 'pending' CHECK(medical_review IN ('pending','clinician_reviewed')),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 review_note TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tibb_use_guides_status ON tibb_use_guides(status,entry_id);
INSERT OR IGNORE INTO tibb_use_guides
(id,entry_id,daily_life_use,reported_method,method_attribution,schedule_or_dose,medical_evidence,safety_boundaries,primary_url,supporting_url,clinical_url,safety_url,religious_review,medical_review,status,review_note)
VALUES
('black-seed-use','black-seed',
'For normal culinary use, food-grade Nigella sativa (kalonji) seeds can be added as a seasoning to ordinary meals such as bread, lentils, or vegetable dishes, according to personal food preferences. This is everyday food use, NOT a Prophetic instruction to consume a fixed daily number, and NOT treatment for a diagnosed illness.',
'Sahih al-Bukhari 5687 reports Ibn Abi Atiq suggesting five or seven crushed black seeds mixed with oil and administered through the nostrils to an ill person. This is documented here as a historical reported application; it is NOT a home-treatment procedure to reproduce.',
'The described five-or-seven-seed nasal preparation was the advice of Ibn Abi Atiq, who cited a narration transmitted from Aisha about the Prophet''s statement on the healing properties of black seed. Do not attribute that specific method or number to a direct general command of the Prophet ﷺ.',
'No established universal Sunnah dose, daily timing, duration, or combination with honey is specified by the cited Prophetic statement. Quantities and formulations studied clinically are not automatically Sunnah prescriptions.',
'Small clinical studies and meta-analyses suggest possible effects on some blood-glucose and blood-pressure measures, but evidence quality varies and disease-specific benefit and safe therapeutic dosing are not established. Black seed is not an alternative to prescribed treatment.',
'Do NOT put homemade seed oil into the nose: aspiration of oils can cause lipoid pneumonia. Culinary food use is different from concentrated medicinal oils, extracts, or capsules. Avoid therapeutic quantities during pregnancy; breastfeeding safety is insufficiently established. Consult a clinician before medicinal use, especially when taking medication, including drugs with potential metabolic interactions or warfarin. Stop use if allergic reactions occur.',
'https://sunnah.com/bukhari/76/10',
'https://sunnah.com/muslim:2215a',
'https://pmc.ncbi.nlm.nih.gov/articles/PMC10086143/',
'https://medicinalplants.doh.gov.ae/Public-education-plants-leaflets/Nigella-sativa',
'pending','pending','published',
'Public educational culinary guidance only, pending independent scholar and clinician review. The nasal historical method must never be presented as a recommended procedure.');
