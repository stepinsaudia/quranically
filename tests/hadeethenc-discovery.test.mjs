import {test} from 'node:test';import assert from 'node:assert/strict';
import {searchHadeethEnc,titleRelevance} from '../src/hadeethenc-discovery.mjs';
const response=data=>({ok:true,status:200,headers:new Headers(),text:async()=>JSON.stringify(data)});
test('official HadeethEnc topic search returns exact publisher content, grade, source and edition',async()=>{
 const urls=[];
 const fetcher=async url=>{
  urls.push(url);
  if(url.includes('/categories/list/'))return response([
   {id:'441',title:'Clothing and Adornment',hadeeths_count:'42',parent_id:'4'},
   {id:'1',title:'The Noble Quran',hadeeths_count:'58',parent_id:null}
  ]);
  if(url.includes('/hadeeths/list/'))return response({data:[
   {id:'1234',title:'Men and women should dress modestly'},
   {id:'9999',title:'Unrelated trade question'},
   {id:'foo',title:'Invalid identifier'}
  ],meta:{total_items:3}});
  if(url.includes('/hadeeths/one/'))return response({id:'1234',title:'Men and women should dress modestly',
   hadeeth:'Exact publisher translation without edits.',explanation:'Publisher explanation, provided without abridgement.',
   grade:'Authentic',attribution:'Recorded by the publisher.',hints:['A published lesson']});
  throw Error('Unexpected request '+url);
 };
 const result=await searchHadeethEnc('What clothing did men wear?',fetcher,{titleIndex:[]});
 assert.equal(result.status,'available');
 assert.equal(result.results.length,1);
 assert.equal(result.results[0].original_hadith,'Exact publisher translation without edits.');
 assert.equal(result.results[0].publisher_explanation,'Publisher explanation, provided without abridgement.');
 assert.equal(result.results[0].reported_grade,'Authentic');
 assert.match(result.results[0].translation_edition,/v1\.25\.0/);
 assert.equal(result.results[0].source_url,'https://hadeethenc.com/en/browse/hadith/1234');
 assert.equal(urls.length,3);
});
test('HadeethEnc refuses to invent a match when a question has no relevant official category',async()=>{
 const result=await searchHadeethEnc('diabetes treatment',async()=>response([
  {id:'1',title:'The Noble Quran and Quranic Sciences',hadeeths_count:'55'}
 ]),{titleIndex:[]});
 assert.equal(result.status,'no_topic_category');
 assert.deepEqual(result.results,[]);
});
test('HadeethEnc rejects IDs and mismatched publisher responses',async()=>{
 const result=await searchHadeethEnc('clothing',async url=>{
  if(url.includes('/categories/list/'))return response([{id:'35',title:'Clothing and Adornment',hadeeths_count:'7'}]);
  if(url.includes('/hadeeths/list/'))return response({data:[{id:'234',title:'About clothing'}]});
  return response({id:'235',hadeeth:'Wrong narration',title:'False attribution'});
 },{titleIndex:[]});
 assert.equal(result.results.length,0);
});
test('HadeethEnc supplier outage remains explicitly unavailable, no fabricated hadith',async()=>{
 const result=await searchHadeethEnc('prayer',async()=>{throw Error('provider down')});
 assert.equal(result.status,'temporarily_unavailable');
 assert.equal(result.results.length,0);
});

test('complete publisher title-index matching reaches beyond first-page category listings',async()=>{
 const sourceRecords=[
  {id:'720001',title:'The Prophet wore a white garment in public',category_ids:['7']},
  {id:'720002',title:'Clothing and modest garments for men',category_ids:['4']},
  {id:'720003',title:'An unrelated topic about hunting',category_ids:['4']}
 ];
 const urls=[];
 const mock=async u=>{
  urls.push(u);
  if(!u.includes('/hadeeths/one/'))throw Error('Title-index lookup must not query partial category pages');
  const id=u.match(/id=(\d+)/)?.[1];
  return response({id,title:sourceRecords.find(x=>x.id===id)?.title,hadeeth:'Publisher original text for '+id,grade:'Authentic',explanation:'Publisher explanation '+id,hints:[]});
 };
 const found=await searchHadeethEnc('How did men dress and what clothing did the Prophet wear?',mock,{titleIndex:sourceRecords});
 assert.equal(found.status,'available');
 assert.equal(found.search_method,'indexed_original_english_titles');
 assert.equal(found.results.length,2);
 assert(found.results.every(x=>x.discovery_mode==='full_title_index'&&x.source_url.includes('/browse/hadith/')));
 assert(urls.every(u=>u.includes('/hadeeths/one/')));
});
test('source index refuses to match a single generic word in a long multi-subject question',()=>{
 assert.equal(titleRelevance(['marriage','diabetes','pilgrimage'],'A narration about marriage'),0);
 assert(titleRelevance(['clothing'],'The Prophet wore clothing')>0);
});
