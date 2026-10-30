# Quranically — verified production soft release

**As of 30 October 2026. This file supersedes the earlier pre-release gate.**

## Canonical production environment

- **Live Worker**: `qst-living-knowledge-v1`, https://qst-living-knowledge-v1.stepinsaudia.workers.dev/
- **Existing D1**: `qst-knowledge-v1-db` (`6c7c8edb-e20c-4354-9d69-0bea89badfd9`).
- **One canonical development branch**: `fix/relevant-source-search-20261029` pending integration into `main` after final review. Do not deploy `main` while it is out of date.
- **No new Worker, database, custom domain, proxy or parallel content layer was created.**
- The emergency one-time DB promotion and Worker deployment workflows were **removed after successful use**, leaving the original explicit-confirmation, existing-Worker release workflow in place.

## What was independently verified in production

1. **D1 source dossier promotion**: all 15 additive editorial dossiers are present in the existing D1 after export/backup-first validation. Production read-only audit reported **42 published encyclopedia articles, 109 encyclopedia citations, 8 Prophetic Medicine entries, and 15/15 new dossiers**.
2. **Published Worker engine**: a separate read-only check found the **6,236-verse complete English Qur’an index operational**, along with the canonical Battle of Badr Seerah answer.
3. **Canonical production release smoke**: homepage HTML, Qur’an Reader, Admin login page, unauthenticated Admin API HTTP 401, health API, paginated Qur’an results, sourced Seerah and medicine articles, and a unified source-grounded Hijrah answer all passed.
4. **Real browser QA on public URL**: one canonical global header, actual diabetes and men’s-clothing source-backed answers, source links, direct Ayat al-Kursi Reader navigation, and no mobile/desktop horizontal overflow passed in Playwright. Real desktop/mobile screenshots are available as a private artifact on the GitHub Actions live browser QA run.
5. **Local correctness tests**: 76 automated unit/integration tests; prior full-suite and Cloudflare dry runs passed. The 24-question answer audit found **23 matching published-source articles and one intentionally rejected nonexistent verse (Qur’an 1:100)**.

These facts describe technical functionality and representative coverage, **not** an independent religious or clinical accuracy certification.

## Knowledge and review status

- Qur’an: all 6,236 verse positions in the attributed Marmaduke Pickthall English translation. A translation search match is **not Tafsir**.
- Hadith: 2,328 publisher-original English HadeethEnc reference titles indexed, with original reports, explanations and provider-reported grading fetched using source IDs. This is **not** the full searchable text of all Hadith collections, and publisher grading is **not** Quranically’s own authentication.
- Canonical encyclopedia: 42 published records with structured sections and 109 article citations, including the 15 new source-linked dossiers.
- Prophetic Medicine: 8 structured ingredient records and additional topic-specific medically bounded encyclopedia articles. Europe PMC searches provide **bibliographic metadata only**, not efficacy decisions or treatment prescriptions.
- All 15 promoted records carry `review_status='editorial_draft'` and their source citations carry `verification_status='pending'`. Expert scholarly and clinical review remains outstanding.
- The live public interface must visibly label the difference between publisher text, local editorial summaries, provisional review and authoritative sources.

## Remaining post-soft-launch work

1. A comprehensive, licensed and qualified **Tafsir** collection and deeper authentic **Seerah** primary-source coverage.
2. Wider representative-question audits beyond the initial 24, including difficult contradictory interpretations, poor matches, source outages and culturally varied transliterations.
3. Independent scholarly validation of source attribution, language, Hadith gradings, historical chronology and interpretations; clinical review for all medical implications.
4. Complete accessibility, responsive design, image/icon and Admin editorial/publishing QA; no unsupported or fabricated source claims.
5. Consolidate this tested branch into the canonical `main` repository only after branch parity and historical production verification. Future releases use the original guarded existing-Worker workflow.

## Operations and rollback

- Cloudflare tracks Worker deployments and supports restoring an earlier Worker version with Wrangler or the Cloudflare dashboard. Code rollback does **not** reverse D1 data migrations. See Cloudflare Workers version/rollback documentation.
- The D1 content migration used only additive `INSERT OR IGNORE` statements from `migrations/0014_...` through `0018_...`. The production DB was exported and validated before writing. Private backups were not committed or uploaded as public artifacts.
- **Never** run the legacy first-deploy workflows or provision another Quranically Worker/database.
- **Never** declare a source corpus scholarly approved because unit tests, browser QA or provider connectivity succeeded.
