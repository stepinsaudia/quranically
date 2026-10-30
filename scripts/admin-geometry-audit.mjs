// Quranically protected Admin visual geometry is audited without login,
// real credentials, production calls or editorial mutations.
import {chromium} from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('artifacts',{recursive:true});
const base=(process.env.QST_VISUAL_BASE||'http://127.0.0.1:8799').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
const sizes=[{width:1440,height:900},{width:1024,height:768},{width:390,height:844},{width:360,height:800}];
const records=[],issues=[];
try{
 for(const size of sizes)for(const type of ['admin','login']){
  const page=await browser.newPage({viewport:size,deviceScaleFactor:2,hasTouch:size.width<600});
  // In read-only render QA the private Admin JS must not request auth state.
  if(type==='admin')await page.route('**/admin.js',route=>route.fulfill({status:200,body:'/* static Admin render inspection: deliberately no login or D1 writes */',contentType:'application/javascript'}));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=type==='admin'?'/admin.html':'/admin-login.html';
  const response=await page.goto(base+url,{waitUntil:'load',timeout:30000});
  const selectors=type==='admin'?{header:'.admin-top',top:'.admin-top-inner',footer:'.admin-footer',main:'.admin-layout',action:'#newRecord'}:
    {header:'.admin-login-header',top:'.admin-login-header-inner',footer:'.admin-login-footer',main:'main.card',action:'#submit'};
  for(const key of ['header','top','footer','main','action'])await page.locator(selectors[key]).first().waitFor({timeout:6000});
  const data=await page.evaluate(sel=>{
   const rect=k=>{const e=document.querySelector(sel[k]),r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right}};
   const main=rect('main'),action=rect('action');
   return {vw:innerWidth,doc:document.documentElement.scrollWidth,header:rect('header'),top:rect('top'),footer:rect('footer'),main,action,bodyColor:getComputedStyle(document.body).backgroundColor,
    h1:getComputedStyle(document.querySelector('main h1')||document.querySelector('main h2')).fontSize,
    navLinks:document.querySelectorAll('#tabs button').length,
    footerVisible:document.querySelector(sel.footer)!=null};
  },selectors);
  const row={type,width:size.width,height:size.height,http:response?.status(),errors,...data};
  records.push(row);
  await page.screenshot({path:'artifacts/qst-admin-'+type+'-'+size.width+'.png',fullPage:false});
  if(row.http!==200)issues.push(type+' '+size.width+' returned '+row.http);
  if(row.errors.length)issues.push(type+' '+size.width+' JS errors '+row.errors.join(';'));
  if(row.doc>row.vw+1)issues.push(type+' '+size.width+' document overflows '+(row.doc-row.vw)+'px');
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
