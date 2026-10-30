// Evidence-grounded answer overview. It extracts attributed, published text;
// it does not generate interpretation, fatwas, or individualized health advice.
const text=x=>typeof x==='string'?x.trim():'';
const first=(xs,n)=>Array.isArray(xs)?xs.filter(Boolean).slice(0,n):[];
export function composeSourceAnswer(question,{contextual_answers=[],guidance=[],evidence={},tibb=[],biomedical_evidence=[]}={}){
 const articles=first(contextual_answers,2);
 const sections=[];
 const citations=[];
 const seen=new Set();
 const cite=(kind,ref,url,source,review)=>{
  const key=kind+':'+ref;
  if(!ref||seen.has(key))return;
  seen.add(key);
  citations.push({kind,reference:ref,source_url:url||null,source:source||'',review_status:review||'source_not_independently_reviewed'});
 };
 let introduction='';
 if(articles.length){
  const a=articles[0];
  introduction=text(a.abstract);
  const parts=first(a.sections,3).map(s=>({heading:text(s.heading),text:text(s.body),origin:'canonical_editorial',review_status:a.review_status}));
  if(parts.length)sections.push({heading:'What the published encyclopedia explains',items:parts});
  for(const a of articles)for(const c of first(a.citations,8))
   cite(c.citation_type||'reference',text(c.citation_ref),c.source_url,c.source_title,c.verification_status);
 }
 const verses=first(evidence.quran,3).filter(x=>x.reference&&x.excerpt);
 if(verses.length){
  sections.push({heading:'Relevant Qur’anic passages',items:verses.map(v=>{
   cite('quran',v.reference,v.source_url,v.translation||v.provider,v.review_status);
   return {heading:'Qur’an '+v.reference,text:v.excerpt,origin:'attributed_translation',review_status:v.review_status};
  })});
 }
 const hadith=first(evidence.hadith,3).filter(x=>x.reference&&(x.original_hadith||x.excerpt));
 if(hadith.length){
  sections.push({heading:'Relevant Sunnah and Hadith records',items:hadith.map(h=>{
   cite('hadith',h.reference,h.source_url,h.provider,h.review_status);
   return {heading:text(h.title)||h.reference,text:text(h.original_hadith||h.excerpt),
    explanation:text(h.publisher_explanation),origin:h.publisher_explanation?'publisher_translation_and_explanation':'external_unverified_index',
    review_status:h.review_status||'unverified'};
  })});
 }
 const practices=first(guidance,2);
 if(practices.length){
  const steps=practices.flatMap(g=>first(g.steps,4).map(s=>({heading:g.title,text:text(s.instruction),origin:'published_editorial_guidance',review_status:g.review_policy}))).filter(x=>x.text);
  if(steps.length)sections.push({heading:'Practical guidance from published records',items:steps});
 }
 const medicines=first(tibb,2);
 if(medicines.length){
  sections.push({heading:'Prophetic Medicine: tradition and limits',items:medicines.map(m=>({
   heading:m.title,text:text(m.tradition_summary),
   explanation:[m.health_context,m.safety_note].filter(Boolean).join(' '),
   origin:'editorial_medicine_record',review_status:m.review_stage
  }))});
  for(const m of medicines)cite('prophetic_medicine',m.reference_label,m.reference_url,'Quranically Prophetic Medicine',m.review_stage);
 }
 if(!introduction){
  if(practices.length)introduction=text(practices[0].summary);
  else if(sections.length)introduction='Below are the relevant attributed source passages and explanations currently available. Their appearance does not establish a complete interpretation or religious ruling.';
  else introduction='No sufficiently relevant, sourced explanation is available for this question yet.';
 }
 const evidenceCount=sections.reduce((sum,s)=>sum+s.items.length,0);
 return {query:String(question||'').slice(0,95),type:articles.length?'editorial_with_primary_sources':evidenceCount?'source_first_evidence_brief':'insufficient_evidence',
  title:articles.length?articles[0].title:'Source-grounded response',introduction,sections,citations,
  sources_count:citations.length,source_items_count:evidenceCount,
  availability:{quran_verses:verses.length,hadith_records:hadith.length,editorial_articles:articles.length,practical_records:practices.length,medicine_records:medicines.length,biomedical_references:first(biomedical_evidence,6).length},
  reliability_notice:'Quoted translations, publisher explanations and reviewed editorial records have different evidence statuses. This is source retrieval, not automatic tafsir, fatwa, medical assessment or a new scholarly judgement.'};
}
