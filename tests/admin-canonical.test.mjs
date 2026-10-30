import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=f=>readFileSync(new URL('../public/'+f,import.meta.url),'utf8');
test('canonical protected editorial desk renders the same Quranically brand lockup, width and no duplicate headers',()=>{
 const html=file('admin.html'),css=file('admin-canonical.css');
 assert.equal((html.match(/<header class="admin-top"/g)||[]).length,1);
 assert.match(html,/class="admin-brand"/);
 assert.match(html,/src="\/favicon.svg"/);
 assert.match(html,/THE ISLAMIC REFERENCE ENCYCLOPEDIA/);
 assert.match(html,/class="admin-layout"/);
 assert.match(html,/href="\/admin-canonical.css"/);
 assert(html.indexOf('href="/admin-canonical.css"')>html.indexOf('href="/admin.css"'),'shared Admin stylesheet must load last');
 assert.match(css,/--admin-width:1280px/);
 assert.match(css,/--admin-gutter:clamp\(32px,6.5vw,104px\)/);
});
test('single canonical Admin retains every functional editor control and review collection',()=>{
 const h=file('admin.html');
 for(const id of ['owner','signOut','tabs','sectionTitle','sectionInfo','newRecord','filter','count','records','articleWorkspace','editor','editForm','fields','cancelEdit'])
  assert(h.includes('id="'+id+'"'),'Missing protected editor control '+id);
 for(const collection of ['research_topics','encyclopedia_articles','encyclopedia_sections','encyclopedia_citations','encyclopedia_passages','encyclopedia_links','journeys','evidence','sources','steps','tibb_entries','tibb_offers','audit','connectors'])
  assert(h.includes('data-tab="'+collection+'"'),'Missing canonical Admin collection '+collection);
 assert.match(h,/Authenticated revisions/);
});
test('protected sign-in preserves native password flow and adopts consistent Quranically identity',()=>{
 const h=file('admin-login.html'),css=file('admin-login-canonical.css');
 assert.match(h,/class="admin-login-header"/);
 assert.match(h,/href="\/admin-login-canonical.css"/);
 assert.match(h,/THE ISLAMIC REFERENCE ENCYCLOPEDIA/);
 assert.match(h,/autocomplete="current-password"/);
 assert.match(h,/id="login"/);
 assert.match(h,/id="status" role="status" aria-live="polite"/);
 assert.match(h,/fetch\('\/api\/admin\/login'/);
 assert.match(css,/1280px/);
});
