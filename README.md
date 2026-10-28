# Quranically — The Islamic Reference Encyclopedia

**Canonical production application:** https://qst-living-knowledge-v1.stepinsaudia.workers.dev/

**Canonical repository:** https://github.com/stepinsaudia/quranically

## Product map

| Public area | URL / API | Current status |
| --- | --- | --- |
| Encyclopedia home and A–Z index | `/`, `/encyclopedia` | Live; 17 original indexed starter articles |
| Permanent encyclopedia articles | `/encyclopedia/:slug` | Live; primary excerpts, ordered sections, bibliographies, related topics |
| Five subject collections | `/encyclopedia?domain=...` | Live; Quranic themes, Sunnah, Seerah, Prophetic Medicine, guidance |
| Full Quran chapter reader | `/study.html` | 114-chapter selector; same-origin attributed external text provider |
| Quran chapter+verse deep links | `/study.html?surah=2&ayah=255` | Links to actual chapter and verse; upstream connectivity required |
| Original guidance journeys | `/guidance` | Live; preserves the original four reference-linked pathways |
| Ingredient research catalogue | `/api/tibb` | Live; eight educational source-linked entries |
| Ingredient seller staging | Admin > Seller staging | No public seller offers until independent approval |
| Admin editorial workspace | `/admin` | Native protected login, CRUD, connected dossier, audit log |
| XML sitemap | `/sitemap.xml` | Generated from published canonical D1 article records |
| Health | `/api/health` | Checks live D1 connectivity |

## One canonical codebase

- `src/index.mjs` — Cloudflare Worker routing, Auth, public APIs, D1-backed editor and SEO.
- `public/index.html`, `public/encyclopedia.*` — canonical public reference experience.
- `public/guidance.html` — retained original sourced guidance.
- `public/study.html` — Quran Reader. External text/translation/recitation editions are explicitly attributed.
- `public/admin.*` — protected canonical Admin.
- `migrations/` — sequential, additive D1 schema and editorial seed records.
- `tests/worker.test.mjs` — isolated DB and Worker tests; no production writes.
- `scripts/encyclopedia-live-check.mjs` — live read-only acceptance plus login/logout session check.
- `scripts/encyclopedia-visual-qa.mjs` — Chromium desktop/mobile and Admin screenshots.

**Never deploy a second Worker or use another project's database.**

Existing Cloudflare resources, **do not rename**:
- Account: `fb9597e74bae3ea18ad7bb013213d776`
- Worker: `qst-living-knowledge-v1`
- D1: `qst-knowledge-v1-db`

## Lean live source federation (V3)

Quranically now has two independent search tiers:

1. **Editorial encyclopedia**: 17 published introductory articles with on-site sections, source IDs, bibliography, original text excerpts, cross-references and qualified-review flags in canonical D1. Published does not imply expert approval.
2. **External source discovery**: `/api/source-discovery?q=...&domain=...` searches source indexes *only on demand*, from the Worker backend. Live UmmahAPI search covers its claimed 6,236 Quranic verses, 36,000+ Hadiths and supplications. The API returns small, attributed excerpts, provider references, link-to-original and `upstream_unreviewed` markers. These are not promoted to editorial articles without checking.

To keep the system lean:
- Queries are limited and validated, parallel provider requests are bounded to nine seconds, and only the small result set is cached at the edge for 30 minutes. No full Hadith or Quran copy is stored in D1.
- A scheduled Cloudflare Worker check runs once daily at **04:17 UTC**. It probes only lightweight metadata endpoints for UmmahAPI and HadeethEnc, storing the last status and UTC check time in the tiny `source_connector_checks` table. The check never saves religious text or visitors' searches.
- `/api/source-connectors` and **Admin → Connected Source APIs** reveal provider status and permissions. Results from secondary indexes explicitly remain awaiting independent source validation.
- **Sunnah.com, Dorar and Quran Foundation** require authorized API credentials or production permission; they are listed as access required, not falsely shown as connected. **NCBI/PubMed** requires registered operator/contact compliance and separate research-rights review before automatic searches are activated.
- HadeethEnc has specific content attribution, version and non-modification conditions. It is currently probed for health; no full text is republished under an assumed blanket license.
- Third-party service outages yield an explicit unavailable status and no invented source records.

The editor should periodically review provenance and reports before converting candidate source matches into approved reference articles. No automated fatwa, medical cure claim or commercial medicine endorsement is permitted.

## Source integrity and scope

**IMPORTANT: This is a working encyclopedia foundation, not a scholar- or clinician-approved complete Islamic corpus.** The 15 opening articles, their short Arabic excerpts, interpretations and bibliographies remain under independent qualified review. Publication status indicates website visibility, not scholarly authentication or clinical treatment efficacy.

- Quranic citations and hadith are linked to identifiable sources; original Arabic excerpts require careful textual verification by qualified reviewers.
- The Quran Reader uses Al Quran Cloud (Arabic `quran-uthmani`, `en.transliteration`, and Pickthall `en.pickthall`) through a fixed same-origin Worker API. Arabic/translation rights and editions must be reviewed before unrestricted redistribution or mass caching. Word-by-word for the complete Quran requires separately authorized source integration; do **not** claim it is live universally.
- Recitations remain streamed from their provider, subject to provider availability and rights.
- No prescribed doses, medical diagnoses, clinical certificates, or 'universal cures'. Source narration is different from medical evidence.
- Third-party seller offers have a separate verification gate. No seller offer may be published merely because a food is referenced in Islamic scripture.

## Admin protection

Native Admin passwords are stored only in GitHub Actions secret `QST_ADMIN_PASSWORD`, from which deployment derives a salted verifier securely stored in the Quranically Worker Secret `ADMIN_PASSWORD_RECORD`. GitHub secret updates alone do not update production; use the narrow password-sync workflow to regenerate the verifier. Neither plaintext passwords nor secret tokens belong in source files or chat.

The Worker stores only hashed session tokens and attempt fingerprints in D1. Session cookies are Secure, HttpOnly and SameSite=Strict; edits require same-origin validation; the Admin includes a change audit. The Cloudflare Zero Trust Access setup is **not required** for native Admin use.

## Test and release

1. `npm install` (Node.js 22).
2. `npm test`.
3. `node --check src/index.mjs`, `node --check public/admin.js` and `node --check public/encyclopedia.js`.
4. Verify the existing Worker/D1 preflight in `scripts/native-admin-preflight.mjs`.
5. Only after passing, use the scoped repository GitHub Actions release workflow to apply **additive** D1 migrations to the existing database, then deploy the existing Worker.
6. Run the current live acceptance and browser QA workflows and retain screenshots/artifacts.

Never run the first-deploy bootstrap on existing resources. Cloudflare token remains a private GitHub Actions secret; deployment must never print or expose it.

## Remaining completion gates

- Independent qualified scholar review of Arabic passages, hadith authenticity context, interpretive claims, and citations.
- Expert medical appraisal of health-related research, safety and regulatory content.
- Rights-checked primary Quran text, translations, recitations, and approved full word-by-word API data.
- A substantial verified corpus beyond 17 pilot articles, with a sustainable editorial and source-refresh workflow.
- Seller onboarding, actual programme/contract verification, market availability, and consumer safeguards before monetization.

**Production software acceptance is not equivalent to encyclopedic content completeness.**
