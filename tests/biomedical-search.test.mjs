import {test} from 'node:test';import assert from 'node:assert/strict';
import {searchBiomedicalEvidence,biomedicalKeywords} from '../src/biomedical-search.mjs';
const response=data=>({ok:true,status:200,headers:new Headers(),text:async()=>JSON.stringify(data)});
test('Prophetic Medicine health research uses its canonical ingredient identity and clinical topic',()=>{
 const ingredients=[{title:'Black Seed',scientific_name:'Nigella sativa',arabic_name:'حبة البركة'}];
 const terms=biomedicalKeywords('Black seed for diabetes',ingredients);
 assert.deepEqual(terms,['nigella','sativa','diabetes']);
});
test('Europe PMC results provide bibliography, never inferred effectiveness or copied abstracts',async()=>{
 let called='';
 const mock=async url=>{
  called=url;
  return response({hitCount:2,resultList:{result:[
   {source:'MED',id:'12345678',title:'Nigella sativa and diabetes: a systematic review',journalTitle:'Test Journal',pubYear:'2024',authorString:'Author A, Author B',doi:'10.1234/test',abstractText:'Copyrighted text not permitted as a cure claim'},
   {source:'MED',id:'9999999',title:'Unrelated sports business news'}
  ]}});
 };
 const result=await searchBiomedicalEvidence('Black seed for diabetes',{ingredients:[{title:'Black Seed',scientific_name:'Nigella sativa'}],domain:'prophetic_medicine'},mock);
 assert.match(called,/europepmc\/webservices\/rest\/search/);
 assert.match(called,/resultType=lite/);
 assert.equal(result.status,'available');
 assert.equal(result.results.length,1);
 assert.equal(result.results[0].source_url,'https://europepmc.org/article/MED/12345678');
 assert(!JSON.stringify(result).includes('Copyrighted text'));
 assert(!JSON.stringify(result).includes('cures diabetes'));
 assert.equal(result.results[0].review_status,'bibliographic_metadata_only_not_clinically_appraised');
});
test('General Seerah search does not silently send user questions to biomedical provider',async()=>{
 const data=await searchBiomedicalEvidence('How did men dress in Seerah?',{domain:'seerah'},async()=>{throw Error('Should never request clinical evidence')});
 assert.equal(data.status,'not_applicable');
});
test('A biomedical query without known ingredient searches only short normalized subject terms',async()=>{
 let url='';
 const result=await searchBiomedicalEvidence('I have diabetes and wonder about Prophetic Medicine',{domain:'prophetic_medicine'},async u=>{
  url=u;return response({resultList:{result:[]},hitCount:0});
 });
 assert.equal(result.status,'available');
 assert.deepEqual(result.query_terms,['diabetes']);
 assert.match(url,/query=diabetes/);
 assert(!url.includes('Prophetic'));
});
test('Provider outage is clearly unavailable and never creates medical claims',async()=>{
 const result=await searchBiomedicalEvidence('asthma treatment',{domain:'prophetic_medicine'},async()=>{throw Error('upstream unavailable')});
 assert.equal(result.status,'temporarily_unavailable');
 assert.deepEqual(result.results,[]);
});
