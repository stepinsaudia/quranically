// Quranically custom-hostname gateway — Cloudflare Pages Advanced Mode.
// Frontend CNAME: quranically.businessinsaudi.com -> quranically-bridge.pages.dev
// This thin gateway invokes the EXISTING qst-living-knowledge-v1 Worker using a
// same-account Service Binding. There is no D1 binding, second content store,
// public workers.dev fetch, or dependency on GoDaddy/Cloudflare parent zone changes.
export default {
  async fetch(request, env) {
    if (!env?.QURANICALLY_ORIGIN || typeof env.QURANICALLY_ORIGIN.fetch !== "function") {
      return new Response("Quranically gateway service binding has not been configured.", {
        status: 503,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff"
        }
      });
    }
    // Preserve the original URL/hostname, HTTP method, request body, cookies,
    // and Origin header. The existing Worker continues to enforce Admin auth,
    // CSRF checking, database access, routing, and static asset lookup.
    return env.QURANICALLY_ORIGIN.fetch(request);
  }
};
