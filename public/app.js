(() => {
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(id)=>`<svg aria-hidden="true"><use href="#i-${id}"></use></svg>`;
const SIZES=[7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
const storageKey='livingquran:v1:';
let topic=null,allJourneys=[],saved=[],toastTimer=null;
try{saved=JSON.parse(localStorage.getItem(storageKey+'saved')||'[]');if(!Array.isArray(saved))saved=[];}catch(e){saved=[];}
const label=e=>({quran:'Quranic revelation',seerah:'Seerah • lived example',sunnah:'Authenticated Sunnah',dua:'Prophetic supplication',tibb:'Tibb al-Nabawi',clinical:'Modern medical evidence'})[e.evidence_type]||'Source evidence';
function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3200);}
function refToNumber(ref){const m=/^(\d{1,3}):(\d{1,3})$/.exec(ref||'');if(!m)return null;const s=+m[1],a=+m[2];if(s<1||s>114||a<1||a>SIZES[s-1])return null;return SIZES.slice(0,s-1).reduce((sum,n)=>sum+n,0)+a;}
const sourceLink=e=>{const u=String(e.source_url||e.source_home||'');return /^https:\/\//.test(u)?`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Inspect source ${icon('external')}</a>`:'';};
function renderEvidence(e){
 const arabic=e.arabic?`<div class="verse-arabic" dir="rtl" lang="ar">${esc(e.arabic)}</div>`:'';
 const trans=e.transliteration?`<div class="transliteration">${esc(e.transliteration)}</div>`:'';
 const num=e.evidence_type==='quran'?refToNumber(e.reference):null;
 const play=num?`<button type="button" class="play-btn" data-play="${num}" data-label="${esc(e.reference)}">${icon('volume')} Listen to this Ayah</button>`:'';
 return `<section class="evidence-block ${e.evidence_type==='dua'?'dua':e.evidence_type==='quran'?'quran':'story'}" id="${esc(e.id)}"><div class="evidence-top"><span class="evidence-kind">${esc(label(e))}</span><span class="evidence-ref">${esc(e.reference)}</span></div>${e.evidence_type==='quran'?'':`<h4 class="evidence-title">${esc(e.title)}</h4>`}${arabic}${trans}${e.meaning?`<div class="meaning">${esc(e.meaning)}</div>`:''}${e.explanation?`<div class="commentary">${esc(e.explanation)}</div>`:''}<div class="citation-bar"><span>${esc(e.source_organization||e.source_title||'Original reference')} · ${esc(e.source_grade||'Reference available')}</span><div>${play}${sourceLink(e)}</div></div>${e.review_status==='editorial_pending'?`<div class="review-meta">Editorial pilot: verify the original reference, wording, translation and context before authoritative use.</div>`:''}</section>`;
}
function partition(list,key){return list.filter(e=>key.includes(e.evidence_type));}
function setOrEmpty(id,data,word){$(id).innerHTML=data.length?data.map(renderEvidence).join(''):`<div class="empty-type">No approved ${esc(word)} has been linked to this topic yet. We will not invent a connection.</div>`;}
function refreshSaved(){$('savedNum').textContent=saved.length;if(!topic)return;$('saveBtn').innerHTML=(saved.includes(topic.journey.slug)?icon('check'):icon('bookmark'))+(saved.includes(topic.journey.slug)?' Saved to collection':' Save this journey');}
function saveNote(){if(!topic)return;try{localStorage.setItem(storageKey+'notes:'+topic.journey.slug,$('myNotes').value);$('noteStatus').textContent='Saved on this device';}catch(e){$('noteStatus').textContent='Could not save on this device';}}
function drawSteps(){let done=[];try{done=JSON.parse(localStorage.getItem(storageKey+'steps:'+topic.journey.slug)||'[]');}catch(e){}const set=new Set(done);$('stepsContent').innerHTML=`<div class="practice-list">${topic.steps.map(s=>`<div class="practice-item ${set.has(s.id)?'checked':''}"><input type="checkbox" id="cb-${esc(s.id)}" data-step="${esc(s.id)}" ${set.has(s.id)?'checked':''}><label for="cb-${esc(s.id)}">${esc(s.instruction)}</label></div>`).join('')}</div>`;}
async function loadJourney(slug){
 const msg=$('statusMessage');msg.hidden=false;msg.textContent='Retrieving original references and source details…';$('journeyGrid').hidden=true;
 try{
  const r=await fetch('/api/journey/'+encodeURIComponent(slug));if(!r.ok)throw new Error(r.status===404?'This topic has not been published yet.':'The source database is unavailable.');
  topic=await r.json();const j=topic.journey;document.title=j.title+' | Quran • Seerah • Living Guidance';
  $('journeyTitle').textContent=j.title;$('journeySummary').textContent=j.summary;
  setOrEmpty('quranContent',partition(topic.evidence,['quran']),'Quranic evidence');
  setOrEmpty('seerahContent',partition(topic.evidence,['seerah','sunnah']),'Seerah narration');
  setOrEmpty('guidanceContent',partition(topic.evidence,['dua','tibb','clinical']),'supplication or clinical reference');
  $('clinicalNote').textContent=j.clinical_note||'Educational material; seek qualified advice for specialized religious, medical or legal questions.';
  drawSteps();try{$('myNotes').value=localStorage.getItem(storageKey+'notes:'+j.slug)||'';}catch(e){$('myNotes').value='';}
  $('noteStatus').textContent='Saved automatically on this device';
  refreshSaved();msg.hidden=true;$('journeyGrid').hidden=false;
 }catch(e){msg.textContent=e.message||'Could not retrieve source data.';}
}
async function search(q){const word=q.trim();if(!word){loadJourney('hardship');return;}
 const msg=$('statusMessage');msg.hidden=false;msg.textContent='Searching approved topics…';
 try{const r=await fetch('/api/journeys?q='+encodeURIComponent(word));if(!r.ok)throw new Error('Search unavailable');const data=await r.json();
  if(data.journeys.length===0){msg.textContent='No approved answer exists yet for this query. Try hardship, anxiety, grief or debt. The engine does not invent religious evidence.';return;}
  if(data.journeys.length===1){await loadJourney(data.journeys[0].slug);$('journey').scrollIntoView({behavior:'smooth'});return;}
  msg.innerHTML='<strong>Choose a topic:</strong> '+data.journeys.map(j=>`<button class="search-result" data-open="${esc(j.slug)}" type="button">${esc(j.title)}</button>`).join(' ');
  $('journey').scrollIntoView({behavior:'smooth'});
 }catch(e){msg.textContent='Search is temporarily unavailable.';}}
async function loadCatalog(){try{const r=await fetch('/api/journeys');if(r.ok)allJourneys=(await r.json()).journeys;}catch(e){}try{const r=await fetch('/api/sources');if(!r.ok)throw Error('Sources unavailable');const s=(await r.json()).sources;$('sourceList').innerHTML=s.map(x=>`<div class="source-record"><strong>${esc(x.title)}</strong><small>${esc(x.organization)} · ${esc(x.source_type)}</small><em>${esc(x.use_policy.replace('_',' '))} · ${esc(x.review_status.replace('_',' '))}</em><a href="${esc(x.source_url)}" target="_blank" rel="noopener noreferrer">Inspect original provider</a></div>`).join('');}catch(e){$('sourceList').textContent='The source registry will appear when the new D1 database is initialized.';}}
function audioPlay(num,lbl){const player=$('audio');const src=`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${num}.mp3`;const dock=$('audioDock');dock.hidden=false;player.src=src;$('audioTitle').textContent='Ayah '+lbl;player.play().catch(()=>notify('Tap the audio controls to play if autoplay is blocked.'));}
function offlineHTML(){
 const j=topic.journey;const sections=[['Quran',partition(topic.evidence,['quran'])],['Seerah and Sunnah',partition(topic.evidence,['seerah','sunnah'])],['Dua and wellbeing',partition(topic.evidence,['dua','tibb','clinical'])]];
 return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(j.title)}</title><style>body{margin:38px auto;max-width:820px;font:15px/1.75 Georgia,serif;color:#2d2026}h1{font-size:40px;color:#4e1832;border-bottom:4px solid #167697;padding-bottom:18px}h2{font-size:26px;color:#4e1832}h3{font-size:19px}.arabic{text-align:right;direction:rtl;font:30px/2.3 'Amiri Quran','Amiri',serif;color:#532b43}.entry{border-bottom:1px solid #e4dbd1;padding:16px 0;break-inside:avoid}.ref{color:#116f9a;font-weight:bold}small{color:#7e6668}a{color:#116f9a}.note{padding:12px;border-left:4px solid #ad8656;background:#fff5e8}@media print{a{color:inherit}}</style></head><body><small>QURAN • SEERAH • LIVING GUIDANCE | SOURCE-GROUNDED EDITORIAL PILOT</small><h1>${esc(j.title)}</h1><p>${esc(j.summary)}</p>${sections.map(([name,records])=>`<h2>${esc(name)}</h2>${records.map(e=>`<div class="entry"><strong>${esc(e.title)}</strong> <span class="ref">${esc(e.reference)}</span>${e.arabic?`<div class="arabic" lang="ar">${esc(e.arabic)}</div>`:''}${e.transliteration?`<p><em>${esc(e.transliteration)}</em></p>`:''}<p>${esc(e.meaning)}</p><p>${esc(e.explanation)}</p><small>Source: ${esc(e.source_organization||e.source_title||'')} | Editorial status: ${esc(e.review_status)}</small><p><a href="${esc(e.source_url)}">${esc(e.source_url)}</a></p></div>`).join('')}`).join('')}<h2>Practical reflections</h2><ol>${topic.steps.map(s=>`<li>${esc(s.instruction)}</li>`).join('')}</ol><p class="note">${esc(j.clinical_note||'Not a medical treatment or fatwa.')} Source texts and translations require scholarly review. Personal notes are intentionally not included.</p></body></html>`;
}
function downloadOffline(){const file=new Blob([offlineHTML()],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='living-quran-guidance-'+topic.journey.slug+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);notify('Self-contained guidance sheet downloaded, with references.');}
async function share(){const j=topic.journey,refs=topic.evidence.map(e=>e.reference).join(', '),message=`${j.title}\nQuran • Seerah • Living Guidance\nReferences: ${refs}\n${location.origin}/?topic=${encodeURIComponent(j.slug)}`;try{if(navigator.share)await navigator.share({title:j.title,text:message,url:location.origin+'/?topic='+j.slug});else{await navigator.clipboard.writeText(message);notify('References and link copied for sharing.');}}catch(e){if(e.name!=='AbortError')notify('Sharing could not be started.');}}
$('searchForm').addEventListener('submit',e=>{e.preventDefault();search($('query').value);});
$('suggestions').addEventListener('click',e=>{const b=e.target.closest('[data-topic]');if(b){$('query').value=b.textContent;loadJourney(b.dataset.topic);$('journey').scrollIntoView({behavior:'smooth'});}});
$('statusMessage').addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)loadJourney(b.dataset.open)});
$('reading-grid');
document.addEventListener('click',e=>{const p=e.target.closest('[data-play]');if(p)audioPlay(p.dataset.play,p.dataset.label)});
$('stepsContent').addEventListener('change',e=>{const el=e.target;if(!el.dataset.step)return;let done=[];try{done=JSON.parse(localStorage.getItem(storageKey+'steps:'+topic.journey.slug)||'[]');}catch(e){}const s=new Set(done);el.checked?s.add(el.dataset.step):s.delete(el.dataset.step);try{localStorage.setItem(storageKey+'steps:'+topic.journey.slug,JSON.stringify([...s]));}catch(e){}drawSteps();});
$('myNotes').addEventListener('input',saveNote);
$('clearNotes').addEventListener('click',()=>{$('myNotes').value='';saveNote()});
$('saveBtn').addEventListener('click',()=>{if(!topic)return;const slug=topic.journey.slug;if(saved.includes(slug))saved=saved.filter(s=>s!==slug);else saved.push(slug);try{localStorage.setItem(storageKey+'saved',JSON.stringify(saved));}catch(e){}refreshSaved();notify(saved.includes(slug)?'Saved to this device.':'Removed from saved collection.');});
$('collectionBtn').addEventListener('click',()=>{if(!saved.length){notify('No saved topics yet. Save a journey to keep it here.');return;}const options=saved.map(s=>allJourneys.find(j=>j.slug===s)?.title||s);const pick=window.prompt('Your saved topics:\n'+options.map((x,i)=>`${i+1}. ${x}`).join('\n')+'\nEnter a number to open:');const n=Number(pick);if(Number.isInteger(n)&&n>=1&&n<=saved.length)loadJourney(saved[n-1]);});
$('downloadBtn').addEventListener('click',()=>topic&&downloadOffline());$('printBtn').addEventListener('click',()=>topic&&window.print());$('shareBtn').addEventListener('click',()=>topic&&share());
$('audioClose').addEventListener('click',()=>{$('audio').pause();$('audio').removeAttribute('src');$('audioDock').hidden=true;});
$('audioToggle').addEventListener('click',()=>{const a=$('audio');a.paused?a.play().catch(()=>{}):a.pause();});
(async()=>{await loadCatalog();const slug=new URLSearchParams(location.search).get('topic');await loadJourney(/^[a-z0-9-]+$/.test(slug||'')?slug:'hardship');refreshSaved();})();
})();
