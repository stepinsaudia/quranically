import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';import worker from '../src/index.mjs';
const root=path.resolve('.');
function fixture(){
 const sqlite=new DatabaseSync(':memory:');for(const name of ['0001_init.sql','0002_seed.sql','0003_native_admin.sql','0004_tibb.sql','0005_tibb_seed.sql','0006_tibb_original_excerpts.sql'])sqlite.exec(fs.readFileSync(path.join(root,'migrations',name),'utf8'));
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
