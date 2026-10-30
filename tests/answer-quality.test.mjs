import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessAnswerQuality} from '../src/answer-quality.mjs';
const brief=(e=0,q=0,h=0)=>({availability:{editorial_articles:e,quran_verses:q,hadith_records:h},sources_count:q+h+e});
test('Seerah question with related ayahs is correctly identified as source leads, not an authenticated historical answer',()=>{
 const result=assessAnswerQuality('What happened at the Battle of Badr?','seerah',brief(0,12,3));
 assert.equal(result.status,'source_leads_only');
 assert.match(result.display,/historical account not yet verified/i);
 assert(result.flags.includes('historical_seerah_narrative_not_established'));
});
test('Medically sensitive query never implies cure from related Hadith',()=>{
 const result=assessAnswerQuality('Does Prophetic Medicine cure asthma?','prophetic_medicine',brief(0,0,3));
 assert.equal(result.status,'source_leads_only');
 assert(result.flags.includes('clinical_efficacy_not_established'));
 assert.match(result.disclaimer,/not.*treatment or cure/i);
});
test('Published source-linked articles are labeled without implying scholarly verification',()=>{
 const result=assessAnswerQuality('How did men dress in the Seerah?','seerah',brief(1,4,2));
 assert.equal(result.status,'published_reference_available');
 assert.match(result.disclaimer,/may still await independent scholarly review/i);
});
test('Missing evidence is distinguished from missing results in source indexes',()=>{
 const result=assessAnswerQuality('Unknown question','',brief());
 assert.equal(result.status,'insufficient_evidence');
 assert(result.flags.includes('no_verified_citations'));
});
