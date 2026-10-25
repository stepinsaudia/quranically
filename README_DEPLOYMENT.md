# The Living Quran — isolated Cloudflare application V1

**Account selected by owner:** `fb9597e74bae3ea18ad7bb013213d776`  
**New Worker name:** `qst-living-knowledge-v1`  
**New D1 name:** `qst-knowledge-v1-db`  
**Public domain:** New Workers.dev subdomain assigned by Cloudflare after deployment; none guessed in advance.

## What is actually included

- A premium, fully responsive homepage, based on the supplied ivory/gold geometry, blue ornamental detail, black typography and deep maroon contrast.
- A real D1-connected question-to-evidence flow. Four seeded pilot topics: hardship, anxiety/worry, grief/loss, debt/livelihood.
- Inline Quran Arabic, explanatory meanings, some transliteration, Ayah references, source-linked Seerah narration summaries, authentic Dua excerpts, clinical notes and practical reflection steps.
- Ayah streaming controls using the openly documented Al Quran Cloud audio CDN. Actual remote playback depends on Internet reachability and provider availability.
- Save topics, add browser-local private notes, check off steps, share references, download a standalone HTML guidance sheet, and use Print → Save as PDF.
- The previous V4 interactive Quran reader remains available at `/study.html` and has a new color overlay. It retains its existing third-party API/audio limitations.
- Protected Admin interface at `/admin`, with D1-backed forms for journeys, evidence, sources and steps; archive controls instead of destructive deletes; audit records.
- Server-side Cloudflare Access JWT verification (RS256, issuer, audience and email allowlist) for Admin pages and API. **Admin intentionally cannot open before Access is configured.**

## Deployment safety

This repository is separate from ALL existing Cloudflare applications. It contains no routes, DNS settings, custom domains, or bindings to other projects. Never repoint an existing Worker or attach an existing D1 to this project. The database UUID is initially a placeholder and must be replaced only by the newly created D1 UUID.

**No Cloudflare deployment has been performed by the author of this kit.** Your dashboard link identifies the account but does not give this environment authenticated access.

## Requirements

- Windows with Node.js LTS + npm and PowerShell (the `scripts/DEPLOY_NEW_WORKER.ps1` script is for PowerShell, not CMD).
- Wrangler login to account `fb9597e74bae3ea18ad7bb013213d776`.
- A completely unused Worker name `qst-living-knowledge-v1` and unused D1 database name `qst-knowledge-v1-db`. If either exists, **STOP** and choose a fresh project-specific name before doing anything.
- Cloudflare Access application for `/admin` and `/api/admin/*` before using editorial controls. Public routes must remain open.

## Windows: safe deployment sequence

Extract the ZIP into a new folder. Open a PowerShell window inside that folder.

```powershell
npm install
npx wrangler login
npx wrangler whoami --account fb9597e74bae3ea18ad7bb013213d776
```

Then create and seed **only the new database**, without deploying the Worker:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\DEPLOY_NEW_WORKER.ps1
```

The script verifies the account, checks for existing Worker deployments, creates a new D1, pins its UUID in the config, applies the two migrations, and runs tests. It deliberately refuses to continue if the existing Worker check is ambiguous. If it cannot parse a new D1 UUID, stop; do not run it again blindly.

After reviewing the script output and confirming this is a new project:

```powershell
npx wrangler deploy
```

Cloudflare then returns the actual new URL. Verify `https://<actual-new-url>/api/health`, browse the public portal, and confirm that `/admin` is denied until Access is configured. **Do not use the existing BIS, Research Exchange, Madinah Dream or other production URLs.**

The PowerShell script also supports `-Deploy` but only on a fresh uninitialized project; after running setup, use the explicit `npx wrangler deploy` command as shown above instead.

## Configuring editorial Cloudflare Access

1. In Cloudflare Zero Trust, create an Access application for the new Worker's domain covering `/admin` and the protected `/api/admin/*` paths. Permit only intended editors through the Access policy.
2. Copy the Access team domain (`your-team.cloudflareaccess.com`) and application Audience/AUD tag.
3. Edit **only this project's** `wrangler.jsonc` vars: `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, and `ADMIN_EMAIL` (the allowed editor email address).
4. Redeploy **this dedicated Worker**. The Worker validates the signature and email for every Admin call even if a Cloudflare Access route is accidentally omitted.
5. Verify `/api/admin/whoami` from an authorized signed-in browser, then check source editing, status workflow and audit records. Do not create shared authentication with other sites.

**Security note:** The frontend Admin HTML can be viewed only through a verified Access session; there are no default passwords. All Admin requests fail closed if variables are absent. Protected write requests must also originate from the same web origin.

## Source and authenticity status

The included religious and medical records are **editorial pilot material**, not a fully scholar-verified religious publication or clinical treatment database. The published pilot display carries review status notices. The Quran Arabic text is a demonstrator extracted from the prior approved prototype; before public religious launch it must be replaced/compared with licensed canonical Tanzil or King Fahd text, with Quranic typography and transliteration reviewed verse-by-verse. English meanings are explanatory paraphrases, not licensed commercial editions. Hadith narrative descriptions are original summaries with external canonical references, not unauthorized bulk copied translations.

Do not claim medical cures, auto-generate fatwas, or publish clinical instructions without qualified professional review. Provide source copyright attribution and comply with provider terms before import.

## Validation performed locally

- SQLite ran both migrations and 39 starter inserts on an in-memory database.
- Worker HTTP routes returned `/api/health` and `/api/journey/hardship` with joined D1 data.
- Automated Node tests exercise public records, source linkage, draft visibility and JWT fail-closed behavior.
- Desktop/mobile visual QA is performed with the same UI against mocked API data; this does **not** replace actual remote Wrangler/browser QA.
- No real remote migrations, uploads, Cloudflare configuration changes, or deployment occurred during the build.

## Next milestones

1. Verify the new Worker URL, D1 connectivity, and Access setup on the selected account.
2. Source-by-source rights clearance and full scholar review.
3. Replace temporary Quran study ingestion with approved licensed comprehensive verse/word corpus, dedicated cache policy and full live reciter QA.
4. Expand the Admin workflow with more precise medical review, source edition/version management, translations, and optional authenticated cross-device collections.

## GitHub Actions first deployment

See `README_GITHUB_DEPLOY.md`. The first-deploy GitHub workflow is intentionally manual and creates only reserved new resources.
