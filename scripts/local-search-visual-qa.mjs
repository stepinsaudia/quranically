// Branch-only browser QA. Runs against localhost, never production.
import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
const base='http://127.0.0.1:8799';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const failures=[];
try {
 for(const viewport of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]){
  const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1});
  page.on('pageerror',error=>failures.push(viewport.name+' '+error.message));
  await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:25000});
  await page.locator('form#encyclopediaSearch').waitFor({timeout:10000});
  if(await page.locator('form#encyclopediaSearch').count()!==1)throw Error('Duplicate main search');
  if(!await page.locator('#query').isVisible())throw Error('Main search hidden on '+viewport.name);
  const headerCount=await page.locator('header.qst-header').count();
  if(headerCount!==1)throw Error('Expected one canonical header on '+viewport.name+', got '+headerCount);
  await page.screenshot({path:'artifacts/quranically-home-'+viewport.name+'.png',fullPage:true});
  for(const [query,title,slug] of [
   ['I have diabetes and need Prophetic Medicine','Diabetes','diabetes'],
   ['How did men dress in the Seerah?','Men','clothing']
  ]){
   await page.locator('#query').fill(query);
   await page.locator('#encyclopediaSearch button[type="submit"]').click();
   await page.locator('#inlineAnswer:not([hidden]) .qa-bibliography li').first().waitFor({timeout:25000});
   if(!await page.locator('body.qst-has-query').count())throw Error('Did not enter compact answer-first mode');
   const answerTop=await page.locator('#inlineAnswer').evaluate(el=>el.getBoundingClientRect().top+window.scrollY);
   if(answerTop>(viewport.name==='desktop'?520:420))throw Error('Answer buried beneath homepage chrome: '+viewport.name+' y='+answerTop);
   const heading=await page.locator('#inlineAnswer h3').first().innerText();
   if(!heading.toLowerCase().includes(title.toLowerCase()))throw Error(query+': incorrect answer '+heading);
   const sections=await page.locator('#inlineAnswer .qa-part').count();
   if(sections<3)throw Error(query+': only '+sections+' substantial answer sections');
   if(await page.locator('#federatedResults:visible').count())throw Error('Duplicate source panel when complete answer exists');
   await page.screenshot({path:'artifacts/quranically-'+slug+'-'+viewport.name+'.png',fullPage:true});
  }
  await page.locator('#query').fill('Where can I find Ayat al Kursi?');
  await page.locator('#encyclopediaSearch button[type="submit"]').click();
  await page.locator('#quranJump:not([hidden]) .qst-verse-link').waitFor({timeout:10000});
  const link=await page.locator('#quranJump .qst-verse-link').getAttribute('href');
  if(link!=='/study.html?surah=2&ayah=255')throw Error('Wrong Quran Reader deep link: '+link);
  const dimensions=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));
  if(dimensions.document>dimensions.viewport+6)throw Error('Horizontal overflow: '+viewport.name+' '+JSON.stringify(dimensions));
  await page.screenshot({path:'artifacts/quranically-verse-link-'+viewport.name+'.png',fullPage:true});
  await page.close();
  console.log('PASS '+viewport.name+': one search, canonical header, two sourced answers, Reader link, no overflow');
 }
}finally{await browser.close();}
if(failures.length)throw Error('Browser script errors: '+failures.join(' | '));
