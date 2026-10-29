import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AYAH_COUNTS,validVerse,parseVerseReference,quranSearchWord,searchQuran} from '../src/quran-search.mjs';
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