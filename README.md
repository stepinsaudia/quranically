# Quranically — Quran • Seerah • Living Guidance

An independent Cloudflare Worker + D1 application with a search-first public interface for Quranic references, sourced Seerah narratives, supplications and careful practical guidance.

**Status:** Working **pilot**, not scholar-approved religious or clinical advice. Sample source links and translations must be independently checked before public launch.

## Repository and deployment boundaries

- GitHub: `stepinsaudia/quranically` (currently **public**; no credentials are committed).
- Locked Cloudflare account: `fb9597e74bae3ea18ad7bb013213d776`.
- Dedicated Worker: `qst-living-knowledge-v1`.
- Dedicated D1 database: `qst-knowledge-v1-db`.
- Does not affect any other BIS Cloudflare Worker, domain or D1 database.

## Local checks

Requires Node.js 22. Use `npm install`, then `npm test` to run the 7 backend tests. Use Wrangler for local database migrations and development.

## Deploy carefully

See `README_GITHUB_DEPLOY.md`. Cloudflare deployment is **manual only**; changes to main branch do not deploy anything. A restricted Cloudflare API token must be stored in repository Actions secret `CLOUDFLARE_API_TOKEN`. Never paste tokens into GitHub files or chat.

The first-deployment workflow creates a *new* D1 and Worker only if reserved names are unused. It is intentionally **not idempotent** after partial resource creation. The editorial Admin remains inaccessible until Cloudflare Access is configured.

## Source use

Quranic text, transliteration, medical claims and other curated pilot entries require source/license and scholarly review. The platform should display original references and distinguish historical, religious and contemporary medical evidence.
