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
await browser.close();
if(issues.length){console.error(issues.join('\n'));process.exitCode=1;}
else console.log('CANONICAL DEVELOPMENT DESKTOP/MOBILE VISUAL CHECK PASS');
