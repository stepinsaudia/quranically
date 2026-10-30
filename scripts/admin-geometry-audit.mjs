// Quranically protected Admin visual geometry is audited without login,
// real credentials, production calls or editorial mutations.
import {chromium} from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('artifacts',{recursive:true});
const base=(process.env.QST_VISUAL_BASE||'http://127.0.0.1:8799').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
// Read-only local source catalogue populates the ACTUAL Admin renderer. This is
// a QA fixture using seeded local data, NOT an authenticated production Admin.
const sourceCatalog=await (await fetch(base+'/api/encyclopedia')).json();
if(!Array.isArray(sourceCatalog.entries)||sourceCatalog.entries.length<10)
 throw Error('Local canonical D1 reference catalogue unavailable for populated Admin QA');
const qaBootstrap={encyclopedia_articles:sourceCatalog.entries,encyclopedia_sections:[],
 encyclopedia_citations:[],encyclopedia_passages:[],encyclopedia_links:[],
 journeys:[],evidence:[],sources:[],steps:[],tibb_entries:[],tibb_offers:[],research_topics:[]};
const sizes=[{width:1440,height:900},{width:1024,height:768},{width:390,height:844},{width:360,height:800}];
const records=[],issues=[];
try{
 for(const size of sizes)for(const type of ['admin','login']){
  const page=await browser.newPage({viewport:size,deviceScaleFactor:2,hasTouch:size.width<600});
  // In read-only render QA the private Admin JS must not request auth state.
  if(type==='admin'){
    // Worker correctly refuses unauthenticated /admin.html in the local preview.
    // Serve the source HTML solely inside this browser's in-memory QA intercept.
    // This DOES NOT change routes, access controls, credentials or production.
    await page.route('**/admin.html',route=>route.fulfill({status:200,contentType:'text/html',body:fs.readFileSync('public/admin.html','utf8')}));
    // Browser-only READ intercepts; all writes remain forbidden by real Worker.
    await page.route('**/api/admin/whoami',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({email:'Local read-only visual QA'})}));
    await page.route('**/api/admin/bootstrap',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(qaBootstrap)}));
    await page.route('**/api/admin/audit',route=>route.fulfill({status:200,contentType:'application/json',body:'{"records":[]}'}));
    await page.route('**/api/source-connectors',route=>route.fulfill({status:200,contentType:'application/json',body:'{"connectors":[]}'}));
  }
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=type==='admin'?'/admin.html':'/admin-login.html';
  const response=await page.goto(base+url,{waitUntil:'load',timeout:30000});
  await page.evaluate(()=>document.fonts.ready);
  const selectors=type==='admin'?{header:'.admin-top',top:'.admin-top-inner',footer:'.admin-footer',main:'.admin-layout',action:'#newRecord',brand:'.admin-brand strong'}:
    {header:'.admin-login-header',top:'.admin-login-header-inner',footer:'.admin-login-footer',main:'main.card',action:'#submit',brand:'.admin-login-brand strong'};
  for(const key of ['header','top','footer','main','action'])await page.locator(selectors[key]).first().waitFor({timeout:6000});
  if(type==='admin')await page.locator('#records .record').first().waitFor({timeout:8000});
  const data=await page.evaluate(sel=>{
   const rect=k=>{const e=document.querySelector(sel[k]),r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}};
   const main=rect('main'),action=rect('action');
   return {vw:innerWidth,doc:document.documentElement.scrollWidth,header:rect('header'),top:rect('top'),footer:rect('footer'),main,action,brand:rect('brand'),bodyColor:getComputedStyle(document.body).backgroundColor,
    h1:getComputedStyle(document.querySelector('main h1')||document.querySelector('main h2')).fontSize,
    navLinks:document.querySelectorAll('#tabs button').length,
    footerVisible:document.querySelector(sel.footer)!=null};
  },selectors);
  const row={type,width:size.width,height:size.height,http:response?.status(),errors,...data};
  records.push(row);
  await page.screenshot({path:'artifacts/qst-admin-'+type+'-'+size.width+'.png',fullPage:false});
  if(type==='admin'){
   const count=await page.locator('#records .record').count();
   if(count!==sourceCatalog.entries.length)issues.push('Admin rendered '+count+' records, expected '+sourceCatalog.entries.length);
   // Verify the actual canonical editor form component, never submit it.
   await page.locator('#newRecord').click();
   await page.locator('#editor:not([hidden]) #editForm input').first().waitFor({timeout:6000});
   await page.screenshot({path:'artifacts/qst-admin-editor-'+size.width+'.png',fullPage:false});
   await page.locator('#cancelEdit').click();
  }
  if(row.http!==200)issues.push(type+' '+size.width+' returned '+row.http);
  if(row.errors.length)issues.push(type+' '+size.width+' JS errors '+row.errors.join(';'));
  if(row.doc>row.vw+1)issues.push(type+' '+size.width+' document overflows '+(row.doc-row.vw)+'px');
  if(row.brand.width<80||row.brand.x<0||row.brand.right>size.width)issues.push(type+' '+size.width+' QURANICALLY wordmark hidden or clipped');
  if(type==='admin'){
   const gutter=Math.max(32,Math.min(size.width*.065,104));
   const desired=Math.round((size.width-Math.min(1280,size.width-gutter))/2);
   if(Math.abs(row.top.x-desired)>4||Math.abs(row.main.x-row.top.x)>2)issues.push('Admin geometry axis mismatch at '+size.width+'px');
   if(row.navLinks<12)issues.push('Admin canonical navigation lost collections');
   if(row.action.y>size.height*0.75)issues.push('Admin New Record action below first viewport');
  }
  else if(row.action.y>size.height*0.82)issues.push('Protected login action below first viewport');
  await page.close();
 }
}finally{await browser.close();}
fs.writeFileSync('artifacts/qst-admin-geometry.json',JSON.stringify({base,records,issues},null,2));
for(const row of records)console.log('ADMIN VISUAL',JSON.stringify(row));
if(issues.length){console.error('ADMIN CANONICAL FAIL',issues.join(' | '));process.exitCode=1}
else console.log('ADMIN CANONICAL PASS: protected Desk and login across four retina viewport widths; shared 1280px axes, visible actions, no overflow, zero data mutations.');
