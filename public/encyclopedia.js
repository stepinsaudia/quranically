(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ic=name=>'<svg aria-hidden="true"><use href="#e-'+name+'"></use></svg>';
const titles={prophetic_medicine:'Prophetic Medicine',quranic_themes:'Quranic Themes',sunnah:'Sunnah & Hadith',seerah:'Seerah & Biography',living_guidance:'Living Guidance'};
const domains=[['','All disciplines'],...Object.entries(titles)];
let filters={domain:new URLSearchParams(location.search).get('domain')||'',q:new URLSearchParams(location.search).get('q')||'',letter:''};
if(!titles[filters.domain])filters.domain='';
let selectedEntry=null;
function toast(m){const t=$('toast');t.textContent=m;t.hidden=false;setTimeout(()=>t.hidden=true,2600);}
async function api(url){const r=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(18000)});let o;try{o=await r.json()}catch{throw Error('The reference service is unavailable.')}if(!r.ok)throw Error(o.error||'Reference request failed');return o;}
function indexLink(){const u=new URL('/encyclopedia',location.origin);if(filters.domain)u.searchParams.set('domain',filters.domain);if(filters.q)u.searchParams.set('q',filters.q);return u.pathname+u.search;}
function linkFor(slug){return '/encyclopedia/'+encodeURIComponent(slug);}
function showIndex(){selectedEntry=null;$('articleView').hidden=true;$('indexView').hidden=false;$('articleCrumbArrow').hidden=true;$('crumbSubject').textContent='Reference index';document.title='Quranically | The Islamic Reference Encyclopedia';$('query').value=filters.q;window.scrollTo({top:0,behavior:'instant'});refresh();}
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
async function refresh(){
 const params=new URLSearchParams();if(filters.domain)params.set('domain',filters.domain);if(filters.q)params.set('q',filters.q);if(filters.letter)params.set('letter',filters.letter);
 const heading=filters.domain?titles[filters.domain]:'All reference entries';
 $('indexHeading').textContent=heading;
 $('indexSubtitle').textContent=filters.q?'Results matching “'+filters.q+'”':'Follow subject pathways, alphabetic entries and cross-references.';
 $('loading').textContent='Retrieving referenced entries…';$('resultCount').textContent='Searching…';$('results').innerHTML='';renderAlphabet();
 try{
  const data=await api('/api/encyclopedia'+(params.size?'?'+params:''));
  $('resultCount').textContent=data.entries.length+' ARTICLE'+(data.entries.length===1?'':'S');
  $('results').innerHTML=data.entries.map(entryCard).join('')||'<div class="loading">No entries match these filters. Try the A–Z index or browse a different discipline.</div>';
  $('loading').textContent='';
 }catch(e){$('loading').textContent=e.message;}
}
const typeNames={quran:'Quranic text',hadith:'Hadith collection',clinical:'Medical evidence',reference:'Reference corpus',classical:'Classical scholarship'};
function sectionHTML(s,i){
 const id='section-'+i;
 return '<section class="article-section" id="'+id+'"><span class="section-count">SECTION '+String(i+1).padStart(2,'0')+' / '+esc(s.section_type.replaceAll('_',' ').toUpperCase())+'</span><h2>'+esc(s.heading)+'</h2>'
  +s.body.split(/\n\n+/).filter(Boolean).map(p=>'<p>'+esc(p)+'</p>').join('')+'</section>';
}
function citationHTML(c,i){
 const url=/^https:\/\/[^\s"<>]+$/.test(c.source_url||'')?c.source_url:'';
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
 const {entry,sections,citations,related}=await api('/api/encyclopedia/'+encodeURIComponent(slug));selectedEntry=entry;
 const domain=titles[entry.domain]||entry.domain;
 $('crumbSubject').textContent=entry.title;
 $('articleSeries').textContent='QURANICALLY / '+domain.toUpperCase()+' / REFERENCE ARTICLE';
 $('articleTitle').textContent=entry.title;$('articleArabic').textContent=entry.arabic_title;
 $('articleSubtitle').textContent=entry.subtitle;$('articleAbstract').textContent=entry.abstract;
 $('articleMeta').innerHTML='<span>'+esc(domain)+'</span><span>'+esc(entry.review_status.replaceAll('_',' '))+'</span><span>'+sections.length+' sections</span><span>'+citations.length+' references</span>';
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
 event.preventDefault();filters.q=$('query').value.trim();filters.letter='';
 history.pushState({},'',indexLink());refresh();document.getElementById('indexView').scrollIntoView({behavior:'smooth'});
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
window.addEventListener('popstate',()=>{
 const match=location.pathname.match(/^\/encyclopedia\/([a-z0-9-]+)\/?$/);
 if(match){openArticle(match[1],false);}
 else{
  const qs=new URLSearchParams(location.search);filters.domain=titles[qs.get('domain')]?qs.get('domain'):'';filters.q=qs.get('q')||'';filters.letter='';showIndex();loadSubjects();
 }
});
const deep=location.pathname.match(/^\/encyclopedia\/([a-z0-9-]+)\/?$/);
loadSubjects();renderAlphabet();
if(deep){openArticle(deep[1],false);}else{showIndex();}
})();