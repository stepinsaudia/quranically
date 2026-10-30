# Quranically — From source search to a governed encyclopedia

Status: development-only, 30 October 2026.

## Verified coverage versus true scholarly breadth

**Live soft launch (unchanged by this research phase):**
- 6,236 Qur'an verses in the attributed Pickthall English translation index (not Tafsir)
- 2,328 original HadeethEnc English reference titles (not all Hadith in existence)
- 42 published structured encyclopedia articles; independent scholarly review remains pending for many
- 8 structured Prophetic Medicine records and clinical bibliographic lookup
- 15 newly researched and source-linked dossiers released in the existing D1 earlier on 30 October 2026

**Independent measurement:**
- The original 24-question test bank evaluates questions for which articles were prepared; it must NOT be advertised as general Islamic answer accuracy.
- A separate 60-question unseen-topic bank now covers 12 questions in each of Qur'anic themes, Sunnah, Seerah, Prophetic Medicine and everyday guidance.
- Initial 60-question result: 0 primary-API/citation-integrity failures, 0 in-domain authored answers, 58 source-lead results and 2 insufficient-evidence responses. This measures only technical retrieval and explicit gaps, NOT whether the leading sources are theologically sufficient.
- The system now requires a stronger multi-subject match for full articles. It retains relevant other-discipline discoveries as **cross-discipline references**, never as unsupported in-discipline answers.

## Canonical editorial research queue (development branch only)

Migration `0019_research_topics.sql` creates 60 **private, unverified** research topics. This is a curated test-question bank, **not stored visitor search history**, and no topic is automatically published.

The canonical Admin Research & Coverage Queue contains:
- research question and discipline
- evidence/risk classification (interpretation, Hadith authenticity, history, medicine, jurisprudence)
- reviewer assignment
- research stage (queued, researching, source check, scholar review, medical review, ready for article, closed)
- supporting source notes, and a link to the eventual canonical encyclopedia article
- authenticated edit and audit history; the public API does not expose these unpublished topics

The editorial process must be: research question → identify original source → confirm licensing and provenance → authenticate grading/context with scholars and clinicians as needed → draft canonical article/sections/citations → independent review → human Admin publication.

**Do not** turn the 60 queued topics into public articles by copying a source title, an AI-generated paraphrase, or unsupported common internet claims.

## Release boundary

The public Worker remains on the earlier verified soft-launch code. The new migration, research Admin module, tighter source matching, related-discipline links and 60-question audit live on `fix/relevant-source-search-20261029` only.

Before releasing new Admin code, apply migration 0019 to the exact existing D1 after a private backup, validate 60 queued records, test protected Admin read/write, and complete browser QA. The existing-Worker guarded release workflow refuses to deploy if this schema or its 60 private records are missing.

No new Worker, database, custom domain or public research index is authorized by this phase.

## What must be built for broad knowledge

1. Authorized, licensed collections of Qur'anic Tafsir, with named scholars, methodology and edition versions.
2. Broader primary-source Hadith coverage beyond HadeethEnc title-only discovery; use original matn and documented publisher grading, not inferred authentication.
3. Structured Seerah chronology cross-checked against Qur'an, authentic reports and scholarly histories.
4. Multilingual topic normalization and question routing, including Arabic and transliteration review, without conflating different concepts.
5. Editorial quality gates for personal fatwas, high-risk healthcare and disputed fiqh matters.
6. Independent expert review and clear public review stamps for every substantive explanation.
7. A larger held-out accuracy audit judged by qualified reviewers, in addition to machine integrity tests.

We should only promote Quranically from **public soft launch** to **comprehensive encyclopedia** when verified source breadth, review coverage and real answer quality are demonstrably broader than this initial reference corpus.
