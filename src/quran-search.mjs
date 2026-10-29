// Quranically first-party Quran verse lookup, delegated to the Al Quran Cloud source.
// Translation matches do not constitute tafsir, fatwa, or independent scholarly review.
export const AYAH_COUNTS=Object.freeze([7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6]);
export function validVerse(c,v){return Number.isInteger(c)&&c>=1&&c<=114&&Number.isInteger(v)&&v>=1&&v<=AYAH_COUNTS[c-1];}
const named=[
 {re:/\b(?:ayat(?:ul|[ -]?al)?[- ]?kursi|throne verse)\b/i,c:2,v:255},
 {re:/\blast (?:two|2) verses? of (?:surah )?(?:al[- ]?)?baqarah\b/i,c:2,v:285},
 {re:/\b(?:surah )?(?:al[- ]?)?fatihah\b/i,c:1,v:1}
];
export function parseVerseReference(query){
 const q=String(query||'').trim();
 const ref=q.match(/\b(\d{1,3})\s*[:/]\s*(\d{1,3})\b/);
 if(ref){const c=Number(ref[1]),v=Number(ref[2]);return validVerse(c,v)?{chapter:c,verse:v,reference:c+':'+v,kind:'numeric'}:null;}
 for(const n of named)if(n.re.test(q))return {chapter:n.c,verse:n.v,reference:n.c+':'+n.v,kind:'named',...(n.c===2&&n.v===285?{lastVerse:286}:{})};
 return null;
}
const ignored=new Set(['the','and','for','from','what','where','when','which','how','can','will','about','some','find','quran','qur','allah','says','say','speak','speaks','verses','verse','surah','prophet','rasulullah','muhammad','islam','regarding','mention','mentions','mentioned','show','give','tell','does','meaning','with','have','our','are','who','his','her','life','teach','teaching','guidance']);
const variants=new Map([['maryam','mary'],['mariam','mary'],['isa','jesus'],['ibrahim','abraham'],['musa','moses'],['sabr','patience'],['salah','prayer'],['salat','prayer'],['zakat','alms'],['riba','usury'],['hijab','veil'],['qiyamah','resurrection'],['jannah','garden'],['jahannam','hell'],['sawm','fast'],['roza','fast'],['tawbah','repentance'],['tauba','repentance'],['rizq','provision'],['shifa','healing']]);
const queryFillers=new Set(['prohibited','prohibition','forbidden','forbid','allowed','permitted','commanded','command','discussed','discussion','topic','topics','religion','religious','interpretation','interpreted','mentions','related','relatedly','explain','explains','understand','understanding','about','passage','passages','history']);
export function quranSearchTerms(query){
 const words=String(query||'').toLowerCase().replace(/[^a-z\u0600-\u06ff ]/g,' ').split(/\s+/).filter(x=>x.length>=3&&!ignored.has(x)&&!queryFillers.has(x));
 const special=words.filter(x=>variants.has(x)).map(x=>variants.get(x));
 const other=words.filter(x=>!variants.has(x));
 return [...new Set([...special,...other])].slice(0,2).map(x=>x.slice(0,40));
}
export function quranSearchWord(query){return quranSearchTerms(query)[0]||'';}
async function boundedJson(url,fetcher){
 const r=await fetcher(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8500),cf:{cacheEverything:true,cacheTtl:1800}});
 if(!r.ok)throw Error('quran_provider_'+r.status);
 if(Number(r.headers?.get('content-length')||0)>1300000)throw Error('quran_response_too_large');
 const text=await r.text();if(text.length>1300000)throw Error('quran_response_too_large');
 const data=JSON.parse(text);if(data.code!==200||!data.data)throw Error('quran_provider_schema');return data.data;
}
export async function searchQuran(query,fetcher=fetch){
 const direct=parseVerseReference(query);
 if(!direct && /\b\d{1,3}\s*[:/]\s*\d{1,3}\b/.test(String(query)))return {status:'invalid_reference',mode:'exact_verse',searched:String(query).slice(0,60),results:[]};
 if(direct){
  const verses=direct.lastVerse?[direct.verse,direct.lastVerse]:[direct.verse];
  const found=await Promise.all(verses.map(async v=>{
   const reference=direct.chapter+':'+v;
   try{
    const rows=await boundedJson('https://api.alquran.cloud/v1/ayah/'+reference+'/editions/quran-uthmani,en.pickthall',fetcher);
    if(!Array.isArray(rows)||rows.length<2)throw Error('quran_edition_schema');
    const [arabic,translated]=rows;
    for(const a of [arabic,translated])if(Number(a?.surah?.number)!==direct.chapter||Number(a?.numberInSurah)!==v)throw Error('quran_reference_mismatch');
    return {provider:'Al Quran Cloud',kind:'quran',reference,title:'Qur’an '+reference,excerpt:String(translated.text||'').slice(0,700),arabic:String(arabic.text||'').slice(0,900),source_url:'https://quran.com/'+direct.chapter+'/'+v,translation:'Marmaduke Pickthall (en.pickthall)',review_status:'provider_text_pending_review'};
   }catch{return null;}
  }));
  const results=found.filter(Boolean);
  return {status:results.length===verses.length?'available':results.length?'partial':'temporarily_unavailable',searched:direct.reference,mode:'exact_verse',results};
 }
 const terms=quranSearchTerms(query);
 if(!terms.length)return {status:'no_search_term',searched:'',mode:'translation_keyword',results:[]};
 const looked=await Promise.all(terms.map(async term=>{
  try{
   const data=await boundedJson('https://api.alquran.cloud/v1/search/'+encodeURIComponent(term)+'/all/en.pickthall',fetcher);
   if(!Array.isArray(data.matches))throw Error('quran_match_schema');
   return {term,status:'available',matches:data.matches.slice(0,18),total:Number(data.count)||0};
  }catch{return {term,status:'temporarily_unavailable',matches:[],total:0};}
 }));
 const unique=new Map();
 for(const item of looked)for(const x of item.matches){
  const c=Number(x?.surah?.number),v=Number(x?.numberInSurah);
  if(!validVerse(c,v)||!x.text)continue;
  const reference=c+':'+v;
  if(!unique.has(reference))unique.set(reference,{provider:'Al Quran Cloud',kind:'quran',reference,title:'Qur’an '+reference,excerpt:String(x.text).slice(0,700),source_url:'https://quran.com/'+c+'/'+v,translation:'Marmaduke Pickthall (en.pickthall)',review_status:'provider_text_pending_review'});
 }
 const ranked=[...unique.values()].map(x=>({...x,_score:terms.filter(t=>x.excerpt.toLowerCase().includes(t.toLowerCase())).length})).sort((a,b)=>b._score-a._score).slice(0,12).map(({_score,...x})=>x);
 const successful=looked.filter(x=>x.status==='available');
 return {status:successful.length===looked.length?'available':successful.length?'partial':'temporarily_unavailable',searched:terms.join(', '),mode:'translation_keyword',total:ranked.length,results:ranked};
}
