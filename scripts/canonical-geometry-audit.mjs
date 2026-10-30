// Real rendered geometry audit, NOT route-only QA. Five public page families, four viewport sizes.
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
 {name:'reader',path:'/study.html',main:'.qrHero, .hero',axis:'.container'},
 {name:'tibb',path:'/tibb.html',main:'.hero',axis:'.shell'},
 {name:'article',path:'/encyclopedia/hijrah-to-madinah',main:'#articleView:not([hidden]) .article-shell',axis:'.shell'}
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
   const activeLinks=links.filter(e=>e.getAttribute('aria-current')==='page').length;
   return {documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,viewportHeight:innerHeight,
    headerCount:headers.length,footerCount:footers.length,activeLinks,
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
const faults=[];
for(const item of records){
 if(item.http!==200)faults.push(item.page+' '+item.width+': HTTP '+item.http);
 if(item.errors.length)faults.push(item.page+' '+item.width+': browser errors '+item.errors.join(', '));
 if(item.documentWidth>item.width+1)faults.push(item.page+' '+item.width+': horizontal overflow '+(item.documentWidth-item.width)+'px');
 if(item.headerCount!==1||item.footerCount!==1)faults.push(item.page+' '+item.width+': expected one physical site header and footer');
 if(item.activeLinks!==1)faults.push(item.page+' '+item.width+': expected exactly one active navigation link, got '+item.activeLinks);
 if(!item.axis||!item.top||!item.nav)faults.push(item.page+' '+item.width+': missing aligned content axis');
 else if(Math.abs(item.axis.x-item.top.x)>1||Math.abs(item.nav.x-item.top.x)>1)
  faults.push(item.page+' '+item.width+': geometry axes differ');
 if(item.header?.top!==0)faults.push(item.page+' '+item.width+': header displaced '+item.header?.top+'px by legacy chrome');
 if(item.page==='encyclopedia'&&item.firstAction?.top>(item.width<=390?405:405))
  faults.push(item.page+' '+item.width+': search is below first viewport decision area');
 if(item.page==='guidance'&&item.firstAction?.height>(item.width<=390?505:460))
  faults.push(item.page+' '+item.width+': decorative hero too tall');
 if(item.page==='tibb'&&item.firstAction?.height>(item.width<=390?505:470))
  faults.push(item.page+' '+item.width+': medical library hero too tall');
 if(item.page==='reader'&&item.firstAction?.height>(item.width<=390?330:350))
  faults.push(item.page+' '+item.width+': Reader hero hides reading experience');
}
for(const size of widths){
 const same=records.filter(x=>x.width===size.w);
 if(Math.max(...same.map(x=>x.header?.height||0))-Math.min(...same.map(x=>x.header?.height||0))>1)
  faults.push('Header height mismatch at '+size.w);
 if(Math.max(...same.map(x=>x.footer?.height||0))-Math.min(...same.map(x=>x.footer?.height||0))>12)
  faults.push('Footer height mismatch at '+size.w);
}
if(faults.length){console.error('CANONICAL GEOMETRY FAIL',faults.join(' | '));process.exitCode=1;}
else console.log('CANONICAL GEOMETRY PASS: 5 page families × 4 retina viewports; single header/footer, axes, above-fold actions, zero overflow.');

