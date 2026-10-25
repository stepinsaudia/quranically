# GitHub → Cloudflare isolated first deployment

**Target account (locked):** `fb9597e74bae3ea18ad7bb013213d776`  
**Only Worker allowed:** `qst-living-knowledge-v1`  
**Only D1 allowed:** `qst-knowledge-v1-db`

This folder is the complete dedicated source repository, including two GitHub Actions workflows:
- `.github/workflows/check.yml` — runs local lint/syntax and database/API tests on commits; never deploys.
- `.github/workflows/first-deploy.yml` — a manually started, first-creation-only workflow. It refuses to overwrite any already existing Worker or D1 name.

## Two account steps still required

1. Create a **new PRIVATE, empty GitHub repository** named `qst-living-knowledge-v1` under the connected GitHub user `stepinsaudia`. Do not use BIS Intelligence, Research Exchange or Madinah Dream repositories. Do **not** pre-add README or license files if uploading by pushing this folder's files. Repository creation is not available from the current ChatGPT GitHub connector.
2. Create a Cloudflare **account-scoped API token** restricted to account `fb9597e74bae3ea18ad7bb013213d776`, with `Workers Scripts:Edit` and `D1:Edit` and sufficient read permissions to list Workers/D1. Store it as a GitHub repository **Actions secret** named `CLOUDFLARE_API_TOKEN`. Do **not** send the token in chat or commit it to source code.

## Upload this source to new repo

If the GitHub connector supports writing to the newly created private repository, return its URL here and ChatGPT can publish source files for you. Alternatively, `git init && git add . && git commit -m "Initial QST isolated application" && git branch -M main && git remote add origin https://github.com/stepinsaudia/qst-living-knowledge-v1.git && git push -u origin main` from the extracted folder.

## First deployment

In GitHub repository → Actions → **FIRST DEPLOY ONLY — new isolated Cloudflare Worker and D1** → Run workflow. Type `CREATE NEW QST ONLY` as confirmation. It then:

1. Runs tests without touching Cloudflare.
2. Checks the actual account, the complete Worker list and the exact D1 name.
3. Creates a new D1 only if the reserved Worker and D1 names are both unused.
4. Applies only this repository's two migration files.
5. Deploys only `qst-living-knowledge-v1`, without adding custom-domain or zone routes.

**IMPORTANT:** The first-deploy workflow cannot be safely retried if a database was created but a later step failed. Such a run must be manually reconciled using the logged UUID before proceeding. This is deliberate collision protection.

The Cloudflare Worker will publish a **PILOT** content set; Admin remains denied until a separate Cloudflare Access application and its `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ADMIN_EMAIL` values are configured. Never claim unreviewed guidance is a scholar-approved medical cure or fatwa.

## Verification

Read the actual Worker URL from Wrangler output. Check `/api/health`, `/api/journeys`, `/api/journey/hardship` and `/admin` (must return access denied until configured). Review source attribution and font/audio behavior before promoting to production.

This workflow is intentionally manual, not deploy-on-push. Source control changes cannot accidentally overwrite existing Workers.
