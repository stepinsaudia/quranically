import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AYAH_COUNTS,validVerse,parseVerseReference,quranSearchWord,quranSearchTerms,searchQuran} from '../src/quran-search.mjs';
test('Quran limits cover all 114 surahs and 6236 verses; never invent an ayah',()=>{
 assert.equal(AYAH_COUNTS.length,114);
 assert.equal(AYAH_COUNTS.reduce((sum,n)=>sum+n,0),6236);
 assert(validVerse(2,286));assert(!validVerse(2,287));
 assert(!validVerse(1,8));assert(validVerse(114,6));assert(!validVerse(114,7));
});
test('exact references and named passages resolve without guessing',()=>{
 assert.deepEqual(parseVerseReference('Where is 2:255?'),{chapter:2,verse:255,reference:'2:255',kind:'numeric'});
 assert.equal(parseVerseReference('1:100'),null);
 assert.equal(parseVerseReference('115:1'),null);
 assert.equal(parseVerseReference('Maryam?'),null);
 assert.equal(parseVerseReference('Ayat al Kursi')?.reference,'2:255');
 assert.equal(parseVerseReference('last two verses of al Baqarah')?.reference,'2:285');
});
test('familiar Arabic names map explicitly to English translation lookup terms',()=>{
 assert.equal(quranSearchWord('Where is Maryam mentioned?'),'mary');
 assert.equal(quranSearchWord('What does the Quran say about riba?'),'usury');
 assert.equal(quranSearchWord('Where in the Quran?'),'');
});
test('provider evidence validates verse number and source metadata',async()=>{
 const fetcher=async u=>{
  assert.match(u,/\/search\/mary\/all\/en\.pickthall/);
  return {ok:true,headers:new Headers(),text:async()=>JSON.stringify({code:200,data:{count:1,matches:[{surah:{number:19},numberInSurah:16,text:'And make mention of Mary in the Scripture...'}]}})};
 };
 const r=await searchQuran('Where is Maryam mentioned?',fetcher);
 assert.equal(r.status,'available');assert.equal(r.results.length,1);
 assert.equal(r.results[0].reference,'19:16');
 assert.equal(r.results[0].source_url,'https://quran.com/19/16');
 assert.match(r.results[0].translation,/Pickthall/);
});
test('exact verse displays attributed Arabic and English only when both positions match',async()=>{
 const mock=async u=>{
  assert.match(u,/\/ayah\/2:255\/editions\//);
  return {ok:true,headers:new Headers(),text:async()=>JSON.stringify({code:200,data:[
   {surah:{number:2},numberInSurah:255,text:'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ'},
   {surah:{number:2},numberInSurah:255,text:'Allah! There is no God save Him'}
  ]})};
 };
 const r=await searchQuran('Ayat al Kursi',mock);
 assert.equal(r.status,'available');assert.equal(r.mode,'exact_verse');
 assert.equal(r.results[0].reference,'2:255');assert.match(r.results[0].arabic,/اللَّهُ/);
});
test('mismatched provider verse cannot appear as another verse',async()=>{
 const mock=async()=>({ok:true,headers:new Headers(),text:async()=>JSON.stringify({code:200,data:[
  {surah:{number:2},numberInSurah:255,text:'Arabic'},
  {surah:{number:3},numberInSurah:255,text:'Wrong reference'}
 ]})});
 const r=await searchQuran('2:255',mock);
 assert.equal(r.status,'temporarily_unavailable');assert.equal(r.results.length,0);
});
test('multi-concept questions prioritize known Islamic terms and exclude question filler',()=>{
 assert.deepEqual(quranSearchTerms('Where in the Quran is riba prohibited?'),['usury']);
 assert.deepEqual(quranSearchTerms('What does the Quran teach about patience when anxious?'),['patience','anxious']);
 assert.equal(quranSearchWord('Which Surah discusses Maryam?'),'mary');
});
test('two keyword searches merge exact verses and retain availability when a provider query fails',async()=>{
 const urls=[];
 const fetcher=async u=>{
  urls.push(u);
  if(u.includes('/anxious/'))throw Error('temporary outage');
  return {ok:true,headers:new Headers(),text:async()=>JSON.stringify({code:200,data:{count:1,matches:[{surah:{number:2},numberInSurah:153,text:'Seek help in patience and prayer'}]}})};
 };
 const result=await searchQuran('Quran patience when anxious',fetcher);
 assert.equal(result.status,'partial');
 assert.equal(result.results.length,1);
 assert.equal(result.results[0].reference,'2:153');
 assert.equal(urls.length,2);
});

test('nonexistent numeric Quran references fail closed',async()=>{
 const result=await searchQuran('Surah 1:100',async()=>{throw Error('Must not call external source');});
 assert.equal(result.status,'invalid_reference');assert.equal(result.results.length,0);
});
test('last two verses are both returned and checked independently',async()=>{
 const asked=[];
 const mock=async u=>{
  const v=Number(u.match(/ayah\/2:(285|286)\/editions/)[1]);
  asked.push(v);
  return {ok:true,headers:new Headers(),text:async()=>JSON.stringify({code:200,data:[
   {surah:{number:2},numberInSurah:v,text:'Arabic '+v},
   {surah:{number:2},numberInSurah:v,text:'Translation '+v}
  ]})};
 };
 const result=await searchQuran('last two verses of al Baqarah',mock);
 assert.deepEqual(asked.sort(),[285,286]);
 assert.deepEqual(result.results.map(x=>x.reference),['2:285','2:286']);
 assert.equal(result.status,'available');
});
