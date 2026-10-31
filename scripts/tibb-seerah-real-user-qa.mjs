// Independent real-browser QA for the problems invisible to API-only smoke tests.
// Works against an isolated local Worker or a READ-ONLY deployed Worker.
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
const base=(process.env.QST_VISUAL_BASE||'http://127.0.0.1:8799').replace(/\/$/,'');
const launch=await chromium.launch({headless:true});
mkdirSync('artifacts',{recursive:true});
const fail=[];let checks=0;
try{
 for(const vp of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]){
  const page=await launch.newPage({viewport:{width:vp.width,height:vp.height},deviceScaleFactor:2});
  const errors=[];
  page.on('pageerror',x=>errors.push('JS: '+x.message));
  page.on('response',res=>{if(res.url().startsWith(base+'/api/tibb')&&res.status()>=400)errors.push('API: '+res.status()+' '+res.url());});
  const nav=await page.goto(base+'/tibb',{waitUntil:'domcontentloaded',timeout:30000});
  if(nav.status()!==200)throw Error('Tibb HTTP '+nav.status());
  await page.locator('#entryGrid .entry').first().waitFor({timeout:18000});
  const total=await page.locator('#entryGrid .entry').count();
  if(total<8)throw Error(vp.name+' Tibb catalog missing '+total+' items');
  if((await page.locator('header.qst-header').count())!==1)throw Error('Tibb header duplicated');
  await page.screenshot({path:'artifacts/qst-tibb-catalog-'+vp.name+'.png',fullPage:true});
  checks++;console.log('PASS '+vp.name+' Tibb catalog '+total+' entries; header, cards and complete page');
  await page.locator('#filters button[data-category="food"]').click();
  const food=await page.locator('#entryGrid .entry').count();
  if(food<1||food>=total)throw Error(vp.name+' Tibb category filter failed '+food);
  checks++;console.log('PASS '+vp.name+' Tibb category filter '+food);
  await page.locator('#filters button[data-category=""]').click();
  await page.locator('#searchInput').fill('black seed');
  await page.locator('#searchForm button[type="submit"]').click();
  await page.locator('#entryGrid .entry').first().waitFor({timeout:18000});
  await page.waitForFunction(()=>document.querySelectorAll('#entryGrid .entry').length===1,{timeout:15000});
  if(!/black seed/i.test(await page.locator('#entryGrid .entry h3').first().innerText()))throw Error('Tibb search wrong answer');
  await page.locator('#entryGrid button[data-entry="black-seed"]').click();
  await page.locator('#detailBody .tibb-practical h3').waitFor({timeout:20000});
  const notice=await page.locator('#detailBody .tibb-practical').innerText();
  if(!notice.includes('Everyday food or care practice')||!notice.includes('pending')||!notice.includes('lipoid pneumonia'))throw Error('Tibb practical details absent or mislabeled');
  const dims=await page.locator('#overlay .detail').evaluate(e=>({width:e.getBoundingClientRect().width,page:window.innerWidth}));
  if(dims.width>dims.page+2)throw Error('Tibb detail overflows viewport');
  await page.screenshot({path:'artifacts/qst-tibb-black-seed-'+vp.name+'.png',fullPage:false});
  checks++;console.log('PASS '+vp.name+' Tibb search > black-seed practical detail, warnings and citations');
  await page.locator('#closeDetail').click();
  if(await page.locator('#overlay:visible').count())throw Error('Tibb detail cannot close');
  if(errors.length)throw Error(vp.name+' client failures '+errors.join(' | '));
  await page.goto(base+'/tibb?entry=black-seed',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#detailBody .tibb-practical h3').waitFor({timeout:15000});
  checks++;console.log('PASS '+vp.name+' deep-linked practical Tibb record');

  // This is the user's screenshot: Seerah answer must not be placed in 193px left grid column.
  await page.goto(base+'/encyclopedia?domain=seerah&q=Hijrah',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#inlineAnswer:not([hidden]) h3').waitFor({timeout:20000});
  const layout=await page.evaluate(()=>{
   const answer=document.querySelector('#inlineAnswer').getBoundingClientRect(),
   content=document.querySelector('.results').getBoundingClientRect(),
   page=document.querySelector('.reference-work').getBoundingClientRect();
   return {answer:{x:answer.x,width:answer.width},content:{x:content.x,width:content.width},page:{x:page.x,width:page.width},screen:innerWidth};
  });
  console.log('SEERAH SEARCH GEOMETRY '+vp.name+' '+JSON.stringify(layout));
  const minWidth=vp.name==='desktop'?Math.min(layout.page.width*.73,850):layout.page.width*.85;
  if(layout.answer.width<minWidth)throw Error('Seerah ANSWER CRUSHED '+vp.name+' width '+layout.answer.width+' expected > '+minWidth);
  if(layout.page.x>layout.answer.x+2||layout.answer.x+layout.answer.width>layout.page.x+layout.page.width+3)throw Error('Seerah answer outside main content');
  await page.screenshot({path:'artifacts/qst-seerah-hijrah-search-'+vp.name+'.png',fullPage:false});
  checks++;console.log('PASS '+vp.name+' Seerah Hijrah answer occupies primary reading viewport');
  await page.close();
 }
}finally{await launch.close();}
console.log('QURANICALLY REAL USER FLOWS PASS '+checks+' Tibb and Seerah browser assertions');
