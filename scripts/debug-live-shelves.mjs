import {chromium} from 'playwright';
const origin='https://qst-living-knowledge-v1.stepinsaudia.workers.dev';
const browser=await chromium.launch({headless:true});
const errors=[];
for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:2});
 const events=[];
 page.on('pageerror',e=>events.push('PAGE_ERROR '+e.message.slice(0,250)));
 page.on('response',r=>{if(r.url().includes('/api/source-shelves/'))events.push('SOURCE_RESPONSE '+r.status()+' '+new URL(r.url()).pathname);});
 await page.goto(origin+'/encyclopedia?domain=seerah',{waitUntil:'domcontentloaded'});
 try{
  await page.locator('#shelfRecords [data-report]').first().waitFor({timeout:20000});
  const id=await page.locator('#shelfRecords [data-report]').first().getAttribute('data-report');
  const direct=await (await fetch(origin+'/api/source-shelves/detail?id='+encodeURIComponent(id),{signal:AbortSignal.timeout(15000)})).json();
  const before=await page.evaluate(()=>({hidden:document.querySelector('#shelfDetail')?.hidden,
   hasRoot:!!document.querySelector('#sourceShelves'),rootHidden:document.querySelector('#sourceShelves')?.hidden,
   reportCount:document.querySelectorAll('#shelfRecords [data-report]').length,
   sourceGlobal:!!window.QuranicallySourceShelves,
   sourceScript:!!document.querySelector('script[src="/source-shelves.js"]')}));
  await page.locator('#shelfRecords [data-report]').first().click();
  await page.waitForTimeout(1300);
  const after=await page.evaluate(()=>{
   const p=document.querySelector('#shelfDetail');
   return {hidden:p?.hidden,hasH4:!!p?.querySelector('h4'),childCount:p?.children.length,tagNames:[...(p?.children||[])].map(x=>x.tagName),
    starts:p?.textContent?.slice(0,110),shelfState:document.querySelector('#shelfStatus')?.textContent?.slice(0,160)}
  });
  console.log(JSON.stringify({width,id,api_status:direct.status,api_origin:direct.origin,
   api_has_passage:!!direct.passage,api_has_arabic:!!direct.original_arabic,
   before,after,events}));
  if(!after.hasH4)errors.push(width+'px source report click did not render');
 }catch(e){errors.push(width+'px '+e.message.slice(0,160));console.log(JSON.stringify({width,events,error:e.message.slice(0,300)}));}
 await page.close();
}
await browser.close();
if(errors.length){console.error('SOURCE UI DEFECT',JSON.stringify(errors));process.exitCode=1;}
else console.log('SOURCE DETAIL READER VISIBLE ON DESKTOP/MOBILE');
