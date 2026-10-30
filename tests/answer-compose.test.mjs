import {test} from 'node:test';import assert from 'node:assert/strict';
import {composeSourceAnswer} from '../src/answer-compose.mjs';
test('grounded answer brief uses only provided sources and preserves review statuses',()=>{
 const input={
 contextual_answers:[{title:'Fair Conduct',abstract:'Published original editorial introduction.',review_status:'editorial_draft',
  sections:[{heading:'Practice',body:'Source-backed editorial explanation.'}],
  citations:[{citation_type:'quran',citation_ref:'2:255',source_url:'https://quran.com/2/255',source_title:'Quran',verification_status:'pending'}]}],
 evidence:{quran:[{reference:'2:255',excerpt:'Exact publisher translation',source_url:'https://quran.com/2/255',translation:'Pickthall'}],
 hadith:[{reference:'HadeethEnc 1234',original_hadith:'Unmodified source narration',publisher_explanation:'Publisher explanation',
  source_url:'https://hadeethenc.com/en/browse/hadith/1234',review_status:'publisher_not_independently_checked'}]},
 guidance:[{title:'Community help',steps:[{instruction:'Act with care'}]}]
 };
 const answer=composeSourceAnswer('What is fair conduct?',input);
 assert.equal(answer.type,'editorial_with_primary_sources');
 assert.equal(answer.introduction,input.contextual_answers[0].abstract);
 assert.equal(answer.availability.quran_verses,1);
 assert.equal(answer.availability.hadith_records,1);
 assert.equal(answer.sources_count,2);
 assert(answer.sections.some(x=>x.items.some(y=>y.text==='Publisher explanation')||x.items.some(y=>y.explanation==='Publisher explanation')));
 assert(!JSON.stringify(answer).includes('independently verified'));
});
test('unknown topic is explicitly not a verified Islamic answer',()=>{
 const a=composeSourceAnswer('unknown subject',{});
 assert.equal(a.type,'insufficient_evidence');
 assert.equal(a.sources_count,0);
 assert.equal(a.sections.length,0);
});
