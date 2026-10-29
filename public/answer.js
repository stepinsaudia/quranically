// Quranically on-page answers: renders only Admin-managed canonical encyclopedia records.
(()=>{'use strict';
let sequence=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const href=v=>{try{const u=new URL(String(v||''));return u.protocol==='https:'?u.href:'';}catch{return '';}};
const section=s=>'<section class="qa-part"><h4>'+esc(s.heading)+'</h4>'+String(s.body||'').split(/\n\n+/).filter(Boolean).map(x=>'<p>'+esc(x)+'</p>').join('')+'</section>';
const citation=(x,i)=>'<li><span>['+(i+1)+']</span><div><strong>'+esc(x.source_title)+'</strong><small>'+esc(x.citation_ref)+' · Verification: '+esc(x.verification_status||'pending')+'</small>'+(x.source_note?'<p>'+esc(x.source_note)+'</p>':'')+'</div>'+(href(x.source_url)?'<a href="'+esc(href(x.source_url))+'" target="_blank" rel="noopener noreferrer">Inspect source</a>':'')+'</li>';
const passage=x=>'<div class="qa-passage"><div lang="ar" dir="rtl">'+esc(x.arabic_excerpt)+'</div><p>'+esc(x.editorial_meaning)+'</p><small>Text verification: '+esc(x.review_status||'pending')+'</small></div>';
async function show(q,domain){
 const root=document.getElementById('inlineAnswer'),content=document.getElementById('inlineAnswerBody');
 const id=++sequence;
 if(!q||q.trim().length<2){root.hidden=true;content.textContent='';return false;}
 root.hidden=false;content.innerHTML='<p class="qa-state">Retrieving a complete source-linked answer from Quranically…</p>';
 try{
  const params=new URLSearchParams({q});if(domain)params.set('domain',domain);
  let data={outcome:'no_editorial_answer',answer:null};
  try{
   const r=await fetch('/api/encyclopedia/answer?'+params,{headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)});
   if(r.ok)data=await r.json();
  }catch{/* The independent, source-only search below remains available. */}
  if(id!==sequence)return null;
  if(data.outcome!=='full_article_answer'||!data.answer){
    content.innerHTML='<div class="qa-kicker">QURANICALLY / CONNECTED KNOWLEDGE</div><h3>Searching the Qur’an, Sunnah and available reference material…</h3>';
    try{
      const url='/api/unified-search?'+new URLSearchParams({q});
      const result=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(19000)});
      if(!result.ok)throw Error('Search temporarily unavailable');
      const found=await result.json();if(id!==sequence)return null;
      const groups=[
        ['The Qur’an','quran'],['Sunnah & Hadith','hadith'],['Supplications','dua']
      ];
      const evidence=groups.map(([name,key])=>{
        const items=found.evidence?.[key]||[];
        if(!items.length)return '';
        return '<section class="qa-part"><h4>'+esc(name)+'</h4>'+items.map(x=>{
          const ref=String(x.reference||'');
          const verse=key==='quran'&&/^(\d{1,3}):(\d{1,3})$/.exec(ref);
          const jump=verse?'<a href="/study.html?surah='+Number(verse[1])+'&ayah='+Number(verse[2])+'">Read in Qur’an Reader</a>':'';
          const arabic=x.arabic?'<p lang="ar" dir="rtl" class="qst-arabic-verse">'+esc(x.arabic)+'</p>':'';
          const sourceLabel=x.translation?esc(x.translation):'Source index';
          const reported=x.reported_grade?' · Provider-reported grading: '+esc(x.reported_grade)+' (not independently checked)':'';
          const inspect=href(x.source_url)?'<a href="'+esc(href(x.source_url))+'" rel="noopener noreferrer" target="_blank">Inspect original source</a>':'';
          return '<article class="qst-evidence"><strong>'+esc(x.title||ref)+'</strong>'+arabic+'<p>'+esc(x.excerpt||'')+'</p><small>'+esc(ref)+' · '+sourceLabel+reported+' · external text pending Quranically review</small>'+jump+inspect+'</article>';
        }).join('')+'</section>';
      }).join('');
      const guidance=(found.guidance||[]).length?'<section class="qa-part"><h4>Living Guidance — sourced teachings and practical steps</h4>'+found.guidance.map(j=>{
        const refs=(j.evidence||[]).map(e=>'<li><strong>'+esc(e.title)+'</strong> — '+esc(e.meaning)+' <small>'+esc(e.reference)+' · '+esc(e.review_status||'review pending')+'</small>'+(href(e.source_url)?'<a href="'+esc(href(e.source_url))+'" rel="noopener noreferrer" target="_blank">Inspect source</a>':'')+'</li>').join('');
        const steps=(j.steps||[]).map(x=>'<li>'+esc(x.instruction)+'</li>').join('');
        return '<div class="qst-guidance-answer"><h5>'+esc(j.title)+'</h5><p>'+esc(j.summary)+'</p>'+(refs?'<h6>Referenced teachings</h6><ul>'+refs+'</ul>':'')+(steps?'<h6>Everyday application</h6><ol>'+steps+'</ol>':'')+(j.clinical_note?'<p class="qa-foot">'+esc(j.clinical_note)+'</p>':'')+'</div>';
      }).join('')+'</section>':'';
      const tibb=(found.tibb||[]).length?'<section class="qa-part"><h4>Prophetic Medicine — tradition, context and safety</h4>'+found.tibb.map(x=>'<article class="qst-evidence"><strong>'+esc(x.title)+'</strong><p>'+esc(x.tradition_summary)+'</p><p><b>Health context:</b> '+esc(x.health_context)+'</p><p><b>Safety:</b> '+esc(x.safety_note)+'</p><small>'+esc(x.reference_label)+' · Review: '+esc(x.review_stage)+'</small>'+(href(x.reference_url)?'<a target="_blank" rel="noopener noreferrer" href="'+esc(href(x.reference_url))+'">Inspect original reference</a>':'')+'</article>').join('')+'</section>':'';
      const groupsByDomain={seerah:'Seerah — the Prophet’s life',sunnah:'Sunnah — practice and explanation',quranic_themes:'Qur’anic context',living_guidance:'Living Guidance',prophetic_medicine:'Prophetic Medicine — source studies'};
      const referenceGroups=Object.entries(groupsByDomain).map(([key,label])=>{
        const records=(found.editorial||[]).filter(x=>x.domain===key);
        return records.length?'<section class="qa-part"><h4>'+esc(label)+'</h4>'+records.map(x=>'<p><a href="/encyclopedia/'+encodeURIComponent(x.slug)+'">'+esc(x.title)+'</a> — '+esc(x.abstract||'')+' <small>Editorial status: '+esc(x.review_status||'pending')+'</small></p>').join('')+'</section>':'';
      }).join('');
      const referenceNotice=found.quran_lookup?.status==='invalid_reference'?'<section class="qa-part"><h4>Qur’an reference not found</h4><p>The chapter and verse numbers do not identify a valid Qur’anic verse. Check the reference before following a link.</p></section>':found.quran_lookup?.status==='temporarily_unavailable'?'<p class="qa-foot">The connected Qur’an text search could not respond right now; the local evidence records may still be available.</p>':'';
      const hasAny=Boolean(referenceGroups||tibb||guidance||evidence);
      content.innerHTML='<div class="qa-kicker">QURANICALLY / CONNECTED KNOWLEDGE SEARCH</div><h3>'+esc(q)+'</h3><p class="qa-summary">Relevant source material is organised below. These are research references, not an automatically verified religious ruling or a medical recommendation.</p>'+referenceNotice+referenceGroups+guidance+tibb+evidence+'<p class="qa-foot">For religious rulings and treatment decisions, consult a qualified scholar or health professional as appropriate. Where source evidence is incomplete, Quranically does not invent an answer.</p>';
      if(!hasAny&&found.quran_lookup?.status!=='invalid_reference')content.innerHTML='<h3>No sufficiently relevant source found</h3><p>We have not verified an answer to '+esc(q)+'. Try a more specific term or a Qur’anic reference. This does not mean the subject is absent from Islam.</p>';
      return true; // The one answer panel owns empty states too; never open a duplicate source index.
    }catch(e){if(id!==sequence)return null;content.innerHTML='<h3>Connected search unavailable</h3><p>'+esc(e.message)+'</p>';}

    return false;
  }
  const a=data.answer;
  const related=(a.related||[]).map(x=>'<a data-open="'+esc(x.slug)+'" href="/encyclopedia/'+encodeURIComponent(x.slug)+'">'+esc(x.title)+'</a>').join('');
  const passages=(a.passages||[]).map(passage).join('');
  content.innerHTML='<div class="qa-kicker">QURANICALLY / COMPLETE ANSWER FROM THE LIVE ENCYCLOPEDIA</div>'
   +'<h3>'+esc(a.title)+'</h3><p class="qa-summary">'+esc(a.abstract)+'</p>'
   +'<div class="qa-badges"><span>'+esc(a.domain.replaceAll('_',' '))+'</span><span>'+esc(a.review_status.replaceAll('_',' '))+'</span><span>'+a.sections.length+' sections</span><span>'+a.citations.length+' sources</span></div>'
   +(passages?'<div class="qa-source"><h4>Original source text</h4>'+passages+'</div>':'')
   +'<div class="qa-chapters">'+a.sections.map(section).join('')+'</div>'
   +'<section class="qa-bibliography"><h4>References and evidence</h4><p>These are source links for independent examination; they do not replace the answer or establish clinical efficacy.</p><ol>'+a.citations.map(citation).join('')+'</ol></section>'
   +(related?'<div class="qa-related"><strong>Related reference articles</strong>'+related+'</div>':'')
   +'<div class="qa-foot"><a data-open="'+esc(a.slug)+'" href="/encyclopedia/'+encodeURIComponent(a.slug)+'">Open permanent article</a><small>Live D1 record managed in Quranically Admin. Scholarly or clinical review may still be pending.</small></div>';
  // A matching editorial article must not suppress other disciplines:
  // load complementary evidence without presenting provider snippets as validated answers.
  try{
    const response=await fetch('/api/unified-search?'+new URLSearchParams({q}),{headers:{accept:'application/json'},signal:AbortSignal.timeout(14000)});
    if(response.ok){
      const found=await response.json();if(id!==sequence)return null;
      const other=(found.editorial||[]).filter(x=>x.slug!==a.slug);
      const blocks=other.map(x=>'<p><a href="/encyclopedia/'+encodeURIComponent(x.slug)+'">'+esc(x.title)+'</a> — '+esc(x.abstract||'')+' <small>'+esc(x.review_status||'review pending')+'</small></p>').join('');
      const complementaryGuidance=(found.guidance||[]).map(j=>'<div class="qst-guidance-answer"><h5>'+esc(j.title)+'</h5><p>'+esc(j.summary)+'</p>'+(j.evidence||[]).map(e=>'<p>'+esc(e.meaning)+' <small>'+esc(e.reference)+' · '+esc(e.review_status||'pending')+'</small></p>').join('')+'</div>').join('');
      const matches=(found.tibb||[]).filter(x=>a.domain!=='prophetic_medicine'||!String(a.title).toLowerCase().includes(String(x.title).toLowerCase()));
      const medicines=matches.map(x=>'<article class="qst-evidence"><strong>'+esc(x.title)+'</strong><p>'+esc(x.tradition_summary)+'</p><p><b>Safety:</b> '+esc(x.safety_note)+'</p><small>'+esc(x.reference_label)+' · '+esc(x.review_stage)+'</small></article>').join('');
      const leads=[...(found.evidence?.quran||[]),...(found.evidence?.hadith||[])].slice(0,6).map(x=>{
        const match=x.kind==='quran'&&/^(\d{1,3}):(\d{1,3})$/.exec(String(x.reference||''));
        const reader=match?'<a href="/study.html?surah='+Number(match[1])+'&ayah='+Number(match[2])+'">Read in Qur’an Reader</a>':'';
        const arabic=x.arabic?'<p lang="ar" dir="rtl" class="qst-arabic-verse">'+esc(x.arabic)+'</p>':'';
        const grade=x.reported_grade?' · Provider-reported grade: '+esc(x.reported_grade)+' (unverified)':'';
        const inspect=href(x.source_url)?'<a href="'+esc(href(x.source_url))+'" rel="noopener noreferrer" target="_blank">Inspect original source</a>':'';
        return '<article class="qst-evidence"><strong>'+esc(x.title||x.reference)+'</strong>'+arabic+'<p>'+esc(x.excerpt||'')+'</p><small>'+esc(x.reference||'')+' · '+esc(x.translation||'Provider index')+grade+' · verification pending</small>'+reader+inspect+'</article>';
      }).join('');
      if(blocks||complementaryGuidance||medicines||leads)content.insertAdjacentHTML('beforeend','<section class="qa-part"><h4>Other relevant perspectives and source leads</h4>'+blocks+complementaryGuidance+medicines+leads+'</section>');
    }
  }catch{/* Preserve the complete, canonical article if secondary providers fail. */}
  return true;
 }catch(e){if(id!==sequence)return null;content.innerHTML='<h3>Answer service unavailable</h3><p>'+esc(e.message)+'. Please retry. We will not substitute unrelated source excerpts.</p>';return false;}
}
function clear(){sequence++;const el=document.getElementById('inlineAnswer');if(el)el.hidden=true;}
window.QuranicallyAnswers={show,clear};
})();