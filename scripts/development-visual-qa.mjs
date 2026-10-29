import {chromium} from 'playwright';
import {mkdirSync} from 'node:fs';
const base='http://127.0.0.1:8787';
mkdirSync('artifacts/development',{recursive:true});
const browser=await chromium.launch({headless:true});
const issues=[];
const pages=[
 ['home','/','.qst-home-discipline',5],
 ['quran','/encyclopedia?domain=quranic_themes','.discipline-hero',1],
 ['hadith','/encyclopedia?domain=sunnah','.discipline-hero',1],
 ['seerah','/encyclopedia?domain=seerah','.discipline-hero',1],
 ['tibb','/encyclopedia?domain=prophetic_medicine','.discipline-hero',1],
 ['guidance','/encyclopedia?domain=living_guidance','.discipline-hero',1],
 ['business-ethics','/encyclopedia?domain=living_guidance&q=business%20ethics','#inlineAnswer .qa-part',5],
 ['admin','/admin','.login-card',0]
];
for(const size of [{id:'desktop',width:1440,height:900},{id:'mobile',width:390,height:844}]){
 const page=await browser.newPage({viewport:{width:size.width,height:size.height},deviceScaleFactor:2});
 page.on('pageerror',e=>issues.push(size.id+' script error: '+e.message));
 for(const [name,path,selector,min] of pages){
  try{
   const response=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:25000});
   if(!response||response.status()>=400)throw Error('HTTP '+(response?.status()??'none'));
   if(name!=='admin'){
    const initial=await response.text();
    if(!initial.includes('data-canonical-shell="server"'))throw Error('Canonical shell not in initial HTML');
    if((initial.match(/<header class="qst-shell-header"/g)||[]).length!==1)throw Error('Duplicate/missing initial header');
    if(initial.includes('<header class="header">')||initial.includes('<header class="site-header">'))throw Error('Legacy header leaked into initial HTML');
   }
   if(min>0)await page.locator(selector).first().waitFor({timeout:17000});
   if(min>0&&await page.locator(selector).count()<min)throw Error('Incomplete view '+selector);
   if(name==='home'){
    await page.locator('#results .entry-row').first().waitFor({timeout:15000});
    await page.waitForFunction(()=>[...document.querySelectorAll('.qst-home-discipline img')].length===5&&[...document.querySelectorAll('.qst-home-discipline img')].every(i=>i.complete&&i.naturalWidth>0),{timeout:16000});
   }
   if(name==='home'&&size.id==='mobile'){
    const heroImage=await page.locator('#indexView .intro-manuscript .qst-managed-hero-image');
    if(await heroImage.count()!==1||!(await heroImage.isVisible()))throw Error('Mobile cinematic hero image is hidden');
   }
   if(['quran','hadith','seerah','tibb','guidance'].includes(name)){
    const expectedNav={quran:null,hadith:'Hadith & Sunnah',seerah:'Seerah',tibb:'Prophetic Medicine',guidance:null}[name];
    if(expectedNav){
      const current=await page.locator('.qst-shell-nav a.qst-active').allTextContents();
      if(!current.some(x=>x.trim()===expectedNav))throw Error('Incorrect active discipline navigation '+JSON.stringify(current));
    }
   }
   if(['hadith','seerah','tibb','guidance'].includes(name)){
    await page.locator('#sourceShelves:visible').waitFor({timeout:15000});
    await page.locator('#shelfTabs [data-shelf]').first().waitFor({timeout:15000});
    if(await page.locator('#shelfTabs [data-shelf]').count()<2)throw Error('Missing published canonical provider shelves');
   }
   if(['quran','hadith','seerah','tibb','guidance'].includes(name)){
    await page.waitForFunction(()=>{const i=document.querySelector('.discipline-art img');return !!i&&i.complete&&i.naturalWidth>0;},{timeout:16000});
   }
   const layout=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,title:document.title}));
   if(layout.scroll>layout.w+6)throw Error('Horizontal overflow '+layout.scroll+' vs '+layout.w);
   if(name!=='admin'){
    await page.locator('.qst-shell-header').waitFor({timeout:15000});
    await page.locator('.qst-shell-footer').waitFor({timeout:15000});
    if(await page.locator('.qst-shell-header').count()!==1)throw Error('Missing canonical header');
    if(await page.locator('.qst-shell-footer').count()!==1)throw Error('Missing canonical footer');
   }
   await page.screenshot({path:'artifacts/development/'+size.id+'-'+name+'.png',fullPage:true});
   console.log('PASS',size.id,name,JSON.stringify(layout));
  }catch(e){issues.push(size.id+' '+name+': '+e.message);}
 }
 await page.close();
}
// Query results must appear from D1 before slow external APIs return.
{
 const fast=await browser.newPage({viewport:{width:1000,height:750}});
 await fast.route('**/api/knowledge/search?**',route=>route.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify({total_indexed:2595,
    results:[{id:'test-indexed',source_id:'hadeethenc-en',external_ref:'99887',title:'Verified local original',
      publisher:'HadeethEnc',domain:'sunnah',original_text:'نص أصلي',translation_text:'Full original passage about traveler luggage.',
      explanation_text:'Source explanation is available locally.',source_url:'https://hadeethenc.com/en/browse/hadith/99887',
      expert_review:'unreviewed',content_version:'v1.25.0'}]})
 }));
 await fast.route('**/api/source-discovery?**',async route=>{
   await new Promise(resolve=>setTimeout(resolve,8500));
   await route.fulfill({status:200,contentType:'application/json',
     body:JSON.stringify({results:[],providers:[],fetched_at:new Date().toISOString()})}).catch(()=>{});
 });
 try{
   await fast.goto(base+'/encyclopedia?domain=seerah&q=traveler%20luggage',{waitUntil:'domcontentloaded',timeout:25000});
   await fast.locator('#sourceResults .provider-hit').first().waitFor({timeout:6500});
   const text=await fast.locator('#sourceResults').innerText();
   if(!text.includes('Full original passage about traveler luggage.'))throw Error('Indexed source not visible before remote');
   const state=await fast.locator('#sourceResultState').innerText();
   if(!state.includes('checking supplementary publisher indexes'))throw Error('Indexed source was not rendered before provider response: '+state);
   console.log('PASS local-first indexed original text renders before delayed provider');
 }catch(e){issues.push('local-first source search: '+e.message);}
 await fast.close();
}
// Events must survive source shelf DOM replacement during encyclopedia rerenders.
{
 const p=await browser.newPage({viewport:{width:1000,height:750}});
 await p.route('**/api/source-shelves/records?**',route=>route.fulfill({
   status:200,contentType:'application/json',
   body:JSON.stringify({status:'available',page:1,page_size:20,
     reported_total:1,has_next_page:false,records:[{id:'90012',title:'Controlled test source'}]})
 }));
 await p.route('**/api/source-shelves/detail?**',route=>route.fulfill({
   status:200,contentType:'application/json',
   body:JSON.stringify({status:'available',origin:'canonical_source_corpus',id:'90012',
     title:'Complete test publisher record',original_arabic:'النص الأصلي',passage:'Exact test source translation.',
     explanation:'Actual test publisher explanation.',benefits:'Testing in-page attribution.',
     reported_grade:'Publisher reported',source_url:'https://hadeethenc.com/en',
     content_version:'v1.25.0'})
 }));
 try{
   await p.goto(base+'/encyclopedia?domain=seerah',{waitUntil:'domcontentloaded'});
   await p.locator('#shelfRecords [data-report]').first().waitFor({timeout:15000});
   await p.evaluate(()=>{
     const shelf=document.querySelector('#sourceShelves');
     shelf.replaceWith(shelf.cloneNode(true));
   });
   await p.locator('#shelfRecords [data-report]').first().click();
   await p.locator('#shelfDetail h4').first().waitFor({timeout:6000});
   const detail=await p.locator('#shelfDetail').innerText();
   if(!detail.includes('Exact test source translation.')||!detail.includes('Actual test publisher explanation.'))
     throw Error('Canonical publisher report content missing after source shelf replacement');
   console.log('PASS publisher detail click survives canonical encyclopedia DOM re-render');
 }catch(e){issues.push('source shelf delegated event handler: '+e.message);}
 await p.close();
}
await browser.close();
if(issues.length){console.error(issues.join('\n'));process.exitCode=1;}
else console.log('CANONICAL DEVELOPMENT DESKTOP/MOBILE VISUAL CHECK PASS');
