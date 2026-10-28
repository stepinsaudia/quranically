// Quranically public chrome: one D1 record set, one rendering layer, no hidden parallel CMS.
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeLink=v=>{const s=String(v||'');if(/^\/(?!\/)[\w/?#=&.%~-]*$/.test(s))return s;try{const u=new URL(s);return u.protocol==='https:'?u.href:'';}catch{return ''}};
const safeImage=v=>{try{const u=new URL(String(v||''));return u.protocol==='https:'?u.href:'';}catch{return ''}};
const linkHtml=(r,cls='')=>{const u=safeLink(r.href);return u?'<a class="'+cls+'" href="'+esc(u)+'">'+esc(r.label)+'</a>':''};
const groups={footer_explore:'Explore',footer_resources:'Resources',footer_about:'About',footer_legal:'Legal'};
async function load(){
 const res=await fetch('/api/site-chrome',{headers:{accept:'application/json'}});
 if(!res.ok)throw Error('Canonical site configuration unavailable');
 const data=await res.json();
 const panels=Object.fromEntries((data.panels||[]).map(p=>[p.id,p]));
 const links=Array.isArray(data.links)?data.links:[];
 const header=panels.header,footer=panels.footer;
 if(header){
  const nav=links.filter(x=>x.section==='header'&&safeLink(x.href));
  const old=[...document.body.children].find(x=>x.tagName==='HEADER');
  if(old){
   const shell=document.createElement('header');
   shell.className='qst-shell-header';
   shell.innerHTML='<div class="qst-shell-inner"><a class="qst-shell-brand" href="/" aria-label="Quranically home"><img src="/favicon.svg" alt="" width="37" height="37"><span><strong>'+esc(header.heading)+'</strong><small>'+esc(header.kicker||'The Islamic Reference Encyclopedia')+'</small></span></a><nav class="qst-shell-nav" id="qstShellNav" aria-label="Main navigation">'+nav.map(x=>{const u=safeLink(x.href);const target=u?new URL(u,location.origin):null;const active=target&&target.pathname===location.pathname&&target.search===location.search;return linkHtml(x,active?'qst-active':'');}).join('')+'</nav><button type="button" class="qst-shell-menu" aria-controls="qstShellNav" aria-expanded="false">Menu</button></div>';
   old.insertAdjacentElement('beforebegin',shell);
   old.style.display='none';old.setAttribute('aria-hidden','true');old.inert=true;
   const button=shell.querySelector('.qst-shell-menu');
   button.addEventListener('click',()=>{const open=shell.classList.toggle('qst-open');button.setAttribute('aria-expanded',String(open));});
  }
 }
 if(footer){
  const old=[...document.body.children].find(x=>x.tagName==='FOOTER');
  if(old){
   const columns=Object.entries(groups).map(([key,label])=>{
    const records=links.filter(x=>x.section===key&&safeLink(x.href));
    return records.length?'<div class="qst-foot-column"><h4>'+label+'</h4>'+records.map(x=>linkHtml(x)).join('')+'</div>':'';
   }).join('');
   old.className='qst-shell-footer';
   old.innerHTML='<div class="qst-footer-inner"><div class="qst-foot-intro"><a class="qst-foot-brand" href="/"><img src="/favicon.svg" alt="" width="33" height="33"><span>'+esc(footer.heading||'Quranically')+'</span></a><p>'+esc(footer.body||footer.subtitle)+'</p></div>'+columns+'</div><div class="qst-footer-bottom"><span>'+esc(footer.subtitle||'The Islamic Reference Encyclopedia')+'</span><span>'+esc(footer.kicker||'Knowledge · Evidence · Context')+'</span></div>';
  }
 }
 const seoMap={quranic_themes:'quran-themes',sunnah:'hadith',seerah:'seerah',prophetic_medicine:'tibb',living_guidance:'living-guidance'};
 const route=location.pathname;
 const seoKey=(route==='/'||route==='/index.html')?'home':(route==='/study'||route==='/study.html')?'quran-reader':(route==='/guidance'||route==='/guidance.html')?'guidance':route.startsWith('/encyclopedia/')?null:route.startsWith('/encyclopedia')?(seoMap[new URLSearchParams(location.search).get('domain')]||'encyclopedia'):null;
 const currentSeo=(data.page_seo||[]).find(x=>x.id===seoKey);
 if(currentSeo){
  document.title=currentSeo.title;
  const setMeta=(attribute,key,val)=>{let node=document.querySelector('meta['+attribute+'="'+key+'"]');if(!node){node=document.createElement('meta');node.setAttribute(attribute,key);document.head.append(node);}node.setAttribute('content',val);};
  setMeta('name','description',currentSeo.description);
  setMeta('property','og:title',currentSeo.title);
  setMeta('property','og:description',currentSeo.description);
  const photo=safeImage(currentSeo.social_image_url);if(photo)setMeta('property','og:image',photo);
 }
 const home=panels.homepage;
 if(home&&(location.pathname==='/'||location.pathname==='/index.html')){
  const homeHero=document.querySelector('#indexView .index-intro');
  const searchStrip=document.querySelector('#indexView .search-strip');
  if(homeHero&&searchStrip)homeHero.appendChild(searchStrip);
  const intro=document.querySelector('#indexView .intro-copy');
  if(intro){
   const kicker=intro.querySelector('.overline'),title=intro.querySelector('h1'),description=intro.querySelector('p:not(.overline)');
   if(kicker)kicker.textContent=home.kicker||'QURANICALLY / ENCYCLOPEDIA';
   if(title)title.textContent=home.heading;
   if(description)description.textContent=home.subtitle||home.body;
  }
  const photo=safeImage(home.image_url),hero=document.querySelector('#indexView .intro-manuscript');
  if(photo&&hero){hero.innerHTML='<img class="qst-managed-hero-image" src="'+esc(photo)+'" alt="'+esc(home.image_alt||'')+'" loading="eager">';}
 }
 const cards=(data.homepage_cards||[]).filter(c=>['quranic_themes','sunnah','seerah','prophetic_medicine','living_guidance'].includes(c.id));
 if(cards.length&&(location.pathname==='/'||location.pathname==='/index.html')){
   const intro=document.querySelector('#indexView .index-intro');
   if(intro){
     const section=document.createElement('section');
     section.className='qst-home-card-grid shell';
     section.setAttribute('aria-label','Explore the five knowledge disciplines');
     section.innerHTML=cards.map(c=>{
       const image=safeImage(c.image_url);
       const media=image?'<img src="'+esc(image)+'" alt="'+esc(c.image_alt||'')+'" loading="lazy">':'<div class="qst-card-placeholder"><span>'+esc(c.title)+'</span></div>';
       return '<a class="qst-home-discipline" href="/encyclopedia?domain='+encodeURIComponent(c.id)+'"><div class="qst-card-media">'+media+'</div><div class="qst-card-copy"><strong>'+esc(c.title)+'</strong><p>'+esc(c.description)+'</p><span class="qst-card-arrow" aria-hidden="true">↗</span></div></a>';
     }).join('');
     intro.insertAdjacentElement('afterend',section);
   }
 }
 document.documentElement.dataset.qstChrome='canonical';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>load().catch(()=>{}));
else load().catch(()=>{});
})();