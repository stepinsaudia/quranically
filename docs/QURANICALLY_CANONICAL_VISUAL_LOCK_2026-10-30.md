# Quranically — Canonical Visual Lock V2
**Date:** 30 October 2026 | **Status:** development branch, not production

## Non-negotiable identity principle

**One means one.** One first-paint masthead, one shared footer, one content-axis geometry, one link system, one review-label hierarchy. The only designed differences are editorial identity and task-specific functionality.

The public shell's single canonical source of truth is `src/qst-public-shell.mjs`. **Do not manually paste header/footer alterations into page HTML.** Use `node scripts/sync-qst-shell.mjs --write`, commit the regenerated public pages, and check with `node scripts/sync-qst-shell.mjs --check`. This is a build-time process; there must be **no client-side DOM replacement, old-header first-paint or flicker**.

Public pages:
- Encyclopedia/index and deep article view — neutral parchment and source-first editorial cards
- Qur’an Reader — restrained deep green, Arabic reading and listening controls above the fold
- Living Guidance — warm editorial narrative, quick action and interactive learning pathway
- Prophetic Medicine — botanical ivory/gold imagery, explicit medical-source distinctions and ingredient library
- Direct canonical `/tibb` route — actual Admin-backed Tibb page, **not** an encyclopedia redirect

Protected Admin and sign-in are distinct functional applications that inherit the same premium white/charcoal/gold visual grammar, header branding, 1280px container geometry and mobile viewport discipline. They must not expose private records or editorial privileges.

## Locked geometry

| Measured requirement | Acceptance |
| --- | --- |
| Max content axis | **1280 CSS px**, centered on desktop |
| Responsive side gutter | `clamp(32px,6.5vw,104px)` total width, split evenly |
| Header | 66 px primary row + 43 px nav row on desktop; 64 px + 39 px on mobile, plus borders |
| Footer | One identical composition across public pages at a given viewport; generic page CSS must not alter it |
| Public test widths | 1440x900; 1024x768; 390x844; 360x800, DPR 2 |
| Admin test widths | Same 4 retina sizes, with real Admin renderer and seeded local encyclopedia data |
| Main search | Within top 405 CSS px at tested widths |
| Mobile guidance hero | Max 505 CSS px |
| Reader hero | Max 350 CSS px desktop; 330 CSS px mobile |
| Horizontal page overflow | **Zero**; the mobile navigation rail may scroll within its own bounds |
| Navigation | Exactly one visible active page marker |
| Visible action | Search/reader controls or Admin New Record/sign-in inside initial decision viewport |
| Accessibility | Real links/buttons, obvious focus rings and visible source/review labels |

## Verified test evidence

- Public 5 page families × 4 widths = **20 true visual/browser geometry checks**. Includes the deep encyclopedia article page, not only a landing page.
- Editorial Admin + sign-in × 4 widths = **8 additional actual browser checks**; the Admin test also renders seeded local reference articles and opens the real New Record form.
- One source-of-truth HTML synchronization gate rejects copied header/footer drift.
- Browser tests measure DOM bounding boxes and horizontal overflow at real DPR 2 and preserve screenshots.
- These verify **layout**, not a full accessibility audit, scholarly content quality, clinical accuracy or source availability.
- Browser visual QA uses an isolated local Worker and read-only browser response fixtures for protected Admin; it does **not** authenticate to production, bypass production access controls or change D1.

Latest verified public + protected Admin acceptance run: [GitHub Actions #41067741167](https://github.com/stepinsaudia/quranically/actions/runs/41067741167) — 20 public plus 8 protected viewport passes. Subsequent refinements must re-run the same gate.

## Engagement and aesthetic direction

The goal is **calm intellectual discovery, not a boring article directory or a giant cinematic splash that hides the answer**:
1. Keep a direct, inviting question/search within the active viewport.
2. Distinguish discipline by editorial identity: Arabic typography and deep jade for Qur’an, narrative/chronology for Seerah, original-text provenance for Sunnah, botanical but medically cautious treatment for Tibb, reflective journey for Living Guidance.
3. Use topic-specific imagery or original iconography **only** when it adds understanding and can be truthfully sourced; avoid decorative binary icons, fake manuscripts or fabricated endorsements.
4. Put source names, statuses and next actions where the reader is looking, not under unrelated tabs or after a long scroll.
5. Let reading and listening content appear promptly; keep native controls visible and keyboard accessible.
6. Maintain clear compact text scales, consistently padded cards and concise summaries, with full sections and references on article detail pages.
7. Preserve Admin parity for any future homepage/editorial modules using structured content fields—not free-form promotional card copy.

## Still requiring human review

- Formal aesthetic acceptance from the user against live screenshots and desired visual benchmark; automated geometry success does not prove artistic excellence.
- Full page-specific interactive and accessibility QA (keyboard navigation, localization, RTL, touch target auditing, 200–400% zoom).
- Audit of provider intermittency, including source-backed Hadith text fetching in live queries.
- Wider source-licensed Qur’an Tafsir, Hadith and historical reference coverage, qualified review and correct article publishing policy.
- Migration 0019 private research topics and production deployment only after explicit approval, backup, health/rollback gates, and exact existing Worker/D1 verification.

**Production remains unchanged during the Canonical Visual Lock V2 work.** No automatic live release is authorized by this document.
