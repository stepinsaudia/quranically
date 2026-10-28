// One provider-bound knowledge browser, no second CMS and no fake records.
// The shelves are published in D1; category records come from HadeethEnc on demand.
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
let epoch=0,current=null,detailEpoch=0;
async function read(path){
 const res=await fetch(path,{headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)});
 const data=await res.json();
 if(!res.ok)throw Error(data.error||'Source request failed');
 return data;
}
function shelfButton(s,active){
 return '<button class="source-shelf-tab'+(active?' selected':'')+'" data-shelf="'+esc(s.id)+'" type="button" aria-pressed="'+String(active)+'">'+esc(s.heading)+'</button>';
}
function renderRecord(x){
 return '<article class="source-shelf-record"><div class="source-shelf-meta">HADEETHENC · ENGLISH TRANSLATION · UNREVIEWED BY QURANICALLY</div>'+
  '<p>'+esc(x.title)+'</p><button type="button" data-report="'+esc(x.id)+'">Read report and publisher’s explanation <span aria-hidden="true">→</span></button></article>';
}
async function loadRecords(seq,shelf,page=1){
 const state=$('shelfStatus'),records=$('shelfRecords'),detail=$('shelfDetail');
 state.textContent='Reading official source index…';records.innerHTML='';detail.hidden=true;detail.innerHTML='';
 try{
  const data=await read('/api/source-shelves/records?'+new URLSearchParams({domain:current.domain,shelf:shelf.id,page:String(page)}));
  if(seq!==epoch)return;
  if(data.status!=='available'){
   state.textContent='The official HadeethEnc collection is temporarily unavailable. Other live source search and reviewed articles remain accessible.';
   return;
  }
  state.textContent=String(data.records.length)+' publisher records from '+shelf.heading+' · page '+page+' · source translations require independent review';
  records.innerHTML=data.records.map(renderRecord).join('')||'<p class="source-shelf-empty">No records returned for this category.</p>';
  if(data.has_next_page)records.insertAdjacentHTML('beforeend','<button type="button" class="source-shelf-next" data-page="'+(page+1)+'">More from this publisher category</button>');
  records.dataset.shelf=shelf.id;records.dataset.page=String(page);
 }catch(e){if(seq===epoch)state.textContent='Publisher collection not available at this time. '+e.message;}
}
async function readDetail(id){
 const seq=++detailEpoch,box=$('shelfDetail');
 box.hidden=false;box.innerHTML='<p>Retrieving attributed report and publisher explanation…</p>';
 try{
  const info=await read('/api/source-shelves/detail?id='+encodeURIComponent(id));
  if(seq!==detailEpoch)return;
  if(info.status!=='available'){box.innerHTML='<p>Publisher record temporarily unavailable. The original source may be checked later.</p>';return;}
  const hints=(info.hints||[]).map(h=>'<li>'+esc(h)+'</li>').join('');
  box.innerHTML='<div class="source-shelf-meta">OFFICIAL PUBLISHER REPORT · ID '+esc(info.id)+'</div>'+
   '<h4>'+esc(info.title)+'</h4><p class="source-shelf-matn">'+esc(info.passage)+'</p>'+
   (info.explanation?'<h5>Publisher explanation</h5><p>'+esc(info.explanation)+'</p>':'')+
   (hints?'<h5>Publisher notes</h5><ul>'+hints+'</ul>':'')+
   '<p class="source-shelf-caution">Provider translation and explanation; not independently authenticated or clinically endorsed by Quranically. '+esc(info.reported_attribution||'')+'</p>'+
   '<a href="'+esc(info.source_url)+'" target="_blank" rel="noopener noreferrer">Inspect official publisher record</a>';
  box.scrollIntoView({block:'nearest',behavior:'smooth'});
 }catch(e){if(seq===detailEpoch)box.innerHTML='<p>Publisher detail retrieval failed: '+esc(e.message)+'</p>';}
}
async function load(domain){
 const root=$('sourceShelves');if(!root)return;
 const allowed=['sunnah','seerah','prophetic_medicine','living_guidance'];
 const seq=++epoch;detailEpoch++;
 if(!allowed.includes(domain)){root.hidden=true;current=null;return;}
 root.hidden=false;root.dataset.domain=domain;root.querySelector('#shelfStatus').textContent='Connecting to published source collections…';
 $('shelfTabs').innerHTML='';$('shelfRecords').innerHTML='';$('shelfDetail').hidden=true;
 try{
  const data=await read('/api/source-shelves?domain='+encodeURIComponent(domain));
  if(seq!==epoch)return;
  const shelves=data.shelves||[];
  if(!shelves.length){$('shelfStatus').textContent='No publisher shelves have been published for this discipline.';return;}
  current={domain,shelves,active:shelves[0]};
  $('shelfTabs').innerHTML=shelves.map((x,i)=>shelfButton(x,i===0)).join('');
  await loadRecords(seq,shelves[0],1);
 }catch(e){if(seq===epoch)$('shelfStatus').textContent='Unable to load publisher shelves: '+e.message;}
}
function setup(){
 const root=$('sourceShelves');if(!root)return;
 root.addEventListener('click',e=>{
  const choice=e.target.closest('[data-shelf]');
  if(choice&&current){
   const shelf=current.shelves.find(x=>x.id===choice.dataset.shelf);
   if(!shelf)return;
   current.active=shelf;const seq=++epoch;
   $('shelfTabs').innerHTML=current.shelves.map(x=>shelfButton(x,x.id===shelf.id)).join('');
   loadRecords(seq,shelf,1);return;
  }
  const report=e.target.closest('[data-report]');if(report){readDetail(report.dataset.report);return;}
  const more=e.target.closest('[data-page]');if(more&&current)loadRecords(++epoch,current.active,Number(more.dataset.page));
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
window.QuranicallySourceShelves={load};
})();