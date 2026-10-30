// Explainable answerability classification. Match counts alone never imply
// a valid Tafsir, sourced Seerah narrative, medical cure or a fatwa.
const clinical=/\b(diabetes|diabetic|asthma|cancer|infection|surgery|blood pressure|illness|disease|medication|drug|treatment|cure|heal|healing|remedy|medical|health|symptom|cough|eyesight)\b/i;
const historical=/\b(seerah|sira|hijrah|hijra|migration|battle of badr|uhud|prophet's life|prophetic era|biography|birth of the prophet)\b/i;
const strongMedical=/\b(cure|treat|treatment|replace medication|stop medicine|prescription|heal|healing)\b/i;
export function assessAnswerQuality(question,domain,answerBrief){
 const q=String(question||''),brief=answerBrief||{},a=brief.availability||{};
 const editorial=Number(a.editorial_articles||0)>0;
 const quran=Number(a.quran_verses||0);
 const hadith=Number(a.hadith_records||0);
 const sources=Number(brief.sources_count||0);
 const medical=domain==='prophetic_medicine'||clinical.test(q);
 const history=domain==='seerah'||historical.test(q);
 const flags=[];
 if(history&&!editorial)flags.push('historical_seerah_narrative_not_established');
 if(medical)flags.push('no_individualized_medical_claim');
 if(strongMedical.test(q)&&medical)flags.push('clinical_efficacy_not_established');
 if(quran&&!editorial)flags.push('quran_translation_match_not_tafsir');
 if(hadith&&!editorial)flags.push('publisher_hadith_grade_not_independently_verified');
 if(!sources)flags.push('no_verified_citations');
 let status='insufficient_evidence',display='Insufficient evidence';
 if(editorial){
  status='published_reference_available';display='Published source-linked reference';
 }else if(sources>0){
  status='source_leads_only';display='Related source material — interpretation pending';
 }
 if(history&&!editorial&&sources>0)display='Seerah source leads — historical account not yet verified';
 if(medical&&!editorial&&sources>0)display='Related evidence — not a medical recommendation';
 return {status,display,flags,
  disclaimer:medical?'Traditional reports and biomedical research do not by themselves establish a treatment or cure. Seek qualified medical care for health decisions.':
   history&&!editorial?'These references do not establish a complete or authenticated historical narrative. Detailed Seerah sources need editorial verification.':
   status==='source_leads_only'?'Keyword-related sources are not a complete Tafsir or religious ruling. Examine their context and attribution.':
   status==='insufficient_evidence'?'No adequately sourced answer has been established for this question yet.':'Published source material may still await independent scholarly review.'};
}
