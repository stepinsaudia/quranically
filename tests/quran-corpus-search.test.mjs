import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchTranslationCorpus,quranCorpusInfo} from '../src/quran-corpus-search.mjs';
import {searchQuran,validVerse} from '../src/quran-search.mjs';
test('complete Quran translation has 114 chapters and all 6236 verse positions',()=>{
 const metadata=quranCorpusInfo();
 assert.equal(metadata.surahs,114);
 assert.equal(metadata.verses,6236);
 assert.equal(metadata.edition,'en.pickthall');
 assert.match(metadata.sha256,/^[0-9a-f]{64}$/);
 assert.equal(validVerse(114,6),true);
 assert.equal(validVerse(114,7),false);
});
test('corpus-wide relevance ranks exact multi-concept matches before partial matches',()=>{
 const records=[
  [1,1,'This text speaks of kindness and mercy'],
  [2,2,'Those who show kindness and patience are rightly guided'],
  [2,3,'They are steadfast and show patience'],
  [5,2,'A text only about patience']
 ];
 const r=searchTranslationCorpus(['kindness','patience'],{records,limit:4});
 assert.equal(r.total,4);
 assert.equal(r.results[0].chapter,2);
 assert.equal(r.results[0].verse,2);
 assert.equal(r.results[0].hit_count,2);
});
test('local source search returns real original translation with exact cite and match count',async()=>{
 const result=await searchQuran('patience');
 assert.equal(result.status,'available');
 assert.equal(result.mode,'full_translation_index');
 assert.equal(result.coverage.verses,6236);
 assert(result.total>=12);
 assert.equal(result.results.length,12);
 assert(result.results.every(x=>/^\d{1,3}:\d{1,3}$/.test(x.reference)));
 assert(result.results.every(x=>x.source_url.startsWith('https://quran.com/')));
 assert(result.results.every(x=>x.review_status==='publisher_translation_not_tafsir'));
});
test('source-index query honors negative results without inventing Quran verses',()=>{
 const r=searchTranslationCorpus(['zzzznoquranword'],{records:[[1,1,'In the name of Allah']]});
 assert.equal(r.total,0);
 assert.deepEqual(r.results,[]);
});
