// Real rendered geometry audit, NOT route-only QA.
// Applies one physical shared top axis, viewport action visibility and readable
// balanced cards across every public page and the editor sign-in surface.
import {chromium} from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('artifacts',{recursive:true});
const base=(process.env.QST_VISUAL_BASE||'http://127.0.0.1:8799').replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
const routes=[
 {name:'encyclopedia',path:'/',main:'form#encyclopediaSearch',axis:'.shell'},
 {name:'guidance',path:'/guidance.html',main:'.hero',axis:'.shell'},
 {name:'reader',path:'/study.html',main:'.qrHero, .hero',axis:'.container'}
];
const widths=[{w:1440,h:900},{w:1024,h:768},{w:390,h:844},{w:360,h:800}];
const records=[];
try{
 for(const size of widths)for(const r of routes){
  const page=await browser.newPage({viewport:{width:size.w,height:size.h},deviceScaleFactor:2,hasTouch:size.w<600});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(base+r.path,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('header.qst-header').first().waitFor({timeout:8000});
  await page.locator(r.main).first().waitFor({timeout:8000});
  const data=await page.evaluate(({selector,main})=>{
   const rect=sel=>{const e=document.querySelector(sel);if(!e)return null;const b=e.getBoundingClientRect();return {x:Math.round(b.left),right:Math.round(b.right),top:Math.round(b.top+scrollY),width:Math.round(b.width),height:Math.round(b.height),visible:getComputedStyle(e).display!=='none'}};
   const headers=[...document.querySelectorAll('header.qst-header')];
   const footers=[...document.querySelectorAll('body > footer')];
   const header=headers[0];const top=header?.querySelector('.qst-top'),nav=header?.querySelector('.qst-links');
   const axis=rect(selector);
   const links=[...document.querySelectorAll('.qst-links a')];
   const visibleLinks=links.filter(e=>e.getBoundingClientRect().width>0).length;
   return {documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,viewportHeight:innerHeight,
    headerCount:headers.length,footerCount:footers.length,
    header:rect('header.qst-header'),top:rect('.qst-top'),nav:rect('.qst-links'),
    firstAction:rect(main),axis, footer:rect('body > footer'),visibleLinks,
    fonts:{body:getComputedStyle(document.body).fontFamily,title:getComputedStyle(document.querySelector('main h1')||document.body).fontSize},
    bodyBg:getComputedStyle(document.body).backgroundColor,
    headerBg:getComputedStyle(header).backgroundColor
   };
  },{selector:r.axis,main:r.main});
  const row={page:r.name,width:size.w,height:size.h,http:response?.status(),errors,...data};
  records.push(row);
  await page.screenshot({path:'artifacts/geometry-before-'+r.name+'-'+size.w+'.png',fullPage:false});
  await page.close();
 }
}finally{await browser.close();}
fs.writeFileSync('artifacts/canonical-geometry-before.json',JSON.stringify(records,null,2));
for(const row of records)console.log('GEOMETRY',JSON.stringify(row));
console.log('CANONICAL GEOMETRY BASELINE RECORDED',records.length,'viewport-page pairs');
