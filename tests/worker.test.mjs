import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';import worker from '../src/index.mjs';
const root=path.resolve('.');
function fixture(){
 const sqlite=new DatabaseSync(':memory:');for(const name of ['0001_init.sql','0002_seed.sql','0003_native_admin.sql','0004_tibb.sql','0005_tibb_seed.sql','0006_tibb_original_excerpts.sql','0007_encyclopedia.sql','0008_encyclopedia_medicine.sql','0009_encyclopedia_cross_domain.sql','0010_encyclopedia_passages.sql'])sqlite.exec(fs.readFileSync(path.join(root,'migrations',name),'utf8'));
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

test('encyclopedia has fifteen source-linked articles spanning five disciplines',async()=>{
 const e=fixture();const articleCount=e.DB.prepare('SELECT COUNT(*) c FROM encyclopedia_articles').first().c;
 assert.equal(articleCount,15);
 assert(e.DB.prepare('SELECT COUNT(*) c FROM encyclopedia_sections').first().c>=70);
 assert(e.DB.prepare('SELECT COUNT(*) c FROM encyclopedia_citations').first().c>=30);
 const groups=await get(e,'/api/encyclopedia/subjects');assert.equal(groups.status,200);
 const subjects=(await groups.json()).subjects;assert.equal(subjects.length,5);
 const result=await get(e,'/api/encyclopedia?q=black%20seed');assert.equal(result.status,200);
 assert.deepEqual((await result.json()).entries.map(x=>x.slug),['black-seed']);
 const med=await get(e,'/api/encyclopedia?domain=prophetic_medicine');assert.equal(med.status,200);
 assert.equal((await med.json()).entries.length,8);
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
 assert.equal(state.encyclopedia_articles.length,15);
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
