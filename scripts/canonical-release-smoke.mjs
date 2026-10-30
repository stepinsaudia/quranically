// Source-backed release smoke checks for both local preview and the real
// existing Cloudflare Worker. Never write, publish or modify an account.
const base=(process.env.QST_SMOKE_ROOT||'http://127.0.0.1:8799').replace(/\/$/,'');
async function get(route){
 const res=await fetch(base+route,{headers:{accept:'application/json'},signal:AbortSignal.timeout(30000)});
 return res;
}
async function json(route,validate){
 const res=await get(route);
 if(res.status!==200)throw Error(route+' returned HTTP '+res.status);
 const d=await res.json();
 if(!validate(d))throw Error(route+' returned incomplete source-backed data: '+JSON.stringify(d).slice(0,500));
 console.log('PASS',route);
}
const adminRoute=/\.workers\.dev$/.test(new URL(base).hostname)?'/admin':'/admin-login.html';
for(const route of ['/','/study.html',adminRoute]){
 const r=await get(route);
 if(r.status!==200)throw Error(route+' did not serve a page (HTTP '+r.status+')');
 const body=await r.text();
 if(!/<html[\s>]/i.test(body))throw Error(route+' returned non-HTML response');
 console.log('PASS',route,'HTML');
}
const forbidden=await get('/api/admin/journeys');
if(forbidden.status!==401)throw Error('Admin data is accessible without authentication or returned an unexpected status '+forbidden.status);
console.log('PASS unauthenticated Admin API protection 401');
await json('/api/health',d=>d.status==='ok'&&d.service==='qst-living-knowledge-v1');
await json('/api/quran/search?q=patience&limit=12',d=>d.source_corpus?.verses===6236&&d.results?.length===12&&d.next_offset===12);
await json('/api/encyclopedia/answer?domain=seerah&q=What%20happened%20at%20the%20Battle%20of%20Badr%3F',d=>d.outcome==='full_article_answer'&&d.answer?.slug==='battle-of-badr-sourced-account'&&d.answer.citations?.length>=3);
await json('/api/encyclopedia/answer?domain=prophetic_medicine&q=Does%20Prophetic%20Medicine%20cure%20asthma%3F',d=>d.outcome==='full_article_answer'&&d.answer?.slug==='asthma-prophetic-medicine-boundaries');
await json('/api/unified-search?domain=seerah&q=What%20happened%20during%20the%20Hijrah%3F',d=>d.answer_brief&&d.answer_quality?.status==='published_reference_available'&&d.contextual_answers?.some(a=>a.slug==='hijrah-to-madinah'));
console.log('QURANICALLY CANONICAL RELEASE SMOKE PASS: '+base);
