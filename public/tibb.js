(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ic=id=>'<svg aria-hidden="true"><use href="#t-'+id+'"></use></svg>';
let category='',query='',current=null;
const kinds={food:'Foods & ingredients',care:'Personal care',practice:'Traditional practice',spiritual:'Spiritual care'};
async function api(path){const r=await fetch(path,{headers:{accept:'application/json'}});let x;try{x=await r.json()}catch{throw Error('The knowledge library is unavailable.')}if(!r.ok)throw Error(x?.error||'Request failed');return x;}
const safeURL=s=>/^https:\/\/[^\s"<>]+$/i.test(String(s||''))?s:'';
function card(x){
 return '<article class="entry"><div class="med-icon">'+ic(x.category==='practice'?'shield':x.category==='spiritual'?'book':'leaf')+'</div><span class="ey">'+esc(kinds[x.category]||'Knowledge')+'</span><h3>'+esc(x.title)+'</h3><div class="arabicname" lang="ar" dir="rtl">'+esc(x.arabic_name)+'</div><p>'+esc(x.tradition_summary)+'</p><div class="entryfoot"><small>'+esc(x.reference_label)+'</small><button type="button" data-entry="'+esc(x.slug)+'">'+(Number(x.practical_guide_available)?'How to use':'Explore')+' '+ic('arrow')+'</button></div></article>';
}
function showTibbKnowledge(){
 const shell=$('tibbAnswerShell');
 if(query.trim().length<2){
  shell.hidden=true;
  window.QuranicallyAnswers.clear();
  return;
 }
 shell.hidden=false;
 window.QuranicallyAnswers.show(query,'prophetic_medicine').catch(()=>{
  $('inlineAnswerBody').textContent='The source-linked answer could not be retrieved. Ingredient records remain available below.';
 });
}
async function search(){
 $('status').textContent='Searching source-linked material…';
 try{
 const params=new URLSearchParams();if(query)params.set('q',query);if(category)params.set('category',category);
 const data=await api('/api/tibb'+(params.size?'?'+params:''));
 $('entryGrid').innerHTML=data.entries.map(card).join('');
 $('resultsCount').textContent=data.entries.length+' entries';
 $('status').textContent=data.entries.length?'':(query?'No matching ingredient record. The source-linked answer to your question appears above when supported by authenticated references.':'No matching entries are published. We do not invent results.');
 }catch(e){$('entryGrid').innerHTML='';$('status').textContent=e.message;}
}
async function open(slug,updateHistory=true){
 if(!/^[a-z0-9-]{1,85}$/.test(slug))return;
 $('overlay').hidden=false;document.body.style.overflow='hidden';$('detailBody').innerHTML='<p>Retrieving the original reference…</p>';
 if(updateHistory){const u=new URL(location.href);u.searchParams.set('entry',slug);history.pushState({entry:slug},'',u);}
 try{
 const data=await api('/api/tibb/'+encodeURIComponent(slug));const x=data.entry;const guide=data.guide;current=x;
 let offers={offers:[],notice:'Seller availability has not been verified.'};
 try{offers=await api('/api/tibb/offers/'+encodeURIComponent(slug));}catch{}
 const href=safeURL(x.reference_url);
 $('detailBody').innerHTML='<div class="kicker">QURANICALLY / '+esc(kinds[x.category]||'KNOWLEDGE')+'</div>'
  +'<h2 id="detailTitle">'+esc(x.title)+'</h2><div class="detail-ar" lang="ar" dir="rtl">'+esc(x.arabic_name)+'</div>'
  +(x.scientific_name?'<p class="minor">'+esc(x.scientific_name)+'</p>':'')
  +'<div class="notice">'+ic('shield')+' Source-linked educational record · '+esc(x.review_stage.replaceAll('_',' '))+'. Religious-source review and clinical validation are distinct.</div>'
  +(guide?'<section class="tibb-practical"><div class="kicker">TIBB IN DAILY LIFE · PRACTICAL APPLICATION</div>'+
   '<h3>How can this actually be used?</h3>'+
   '<div class="tibb-practical-review">Religious review: '+esc(guide.religious_review.replaceAll('_',' '))+
   ' · Clinical review: '+esc(guide.medical_review.replaceAll('_',' '))+'</div>'+
   '<h4>Everyday food or care practice</h4><p>'+esc(guide.daily_life_use)+'</p>'+
   '<h4>What is actually reported?</h4><p>'+esc(guide.reported_method||'No specific application method has been confirmed from a traceable original report.')+'</p>'+
   '<p class="minor"><strong>Who advised this method:</strong> '+esc(guide.method_attribution)+'</p>'+
   '<h4>Quantity, timing and repetition</h4><p>'+esc(guide.schedule_or_dose||'No universally established schedule or quantity is recorded for this entry.')+'</p>'+
   '<h4>Medical evidence</h4><p>'+esc(guide.medical_evidence||'Clinical evidence has not been reviewed for this preparation.')+'</p>'+
   '<h4>When not to use it yourself</h4><p>'+esc(guide.safety_boundaries)+'</p>'+
   '<div class="tibb-practical-references"><strong>Check the original sources</strong>'+
   [['Prophetic report',guide.primary_url],['Supporting report',guide.supporting_url],['Clinical evidence',guide.clinical_url],['Safety reference',guide.safety_url]].map(([title,url])=>safeURL(url)?'<a href="'+esc(safeURL(url))+'" target="_blank" rel="noopener noreferrer">'+esc(title)+' '+ic('external')+'</a>':'').join('')+
   '</div><p class="minor">Published educational guidance, not an individualized treatment plan. Review flags do not imply expert endorsement.</p></section>':
   '<section class="tibb-practical tibb-practical-pending"><div class="kicker">TIBB IN DAILY LIFE</div><h3>How to use this authentically</h3><p>A source-checked practical application guide has not yet been published for this entry. The historical reference below must not be treated as an automatic personal prescription.</p></section>')
  +'<div class="section"><h3>Original source excerpt</h3>'+(x.source_arabic?'<blockquote class="source-arabic" dir="rtl" lang="ar">'+esc(x.source_arabic)+'</blockquote>':'<p class="minor">Arabic excerpt pending source review.</p>')+(x.source_meaning?'<p>'+esc(x.source_meaning)+'</p>':'')+'<p class="minor">Short excerpt and original editorial explanation; inspect the complete cited context.</p></div>'
  +'<div class="section"><h3>What the source describes</h3><p>'+esc(x.tradition_summary)+'</p><p><strong>Reference:</strong> '+esc(x.reference_label)+'</p>'
  +(href?'<a class="sourcelink" target="_blank" rel="noopener noreferrer" href="'+esc(href)+'">Inspect original source '+ic('external')+'</a>':'')+'</div>'
  +'<div class="section"><h3>Contemporary evidence & interpretation</h3><p>'+esc(x.health_context)+'</p><p class="minor">Not a medical efficacy rating. No diagnosis, dosage or individual treatment instruction is supplied.</p></div>'
  +'<div class="section"><h3>Safety and limitations</h3><p>'+esc(x.safety_note)+'</p></div>'
  +'<div class="offers"><div class="kicker">INGREDIENT AVAILABILITY · SEPARATELY VERIFIED</div><h3>'+(x.seller_eligible==='yes'?'Where ingredients may be available':'No ingredient selling for this practice')+'</h3><p>'+esc(x.availability_note)+'</p>'
  +(offers.offers.length?offers.offers.map(o=>'<div><strong>'+esc(o.seller_name)+'</strong> · '+esc(o.product_name)+' · '+esc(o.country)+' <a target="_blank" rel="noopener sponsored noreferrer" href="'+esc(safeURL(o.offer_url))+'">Seller listing</a></div>').join(''):'<p class="minor">'+esc(offers.notice)+'</p>')+'</div>'
  +'<div class="detail-actions"><button type="button" id="shareEntry">Copy page link</button><button type="button" id="printEntry">Print / save PDF</button></div>';
 document.title=x.title+' | Prophetic Medicine — Quranically';
 }catch(e){$('detailBody').innerHTML='<h2 id="detailTitle">Entry unavailable</h2><p>'+esc(e.message)+'</p>';}
}
function close(){
 $('overlay').hidden=true;document.body.style.overflow='';current=null;document.title='Prophetic Medicine — Quranically';
 const u=new URL(location.href);if(u.searchParams.has('entry')){u.searchParams.delete('entry');history.replaceState({},'',u);}
}
$('searchForm').addEventListener('submit',e=>{
 e.preventDefault();query=$('searchInput').value.trim();category='';
 document.querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('selected',b.dataset.category===''));
 const u=new URL(location.href);if(query)u.searchParams.set('q',query);else u.searchParams.delete('q');
 history.replaceState({},'',u);
 showTibbKnowledge();search();
 (query.trim().length>=2?$('tibbAnswerShell'):$('library')).scrollIntoView({behavior:'smooth',block:'start'});
});
document.querySelectorAll('[data-query]').forEach(b=>b.addEventListener('click',()=>{category='';document.querySelectorAll('[data-category]').forEach(x=>x.classList.toggle('selected',x.dataset.category===''));query=b.dataset.query;$('searchInput').value=query;
 const u=new URL(location.href);u.searchParams.set('q',query);history.replaceState({},'',u);
 showTibbKnowledge();search();$('tibbAnswerShell').scrollIntoView({behavior:'smooth',block:'start'});}));
$('filters').addEventListener('click',e=>{const b=e.target.closest('button[data-category]');if(!b)return;category=b.dataset.category;document.querySelectorAll('[data-category]').forEach(x=>x.classList.toggle('selected',x===b));search();});
$('entryGrid').addEventListener('click',e=>{const b=e.target.closest('button[data-entry]');if(b)open(b.dataset.entry);});
$('closeDetail').addEventListener('click',close);$('overlayBack').addEventListener('click',close);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('overlay').hidden)close();});
$('detailBody').addEventListener('click',e=>{
 if(e.target.closest('#printEntry'))window.print();
 if(e.target.closest('#shareEntry')){const u=new URL(location.href);if(current)u.searchParams.set('entry',current.slug);navigator.clipboard?.writeText(u.toString()).then(()=>{e.target.textContent='Link copied';}).catch(()=>{e.target.textContent='Copy from address bar';});}
});
window.addEventListener('popstate',()=>{const entry=new URLSearchParams(location.search).get('entry');if(entry)open(entry,false);else if(!$('overlay').hidden)close();});
const currentParams=new URLSearchParams(location.search);
query=(currentParams.get('q')||'').trim().slice(0,180);
if(query)$('searchInput').value=query;
const requested=currentParams.get('entry');
showTibbKnowledge();
search().then(()=>{if(requested)open(requested,false);});
})();