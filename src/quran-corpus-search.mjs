import corpus from './data/quran-verse-index.json' with {type:'json'};
export const quranCorpusInfo=()=>({publisher:corpus.publisher,edition:corpus.edition,verses:corpus.verses,surahs:corpus.surahs,sha256:corpus.sha256,retrieved_at:corpus.retrieved_at,source_url:corpus.source_url,review_status:'translation_not_tafsir'});

const normalize=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const synonyms={
 patience:['steadfast','patient','persevere'],prayer:['pray','worship'],charity:['alms','giving'],
 mercy:['merciful','compassion'],repentance:['repent','turn'],forgiveness:['forgive','pardon'],
 generosity:['generous','giving','spend','alms'],modesty:['modest','chaste'],
 marriage:['marry','spouse'],anxiety:['fear','grief','sorrow'],justice:['just','fair','equity']
};
const stem=value=>value.length>=5?value.replace(/(?:ing|ed|es|s)$/,''):value;
function wordMatch(word,wanted){
 if(word===wanted)return 1;
 return word.length>=5&&wanted.length>=5&&stem(word)===stem(wanted)?0.6:0;
}
export function searchTranslationCorpus(terms,{records=corpus.records,limit=12,offset=0}={}){
 const words=[...new Set((terms||[]).map(normalize).filter(t=>t.length>=3))].slice(0,5);
 if(!words.length)return {total:0,results:[]};
 const matched=[];
 for(const record of records){
  if(!Array.isArray(record)||record.length<3)continue;
  const [chapter,verse,text]=record;
  if(!Number.isInteger(chapter)||!Number.isInteger(verse)||typeof text!=='string')continue;
  const verseWords=normalize(text).split(' ');
  let count=0,score=0;
  for(const term of words){
   let best=0;
   for(const alt of [term,...(synonyms[term]||[])]){
    for(const w of verseWords){best=Math.max(best,wordMatch(w,alt));if(best===1)break;}
    if(best===1)break;
   }
   if(best){count++;score+=best===1?8:5;}
  }
  if(!count||words.length>2&&count<2)continue;
  if(count===words.length)score+=18;
  if(words.length>1&&normalize(text).includes(words.join(' ')))score+=11;
  matched.push({chapter,verse,text,score,hit_count:count});
 }
 matched.sort((a,b)=>b.score-a.score||b.hit_count-a.hit_count||a.chapter-b.chapter||a.verse-b.verse);
 const start=Math.max(0,Math.min(6236,Number(offset)||0));
 const size=Math.max(1,Math.min(30,Number(limit)||12));
 return {total:matched.length,offset:start,limit:size,next_offset:start+size<matched.length?start+size:null,results:matched.slice(start,start+size)};
}
