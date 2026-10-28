// Progressive enhancement only. The canonical header/footer are server-rendered
// from D1 before first paint. Never create, replace, hide or re-render them in JS.
(()=>{'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeImage=value=>{try{const u=new URL(String(value||''));return u.protocol==='https:'?u.href:'';}catch{return ''}};
function menu(){
 const header=document.querySelector('header.qst-shell-header[data-canonical-shell="server"]');
 if(!header)return;
 const button=header.querySelector('.qst-shell-menu');
 if(!button)return;
 button.addEventListener('click',()=>{
   const open=header.classList.toggle('qst-open');
   button.setAttribute('aria-expanded',String(open));
 });
}
async function home(){
 if(location.pathname!=='/'&&location.pathname!=='/index.html')return;
 const res=await fetch('/api/site-chrome',{headers:{accept:'application/json'}});
 if(!res.ok)return;
 const data=await res.json();
 const panels=Object.fromEntries((data.panels||[]).map(p=>[p.id,p]));
 const homepage=panels.homepage;
 if(homepage){
  const hero=document.querySelector('#indexView .index-intro');
  const search=document.querySelector('#indexView .search-strip');
  if(hero&&search&&!hero.contains(search))hero.appendChild(search);
  const copy=document.querySelector('#indexView .intro-copy');
  if(copy){
   const kicker=copy.querySelector('.overline'),title=copy.querySelector('h1'),description=copy.querySelector('p:not(.overline)');
   if(kicker)kicker.textContent=homepage.kicker||'QURANICALLY / ENCYCLOPEDIA';
   if(title)title.textContent=homepage.heading;
   if(description)description.textContent=homepage.subtitle||homepage.body;
  }
  const image=safeImage(homepage.image_url),canvas=document.querySelector('#indexView .intro-manuscript');
  if(image&&canvas)canvas.innerHTML='<img class="qst-managed-hero-image" src="'+esc(image)+'" alt="'+esc(homepage.image_alt||'')+'" loading="eager">';
 }
 if(document.querySelector('.qst-home-card-grid'))return;
 const cards=(data.homepage_cards||[]).filter(c=>['quranic_themes','sunnah','seerah','prophetic_medicine','living_guidance'].includes(c.id));
 const intro=document.querySelector('#indexView .index-intro');
 if(!intro||!cards.length)return;
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
function start(){menu();home().catch(()=>{});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
else start();
})();