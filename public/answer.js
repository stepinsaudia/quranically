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
  const r=await fetch('/api/encyclopedia/answer?'+params,{headers:{accept:'application/json'},signal:AbortSignal.timeout(18000)});
  if(!r.ok)throw Error('The knowledge database is temporarily unavailable');
  const data=await r.json();if(id!==sequence)return null;
  if(data.outcome!=='full_article_answer'||!data.answer){
    content.innerHTML='<div class="qa-kicker">QURANICALLY / ANSWER SEARCH</div><h3>No complete article for this specific question yet</h3><p>We could not establish a relevant, source-backed response for “'+esc(q)+'”. We will not invent a cure, ruling or unrelated answer. You can examine any separately identified research references below.</p>';
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
  return true;
 }catch(e){if(id!==sequence)return null;content.innerHTML='<h3>Answer service unavailable</h3><p>'+esc(e.message)+'. Please retry. We will not substitute unrelated source excerpts.</p>';return false;}
}
function clear(){sequence++;const el=document.getElementById('inlineAnswer');if(el)el.hidden=true;}
window.QuranicallyAnswers={show,clear};
})();