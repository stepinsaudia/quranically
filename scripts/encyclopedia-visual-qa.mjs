import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
const origin='https://qst-living-knowledge-v1.stepinsaudia.workers.dev';
const password=(process.env.QST_ADMIN_PASSWORD||'').trim();
if(password.length<20)throw Error('Admin credential unavailable for visual QA');
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const failures=[];
async function auditPage(page,label,expected){
 await page.waitForLoadState('networkidle',{timeout:30000});
 if(expected){
  const count=await page.locator(expected.selector).count();
  if(count<expected.minimum)throw Error(label+': expected at least '+expected.minimum+' '+expected.selector+', got '+count);
 }
 const layout=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
 if(layout.document>layout.viewport+5)failures.push(label+' horizontal overflow: '+JSON.stringify(layout));
 console.log(label,JSON.stringify(layout));
}
for(const size of [{name:'desktop',width:1440,height:980},{name:'mobile',width:390,height:844}]){
 const page=await browser.newPage({viewport:{width:size.width,height:size.height},deviceScaleFactor:1});
 page.on('pageerror',e=>failures.push(size.name+' script error: '+e.message));
 await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:35000});
 await page.locator('#results .entry-row').first().waitFor({timeout:25000});
 await auditPage(page,size.name+' encyclopedia',{selector:'.entry-row',minimum:15});
 await page.screenshot({path:'artifacts/encyclopedia-'+size.name+'.png',fullPage:true});
 await page.goto(origin+'/encyclopedia/black-seed',{waitUntil:'domcontentloaded',timeout:35000});
 await page.locator('.article-section').first().waitFor({timeout:25000});
 await auditPage(page,size.name+' article',{selector:'.article-section',minimum:5});
 const citationCount=await page.locator('#articleCitations .bib-row').count();
 if(citationCount<2)throw Error('Bibliography missing on '+size.name);
 const passages=await page.locator('#primaryExcerpts:not([hidden]) .arabic-source').count();
 if(passages<1)throw Error('Source-linked original Arabic section missing on '+size.name);
 await page.screenshot({path:'artifacts/black-seed-article-'+size.name+'.png',fullPage:true});
 await page.close();
}
const admin=await browser.newPage({viewport:{width:1440,height:900}});
await admin.goto(origin+'/admin',{waitUntil:'domcontentloaded'});
const loginStatus=await admin.evaluate(async p=>{
 const r=await fetch('/api/admin/login',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({password:p})});return r.status;
},password);
if(loginStatus!==200)throw Error('Browser Admin sign-in failed HTTP '+loginStatus);
await admin.goto(origin+'/admin',{waitUntil:'domcontentloaded'});
await admin.locator('#records .record').first().waitFor({timeout:25000});
const artCount=await admin.locator('#records .record').count();
if(artCount!==15)throw Error('Browser Admin shows '+artCount+' articles, expected 15');
await auditPage(admin,'canonical desktop Admin',{selector:'#records .record',minimum:15});
await admin.screenshot({path:'artifacts/canonical-admin-desktop.png',fullPage:true});
await admin.locator('button[data-action="workspace"]').first().click();
await admin.locator('#articleWorkspace:not([hidden]) .workspace-panel').first().waitFor({timeout:10000});
if(await admin.locator('#articleWorkspace .workspace-panel').count()!==4)throw Error('Canonical dossier must show sections, bibliography, Arabic and cross-references');
await auditPage(admin,'connected editorial dossier',{selector:'#articleWorkspace .workspace-panel',minimum:4});
await admin.screenshot({path:'artifacts/canonical-admin-dossier-desktop.png',fullPage:true});
await admin.locator('#articleWorkspace button[data-work-action="add"][data-entity="encyclopedia_passages"]').click();
if(await admin.locator('#editor:not([hidden])').count()!==1)throw Error('Connected dossier cannot open original Arabic editor');
const articleId=await admin.locator('#fields select[name="article_id"]').inputValue();
if(!articleId)throw Error('Source editor lost selected article reference');
console.log('PASS interconnected Admin dossier and source form; no record changes');
await admin.locator('#closeEdit').click();

await admin.locator('button[data-tab="encyclopedia_sections"]').click();
await admin.locator('#records .record').first().waitFor({timeout:12000});
if(await admin.locator('#records .record').count()<70)throw Error('Admin section records missing');
await admin.locator('button[data-tab="encyclopedia_citations"]').click();
if(await admin.locator('#records .record').count()<30)throw Error('Admin bibliography records missing');
console.log('PASS browser Admin articles, sections and bibliographies');
await admin.close();await browser.close();
if(failures.length)throw Error(failures.join('\n'));
console.log('BROWSER DESKTOP/MOBILE VISUAL AND ADMIN QA PASS');
