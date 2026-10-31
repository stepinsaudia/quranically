# Quranically custom domain — free CNAME-only Cloudflare Pages gateway

**Target:** `https://quranically.businessinsaudi.com`  
**Existing actual application:** `qst-living-knowledge-v1.stepinsaudia.workers.dev`  
**Required Cloudflare service:** Pages project `quranically-bridge` (free plan, only a gateway)  
**No GoDaddy nameserver change. No new D1. No duplicate Quranically site. No card required.**

## Why a bridge is necessary
Cloudflare Workers Custom Domains require an active Cloudflare DNS zone. As of 31 Oct 2026, `businessinsaudi.com` was not in the existing Quranically Cloudflare account. Cloudflare Pages permits a **subdomain** CNAME from an outside DNS provider directly to its `pages.dev` domain, without moving authoritative nameservers. A Pages Function can send the incoming request to the existing Worker through a native Service Binding, preserving the original URL and cookies.

Cloudflare reference: https://developers.cloudflare.com/pages/configuration/custom-domains/
Cloudflare reference: https://developers.cloudflare.com/pages/functions/bindings/#service-bindings

## Safe implementation
`dist/_worker.js` is a thin proxy using `env.QURANICALLY_ORIGIN.fetch(request)`, never a client-side redirect and never a reimplementation of Quranically. The exact Worker `qst-living-knowledge-v1` remains sole source of code, Admin, Quran search and D1. The binding is declared in this folder's `wrangler.jsonc`.

## Deployment once authorized Cloudflare Pages credentials are available
1. In Cloudflare **Workers & Pages**, create a **Pages** project named **quranically-bridge** on **Free**. Do NOT add `businessinsaudi.com` as a DNS zone.
2. For a GitHub-connected Pages build: repository `stepinsaudia/quranically`, production branch `fix/relevant-source-search-20261029` (until the canonical release branch is promoted), root directory `quranically-domain-bridge`, output directory `dist`, build command empty or `true`.
   Or use Cloudflare Pages Direct Upload via Wrangler, from this folder, with `npx wrangler pages deploy ./dist --project-name quranically-bridge`. This requires Pages Write permission, which the current deployment token does not have.
3. Confirm **Settings → Bindings → Service binding** has `QURANICALLY_ORIGIN` targeting `qst-living-knowledge-v1`, and redeploy the Pages project after adding this binding if necessary. The `wrangler.jsonc` also declares it. **Do not bind D1 directly to Pages.**
4. Test `https://quranically-bridge.pages.dev/tibb` and `/api/health` first. If 503, the service binding is missing. Do not proceed until it works.
5. In the **Pages project's Custom domains**, choose **Set up a domain** and enter `quranically.businessinsaudi.com`. The hostname must be registered in Pages *before* the external CNAME is inserted.
6. Only then, in the **authoritative DNS provider** (GoDaddy *if* its DNS really hosts this domain), create:
   - Type: `CNAME`
   - Name/Host: `quranically`
   - Value/Target: `quranically-bridge.pages.dev`
   - TTL: 600 seconds or 1 hour as available.
   Do not make an A/AAAA at the same host. Do not point CNAME to `workers.dev`. Do not touch the base website's `@` or `www`, MX/SPF/DKIM/DMARC, or GoDaddy nameservers.
7. Confirm the Pages Custom Domain's TLS status is **Active**; then test homepage, Seerah answer, Reader, Tibb/black-seed and Admin login using the final hostname. **Never consider a 200 alone sufficient**.

## Current delivery state (31 October 2026)
The Pages bridge code and tests are in GitHub, **not deployed**. The existing GitHub `CLOUDFLARE_API_TOKEN` could read Worker settings but returned **403** for both Cloudflare zone creation and listing Pages projects. No Pages project or zone was created, and no DNS or certificate changes were made. Create Pages through the dashboard or grant a tightly scoped Pages Write token through GitHub Secrets — never share the token in chat.

## Rollback
Removing only the `quranically` CNAME (or unlinking the Pages custom domain) returns the domain to its previous state. The original `workers.dev` Worker remains accessible and unaffected. If a Pages bridge is unhealthy, do not delete or redeploy the canonical Worker.
