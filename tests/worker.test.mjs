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
 assert(articleCount>=21);
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
 assert((await med.json()).entries.length>=13);
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

test('three source-linked Seerah dossiers render comprehensive canonical answers',async()=>{
 const env=fixture();
 for(const [q,slug,primary] of [
  ['What happened during the Hijrah?','hijrah-to-madinah','9:40'],
  ['What happened at the Battle of Badr?','battle-of-badr-sourced-account','3:123'],
  ['How did the Prophet treat his neighbours?','prophetic-guidance-neighbours','6014']
 ]){
  const response=await get(env,'/api/encyclopedia/answer?'+new URLSearchParams({q,domain:'seerah'}));
  assert.equal(response.status,200,q);
  const data=await response.json();
  assert.equal(data.outcome,'full_article_answer',q);
  assert.equal(data.answer.slug,slug,q);
  assert(data.answer.sections.length>=4,q);
  assert(data.answer.citations.some(c=>c.citation_ref.includes(primary)),q);
  assert(data.answer.citations.every(c=>c.source_url?.startsWith('https://')&&c.verification_status==='pending'),q);
  assert.equal(data.answer.review_status,'editorial_draft',q);
  const all=await get(env,'/api/unified-search?'+new URLSearchParams({q,domain:'seerah'}));
  assert.equal(all.status,200,q);
  const related=await all.json();
  assert(related.contextual_answers.some(x=>x.slug===slug),q);
  assert.equal(related.answer_quality?.status,'published_reference_available',q);
 }
});

test('three canonical Living Guidance dossiers return substantial sections and source links',async()=>{
 const env=fixture();
 for(const [q,slug,ref] of [
  ['How should I manage anger?','anger-and-self-restraint','6116'],
  ['What is repentance in Islam?','repentance-tawbah-in-islam','39:53'],
  ['What does Islam teach about family relationships?','family-relationships-kindness','17:23']
 ]){
  const r=await get(env,'/api/encyclopedia/answer?'+new URLSearchParams({q,domain:'living_guidance'}));
  assert.equal(r.status,200,q);
  const answer=(await r.json()).answer;
  assert(answer&&answer.slug===slug,'Wrong Living Guidance topic: '+q);
  assert(answer.sections.length>=4,q);
  assert(answer.citations.some(x=>x.citation_ref.includes(ref)),q);
  assert(answer.citations.every(x=>x.source_url.startsWith('https://')&&x.verification_status==='pending'),q);
  assert.equal(answer.review_status,'editorial_draft',q);
  const u=await get(env,'/api/unified-search?'+new URLSearchParams({q,domain:'living_guidance'}));
  assert.equal(u.status,200,q);
  assert((await u.json()).contextual_answers.some(x=>x.slug===slug),q);
 }
});

test('three medically bounded Tibb dossiers answer without unverified cure claims',async()=>{
 const env=fixture();
 for(const [query,slug,sourceRef] of [
   ['What about honey for a cough?','honey-for-cough-evidence','5684'],
   ['What is hijama and is it safe?','hijama-cupping-safety','5681'],
   ['Does Prophetic Medicine cure asthma?','asthma-prophetic-medicine-boundaries','26:80']
 ]){
  const route='/api/encyclopedia/answer?'+new URLSearchParams({q:query,domain:'prophetic_medicine'});
  const response=await get(env,route);
  assert.equal(response.status,200,query);
  const data=await response.json();
  assert.equal(data.outcome,'full_article_answer',query);
  assert.equal(data.answer.slug,slug,query);
  assert(data.answer.sections.length>=4,query);
  assert(data.answer.citations.some(x=>x.citation_ref.includes(sourceRef)),query);
  assert(data.answer.citations.some(x=>x.citation_type==='clinical'),query);
  assert(data.answer.citations.every(x=>x.source_url?.startsWith('https://')&&x.verification_status==='pending'),query);
  assert.equal(data.answer.review_status,'editorial_draft');
  const unified=await get(env,'/api/unified-search?'+new URLSearchParams({q:query,domain:'prophetic_medicine'}));
  assert.equal(unified.status,200,query);
  const result=await unified.json();
  assert(result.contextual_answers.some(x=>x.slug===slug),query);
  assert(result.answer_quality.flags.includes('no_individualized_medical_claim'),query);
 }
});

test('five sourced Quranic and Sunnah dossiers answer without fabricated tafsir or fatwa',async()=>{
 const env=fixture();
 for(const [q,domain,slug,ref] of [
  ['What does Quran say about patience?','quranic_themes','patience-quranic-theme','2:153'],
  ['Does Quran discuss riba?','quranic_themes','riba-in-quranic-text','2:275'],
  ['Where is Maryam mentioned?','quranic_themes','maryam-in-quran','19:16'],
  ['What hadith discuss honesty?','sunnah','truthfulness-in-sunnah','6094'],
  ['What is Sunnah about backbiting?','sunnah','backbiting-ghibah-sunnah','2589']
 ]){
  const res=await get(env,'/api/encyclopedia/answer?'+new URLSearchParams({q,domain}));
  assert.equal(res.status,200,q);
  const body=await res.json();
  assert.equal(body.outcome,'full_article_answer',q);
  assert.equal(body.answer.slug,slug,q);
  assert(body.answer.sections.length>=4,q);
  assert(body.answer.citations.some(c=>c.citation_ref.includes(ref)),q);
  assert(body.answer.citations.every(c=>c.source_url?.startsWith('https://')&&c.verification_status==='pending'),q);
  assert.equal(body.answer.review_status,'editorial_draft',q);
  const unified=await get(env,'/api/unified-search?'+new URLSearchParams({q,domain}));
  assert.equal(unified.status,200,q);
  assert((await unified.json()).contextual_answers.some(a=>a.slug===slug),q);
 }
});

test('Ayat al-Kursi 2:255 includes full reference, contextual sections and authenticated hadith pointers',async()=>{
 const env=fixture(),q='Where is Ayat al Kursi?';
 const r=await get(env,'/api/encyclopedia/answer?'+new URLSearchParams({q,domain:'quranic_themes'}));
 assert.equal(r.status,200);
 const body=await r.json();
 assert.equal(body.outcome,'full_article_answer');
 assert.equal(body.answer.slug,'ayat-al-kursi-guide');
 assert(body.answer.sections.length>=4);
 assert(body.answer.citations.some(x=>x.citation_ref==='2:255'));
 assert(body.answer.citations.some(x=>x.citation_ref==='810'));
 assert(body.answer.citations.some(x=>x.citation_ref==='5010'));
 assert.equal(body.answer.review_status,'editorial_draft');
 const u=await get(env,'/api/unified-search?'+new URLSearchParams({q,domain:'quranic_themes'}));
 const answer=await u.json();
 assert(answer.contextual_answers.some(x=>x.slug==='ayat-al-kursi-guide'));
 assert(answer.evidence.quran.some(v=>v.reference==='2:255'));
});

test('Sunnah question finds the Seerah clothing article as a labelled cross-discipline link only',async()=>{
 const env=fixture(),q='How should Muslim men dress?';
 const r=await get(env,'/api/unified-search?'+new URLSearchParams({q,domain:'sunnah'}));
 assert.equal(r.status,200);
 const body=await r.json();
 assert.equal(body.contextual_answers.length,0,'Do not claim Seerah as a Sunnah editorial answer');
 assert(body.related_articles.some(x=>x.slug==='mens-clothing-prophetic-era'&&x.domain==='seerah'));
 assert.notEqual(body.answer_quality.status,'published_reference_available');
 const historical=await get(env,'/api/unified-search?'+new URLSearchParams({q,domain:'seerah'}));
 const answer=await historical.json();
 assert(answer.contextual_answers.some(x=>x.slug==='mens-clothing-prophetic-era'));
 assert.equal(answer.answer_quality.status,'published_reference_available');
});
test('a specific medical or fiqh question cannot become a complete answer through one shared noun',async()=>{
 const env=fixture();
 for(const [q,domain] of [
  ['Can I replace insulin with black seed during Ramadan?','prophetic_medicine'],
  ['Does honey cure cancer without chemotherapy?','prophetic_medicine'],
  ['Does the Quran define zakat on cryptocurrency?','quranic_themes'],
  ['Can hijama replace medical care for asthma?','prophetic_medicine']
 ]){
  const r=await get(env,'/api/unified-search?'+new URLSearchParams({q,domain}));
  assert.equal(r.status,200,q);
  const x=await r.json();
  assert.equal(x.contextual_answers.length,0,'False complete answer for '+q);
  assert.notEqual(x.answer_quality.status,'published_reference_available',q);
 }
});

test('the 60-topic research queue is private, source-review staged and editable only through canonical authenticated Admin',async()=>{
 const e=fixture();
 const current=e.DB.prepare('SELECT COUNT(*) AS n FROM research_topics').first();
 assert.equal(current.n,60);
 assert.equal(e.DB.prepare("SELECT COUNT(*) AS n FROM research_topics WHERE research_stage='queued'").first().n,60);
 assert.equal(e.DB.prepare("SELECT COUNT(*) AS n FROM research_topics WHERE linked_article_id IS NOT NULL").first().n,0);
 const visitor=await get(e,'/api/admin/research_topics');
 assert.equal(visitor.status,503);
 const publicLeak=await get(e,'/api/research_topics');
 assert.notEqual(publicLeak.status,200,'Private editorial research cannot be published as user-facing content');
 const password='Private-editorial-research-test-password-2026';
 const salt=new Uint8Array(16).fill(0x65);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const derived=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256));
 const hex=u=>Array.from(u,x=>x.toString(16).padStart(2,'0')).join('');
 e.ADMIN_PASSWORD_RECORD='pbkdf2-sha256:100000:'+hex(salt)+':'+hex(derived);
 const login=await get(e,'/api/admin/login',{method:'POST',headers:{origin:'https://test.local','content-type':'application/json'},body:JSON.stringify({password})});
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const boot=await get(e,'/api/admin/bootstrap',{headers:{cookie}});
 assert.equal(boot.status,200);
 const loaded=await boot.json();
 assert.equal(loaded.research_topics.length,60);
 assert(loaded.research_topics.every(x=>x.research_stage==='queued'&&x.linked_article_id===null));
 const create=await get(e,'/api/admin/research_topics',{method:'POST',headers:{origin:'https://test.local',cookie,'content-type':'application/json'},
  body:JSON.stringify({question:'How are astronomic observations authenticated?',domain:'quranic_themes',research_stage:'queued',
    risk_class:'interpretation',source_notes:'Research only: evidence not yet verified',linked_article_id:'',sort_order:5})});
 assert.equal(create.status,200);
 const added=await create.json();
 assert(added.id);
 const saved=e.DB.prepare('SELECT * FROM research_topics WHERE id=?').bind(added.id).first();
 assert.equal(saved.linked_article_id,null);
 assert.equal(saved.research_stage,'queued');
 const edit=await get(e,'/api/admin/research_topics/'+added.id,{method:'PUT',headers:{origin:'https://test.local',cookie,'content-type':'application/json'},
 body:JSON.stringify({research_stage:'source_check',assigned_reviewer:'Editorial Desk'})});
 assert.equal(edit.status,200);
 assert.equal(e.DB.prepare('SELECT research_stage FROM research_topics WHERE id=?').bind(added.id).first().research_stage,'source_check');
 const invalid=await get(e,'/api/admin/research_topics/'+added.id,{method:'PUT',headers:{origin:'https://test.local',cookie,'content-type':'application/json'},body:JSON.stringify({research_stage:'expert_approved_without_sources'})});
 assert.equal(invalid.status,400);
 assert.equal(e.DB.prepare("SELECT COUNT(*) AS n FROM research_topics WHERE research_stage='source_check'").first().n,1);
 assert(e.DB.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE table_name='research_topics'").first().n>=2);
});

test('dedicated Prophetic Medicine route serves the real D1-backed Tibb experience, not an encyclopedia redirect',async()=>{
 const e=fixture();const paths=[];
 e.ASSETS.fetch=async request=>{
  paths.push(new URL(request.url).pathname);
  return new Response('<!doctype html><html><body data-qst-page="tibb"><main>Prophetic Medicine</main></body></html>',{status:200,headers:{'content-type':'text/html'}});
 };
 for(const pathname of ['/tibb','/tibb/','/tibb.html','/tibb?entry=black-seed']){
  const res=await get(e,pathname);
  assert.equal(res.status,200,'route '+pathname);
  assert.equal(res.headers.get('location'),null,'should never redirect '+pathname);
  assert.match(await res.text(),/data-qst-page="tibb"/);
 }
 // Cloudflare canonical /tibb serves the tibb.html asset; asking for /tibb.html causes a 307 redirect to /tibb.
 assert.deepEqual(paths,['/tibb','/tibb','/tibb','/tibb']);
 const catalogue=await get(e,'/api/tibb');
 assert.equal(catalogue.status,200,'D1-backed Prophetic Medicine catalogue must still work');
 const entries=(await catalogue.json()).entries;
 assert(entries.length>=8);
});

test('discipline index cards expose real D1 references without inventing grading',async()=>{
 const env=fixture();
 for(const domain of ['quranic_themes','sunnah','seerah','prophetic_medicine','living_guidance']){
  const response=await get(env,'/api/encyclopedia?domain='+domain);
  assert.equal(response.status,200,domain);
  const data=await response.json();
  assert(data.entries.length>0,domain+' has no published articles');
  for(const entry of data.entries){
   const db=env.DB.prepare('SELECT COUNT(*) AS n FROM encyclopedia_citations WHERE article_id=?').bind(entry.id).first();
   assert.equal(Number(entry.citation_count),Number(db.n),entry.slug+' citation count');
   if(db.n){
    const first=env.DB.prepare('SELECT citation_ref,source_title FROM encyclopedia_citations WHERE article_id=? ORDER BY sort_order,id LIMIT 1').bind(entry.id).first();
    assert.equal(entry.primary_reference,first.citation_ref);
    assert.equal(entry.primary_source_title,first.source_title);
   }
   assert(entry.review_status,'Review state must be visible');
  }
 }
});

test('practical black seed use keeps companion action separate from Prophetic statement and medical advice',async()=>{
 const env=fixture();
 const resp=await get(env,'/api/tibb/black-seed');
 assert.equal(resp.status,200);
 const data=await resp.json();
 const g=data.guide;
 assert.equal(data.entry.scientific_name,'Nigella sativa');
 assert(g&&g.daily_life_use.includes('ordinary meals'),'Everyday culinary usage must be present');
 assert(g.reported_method.includes('Ibn Abi Atiq'),'Historical narrated use must identify the adviser');
 assert(g.method_attribution.includes('not'), 'Method must distinguish the Companion from a universal command');
 assert(g.schedule_or_dose.includes('No established universal Sunnah dose'),'No invented daily seven-seed prescription');
 assert(g.safety_boundaries.includes('lipoid pneumonia'),'Unsafe intranasal oils must be clearly discouraged');
 assert.equal(g.religious_review,'pending');
 assert.equal(g.medical_review,'pending');
 assert.equal(g.primary_url,'https://sunnah.com/bukhari/76/10');
 const list=await (await get(env,'/api/tibb?q=black')).json();
 assert(list.entries.some(x=>x.slug==='black-seed'&&Number(x.practical_guide_available)===1));
 for(const other of ['honey','talbina']){
  const doc=await (await get(env,'/api/tibb/'+other)).json();
  assert.equal(doc.guide,null,'Unreviewed/unwritten practical usage must not be fabricated: '+other);
 }
 // Draft material cannot leak to public APIs even when it exists in the database.
 env.DB.prepare("UPDATE tibb_use_guides SET status='draft' WHERE id='black-seed-use'").run();
 assert.equal((await (await get(env,'/api/tibb/black-seed')).json()).guide,null);
});
test('practical Tibb guide API cannot publish unreviewed records without authenticated Admin',async()=>{
 const env=fixture();
 const res=await get(env,'/api/admin/tibb_use_guides',{method:'POST',headers:{origin:'https://test.local','content-type':'application/json'},body:JSON.stringify({entry_id:'black-seed',daily_life_use:'A dubious cure',status:'published'})});
 assert.equal(res.status,503);
 const state=await (await get(env,'/api/tibb/black-seed')).json();
 assert(state.guide?.daily_life_use.includes('food-grade'));
});

test('Quranically discipline learning guides enforce citation-family isolation, public source attribution and draft hiding',async()=>{
 const e=fixture();
 const cases=[
  ['patience-quranic-theme','quranic_themes','quran'],
  ['truthfulness-in-sunnah','sunnah','hadith'],
  ['hijrah-to-madinah','seerah','quran'],
  ['anger-and-self-restraint','living_guidance','quran']
 ];
 for(const [slug,domain,kind] of cases){
  const response=await get(e,'/api/encyclopedia/'+slug);
  assert.equal(response.status,200,slug);
  const data=await response.json(),g=data.learning_guide;
  assert.equal(data.entry.domain,domain);
  assert(g&&g.source_teaching&&g.everyday_application&&g.boundaries,slug+' must have a practical, bounded, cited guide');
  assert.equal(g.citation_type,kind);
  assert(g.source_url.startsWith('https://'));
  assert.equal(g.review_status,'pending','Not independently reviewed; do not mislabel');
  assert(data.citations.some(c=>c.citation_ref===g.citation_ref&&c.source_url===g.source_url));
 }
 const verse=await (await get(e,'/api/quran/learning?surah=2&ayah=153')).json();
 assert.equal(verse.reference,'2:153');
 assert(verse.studies.some(s=>s.slug==='patience-quranic-theme'));
 const unrelated=await (await get(e,'/api/quran/learning?surah=2&ayah=154')).json();
 assert(!unrelated.studies.some(s=>s.slug==='patience-quranic-theme'),'Nearby verse must not inherit unrelated teaching');
 const invalid=await get(e,'/api/quran/learning?surah=123&ayah=4');
 assert.equal(invalid.status,400);
 e.DB.prepare("UPDATE discipline_learning_guides SET status='draft' WHERE article_id='patience-quranic-theme'").run();
 const hidden=await (await get(e,'/api/encyclopedia/patience-quranic-theme')).json();
 assert.equal(hidden.learning_guide,null,'Unpublished guidance must not leak');
});
test('authenticated Admin refuses cross-article and cross-discipline evidence for practical learning',async()=>{
 const e=fixture();
 const password='Only-for-QST-discipline-isolation-test';
 const salt=new Uint8Array(16);salt.fill(0x27);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const digest=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256));
 const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
 e.ADMIN_PASSWORD_RECORD='pbkdf2-sha256:100000:'+hex(salt)+':'+hex(digest);
 const login=await get(e,'/api/admin/login',{method:'POST',headers:{origin:'https://test.local','content-type':'application/json'},body:JSON.stringify({password})});
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const write=async data=>get(e,'/api/admin/discipline_learning_guides/sunnah-truthfulness-application',{
  method:'PUT',headers:{origin:'https://test.local',cookie,'content-type':'application/json'},body:JSON.stringify(data)
 });
 assert.equal((await write({primary_citation_id:'patience-quranic-theme-r1'})).status,400,'Different parent article must be forbidden');
 assert.equal((await write({primary_citation_id:'truthfulness-in-sunnah-r2'})).status,400,'A Qur’an verse cannot become a Hadith report');
 assert.equal((await write({boundaries:'',status:'published'})).status,400,'Published guide must have limitations');
 assert.equal((await write({everyday_example:'Reflect before sending an unverified claim.'})).status,200);
 const doc=await (await get(e,'/api/encyclopedia/truthfulness-in-sunnah')).json();
 assert(doc.learning_guide.everyday_example.includes('unverified claim'));
 assert.equal(doc.learning_guide.citation_type,'hadith');
 const tamperCitation=await get(e,'/api/admin/encyclopedia_citations/truthfulness-in-sunnah-r1',{method:'PUT',
  headers:{origin:'https://test.local',cookie,'content-type':'application/json'},body:JSON.stringify({citation_type:'clinical'})});
 assert.equal(tamperCitation.status,400,'An existing Hadith teaching must never be converted to clinical evidence');
 const tamperDomain=await get(e,'/api/admin/encyclopedia_articles/truthfulness-in-sunnah',{method:'PUT',
  headers:{origin:'https://test.local',cookie,'content-type':'application/json'},body:JSON.stringify({domain:'seerah'})});
 assert.equal(tamperDomain.status,400,'A source-linked guide cannot silently migrate to another discipline');
});
