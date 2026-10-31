// One source-governed learning presentation for Qur'an themes, Hadith, Seerah and Living Guidance.
// Literal source teachings and contextual applications are distinct; never generate missing instructions.
(()=>{'use strict';
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safe=v=>{try{const u=new URL(String(v||''));return u.protocol==='https:'?u.href:''}catch{return ''}};
 const families={
  quranic_themes:{eyebrow:'QUR’AN / REFLECT WITH CONTEXT',title:'From revelation to understanding',first:'What the cited verse teaches',second:'How to read and understand it',third:'A responsible reflection and action',fourth:'Example in ordinary life',limit:'What this verse does not automatically establish'},
  sunnah:{eyebrow:'SUNNAH / FROM REPORT TO PRACTICE',title:'What was taught — and how to apply it',first:'What the report actually states',second:'Transmission and interpretive context',third:'Practical conduct today',fourth:'A real-world example',limit:'Limits, conditions and exceptions'},
  seerah:{eyebrow:'SEERAH / HISTORY INTO CHARACTER',title:'Learn from the life of the Prophet ﷺ',first:'What the historical sources establish',second:'The circumstances and what can be inferred',third:'A lesson for responsible conduct',fourth:'A contemporary reflection',limit:'What must not be generalized'},
  living_guidance:{eyebrow:'LIVING GUIDANCE / EVIDENCE INTO ACTION',title:'How to respond in everyday life',first:'The Qur’anic or Prophetic foundation',second:'What it means in context',third:'Practical next steps',fourth:'Illustrative everyday situation',limit:'When personal scholarly or professional guidance is needed'}
 };
 function render(g,domain){
  const d=families[domain];if(!d)return '';
  if(!g)return '<section class="qst-lived-knowledge qst-lived-empty"><p class="qst-lived-kicker">'+escape(d.eyebrow)+'</p><h2>Daily-life application awaits source review</h2><p>This article has references, but no separate source-grounded learning guide has been published. Do not infer a prescription, ruling or universal Sunnah practice from a brief summary.</p></section>';
  const link=safe(g.source_url),review=String(g.review_status||'pending').replaceAll('_',' ');
  const row=(label,body,n)=>body?'<div class="qst-lived-step"><span class="qst-lived-index">'+n+'</span><div><h3>'+escape(label)+'</h3><p>'+escape(body)+'</p></div></div>':'';
  return '<section class="qst-lived-knowledge" aria-label="Authenticity and practical learning">'+
   '<p class="qst-lived-kicker">'+escape(d.eyebrow)+'</p><h2>'+escape(d.title)+'</h2>'+
   '<p class="qst-lived-review">Editorial interpretation · Independent scholarly review: '+escape(review)+'. Optional examples are not new prescribed Sunnah rituals or legal fatwas.</p>'+
   row(d.first,g.source_teaching,'01')+row(d.second,g.how_to_understand,'02')+
   row(d.third,g.everyday_application,'03')+row(d.fourth,g.everyday_example,'04')+
   row(d.limit,g.boundaries,'05')+
   (g.interpretation_notes?'<p class="qst-lived-differences"><strong>Interpretive differences / further scholarship:</strong> '+escape(g.interpretation_notes)+'</p>':'')+
   '<div class="qst-lived-citation"><strong>Primary canonical reference:</strong> '+escape(g.source_title||'Original source')+' · '+escape(g.citation_ref||'')+
   (link?' <a href="'+escape(link)+'" target="_blank" rel="noopener noreferrer">Inspect original source</a>':'')+
   ' <small>Primary evidence type: '+escape(g.citation_type||'source')+'</small></div></section>';
 }
 window.QuranicallyLearning={render};
})();
