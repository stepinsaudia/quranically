# Quranically — source quality and production release gate

Date: 2026-10-30. Development branch: `fix/relevant-source-search-20261029`.

## What is actually in the development build

- All 6,236 Qur'an verses across 114 Surahs indexed from the attributed `en.pickthall` edition; translation is **not** Tafsir.
- 2,328 original English HadeethEnc source titles indexed for discovery, with publisher text and grading retrieved live when needed. Publisher grades are not Quranically's independent authentication.
- Canonical D1 article, section and citation model; the public frontend and Admin read the same records.
- 15 new source-led dossiers spanning Seerah, Living Guidance, Prophetic Medicine, Qur'anic themes and Sunnah, in additive migration files `0014` through `0018`.
- A source-grounded overview and answer-quality status that distinguish a matched, published editorial article from related source leads and unverified clinical conclusions.

## Verified QA evidence

- 24-question quality test: 23 questions retrieve a relevant published-source article, 0 return only source leads, 1 intentionally invalid Qur'an reference (`1:100`) is correctly rejected. This is **sample coverage**, not measured accuracy across all Islamic questions.
- Application tests and desktop/mobile browser QA are part of required CI checks.
- Live source provider checks use read-only GET operations. An external source's availability does not establish its authenticity.
- Wrangler bundle `--dry-run` confirms compilation but **does not deploy**.
- No independent scholar, qualified Tafsir specialist, Hadith authentication reviewer, Seerah historian or clinician has approved the editorial dossiers. They remain marked `editorial_draft` with citation review `pending`.

## Production release boundary

The live Worker is `qst-living-knowledge-v1`, and the existing D1 database is `qst-knowledge-v1-db`. No other Worker or database is in scope.

As of the last read-only audit, the live database held 27 published encyclopedia articles, 8 Tibb records, and 63 encyclopedia citations. The new 15 dossiers live on the development branch until the additive migrations are carefully applied to production.

Apply migrations only in order after backup and preview:
1. `0014_seerah_primary_sources.sql`
2. `0015_living_guidance_primary_sources.sql`
3. `0016_tibb_health_safety_dossiers.sql`
4. `0017_quranic_sunnah_source_dossiers.sql`
5. `0018_ayat_al_kursi_source_dossier.sql`

They use `INSERT OR IGNORE`, but must still be reviewed, tested and audited before any production data write. The existing-worker release workflow now refuses deployment until all 15 new dossier IDs are present in the **existing** production D1. Read-only infrastructure health is tracked separately from dossier migration readiness.

## Non-negotiable remaining product gates

1. Obtain authorized licensing/API access to qualified Tafsir and additional authenticated primary sources; integrate without inventing an equivalent text source.
2. Expand Seerah, Hadith and Prophetic Medicine beyond the initial 24-question benchmark and verify cross-references.
3. Qualified scholars review interpretation, grading, source attribution, and historical timelines; clinicians review medical implications.
4. Visual parity and interaction QA across homepage, study reader, question answers, topic exploration, Admin and mobile.
5. Confirm remote D1 data migration, protected Admin access, approved evidence statuses, production smoke results and release authorization before declaring launch complete.

**Never claim that CI, a dry run or matching article coverage equals a complete scholarly encyclopedia or a live release.**
