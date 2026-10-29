// Canonical HadeethEnc browser: Admin-approved roots, official subcategory hierarchy,
// full publisher pagination, independently attributed passages and explanations.
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const $=id=>document.getElementById(id);
let epoch=0,detailEpoch=0,current=null;
async function read(path){
 const response=await fetch(path,{headers:{accept:'application/json'},signal:AbortSignal.timeout(20000)});
 const data=await response.json();
 if(!response.ok)throw Error(data.error||'Source request failed');
 return data;
}
function shelfButton(s,active){
 return '<button class="source-shelf-tab'+(active?' selected':'')+'" data-shelf="'+esc(s.id)+'" type="button" aria-pressed="'+String(active)+'">'+esc(s.heading)+'</button>';
}
function renderRecord(x){
 return '<article class="source-shelf-record"><div class="source-shelf-meta">HADEETHENC · PUBLISHER TRANSLATION · INDEPENDENT REVIEW PENDING</div>'+
  '<p>'+esc(x.title)+'</p><button type="button" data-report="'+esc(x.id)+'">Read original source and explanation <span aria-hidden="true">→</span></button></article>';
}
function sourceLink(id){
 return 'https://hadeethenc.com/api/v1/hadeeths/one/?language=en&id='+encodeURIComponent(id);
}
function renderCategories(){
 const holder=$('shelfCategories');if(!current)return;
 const root=String(current.active.provider_category_id);
 const all=(current.categories||[]).filter(c=>(c.shelf_roots||[]).includes(root));
 if(!all.length){
  holder.innerHTML='<p>Browse the published collection. '+(current.categoryStatus==='temporarily_unavailable'?'Publisher subcategory list is temporarily unavailable.':'Checking for official subcategories…')+'</p>';
  return;
 }
 const children=all.filter(c=>c.id!==root);
 const options=[{id:root,title:'All reports in '+current.active.heading,reported_count:all.find(c=>c.id===root)?.reported_count}].concat(children);
 const max=options.length;
 holder.innerHTML='<label for="shelfCategorySelect">Publisher topic ('+Math.max(0,max-1)+' subcategories)</label>'+
  '<select id="shelfCategorySelect" aria-label="Browse official subcategories">'+options.map(c=>'<option value="'+esc(c.id)+'"'+(String(current.categoryId)===c.id?' selected':'')+'>'+esc(c.title)+(c.reported_count!==null&&c.reported_count!==undefined?' · '+c.reported_count+' listed':'')+'</option>').join('')+'</select>';
}
async function loadTree(seq){
 if(!current)return;
 try{
  const data=await read('/api/source-shelves/tree?domain='+encodeURIComponent(current.domain));
  if(seq!==epoch||!current)return;
  current.categoryStatus=data.status;
  current.categories=data.status==='available'&&Array.isArray(data.categories)?data.categories:[];
  renderCategories();
 }catch{
  if(seq!==epoch||!current)return;
  current.categoryStatus='temporarily_unavailable';
  renderCategories();
 }
}
async function loadRecords(seq,shelf,page=1){
 const state=$('shelfStatus'),records=$('shelfRecords'),detail=$('shelfDetail');
 state.textContent='Retrieving official publisher entries…';records.innerHTML='';detail.hidden=true;detail.innerHTML='';
 const category=String(current?.categoryId||shelf.provider_category_id);
 try{
  const params=new URLSearchParams({domain:current.domain,shelf:shelf.id,page:String(page),category});
  const data=await read('/api/source-shelves/records?'+params);
  if(seq!==epoch)return;
  if(data.status!=='available'){
   state.textContent='The source publisher is temporarily unavailable. Try another category or the linked reference search.';
   return;
  }
  const total=data.reported_total===null?'total not reported':Number(data.reported_total).toLocaleString()+' publisher records reported';
  const pages=data.last_page?' of '+data.last_page:'';
  state.textContent=total+' · page '+page+pages+' · '+data.records.length+' results on this page · provider translation, independent review pending';
  records.innerHTML=data.records.map(renderRecord).join('')||'<p class="source-shelf-empty">No reports returned for this page.</p>';
  const pagination='<nav class="source-shelf-pagination" aria-label="Source records pages">'+
   (page>1?'<button type="button" data-page="'+(page-1)+'">Previous page</button>':'')+
   (data.has_next_page?'<button type="button" data-page="'+(page+1)+'">Next 20 reports</button>':'')+'</nav>';
  records.insertAdjacentHTML('beforeend',pagination);
  records.dataset.shelf=shelf.id;records.dataset.page=String(page);
 }catch(e){if(seq===epoch)state.textContent='Could not retrieve publisher records: '+e.message;}
}
async function readDetail(id){
 const seq=++detailEpoch,box=$('shelfDetail');
 box.hidden=false;box.innerHTML='<p>Retrieving the official report and explanation…</p>';
 const fallback='<p>Publisher detail temporarily unavailable within Quranically. You can consult the original source.</p>'+
  '<a href="'+esc(sourceLink(id))+'" rel="noopener noreferrer" target="_blank">Open the official HadeethEnc record</a>'+
  ' · <button type="button" data-report="'+esc(id)+'">Retry reading here</button>';
 try{
  const info=await read('/api/source-shelves/detail?id='+encodeURIComponent(id));
  if(seq!==detailEpoch)return;
  if(info.status!=='available'){box.innerHTML=fallback;return;}
  const hints=(info.hints||[]).map(h=>'<li>'+esc(h)+'</li>').join('');
  box.innerHTML='<div class="source-shelf-meta">ORIGINAL PUBLISHER SOURCE · REPORT '+esc(info.id)+'</div>'+
   '<h4>'+esc(info.title||'Original publisher report')+'</h4>'+
   (info.original_arabic?'<h5>Original Arabic</h5><p class="source-shelf-arabic" lang="ar" dir="rtl">'+esc(info.original_arabic)+'</p>':'')+
   '<h5>English translation</h5><p class="source-shelf-matn">'+esc(info.passage||'No verified English translation in this record.')+'</p>'+
   (info.explanation?'<h5>Publisher explanation</h5><p>'+esc(info.explanation)+'</p>':'')+
   (info.benefits?'<h5>Publisher benefits and lessons</h5><p>'+esc(info.benefits)+'</p>':'')+
   (info.reported_grade?'<p><strong>Publisher-reported grade:</strong> '+esc(info.reported_grade)+'</p>':'')+
   (hints?'<h5>Publisher notes</h5><ul>'+hints+'</ul>':'')+
   '<p class="source-shelf-caution">Publisher original and translation, not a Quranically-authenticated fatwa or clinically validated treatment. '+
   (info.content_version?'Edition '+esc(info.content_version)+'. ':'')+esc(info.reported_attribution||'')+'</p>'+
   '<a href="'+esc(info.source_url)+'" target="_blank" rel="noopener noreferrer">Inspect official publisher record</a>';
  box.scrollIntoView({block:'nearest',behavior:'smooth'});
 }catch(e){if(seq===detailEpoch)box.innerHTML=fallback;}
}
async function load(domain){
 const root=$('sourceShelves');if(!root)return;
 const allowed=['sunnah','seerah','prophetic_medicine','living_guidance'];
 const seq=++epoch;detailEpoch++;
 if(!allowed.includes(domain)){root.hidden=true;current=null;return;}
 root.hidden=false;root.dataset.domain=domain;
 $('shelfStatus').textContent='Connecting to official source collections…';
 $('shelfTabs').innerHTML='';$('shelfCategories').innerHTML='';$('shelfRecords').innerHTML='';$('shelfDetail').hidden=true;
 try{
  const data=await read('/api/source-shelves?domain='+encodeURIComponent(domain));
  if(seq!==epoch)return;
  const shelves=data.shelves||[];
  if(!shelves.length){$('shelfStatus').textContent='No published source collections in this discipline.';return;}
  current={domain,shelves,active:shelves[0],categoryId:String(shelves[0].provider_category_id),categories:[],categoryStatus:'loading'};
  $('shelfTabs').innerHTML=shelves.map((x,i)=>shelfButton(x,i===0)).join('');
  renderCategories();
  loadTree(seq);
  await loadRecords(seq,shelves[0],1);
 }catch(e){if(seq===epoch)$('shelfStatus').textContent='Unable to load source collections: '+e.message;}
}
function setup(){
 // Delegate from the stable document: encyclopedia view rendering can replace
 // the source-shelf element after the script has initially loaded.
 document.addEventListener('click',e=>{
  const root=$('sourceShelves');
  if(!root||!root.contains(e.target)||!e.target.closest)return;
  const choice=e.target.closest('[data-shelf]');
  if(choice&&current){
   const shelf=current.shelves.find(x=>x.id===choice.dataset.shelf);
   if(!shelf)return;
   current.active=shelf;current.categoryId=String(shelf.provider_category_id);
   const seq=++epoch;
   $('shelfTabs').innerHTML=current.shelves.map(x=>shelfButton(x,x.id===shelf.id)).join('');
   renderCategories();loadRecords(seq,shelf,1);loadTree(seq);return;
  }
  const report=e.target.closest('[data-report]');if(report){readDetail(report.dataset.report);return;}
  const more=e.target.closest('[data-page]');
  if(more&&current)loadRecords(++epoch,current.active,Number(more.dataset.page));
 });
 document.addEventListener('change',e=>{
  if(e.target.id==='shelfCategorySelect'&&current&&$('sourceShelves')?.contains(e.target)){
   current.categoryId=e.target.value;
   loadRecords(++epoch,current.active,1);
  }
 });
}
// Event delegation must register at script evaluation, independently of
// DOMContentLoaded timing and any asynchronous encyclopedia view refresh.
setup();
function start(){
 // On a first visit the encyclopedia script may execute first.
 load(new URLSearchParams(location.search).get('domain')||'');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.QuranicallySourceShelves={load};
})();