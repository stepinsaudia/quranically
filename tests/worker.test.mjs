import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';import worker from '../src/index.mjs';
const root=path.resolve('.');
function fixture(){
 const sqlite=new DatabaseSync(':memory:');for(const name of fs.readdirSync(path.join(root,'migrations')).filter(x=>/^\d{4}_.*\.sql$/.test(x)).sort())sqlite.exec(fs.readFileSync(path.join(root,'migrations',name),'utf8'));
 const DB={prepare:(sql)=>({bind(...params){return{first:()=>sqlite.prepare(sql).get(...params)||null,all:()=>({results:sqlite.prepare(sql).all(...params)}),run:()=>sqlite.prepare(sql).run(...params)}},first:()=>sqlite.prepare(sql).get()||null,all:()=>({results:sqlite.prepare(sql).all()}),run:()=>sqlite.prepare(sql).run()})};
 return {DB,ASSETS:{fetch:async()=>new Response('asset',{status:200})},ACCESS_AUD:'',ACCESS_TEAM_DOMAIN:'',ADMIN_EMAIL:''};
}
async function get(env,uri,options={}){return worker.fetch(new Request('https://test.local'+uri,options),env)}
test('seed migrations establish isolated canonical evidence and audit schema',()=>{const e=fixture();assert(e.DB.prepare('SELECT COUNT(*) c FROM sources').first().c>=4);assert(e.DB.prepare('SELECT COUNT(*) c FROM journeys').first().c===4);assert(e.DB.prepare('SELECT COUNT(*) c FROM evidence').first().c>=10);assert(e.DB.prepare('SELECT COUNT(*) c FROM audit_log').first().c===0)});
test('public API returns joined Quran, Seerah and Dua records with source metadata',async()=>{const e=fixture();const r=await get(e,'/api/journey/hardship');assert.equal(r.status,200);const p=await r.json();assert(p.evidence.some(x=>x.evidence_type==='quran'&&x.reference==='94:5'));assert(p.evidence.some(x=>x.evidence_type==='seerah'&&x.reference.includes('3231')));assert(p.evidence.some(x=>x.evidence_type==='dua'&&x.reference.includes('6369')));assert(p.evidence.every(x=>x.source_title&&x.source_url));});
test('draft/archived journey cannot be returned through public API',async()=>{const e=fixture();e.DB.prepare("UPDATE journeys SET status='draft' WHERE slug='hardship'").run();assert.equal((await get(e,'/api/journey/hardship')).status,404)});
test('public topic search returns relevant journeys, no fabricated answers',async()=>{const e=fixture();const p=await (await get(e,'/api/journeys?q=anxiety')).json();assert(p.journeys.some(x=>x.slug==='anxiety'));const q=await (await get(e,'/api/journeys?q=questionnobodyindexed')).json();assert.equal(q.journeys.length,0)});
test('admin displays protected login and API fails closed when credentials not configured',async()=>{const e=fixture();for(const method of ['GET','POST']){const opt=method==='POST'?{method,headers:{'content-type':'application/json','origin':'https://test.local'},body:JSON.stringify({slug:'xxx',title:'xxx'})}:{method};const r=await get(e,'/api/admin/journeys',opt);assert.equal(r.status,503)}assert.equal((await get(e,'/admin')).status,200)});
test('Admin with invalid JWT cannot make database writes',async()=>{const e=fixture();Object.assign(e,{ACCESS_TEAM_DOMAIN:'sample.cloudflareaccess.com',ACCESS_AUD:'aud-sample',ADMIN_EMAIL:'editor@example.org'});const r=await get(e,'/api/admin/journeys',{method:'POST',headers:{'content-type':'application/json','origin':'https://test.local','cf-access-jwt-assertion':'fake'},body:JSON.stringify({slug:'forgery',title:'Bad'})});assert([401,403].includes(r.status));assert(!e.DB.prepare("SELECT id FROM journeys WHERE slug='forgery'").first())});
test('hardcoded account and Worker isolate existing BIS projects',()=>{const config=fs.readFileSync('wrangler.jsonc','utf8');assert(config.includes('fb9597e74bae3ea18ad7bb013213d776'));assert(config.includes('qst-living-knowledge-v1'));for(const name of ['bis-one','research-exchange','madinahdream','bis-coming-soon'])assert(!config.includes(name))});

test('native password login yields protected session, allows authorized edit, and sign-out revokes access',async()=>{
  const e=fixture();const password='A-good-long-and-unique-test-password-2026';
  const salt=new Uint8Array(16);salt.fill(0x4a);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const derived=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256));
  const hex=u=>Array.from(u,x=>x.toString(16).padStart(2,'0')).join('');
  e.ADMIN_PASSWORD_RECORD=`pbkdf2-sha256:100000:${hex(salt)}:${hex(derived)}`;
  const login=await get(e,'/api/admin/login',{method:'POST',headers:{origin:'https://test.local','content-type':'application/json','cf-connecting-ip':'192.0.2.8'},body:JSON.stringify({password})});
  assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
  assert(login.headers.get('set-cookie').includes('HttpOnly'));
  assert(login.headers.get('set-cookie').includes('SameSite=Strict'));
  assert.equal((await get(e,'/api/admin/whoami',{headers:{cookie}})).status,200);
  assert.equal((await get(e,'/api/admin/whoami')).status,401);
  assert.equal((await get(e,'/admin',{headers:{cookie}})).status,200);
  assert.equal((await get(e,'/api/admin/bootstrap',{headers:{cookie}})).status,200);
  const originDenied=await get(e,'/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});
  assert.equal(originDenied.status,403);
  const logout=await get(e,'/api/admin/logout',{method:'POST',headers:{origin:'https://test.local',cookie}});
  assert.equal(logout.status,200);
  assert.equal((await get(e,'/api/admin/whoami',{headers:{cookie}})).status,401);
});

test('native admin rejects wrong passwords and rate-limits repeated attempts',async()=>{
  const e=fixture();const password='A-good-long-and-unique-test-password-2026';
  const salt=new Uint8Array(16);salt.fill(0x4a);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const derived=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256));
  const hex=u=>Array.from(u,x=>x.toString(16).padStart(2,'0')).join('');
  e.ADMIN_PASSWORD_RECORD=`pbkdf2-sha256:100000:${hex(salt)}:${hex(derived)}`;
  for(let i=0;i<8;i++){const r=await get(e,'/api/admin/login',{method:'POST',headers:{origin:'https://test.local','content-type':'application/json','cf-connecting-ip':'192.0.2.7'},body:JSON.stringify({password:'wrong'})});assert.equal(r.status,401)}
  const blocked=await get(e,'/api/admin/login',{method:'POST',headers:{origin:'https://test.local','content-type':'application/json','cf-connecting-ip':'192.0.2.7'},body:JSON.stringify({password})});
  assert.equal(blocked.status,429);
});


test('editorial create-edit-archive workflow is authenticated, audited and preserves public draft hiding',async()=>{
  const e=fixture();
  const password='Test-only-credential-for-isolated-editor-2026';
  const salt=new Uint8Array(16);salt.fill(0x31);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const digest=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256));
  const hex=a=>Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');
  e.ADMIN_PASSWORD_RECORD='pbkdf2-sha256:100000:'+hex(salt)+':'+hex(digest);
  const login=await get(e,'/api/admin/login',{method:'POST',headers:{origin:'https://test.local','content-type':'application/json'},body:JSON.stringify({password})});
  assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const headers={cookie,origin:'https://test.local','content-type':'application/json'};
  const denied=await get(e,'/api/admin/journeys',{method:'POST',headers:{origin:'https://test.local','content-type':'application/json'},body:JSON.stringify({slug:'unauthorized',title:'Unauthorized'})});
  assert.equal(denied.status,401);
  const crossOrigin=await get(e,'/api/admin/journeys',{method:'POST',headers:{...headers,origin:'https://untrusted.example'},body:JSON.stringify({slug:'cross-origin',title:'Blocked'})});
  assert.equal(crossOrigin.status,403);
  const created=await get(e,'/api/admin/journeys',{method:'POST',headers,body:JSON.stringify({slug:'test-path',title:'Test-only pathway',status:'draft'})});
  assert.equal(created.status,200);
  const createdId=(await created.json()).id;
  assert.equal((await get(e,'/api/journey/test-path')).status,404);
  const changed=await get(e,'/api/admin/journeys/'+createdId,{method:'PUT',headers,body:JSON.stringify({title:'Test-only updated pathway'})});
  assert.equal(changed.status,200);
  const stored=e.DB.prepare('SELECT title,status FROM journeys WHERE id=?').bind(createdId).first();
  assert.equal(stored.title,'Test-only updated pathway');
  assert.equal(stored.status,'draft');
  const archived=await get(e,'/api/admin/journeys/'+createdId,{method:'PUT',headers,body:JSON.stringify({status:'archived'})});
  assert.equal(archived.status,200);
  assert.equal(e.DB.prepare('SELECT status FROM journeys WHERE id=?').bind(createdId).first().status,'archived');
  assert.equal((await get(e,'/api/journey/test-path')).status,404);
  const audit=(await (await get(e,'/api/admin/audit',{headers:{cookie}})).json()).records;
  assert.equal(audit.filter(row=>row.record_id===createdId).length,3);
});

test('Tibb editorial collection is seeded and searchable with proper source context',async()=>{
 const env=fixture();
 assert.equal(env.DB.prepare('SELECT COUNT(*) c FROM tibb_entries').first().c,8);
 assert.equal(env.DB.prepare('SELECT COUNT(*) c FROM tibb_offers').first().c,0);
 const result=await get(env,'/api/tibb?q=black%20seed');
 assert.equal(result.status,200);
 const found=(await result.json()).entries;
 assert.equal(found.length,1);assert.equal(found[0].slug,'black-seed');
 assert.equal(found[0].review_stage,'pending');
 const foods=(await (await get(env,'/api/tibb?category=food')).json()).entries;
 assert(foods.length>=4 && foods.every(x=>x.category==='food'));
 assert.equal((await get(env,'/api/tibb?category=unverified')).status,400);
 const detail=await get(env,'/api/tibb/black-seed');
 assert.equal(detail.status,200);
 const record=(await detail.json()).entry;
 assert(record.reference_url.includes('bukhari:5688'));
 assert(record.safety_note.length>20);
 assert(record.source_arabic.length>10);
 assert(record.source_meaning.length>15);
 assert.equal((await get(env,'/api/tibb/bad-entry')).status,404);
});
test('Tibb offers are absent until independently verified and published',async()=>{
 const env=fixture();
 const empty=await (await get(env,'/api/tibb/offers/black-seed')).json();assert.deepEqual(empty.offers,[]);
 const notEligible=await (await get(env,'/api/tibb/offers/ruqyah')).json();assert.deepEqual(notEligible.offers,[]);
 env.DB.prepare("INSERT INTO tibb_offers (id,entry_id,seller_name,product_name,offer_url,status,verification_status) VALUES ('offer-test','black-seed','Test Seller','Food seeds','https://seller.example/item','published','pending')").run();
 const excluded=await (await get(env,'/api/tibb/offers/black-seed')).json();assert.equal(excluded.offers.length,0);
 env.DB.prepare("UPDATE tibb_offers SET verification_status='verified' WHERE id='offer-test'").run();
 const included=await (await get(env,'/api/tibb/offers/black-seed')).json();assert.equal(included.offers.length,1);
 env.DB.prepare("UPDATE tibb_offers SET status='archived' WHERE id='offer-test'").run();
 assert.equal((await (await get(env,'/api/tibb/offers/black-seed')).json()).offers.length,0);
});
test('Native Admin exposes Tibb modules through canonical endpoint without giving public write access',async()=>{
 const env=fixture();
 assert.equal((await get(env,'/api/admin/tibb_entries')).status,503);
 const secret='Test-admin-library-password-2026';
 const salt=new Uint8Array(16);salt.fill(0x11);
 const cryptoKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),'PBKDF2',false,['deriveBits']);
 const dig=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},cryptoKey,256));
 const hex=arr=>Array.from(arr,x=>x.toString(16).padStart(2,'0')).join('');
 env.ADMIN_PASSWORD_RECORD='pbkdf2-sha256:100000:'+hex(salt)+':'+hex(dig);
 const login=await get(env,'/api/admin/login',{method:'POST',headers:{origin:'https://test.local','content-type':'application/json'},body:JSON.stringify({password:secret})});assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0],headers={cookie,origin:'https://test.local','content-type':'application/json'};
 const bootstrap=(await (await get(env,'/api/admin/bootstrap',{headers})).json());
 assert.equal(bootstrap.tibb_entries.length,8);assert.equal(bootstrap.tibb_offers.length,0);
 const blocked=await get(env,'/api/admin/tibb_offers',{method:'POST',headers,body:JSON.stringify({entry_id:'black-seed',seller_name:'Unverified Seller',product_name:'Unverified product',offer_url:'https://example.org/offer',status:'published'})});
 assert.equal(blocked.status,400);
 const staged=await get(env,'/api/admin/tibb_offers',{method:'POST',headers,body:JSON.stringify({entry_id:'black-seed',seller_name:'Example Seller',product_name:'Seed packet',offer_url:'https://example.org/offer',status:'draft'})});
 assert.equal(staged.status,200);
 const offerId=(await staged.json()).id;
 const pending=await get(env,'/api/admin/tibb_offers/'+offerId,{method:'PUT',headers,body:JSON.stringify({status:'published'})});
 assert.equal(pending.status,400);
 const approved=await get(env,'/api/admin/tibb_offers/'+offerId,{method:'PUT',headers,body:JSON.stringify({verification_status:'verified',status:'published'})});
 assert.equal(approved.status,200);
 const publicList=(await (await get(env,'/api/tibb/offers/black-seed')).json()).offers;assert.equal(publicList.length,1);
});

test('encyclopedia has source-linked articles spanning five disciplines',async()=>{
 const e=fixture();const articleCount=e.DB.prepare('SELECT COUNT(*) c FROM encyclopedia_articles').first().c;
 assert.equal(articleCount,18);
 assert(e.DB.prepare('SELECT COUNT(*) c FROM encyclopedia_sections').first().c>=70);
 assert(e.DB.prepare('SELECT COUNT(*) c FROM encyclopedia_citations').first().c>=30);
 const groups=await get(e,'/api/encyclopedia/subjects');assert.equal(groups.status,200);
 const subjects=(await groups.json()).subjects;assert.equal(subjects.length,5);
 const result=await get(e,'/api/encyclopedia?q=black%20seed');assert.equal(result.status,200);
 assert((await result.json()).entries.some(x=>x.slug==='black-seed'));
 const condition=await get(e,'/api/encyclopedia?domain=prophetic_medicine&q=diabetes');assert.equal(condition.status,200);
 assert((await condition.json()).entries.some(x=>x.slug==='diabetes-and-prophetic-medicine'));
 const clothes=await get(e,'/api/encyclopedia?domain=seerah&q=clothing%20for%20men');assert.equal(clothes.status,200);
 assert((await clothes.json()).entries.some(x=>x.slug==='mens-clothing-prophetic-era'));
 const direct=await get(e,'/api/encyclopedia?q=talbina');
 assert.equal(direct.status,200);
 assert.equal((await direct.json()).entries[0].slug,'talbina');
 const citationSearch=await get(e,'/api/encyclopedia?q=5688');assert.equal(citationSearch.status,200);
 assert((await citationSearch.json()).entries.some(x=>x.slug==='black-seed'));
 const fullSection=await get(e,'/api/encyclopedia?q=botulism');assert.equal(fullSection.status,200);
 assert((await fullSection.json()).entries.some(x=>x.slug==='honey'));
 const med=await get(e,'/api/encyclopedia?domain=prophetic_medicine');assert.equal(med.status,200);
 assert.equal((await med.json()).entries.length,10);
 const s=await get(e,'/api/encyclopedia?letter=H');
 assert((await s.json()).entries.some(x=>x.slug==='honey'));
 assert.equal((await get(e,'/api/encyclopedia?domain=unknown')).status,400);
});
test('encyclopedia detail returns real sections, numbered bibliography and related reading',async()=>{
 const e=fixture();const r=await get(e,'/api/encyclopedia/black-seed');assert.equal(r.status,200);
 const x=await r.json();
 assert(x.sections.length>=5);assert(x.citations.length>=2);
 assert(x.citations.some(c=>c.citation_ref==='5688'&&c.citation_type==='hadith'));
 assert(x.passages.length>=1);assert(x.passages[0].arabic_excerpt.length>10);assert(x.passages[0].review_status==='pending');
 assert(x.related.some(c=>c.slug==='healing-shifa'));
 assert.equal(x.entry.review_status,'editorial_draft');
 assert(x.sections.some(s=>s.section_type==='safety'));
 assert.equal((await get(e,'/api/encyclopedia/missing-article')).status,404);
 const html=await get(e,'/encyclopedia/black-seed');assert.equal(html.status,200);
});
test('encyclopedia article publication requires sources and sections; Admin audit is canonical',async()=>{
 const e=fixture();const password='Encyclopedia-publishing-test-passphrase-2026';
 const salt=new Uint8Array(16);salt.fill(0x3c);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256));
 const hex=a=>Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');
 e.ADMIN_PASSWORD_RECORD='pbkdf2-sha256:100000:'+hex(salt)+':'+hex(bits);
 const login=await get(e,'/api/admin/login',{method:'POST',headers:{origin:'https://test.local','content-type':'application/json'},body:JSON.stringify({password})});
 assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0],headers={origin:'https://test.local',cookie,'content-type':'application/json'};
 const bootstrap=await get(e,'/api/admin/bootstrap',{headers});assert.equal(bootstrap.status,200);const state=await bootstrap.json();
 assert(state.encyclopedia_articles.length>=21);
 assert(state.encyclopedia_sections.length>=70);assert(state.encyclopedia_citations.length>=30);
 assert(state.encyclopedia_passages.length>=10);
 const make=await get(e,'/api/admin/encyclopedia_articles',{method:'POST',headers,body:JSON.stringify({slug:'test-reference-entry',title:'A test reference entry',domain:'quranic_themes',entry_type:'concept',abstract:'An isolated test entry.',status:'draft'})});
 assert.equal(make.status,200);const id=(await make.json()).id;
 assert.equal((await get(e,'/api/encyclopedia/test-reference-entry')).status,404);
 assert.equal((await get(e,'/api/admin/encyclopedia_articles/'+id,{method:'PUT',headers,body:JSON.stringify({status:'published'})})).status,400);
 for(let i=1;i<=3;i++){
  const section=await get(e,'/api/admin/encyclopedia_sections',{method:'POST',headers,body:JSON.stringify({article_id:id,heading:'Section '+i,section_type:'overview',body:'A sourced editorial paragraph for test publication gate.',sort_order:i})});
  assert.equal(section.status,200);
 }
 const cite=await get(e,'/api/admin/encyclopedia_citations',{method:'POST',headers,body:JSON.stringify({article_id:id,citation_type:'quran',source_title:'The Quran',citation_ref:'2:153',source_url:'https://quran.com/2/153'})});
 assert.equal(cite.status,200);
 const pub=await get(e,'/api/admin/encyclopedia_articles/'+id,{method:'PUT',headers,body:JSON.stringify({status:'published'})});
 assert.equal(pub.status,200);
 assert.equal((await get(e,'/api/encyclopedia/test-reference-entry')).status,200);
 const audit=await get(e,'/api/admin/audit',{headers});assert.equal(audit.status,200);
 assert((await audit.json()).records.some(row=>row.record_id===id));
});

test("encyclopedia Admin rejects cross-article or mismatched Qur'an-Hadith excerpts",async()=>{
 const e=fixture();
 const password='Cited-text-integrity-testing-secret-2026';
 const salt=new Uint8Array(16);salt.fill(0x52);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const data=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256));
 const hex=a=>Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');
 e.ADMIN_PASSWORD_RECORD='pbkdf2-sha256:100000:'+hex(salt)+':'+hex(data);
 const origin='https://test.local';
 const lr=await get(e,'/api/admin/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({password})});assert.equal(lr.status,200);
 const cookie=lr.headers.get('set-cookie').split(';')[0];
 const headers={origin,cookie,'content-type':'application/json'};
 async function save(body){return get(e,'/api/admin/encyclopedia_passages',{method:'POST',headers,body:JSON.stringify(body)});}
 const wrongArticle=await save({article_id:'honey',citation_id:'black-seed-r1',passage_type:'hadith',arabic_excerpt:'Test excerpt for integrity only',status:'published'});
 assert.equal(wrongArticle.status,400);
 const wrongType=await save({article_id:'honey',citation_id:'honey-r1',passage_type:'hadith',arabic_excerpt:'Test excerpt for integrity only',status:'published'});
 assert.equal(wrongType.status,400);
 const valid=await save({article_id:'honey',citation_id:'honey-r1',passage_type:'quran',arabic_excerpt:'Test excerpt for integrity only',status:'draft'});
 assert.equal(valid.status,200);
 const moved=await get(e,'/api/admin/encyclopedia_citations/honey-r1',{method:'PUT',headers,body:JSON.stringify({article_id:'black-seed'})});
 assert.equal(moved.status,400);
 assert.equal(e.DB.prepare("SELECT COUNT(*) c FROM encyclopedia_passages WHERE article_id='honey'").first().c,2);
});

test('Quran same-origin chapter API validates source alignment and rejects invented or malformed verses',async()=>{
 const env=fixture();
 assert.equal((await get(env,'/api/quran/surah/0')).status,400);
 assert.equal((await get(env,'/api/quran/surah/115')).status,400);
 assert.equal((await get(env,'/api/quran/surah/notanumber')).status,400);
 const original=globalThis.fetch;
 let upstream='';
 try{
  globalThis.fetch=async url=>{
   upstream=String(url);
   const data=['quran-uthmani','en.transliteration','en.pickthall'].map((edition,i)=>({
    number:1,edition:{identifier:edition},ayahs:[{numberInSurah:1,text:i===0?'بِسْمِ اللَّهِ':'The opening'}]
   }));
   return new Response(JSON.stringify({code:200,data}),{status:200,headers:{'content-type':'application/json'}});
  };
  const ok=await get(env,'/api/quran/surah/1');assert.equal(ok.status,200);
  assert(upstream.startsWith('https://api.alquran.cloud/v1/surah/1/editions/'));
  const json=await ok.json();
  assert.equal(json.data.length,3);
  assert.equal(json.provenance.review_status.includes('pending'),true);
  globalThis.fetch=async()=>new Response(JSON.stringify({code:200,data:[{number:1,ayahs:[]}]}),{status:200});
  const bad=await get(env,'/api/quran/surah/1');assert.equal(bad.status,502);
  globalThis.fetch=async()=>{throw Error('provider offline');};
  assert.equal((await get(env,'/api/quran/surah/1')).status,502);
 }finally{globalThis.fetch=original;}
});

test('canonical article SEO and XML sitemap use only published D1 entries',async()=>{
 const env=fixture();
 env.ASSETS.fetch=async()=>new Response('<!doctype html><html><head><title>Quranically | The Islamic Reference Encyclopedia</title><meta name="description" content="Editorial encyclopedia"></head><body><div id="articleView"></div></body></html>',{status:200,headers:{'content-type':'text/html'}});
 const detail=await get(env,'/encyclopedia/black-seed');
 assert.equal(detail.status,200);
 const html=await detail.text();
 assert(html.includes('<title>Black Seed | Quranically'));
 assert(html.includes('rel="canonical"'));
 assert(html.includes('/encyclopedia/black-seed'));
 assert(html.includes('application/ld+json'));
 assert(html.includes('Sahih al-Bukhari'));
 const sitemap=await get(env,'/sitemap.xml');
 assert.equal(sitemap.status,200);
 const xml=await sitemap.text();
 assert(xml.includes('<urlset'));
 assert(xml.includes('/encyclopedia/black-seed'));
 assert(xml.includes('/study.html'));
 const robots=await (await get(env,'/robots.txt')).text();
 assert(robots.includes('Disallow: /api/admin/'));
 env.DB.prepare("UPDATE encyclopedia_articles SET status='draft' WHERE slug='black-seed'").run();
 assert.equal((await get(env,'/encyclopedia/black-seed')).status,404);
 assert(!(await (await get(env,'/sitemap.xml')).text()).includes('/encyclopedia/black-seed'));
});
test('Quran chapter list is validated before it is displayed',async()=>{
 const env=fixture();const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify({code:200,data:Array.from({length:114},(_,i)=>({number:i+1,numberOfAyahs:i===1?286:7,englishName:'Chapter '+(i+1),name:'سورة'}))}),{status:200});
  const r=await get(env,'/api/quran/chapters');assert.equal(r.status,200);
  const response=await r.json();assert.equal(response.chapters.length,114);
  globalThis.fetch=async()=>new Response(JSON.stringify({code:200,data:[]}),{status:200});
  assert.equal((await get(env,'/api/quran/chapters')).status,502);
 }finally{globalThis.fetch=original;}
});

test('Live source discovery retrieves labeled Quran and Hadith matches without claiming Quranically review',async()=>{
 const env=fixture(),old=globalThis.fetch;const requested=[];
 try{
  globalThis.fetch=async url=>{
   requested.push(String(url));
   if(String(url).includes('/api/quran/search'))return new Response(JSON.stringify({success:true,data:{results_count:1,results:[{verse_key:'16:69',surah_number:16,surah_name:'An-Nahl',ayah:69,translation:'Among the signs is an account of bees.'}]}}),{status:200});
   if(String(url).includes('/api/hadith/search'))return new Response(JSON.stringify({success:true,data:{total_found:100,hadiths:[{id:'bukhari-1',collection:'bukhari',collection_name:'Sahih al-Bukhari',hadithnumber:1,english:'Clothing is mentioned in context.',grade:'Sahih'}]}}),{status:200});
   if(String(url).includes('/api/duas/search'))return new Response(JSON.stringify({success:true,data:{results_count:0,results:[]}}),{status:200});
   return new Response('{}',{status:404});
  };
  const r=await get(env,'/api/source-discovery?q=clothing%20for%20men&domain=seerah');
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.term,'clothing');
  assert(data.results.some(x=>x.kind==='hadith'));
  assert(data.results.every(x=>x.review_status==='upstream_unreviewed'));
  assert(data.results.every(x=>x.source_url.startsWith('https://')));
  assert(requested.every(x=>x.startsWith('https://ummahapi.com/')));
  assert.equal((await get(env,'/api/source-discovery?q=x')).status,400);
  assert.equal((await get(env,'/api/source-discovery?q=clothing&domain=invalid')).status,400);
 }finally{globalThis.fetch=old;}
});
test('Source provider failures are visible as unavailable rather than fabricated search hits',async()=>{
 const env=fixture(),old=globalThis.fetch;
 try{
  globalThis.fetch=async()=>{throw Error('network disconnected');};
  const r=await get(env,'/api/source-discovery?q=diabetes&domain=prophetic_medicine');
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.results.length,0);
  assert(data.providers.some(x=>x.status==='temporarily_unavailable'));
  assert.equal(data.review_notice.includes('not Quranically'),true);
 }finally{globalThis.fetch=old;}
});
test('Scheduled source checks use metadata only and do not store religious text or searches',async()=>{
 const env=fixture(),old=globalThis.fetch;const called=[];
 try{
  globalThis.fetch=async url=>{called.push(String(url));return new Response('{}',{status:200});};
  await worker.scheduled({},env);
  const records=(await env.DB.prepare('SELECT * FROM source_connector_checks').all()).results;
  assert.equal(records.length,6);
  assert(records.every(x=>x.last_state==='healthy'));
  assert.equal(called.length,6);
  assert(called.every(x=>!x.includes('search?q=')));
  const list=await get(env,'/api/source-connectors');
  assert.equal(list.status,200);
  const data=await list.json();
  assert(data.connectors.some(x=>x.id==='sunnah_com'&&x.mode==='access_required'));
  assert(data.connectors.some(x=>x.id==='ummah_hadith'&&x.last_state==='healthy'));
  assert(data.connectors.some(x=>x.id==='hadeethenc'&&x.last_state==='healthy'));
  const official=data.connectors.find(x=>x.id==='hadeethenc');
  assert.equal(official.source_catalog.title_count,2328);
  assert.equal(official.source_catalog.root_subjects,7);
  assert.equal(official.source_catalog.original_titles_only,true);
  assert(data.connectors.some(x=>x.id==='alquran_cloud'&&x.last_state==='healthy'));
  assert(data.connectors.some(x=>x.id==='europe_pmc'&&x.last_state==='healthy'));
  assert(data.connectors.find(x=>x.id==='europe_pmc').verification==='independent_medical_review_required');
 }finally{globalThis.fetch=old;}
});

test('on-page canonical answers address weak eyesight, diabetes, and clothing without unrelated snippets',async()=>{
 const env=fixture();
 const queries=[
  {q:'i have weak eyesight',domain:'prophetic_medicine',slug:'weak-eyesight-prophetic-medicine',minSections:6,minCitations:6},
  {q:'diabetes',domain:'prophetic_medicine',slug:'diabetes-and-prophetic-medicine',minSections:5,minCitations:3},
  {q:'clothing for men',domain:'seerah',slug:'mens-clothing-prophetic-era',minSections:5,minCitations:4}
 ];
 for(const x of queries){
  const r=await get(env,'/api/encyclopedia/answer?'+new URLSearchParams({q:x.q,domain:x.domain}));
  assert.equal(r.status,200,x.q);
  const data=await r.json();
  assert.equal(data.outcome,'full_article_answer',x.q);
  assert.equal(data.answer.slug,x.slug,x.q);
  assert(data.answer.sections.length>=x.minSections);
  assert(data.answer.citations.length>=x.minCitations);
  assert.equal(data.answer.review_status,'editorial_draft');
  assert(data.answer.citations.every(c=>c.source_url.startsWith('https://')));
 }
 const safety=(await (await get(env,'/api/encyclopedia/answer?q=blurred%20vision&domain=prophetic_medicine')).json()).answer;
 assert(safety.sections.some(s=>s.section_type==='safety'));
 assert(safety.sections.some(s=>s.body.includes('lead')));
 const noAnswer=await get(env,'/api/encyclopedia/answer?q=unresearched%20blue%20shoelaces&domain=prophetic_medicine');
 assert.equal((await noAnswer.json()).outcome,'no_editorial_answer');
 const crossed=await get(env,'/api/encyclopedia/answer?q=weak%20eyesight&domain=seerah');
 assert.equal((await crossed.json()).outcome,'no_editorial_answer');
 assert.equal((await get(env,'/api/encyclopedia/answer?q=x')).status,400);
});

test('unified search rejects invalid queries and returns the canonical evidence schema',async()=>{
 const e=fixture();
 assert.equal((await get(e,'/api/unified-search?q=x')).status,400);
 const response=await get(e,'/api/unified-search?q=black%20seed');
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.query,'black seed');
 assert.ok(Array.isArray(body.editorial));
 assert.ok(Array.isArray(body.tibb));
 assert.ok(body.tibb.some(x=>x.slug==='black-seed'&&x.safety_note&&x.reference_label));
 assert.equal(body.answer_policy,'source_first_no_fabrication');
 assert.ok(Array.isArray(body.evidence.quran));
 assert.ok(Array.isArray(body.evidence.hadith));
 assert.ok(Array.isArray(body.evidence.dua));
 assert.ok(body.editorial.every(x=>x.slug && x.review_status));
 assert.ok(!JSON.stringify(body).includes('guaranteed cure'));
});

test('unified search gives source-linked Living Guidance and actual practical steps',async()=>{
 const env=fixture();
 const response=await get(env,'/api/unified-search?q=anxiety');
 assert.equal(response.status,200);
 const data=await response.json();
 const guidance=data.guidance.find(item=>item.slug==='anxiety');
 assert(guidance);
 assert(guidance.evidence.some(x=>x.reference==='Sahih al-Bukhari 6369'&&x.source_url));
 assert(guidance.steps.some(x=>/support|healthcare/i.test(x.instruction)));
 assert(guidance.clinical_note);
});

test('unified evidence search fails open safely when older D1 has missing editorial tables',async()=>{
 const env=fixture();const original=env.DB;
 env.DB={prepare(sql){
  if(/FROM (encyclopedia_articles|tibb_entries|journeys)\b/.test(sql))throw Error('D1_ERROR: no such table');
  return original.prepare(sql);
 }};
 const r=await get(env,'/api/unified-search?q=black%20seed');
 assert.equal(r.status,200);
 const data=await r.json();
 assert.deepEqual(data.editorial,[]);
 assert.deepEqual(data.tibb,[]);
 assert.deepEqual(data.guidance,[]);
 assert.ok(Array.isArray(data.evidence.quran));
 assert.ok(Array.isArray(data.evidence.hadith));
 assert.equal(data.answer_policy,'source_first_no_fabrication');
});

test('unified questions return actual on-page answer sections and original citations, not just links',async()=>{
 const e=fixture();
 for(const [q,expectedSlug] of [
   ['I have diabetes and need Prophetic Medicine','diabetes-and-prophetic-medicine'],
   ['How did men dress in the Seerah?','mens-clothing-prophetic-era']
 ]){
   const response=await get(e,'/api/unified-search?q='+encodeURIComponent(q));
   assert.equal(response.status,200,q);
   const body=await response.json();
   const answer=body.contextual_answers.find(x=>x.slug===expectedSlug);
   assert(answer, 'Missing source-grounded answer for '+q);
   assert(answer.sections.length>=3, 'Not enough explanation for '+q);
   assert(answer.sections.every(x=>x.heading&&x.body), 'Missing on-page explanation');
   assert(answer.citations.length>=1);
   assert(answer.citations.every(x=>x.citation_ref&&x.source_url&&x.verification_status));
 }
});

test('full Quran verse index supports real paginated results without source API calls',async()=>{
 const env=fixture();
 const first=await get(env,'/api/quran/search?q=patience&offset=0&limit=4');
 assert.equal(first.status,200);
 const data=await first.json();
 assert.equal(data.source_corpus.verses,6236);
 assert.equal(data.source_corpus.surahs,114);
 assert.equal(data.results.length,4);
 assert.equal(data.next_offset,4);
 assert(data.total>=8);
 const second=await get(env,'/api/quran/search?q=patience&offset=4&limit=4');
 const next=await second.json();
 assert.equal(next.results.length,4);
 assert.notEqual(data.results[0].reference,next.results[0].reference);
 assert(data.results.every(x=>x.reader_url.startsWith('/study.html?')));
 assert(data.results.every(x=>x.review_status==='publisher_translation_not_tafsir'));
});
test('unified search gives transparent source corpus coverage and grounded answer plan',async()=>{
 const env=fixture();
 const res=await get(env,'/api/unified-search?q=patience');
 assert.equal(res.status,200);
 const body=await res.json();
 assert.equal(body.quran_lookup.source_corpus.verses,6236);
 assert(body.answer_brief.type==='source_first_evidence_brief'||body.answer_brief.type==='editorial_with_primary_sources');
 assert(body.answer_brief.sources_count>=1);
 assert(body.answer_brief.sections.some(x=>x.heading==='Relevant Qur’anic passages'));
});
