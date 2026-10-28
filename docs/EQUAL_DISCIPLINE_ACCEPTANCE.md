# Quranically — Equal Discipline Capability Contract

Status: **Implementation acceptance contract, not a declaration of completion.**
Scope: One Worker, one D1 database, one public answer engine, one canonical Admin. Existing live deployment remains unchanged until tests and approved promotion.

## Mandatory parity

Each discipline (quranic_themes, sunnah, seerah, prophetic_medicine, living_guidance) must support the **same service contract**:

1. Natural-language questions and short keyword search, including spelling variants and Arabic/English aliases.
2. Query interpretation and relevant retrieval of canonical editorial content, identified primary-source records and permitted external sources.
3. Substantial answer **on the page**, not merely a link list; concise lead conclusion, relevant context, supported evidence, meaningful limitations, optional further reading.
4. Claim-level attribution including source reference, provider, excerpt permissions, source date where applicable, authenticity/review flags, and no fabricated citations.
5. Historical, religious, legal and clinical statements distinctly typed, with scholar differences and medical safeguards when needed.
6. Cross-references, persistent article deep link, search no-results explanation and useful related topics.
7. Same Admin-controlled lifecycle: source registration + health/readiness check; editorial draft; source review; specialist review when needed; publish/unpublish; edit audit.
8. Traceable behavior and failures: connected != readable != searchable != licensed != reviewed. Visible source status and a nonmisleading partial-answer state.

## Equal capacity, subject-specific evidence

- Quranic themes: verse-accurate citation, tafsir attribution, translation edition, context and differences in interpretation.
- Sunnah: collection/book/narration ID, transmitted text, grading attribution, authenticity disputes and application context.
- Seerah: chronological/geographical anchoring, source reliability, distinguish reports and reconstructed detail.
- Prophetic Medicine: documented traditional attribution, botanical/material identity, modern evidence assessment, contraindications and urgent-care warning; religious provenance is not treatment efficacy.
- Living Guidance: distinguish descriptive history, practice, scholarly positions and fatwa-specific questions; avoid false binding personal rulings.

## Quality gates (all five must pass independently)

- Every discipline can answer a direct question, an indirect phrasing, a comparison, and a topic not currently named as an article, if adequate usable evidence exists.
- No query silently transforms into an unrelated article or apparently authoritative guessed answer.
- For an unavailable source, answer degrades gracefully with an explicit limitation; never invents evidence.
- Two known failures must pass: 'diabetes' in Prophetic Medicine and 'clothing for men' in Seerah; add eyesight and business ethics as regression fixtures.
- Running local DB-migration tests is not evidence that production D1 has migrated; verify remote records separately, read-only.
- Source-discovery API responses must be inspected for title/excerpt/reference relevance before an answer is labeled grounded.
- Full-coverage declarations require per-discipline source-readiness, topic depth, retrieval, rendering, Admin CRUD, desktop/mobile QA and live deployment verification.

## Build sequence

1. Audit each provider's live searchable endpoints, actual responses, terms and failure modes; record source capability separately from an Admin connector entry.
2. Implement one source-evidence retrieval interface used by all disciplines and a shared citation-aware answer composer. No claims of universal authority.
3. Expand structured topical and editorial coverage across all five disciplines, using evidence links and review workflows; never hand-author one-off fixes in place of retrieval.
4. Test all five disciplines equally against the common fixture suite and specialist requirements.
5. Run independently reviewed QA, then deploy the existing canonical Worker only with explicit production approval.

## Architectural invariants

- No second Worker, no alternative repository, no duplicate frontend answer components, no unreviewed external source promoted to vetted religious authority.
- Never publish seller inventory or implied cure claims automatically from Prophetic Medicine citations.
- Live site, production database and secrets are untouched by this development contract.
