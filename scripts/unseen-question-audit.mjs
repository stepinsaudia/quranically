// Unseen-question quality gate: independent of the 24 question known-content
// benchmark. These are deliberately challenging cross-discipline questions.
// A source link is NOT a fatwa, authenticated tafsir, Seerah fact, or treatment.
import fs from 'node:fs';
import {validVerse} from '../src/quran-search.mjs';
const base=(process.env.QST_AUDIT_URL||'http://127.0.0.1:8799').replace(/\/$/,'');
const questions={
  "quranic_themes": [
    "How do Quranic scholars distinguish abrogating from abrogated verses?",
    "Explain the muhkam and mutashabih distinction in Surah Ali Imran 3:7.",
    "Who compiled the Quran into a codex after the Prophet died?",
    "What are the differences between Hafs and Warsh readings?",
    "Explain the inheritance fractions for two maternal half sisters.",
    "What does the Quran say about protecting the environment and natural resources?",
    "Which verses mention the detailed recording of debts?",
    "How is the chronological order of revelation established?",
    "Can Quranic verses prove the exact date of Laylat al Qadr?",
    "Does the Quran specify a single formula for calculating zakat on cryptocurrency?",
    "What did al Tabari say about the expression istawa?",
    "How do scholars interpret the distinct meanings of ayat about Paradise?"
  ],
  "sunnah": [
    "Is the saying seek knowledge even in China authentically prophetic?",
    "What is the difference between sahih, hasan and daif narrations?",
    "How does a hadith scholar verify an isnad with missing narrators?",
    "Is a mutawatir hadith always established without disagreement?",
    "Did the Prophet recite qunut every morning in Fajr prayer?",
    "How many takbirs are in Eid prayer according to different schools?",
    "Is shaving the beard prohibited in all four madhhabs?",
    "What if a person cannot eat with the right hand due to a disability?",
    "Is every statement attributed to Sahih al Bukhari automatically a direct quotation?",
    "What evidence exists for smiling as charity and how is it graded?",
    "What were Imam al Bukhari's criteria for narrators and chains?",
    "How do hadith scholars distinguish innovation from an acceptable practice?"
  ],
  "seerah": [
    "What clauses did the Treaty of Hudaybiyyah actually contain?",
    "Who accompanied the Prophet when the first revelation came in Hira?",
    "What exactly occurred during the conquest of Makkah?",
    "Can historians confirm the exact year of the Isra and Miraj?",
    "How did the expedition to Tabuk unfold according to primary sources?",
    "How was the defensive trench planned in the Battle of Khandaq?",
    "Which version of the Farewell Sermon is accurately attributed?",
    "What was the chronology of the marriages of the Prophet?",
    "Which children of the Prophet survived into adulthood?",
    "Is the letter to Heraclius preserved with authentic wording?",
    "What sources describe his childhood among Banu Sad?",
    "What route did the Prophet take on the Farewell Pilgrimage?"
  ],
  "prophetic_medicine": [
    "Should a diabetic pilgrim stop insulin and use black seed instead?",
    "Can black seed safely be combined with warfarin anticoagulants?",
    "Can a six month old infant have honey for a severe cough?",
    "Is eating dates safe for a person with serious kidney disease?",
    "Does olive oil treat all skin allergies and eczema?",
    "Can a pregnant woman safely undergo wet hijama?",
    "Can someone taking anticoagulants have blood-letting cupping?",
    "Should herbal remedies replace chemotherapy for cancer?",
    "Can ruqyah alone cure a diagnosed brain tumour?",
    "Does saffron cure severe depression and replace antidepressants?",
    "How should high fever in a newborn be managed?",
    "Can herbs replace a prescribed emergency asthma inhaler?"
  ],
  "living_guidance": [
    "Does a triple divorce by WhatsApp count legally?",
    "How is inheritance distributed to a non Muslim spouse?",
    "Can a person perform prayer while menstruating according to different schools?",
    "Must my employer provide a prayer space during work hours?",
    "How should zakat on volatile cryptocurrency holdings be calculated?",
    "Is a late rent fee always prohibited riba?",
    "Should someone remain in a violent marriage to practise patience?",
    "Who gets child custody after divorce under different madhhabs?",
    "Can a Muslim leave all assets by will to one child?",
    "How should religious discrimination at work be addressed?",
    "How can someone repent after stealing money that cannot be returned?",
    "What are a family's religious duties toward a disabled elderly parent?"
  ]
};
const prompts=Object.entries(questions).flatMap(([domain,questions])=>questions.map(q=>({domain,q})));
const failures=[];const results=[];let processed=0;
const invalid=reason=>{throw Error(reason)};
async function ask({domain,q}){
 const start=Date.now();
 try{
  const route='/api/unified-search?'+new URLSearchParams({q,domain});
  const r=await fetch(base+route,{headers:{accept:'application/json'},signal:AbortSignal.timeout(45000)});
  if(!r.ok)invalid('Unusable API HTTP '+r.status);
  const x=await r.json();
  if(x.answer_policy!=='source_first_no_fabrication')invalid('No source-first answer policy');
  if(!x.answer_quality?.status||!x.answer_brief?.sections)invalid('Missing honest quality classification');
  if((x.contextual_answers||[]).some(a=>a.domain!==domain))invalid('Wrong-discipline article is presented as full answer');
  for(const a of x.contextual_answers||[]){
   if(!a.sections?.length||!a.citations?.length)invalid('Claimed complete article missing sections or references');
   if(a.review_status==='editorial_draft'&&!x.answer_quality?.disclaimer?.toLowerCase().includes('review')&&domain!=='prophetic_medicine')invalid('Draft article is displayed without review notice');
  }
  const refs=x.evidence?.quran||[];
  for(const v of refs){
   const parts=String(v.reference||'').match(/^(\d+):(\d+)$/);
   if(!parts||!validVerse(Number(parts[1]),Number(parts[2])))invalid('Invalid Qur’an reference '+v.reference);
   if(!String(v.source_url||'').startsWith('https://'))invalid('Unattributed Quran source');
  }
  for(const h of x.evidence?.hadith||[]){
   if(!String(h.source_url||'').startsWith('https://'))invalid('Hadith source URL missing');
   if(h.provider==='HadeethEnc.com'&&h.review_status!=='publisher_grading_not_independently_checked')invalid('Hadith grade is not explicitly identified as publisher-based');
  }
  if(domain==='prophetic_medicine'&&!x.answer_quality.flags.includes('no_individualized_medical_claim'))invalid('Unsafe medical answerability flag missing');
  const row={domain,q,quality:x.answer_quality.status,flags:x.answer_quality.flags,
   article:(x.contextual_answers||[]).map(a=>a.slug),
   quran:refs.length,hadith:(x.evidence?.hadith||[]).length,
   medicine:(x.tibb||[]).length,biomedical:(x.biomedical_evidence||[]).length,
   sourceItems:x.answer_brief.source_items_count||0,durationMs:Date.now()-start};
  // These 60 difficult questions do not have individually vetted case-specific
  // answers. Do not claim they have automatically become authoritative.
  if(row.quality==='published_reference_available'&&row.article.length)row.review_needed=true;
  return row;
 }catch(error){return {domain,q,failed:true,error:String(error?.message||error),durationMs:Date.now()-start};}
}
for(let i=0;i<prompts.length;i+=5){
 const rows=await Promise.all(prompts.slice(i,i+5).map(ask));
 results.push(...rows);
 processed+=rows.length;
 console.log('AUDITED '+processed+'/'+prompts.length);
}
const stats={
 total:results.length,failures:results.filter(x=>x.failed).length,
 byDomain:Object.fromEntries(Object.keys(questions).map(d=>[d,{
  total:results.filter(x=>x.domain===d).length,
  publishedReference:results.filter(x=>x.domain===d&&x.quality==='published_reference_available').length,
  sourceLeads:results.filter(x=>x.domain===d&&x.quality==='source_leads_only').length,
  insufficient:results.filter(x=>x.domain===d&&x.quality==='insufficient_evidence').length,
  errors:results.filter(x=>x.domain===d&&x.failed).length
 }])),
 draftAnswerReviewsNeeded:results.filter(x=>x.review_needed).length
};
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/quranically-unseen-question-audit.json',JSON.stringify({createdUtc:new Date().toISOString(),environment:base,stats,results},null,2));
const report=['# Quranically — Unseen 60-question audit','',
'Purpose: measure retrieval and transparency on questions NOT used to author the original 24-dossier benchmark. These questions require independent expert review. A matching article does not imply a complete fatwa or medical conclusion.','',
'| Discipline | Tested | Published-reference matches (not independently approved) | Leads | Insufficient | Errors |',
'| --- | ---: | ---: | ---: | ---: | ---: |',
...Object.entries(stats.byDomain).map(([d,x])=>`| ${d} | ${x.total} | ${x.publishedReference} | ${x.sourceLeads} | ${x.insufficient} | ${x.errors} |`),
'','## Unexpected / failing results',
...results.filter(x=>x.failed||x.review_needed).map(x=>`- ${x.domain}: ${x.q} — ${x.error||'Unexpected editorial match: '+x.article.join(', ')}`),
'','## Full evidence coverage','',
...results.map(x=>`- ${x.domain}: ${x.q} — ${x.failed?'ERROR: '+x.error:`status=${x.quality}, quran=${x.quran}, hadith=${x.hadith}, research=${x.biomedical}, article=${x.article.join('; ')||'none'}`}`)
].join('\n');
fs.writeFileSync('artifacts/quranically-unseen-question-audit.md',report);
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,report);
console.log('UNSEEN QUESTION AUDIT',JSON.stringify(stats));
if(stats.failures)throw Error(stats.failures+' question API integrity checks failed. Review audit artifact.');
