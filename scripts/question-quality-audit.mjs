// Quranically real-question quality audit against the isolated local Worker.
// The audit is diagnostic, not fabricated scholarly approval. It records source
// availability, evidence provenance, and topics that require more curation.
import fs from 'node:fs';
import {validVerse} from '../src/quran-search.mjs';
const base=process.env.QST_AUDIT_URL||'http://127.0.0.1:8799';
const questions=[
 {domain:'quranic_themes',q:'Where is Ayat al Kursi?',expect:'exact_verse'},
 {domain:'quranic_themes',q:'Show Quran 1:100',expect:'invalid_reference'},
 {domain:'quranic_themes',q:'What does Quran say about patience?',expect:'quran'},
 {domain:'quranic_themes',q:'Does Quran discuss riba?',expect:'quran'},
 {domain:'quranic_themes',q:'Where is Maryam mentioned?',expect:'quran'},
 {domain:'sunnah',q:'What hadith discuss honesty?'},
 {domain:'sunnah',q:'What did the Prophet teach about kindness?'},
 {domain:'sunnah',q:'What is Sunnah about backbiting?'},
 {domain:'sunnah',q:'How should Muslim men dress?',expect:'known_article'},
 {domain:'seerah',q:'How did men dress in the Seerah?',expect:'known_article'},
 {domain:'seerah',q:'What happened during the Hijrah?',expect:'known_article'},
 {domain:'seerah',q:'What happened at the Battle of Badr?',expect:'known_article'},
 {domain:'seerah',q:'How did the Prophet treat his neighbours?',expect:'known_article'},
 {domain:'seerah',q:'What did the Prophet wear?'},
 {domain:'prophetic_medicine',q:'I have diabetes: what does Prophetic Medicine say?',expect:'known_article'},
 {domain:'prophetic_medicine',q:'What does Hadith say about black seed?'},
 {domain:'prophetic_medicine',q:'What about honey for a cough?',expect:'known_article'},
 {domain:'prophetic_medicine',q:'What is hijama and is it safe?',expect:'known_article'},
 {domain:'prophetic_medicine',q:'Does Prophetic Medicine cure asthma?',expect:'known_article'},
 {domain:'living_guidance',q:'What Islamic guidance exists for anxiety?'},
 {domain:'living_guidance',q:'What should I do during hardship?'},
 {domain:'living_guidance',q:'How should I manage anger?',expect:'known_article'},
 {domain:'living_guidance',q:'What is repentance in Islam?',expect:'known_article'},
 {domain:'living_guidance',q:'What does Islam teach about family relationships?',expect:'known_article'}
];
function assert(c,m){if(!c)throw Error(m);}
async function inspect(item){
 const start=Date.now(),url=base+'/api/unified-search?'+new URLSearchParams({q:item.q,domain:item.domain});
 let result;
 try{
  const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(45000)});
  assert(response.ok,'HTTP '+response.status);
  const data=await response.json();
  const intro=data.answer_brief||{};
  const verses=data.evidence?.quran||[],hadith=data.evidence?.hadith||[];
  const reviewed=data.contextual_answers||[];
  for(const v of verses){
   const m=/^(\d{1,3}):(\d{1,3})$/.exec(String(v.reference||''));
   assert(m&&validVerse(Number(m[1]),Number(m[2])),'invalid Quran citation '+v.reference);
   assert(typeof v.source_url==='string'&&v.source_url.startsWith('https://'),'unattributed Quran result');
  }
  for(const h of hadith)assert(typeof h.source_url==='string'&&h.source_url.startsWith('https://'),'unattributed hadith result');
  assert(Array.isArray(intro.sections)&&Array.isArray(intro.citations),'missing structured answer');
  assert(intro.type==='insufficient_evidence'||intro.source_items_count>0,'invented evidence summary');
  if(item.expect==='known_article')assert(reviewed.length>0,'published editorial answer missing');
  if(item.expect==='invalid_reference')assert(data.quran_lookup?.status==='invalid_reference','nonexistent verse was accepted');
  if(item.expect==='quran')assert(verses.length>0,'full translation index did not retrieve passages');
  if(item.expect==='exact_verse')assert(verses.some(v=>v.reference==='2:255'),'named verse not found');
  const record={
   domain:item.domain,query:item.q,expect:item.expect||'source_discovery',
   answer_type:intro.type,
   quality_status:data.answer_quality?.status||'not_classified',
   quality_flags:data.answer_quality?.flags||[],
   editorial:reviewed.length,quran:verses.length,hadith:hadith.length,
   guidance:(data.guidance||[]).length,medicine:(data.tibb||[]).length,
   clinical_bibliography:(data.biomedical_evidence||[]).length,
   source_citations:intro.sources_count||0,
   source_items:intro.source_items_count||0,
   quran_status:data.quran_lookup?.status,
   hadeethenc_status:data.hadeethenc_lookup?.status,
   ms:Date.now()-start,
   gap:intro.type==='insufficient_evidence'?'NO_RELEVANT_SOURCED_ANSWER':
       reviewed.length===0&&hadith.length===0&&verses.length===0?'LIMITED_SOURCE_EXPLANATION':null
  };
  return record;
 }catch(e){return {domain:item.domain,query:item.q,expect:item.expect||'source_discovery',fatal:true,error:String(e.message||e),ms:Date.now()-start};}
}
const records=[];
for(let i=0;i<questions.length;i+=4){
 const batch=await Promise.all(questions.slice(i,i+4).map(inspect));
 records.push(...batch);
 console.log('CHECKED',records.length,'/',questions.length);
}
const summary={
 total:records.length,
 fatal:records.filter(x=>x.fatal).length,
 no_sourced_answer:records.filter(x=>x.gap==='NO_RELEVANT_SOURCED_ANSWER').length,
 published_reference_available:records.filter(x=>x.quality_status==='published_reference_available').length,
 source_leads_only:records.filter(x=>x.quality_status==='source_leads_only').length,
 seerah_unverified:records.filter(x=>x.quality_flags?.includes('historical_seerah_narrative_not_established')).length,
 clinical_efficacy_unverified:records.filter(x=>x.quality_flags?.includes('clinical_efficacy_not_established')).length,
 total_quran_references:records.reduce((a,x)=>a+(x.quran||0),0),
 total_hadith_references:records.reduce((a,x)=>a+(x.hadith||0),0),
 per_discipline:Object.fromEntries([...new Set(questions.map(q=>q.domain))].map(d=>[d,{
  tested:records.filter(x=>x.domain===d).length,
  sourced:records.filter(x=>x.domain===d&&!x.fatal&&x.answer_type!=='insufficient_evidence').length,
  gaps:records.filter(x=>x.domain===d&&!!x.gap).length,
  published:records.filter(x=>x.domain===d&&x.quality_status==='published_reference_available').length,
  leads:records.filter(x=>x.domain===d&&x.quality_status==='source_leads_only').length
 }]))
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/quranically-question-quality.json',JSON.stringify({scope:'local_preview_only_not_production',generated_utc:new Date().toISOString(),summary,records},null,2));
const markdown=[
 '# Quranically: Real-question evidence audit','',
 'Local preview only. Live source availability and relevance must be reviewed by editors. Source count is not a guarantee of religious correctness.','',
 '| Discipline | Questions | Published reference | Source leads only | Empty |',
 '| --- | ---: | ---: | ---: | ---: |',
 ...Object.entries(summary.per_discipline).map(([d,x])=>`| ${d} | ${x.tested} | ${x.published} | ${x.leads} | ${x.gaps} |`),
 '', '## Questions with missing evidence or test failures',
 ...records.filter(x=>x.gap||x.fatal).map(x=>`- **${x.domain}:** ${x.query}: ${x.error||x.gap}`),
 '', '## Full observed results',
 ...records.map(x=>`- ${x.domain}: ${x.query} — ${x.fatal?'FAILED '+x.error:'editorial='+x.editorial+', Quran='+x.quran+', Hadith='+x.hadith+', Tibb='+x.medicine+', guidance='+x.guidance+', biomedical='+x.clinical_bibliography+', answer='+x.answer_type+', quality='+x.quality_status}`)
].join('\n');
fs.writeFileSync('artifacts/quranically-question-quality.md',markdown);
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown);
console.log('QUALITY AUDIT',JSON.stringify(summary));
// Hard failures are limited to broken API, unsupported/invalid Quran references,
// broken source attribution, and previously known real-world editorial answers.
if(summary.fatal)throw Error(summary.fatal+' evidence integrity / API checks failed; see audit artifact.');
