(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ic=name=>'<svg aria-hidden="true"><use href="#e-'+name+'"></use></svg>';
const titles={prophetic_medicine:'Prophetic Medicine',quranic_themes:'Quranic Themes',sunnah:'Sunnah & Hadith',seerah:'Seerah & Biography',living_guidance:'Living Guidance'};
const domains=[['','All disciplines'],...Object.entries(titles)];
let filters={domain:new URLSearchParams(location.search).get('domain')||'',q:new URLSearchParams(location.search).get('q')||'',letter:''};
if(!titles[filters.domain])filters.domain='';
let selectedEntry=null;
const disciplineTones={quranic_themes:'quran',sunnah:'hadith',seerah:'seerah',prophetic_medicine:'tibb',living_guidance:'guidance'};
let disciplinePages={},disciplinePathways=[];
function renderDiscipline(){
 const d=disciplinePages[filters.domain],el=$('disciplineLanding');
 if(!d){el.hidden=true;el.innerHTML='';document.body.removeAttribute('data-discipline');return;}
 const tone=disciplineTones[filters.domain];
 document.body.dataset.discipline=tone;
 const tabs=disciplinePathways.filter(p=>p.domain===filters.domain&&/^\/(?!\/)[a-zA-Z0-9/?#=&._%~-]*$/.test(p.href)).slice(0,8);
 const img=d.hero_image_url&&/^https:\/\//.test(d.hero_image_url)?d.hero_image_url:'';
 el.hidden=false;
 el.innerHTML='<div class="discipline-hero discipline-'+tone+'"><div class="discipline-copy"><span class="discipline-eyebrow">'+esc(d.eyebrow)+'</span><h2>'+esc(d.heading)+'</h2><p>'+esc(d.introduction)+'</p><a class="discipline-explore" href="#indexHeading">Browse reference articles <span aria-hidden="true">→</span></a></div><div class="discipline-art" aria-hidden="true">'+(img?'<img src="'+esc(img)+'" alt="'+esc(d.hero_image_alt||'')+'" loading="lazy">':'<div class="discipline-art-frame"><span>'+esc((d.eyebrow||'KNOWLEDGE').split(' / ').pop())+'</span></div>')+'</div></div><nav class="discipline-tabs" aria-label="'+esc(titles[filters.domain])+' pathways">'+tabs.map(p=>'<a href="'+esc(p.href)+'">'+esc(p.label)+'</a>').join('')+'</nav>';
}
async function loadDisciplinePages(){
 try{
  const data=await api('/api/discipline-pages');
  disciplinePages=Object.fromEntries((data.pages||[]).map(d=>[d.id,d]));
  disciplinePathways=Array.isArray(data.pathways)?data.pathways:[];
  renderDiscipline();
 }catch(e){
  const el=$('disciplineLanding');el.hidden=true;el.innerHTML='';
 }
}
function toast(m){const t=$('toast');t.textContent=m;t.hidden=false;setTimeout(()=>t.hidden=true,2600);}
async function api(url){const r=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(18000)});let o;try{o=await r.json()}catch{throw Error('The reference service is unavailable.')}if(!r.ok)throw Error(o.error||'Reference request failed');return o;}
function indexLink(){const u=new URL('/encyclopedia',location.origin);if(filters.domain)u.searchParams.set('domain',filters.domain);if(filters.q)u.searchParams.set('q',filters.q);return u.pathname+u.search;}
function linkFor(slug){return '/encyclopedia/'+encodeURIComponent(slug);}
function showIndex(){selectedEntry=null;$('articleView').hidden=true;$('indexView').hidden=false;$('articleCrumbArrow').hidden=true;$('crumbSubject').textContent='Reference index';document.title='Quranically | The Islamic Reference Encyclopedia';$('query').value=filters.q;window.scrollTo({top:0,behavior:'instant'});refresh().then(()=>{if(filters.q&&!selectedEntry)document.getElementById('inlineAnswer').scrollIntoView({behavior:'smooth',block:'start'});});}
function renderSubjects(counts){
 const map=new Map(counts.map(x=>[x.domain,Number(x.entries)]));const total=counts.reduce((n,x)=>n+Number(x.entries),0);
 $('subjects').innerHTML=domains.map(([key,name])=>'<button type="button" data-domain="'+esc(key)+'" class="'+(filters.domain===key?'active':'')+'">'+esc(name)+'<b>'+ (key?(map.get(key)||0):total)+'</b></button>').join('');
}
async function loadSubjects(){try{const data=await api('/api/encyclopedia/subjects');renderSubjects(data.subjects);}catch(e){$('subjects').textContent='Subject index unavailable';}}
const alphabet=['ALL',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
function renderAlphabet(){
 $('alphabet').innerHTML=alphabet.map(letter=>'<button type="button" data-letter="'+esc(letter)+'" class="'+(filters.letter===(letter==='ALL'?'':letter)?'selected':'')+'">'+esc(letter==='ALL'?'A–Z':letter)+'</button>').join('');
}
function entryCard(x,i){
 return '<article class="entry-row"><div><div class="entry-head"><span class="entry-domain">'+esc(titles[x.domain]||x.domain)+'</span><span class="entry-number">REFERENCE / '+String(i+1).padStart(2,'0')+'</span></div>'
  +'<h3><a data-open="'+esc(x.slug)+'" href="'+esc(linkFor(x.slug))+'">'+esc(x.title)+'</a></h3>'
  +'<p class="sub">'+esc(x.subtitle)+'</p><p class="description">'+esc(x.abstract)+'</p>'
  +'<div class="entry-meta">'+ic('book')+'<span>Source-indexed · '+esc(x.review_status.replaceAll('_',' '))+'</span></div></div>'
  +'<div class="entry-side"><div class="entry-arabic" lang="ar" dir="rtl">'+esc(x.arabic_title)+'</div><a class="open-entry" href="'+esc(linkFor(x.slug))+'" data-open="'+esc(x.slug)+'">Read article '+ic('arrow')+'</a></div></article>';
}
function renderProviderResult(x){
  const external=String(x.source_url||'');
  let safe='';try{const u=new URL(external);if(u.protocol==='https:')safe=u.href;}catch{}
  return '<article class="provider-hit"><div class="provider-hit-top"><span>'+esc(x.kind==='quran'?'Quran verse':x.kind==='hadith'?'Hadith collection':'Supplication')+'</span><small>Provider indexed · review pending</small></div>'
    +'<h4>'+esc(x.title)+'</h4><p>'+esc(x.excerpt||'Provider reference available; examine the original source record.')+'</p>'
    +'<div class="provider-hit-footer"><span>'+esc(x.reference||'')+'</span>'+(safe?'<a href="'+esc(safe)+'" rel="noopener noreferrer" target="_blank">Inspect original source '+ic('external')+'</a>':'')+'</div></article>';
}
let sourceSequence=0;
async function liveSources(q,domain){
 const root=$('federatedResults');
 if(!q||q.length<2){sourceSequence++;root.hidden=true;return;}
 root.hidden=false;$('sourceResultState').textContent='Searching connected Quran, Hadith and supplication sources…';$('sourceResults').innerHTML='';
 const mySeq=++sourceSequence;
 try{
  const params=new URLSearchParams({q});if(domain)params.set('domain',domain);
  const data=await api('/api/source-discovery?'+params);
  if(mySeq!==sourceSequence)return;
  // Provider snippets must directly contain every meaningful query word.
  // A keyword-index hit alone is not evidence about the user's actual concern.
  const words=q.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w.length>3&&!['have','with','about','please','prophetic','medicine','there','what','want'].includes(w));
  const items=(Array.isArray(data.results)?data.results:[]).filter(x=>{
    const body=(x.title+' '+x.excerpt+' '+x.reference).toLowerCase();
    return words.length>0&&words.every(w=>body.includes(w));
  }).slice(0,5);
  $('sourceResults').innerHTML=items.map(renderProviderResult).join('');
  const total=items.length,offline=(data.providers||[]).filter(p=>p.status==='temporarily_unavailable').map(p=>p.id);
  $('sourceResultState').textContent=total+' indexed source match(es) shown · fetched '+new Date(data.fetched_at).toLocaleString()+
    (offline.length?' · Unavailable: '+offline.join(', '):'')+
    (total===0?' · Search again with one clear subject word.':'');
 }catch(e){if(mySeq===sourceSequence)$('sourceResultState').textContent='Connected search unavailable: '+e.message;}
}
let refreshSequence=0;
async function refresh(){
 renderDiscipline();
 const seq=++refreshSequence;
 const params=new URLSearchParams();if(filters.domain)params.set('domain',filters.domain);if(filters.q)params.set('q',filters.q);if(filters.letter)params.set('letter',filters.letter);
 const heading=filters.domain?titles[filters.domain]:'All reference entries';
 $('indexHeading').textContent=heading;
 $('indexSubtitle').textContent=filters.q?'Results matching “'+filters.q+'”':'Follow subject pathways, alphabetic entries and cross-references.';
 $('loading').textContent='Retrieving referenced entries…';$('resultCount').textContent='Searching…';$('results').innerHTML='';renderAlphabet();
 sourceSequence++;$('federatedResults').hidden=true;
 const answerTask=window.QuranicallyAnswers.show(filters.q,filters.domain);
 try{
  const data=await api('/api/encyclopedia'+(params.size?'?'+params:''));
  if(seq!==refreshSequence)return;
  $('resultCount').textContent=data.entries.length+' ARTICLE'+(data.entries.length===1?'':'S');
  $('results').innerHTML=data.entries.map(entryCard).join('')||'<div class="loading">No matching indexed articles. The answer search above is checked separately.</div>';
  $('loading').textContent='';
 }catch(e){if(seq===refreshSequence)$('loading').textContent=e.message;}
 const matched=await answerTask;
 if(seq!==refreshSequence)return;
 if(matched){
  $('indexHeading').textContent='Additional encyclopedia results';
  $('indexSubtitle').textContent='The complete contextual response appears above. References and further reading follow.';
 }else if(filters.q){liveSources(filters.q,filters.domain);}
}
const typeNames={quran:'Quranic text',hadith:'Hadith collection',clinical:'Medical evidence',reference:'Reference corpus',classical:'Classical scholarship'};
function sectionHTML(s,i){
 const id='section-'+i;
 return '<section class="article-section" id="'+id+'"><span class="section-count">SECTION '+String(i+1).padStart(2,'0')+' / '+esc(s.section_type.replaceAll('_',' ').toUpperCase())+'</span><h2>'+esc(s.heading)+'</h2>'
  +s.body.split(/\n\n+/).filter(Boolean).map(p=>'<p>'+esc(p)+'</p>').join('')+'</section>';
}
function citationHTML(c,i){
 let url='';try{const parsed=new URL(c.source_url||'');if(parsed.protocol==='https:')url=parsed.href;}catch{}
 return '<div class="bib-row"><span class="bib-number">'+String(i+1).padStart(2,'0')+'.</span><div>'
 +'<strong>'+esc(c.source_title)+'</strong><div class="ref">'+esc(typeNames[c.citation_type]||c.citation_type)+' / '+esc(c.citation_ref)+'</div>'
 +(c.source_note?'<p>'+esc(c.source_note)+'</p>':'')
 +'<div class="review-status">Reference status: '+esc(c.verification_status.replaceAll('_',' '))+'</div></div>'
 +(url?'<a target="_blank" rel="noopener noreferrer" href="'+esc(url)+'">Inspect source '+ic('external')+'</a>':'')+'</div>';
}
async function openArticle(slug,writeHistory=true){
 if(!/^[a-z0-9-]{1,85}$/.test(slug))return;
 $('indexView').hidden=true;$('articleView').hidden=false;$('articleSections').textContent='Loading article…';$('articleCitations').textContent='';$('tocNav').textContent='';$('crumbSubject').textContent='Loading…';$('articleCrumbArrow').hidden=false;
 if(writeHistory)history.pushState({article:slug},'',linkFor(slug));
 window.scrollTo({top:0,behavior:'instant'});
 try{
 const {entry,sections,citations,related,passages=[]}=await api('/api/encyclopedia/'+encodeURIComponent(slug));selectedEntry=entry;
 const domain=titles[entry.domain]||entry.domain;
 $('crumbSubject').textContent=entry.title;
 $('articleSeries').textContent='QURANICALLY / '+domain.toUpperCase()+' / REFERENCE ARTICLE';
 $('articleTitle').textContent=entry.title;$('articleArabic').textContent=entry.arabic_title;
 $('articleSubtitle').textContent=entry.subtitle;$('articleAbstract').textContent=entry.abstract;
 $('articleMeta').innerHTML='<span>'+esc(domain)+'</span><span>'+esc(entry.review_status.replaceAll('_',' '))+'</span><span>'+sections.length+' sections</span><span>'+citations.length+' references</span>';
 const panel=$('primaryExcerpts');
 panel.hidden=passages.length===0;
 $('primaryExcerptContent').innerHTML=passages.map((p,i)=>'<figure class="transmitted-text"><blockquote class="arabic-source" lang="ar" dir="rtl">'+esc(p.arabic_excerpt)+'</blockquote>'
   +'<figcaption><span class="transmission-kind">'+esc(p.passage_type==='quran'?'Quranic excerpt':'Hadith excerpt')+' · '+esc(p.citation_ref)+'</span>'
   +'<p>'+esc(p.editorial_meaning)+'</p><small>'+esc(p.context_note)+' · Review: '+esc(p.review_status.replaceAll('_',' '))+'</small></figcaption></figure>').join('');
 $('articleSections').innerHTML=sections.map(sectionHTML).join('');
 $('tocNav').innerHTML=sections.map((s,i)=>'<a href="#section-'+i+'">'+String(i+1).padStart(2,'0')+' '+esc(s.heading)+'</a>').join('')+'<a href="#bibliography">Bibliography & provenance</a>';
 $('articleCitations').innerHTML=citations.map(citationHTML).join('');
 $('docCode').textContent='QUR / '+entry.slug.toUpperCase().replaceAll('-',' ');
 $('docDomain').textContent=domain;$('docReview').textContent=entry.review_status.replaceAll('_',' ');$('docSources').textContent=String(citations.length);
 $('relatedList').innerHTML=related.length?related.map(x=>'<a href="'+esc(linkFor(x.slug))+'" data-open="'+esc(x.slug)+'">'+esc(x.title)+ic('chevron')+'</a>').join(''):'<p class="toc-foot">Related articles are being catalogued.</p>';
 document.title=entry.title+' | Quranically Encyclopedia';
 }catch(e){selectedEntry=null;$('articleTitle').textContent='Entry unavailable';$('articleAbstract').textContent=e.message;$('articleSections').textContent='';$('articleMeta').textContent='';}
}
$('encyclopediaSearch').addEventListener('submit',event=>{
 event.preventDefault();
 const entered=$('query').value.trim();
 const ref=/^(?:quran\\s+)?(\\d{1,3}):(\\d{1,3})$/i.exec(entered);
 if(ref){
   const chapter=Number(ref[1]),ayah=Number(ref[2]);
   if(chapter>=1&&chapter<=114&&ayah>=1&&ayah<=286){
     location.assign('/study.html?surah='+chapter+'&ayah='+ayah);return;
   }
 }
 filters.q=entered;filters.letter='';
 history.pushState({},'',indexLink());refresh();document.getElementById('inlineAnswer').scrollIntoView({behavior:'smooth',block:'start'});
});
$('subjects').addEventListener('click',event=>{
 const b=event.target.closest('button[data-domain]');if(!b)return;filters.domain=b.dataset.domain;filters.letter='';filters.q='';$('query').value='';
 history.pushState({},'',indexLink());loadSubjects();refresh();$('results').scrollIntoView({behavior:'smooth'});
});
$('alphabet').addEventListener('click',event=>{
 const b=event.target.closest('button[data-letter]');if(!b)return;filters.letter=b.dataset.letter==='ALL'?'':b.dataset.letter;refresh();
});
document.addEventListener('click',event=>{
 const a=event.target.closest('a[data-open]');if(!a)return;event.preventDefault();openArticle(a.dataset.open);
});
$('backIndex').addEventListener('click',event=>{event.preventDefault();history.pushState({},'',indexLink());showIndex();});
$('printArticle').addEventListener('click',()=>window.print());
$('copyArticle').addEventListener('click',()=>{
 const url=location.href;navigator.clipboard?.writeText(url).then(()=>toast('Article link copied')).catch(()=>toast('Copy this page address from your browser'));
});
$('mobileMenu').addEventListener('click',()=>document.getElementById('navLinks').classList.toggle('expanded'));
function activeSlug(){const parts=location.pathname.split('/').filter(Boolean);return parts.length===2&&parts[0]==='encyclopedia'&&/^[a-z0-9-]{1,85}$/.test(parts[1])?parts[1]:null;}
window.addEventListener('popstate',()=>{
 const match=activeSlug();
 if(match){openArticle(match,false);}
 else{
  const qs=new URLSearchParams(location.search);filters.domain=titles[qs.get('domain')]?qs.get('domain'):'';filters.q=qs.get('q')||'';filters.letter='';showIndex();loadSubjects();
 }
});
const deep=activeSlug();
loadSubjects();loadDisciplinePages();renderAlphabet();
if(deep){openArticle(deep,false);}else{showIndex();}
})();