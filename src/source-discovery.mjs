// Quranically's bounded, attributed live source lookup.
// Live source evidence is never promoted to a scholarly verdict or clinical conclusion.
const origin='https://ummahapi.com';
const stop=new Set(['i','me','my','we','us','our','the','a','an','of','in','on','and','or','to','from','with','about','for','are','was','were','is','be','it','its','this','that','they','them','their','have','has','had','what','which','why','when','where','who','how','can','could','would','should','does','did','do','tell','please','give','show','explain','want','need','help','according','islam','islamic','prophetic','prophet','muhammad','medicine','seerah','biography','sunnah','hadith','quran','quranic','life','men','women','people','used','use','using']);
const aliases=new Map(Object.entries({
  clothes:'clothing',cloth:'clothing',garments:'clothing',garment:'clothing',dress:'clothing',dressed:'clothing',wear:'clothing',wore:'clothing',wearing:'clothing',attire:'clothing',robes:'clothing',robe:'clothing',
  fast:'fasting',fasts:'fasting',sawm:'fasting',ramadan:'ramadan',
  honest:'honesty',truthful:'honesty',truthfulness:'honesty',truth:'honesty',
  hijra:'hijrah',migration:'hijrah',migrated:'hijrah',
  supplicate:'dua',supplication:'dua',supplications:'dua',prayers:'prayer',
  remedy:'remedies',herbs:'remedies',herbal:'remedies',treatments:'treatment',cures:'cure',
  diabetic:'diabetes',bloodsugar:'diabetes',habbat:'seed',sawda:'seed',
  marriage:'marriage',married:'marriage',trade:'business',merchant:'business',
  anger:'anger',angry:'anger',patience:'patience',patient:'patience'
}));
const normalize=v=>String(v??'').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g,' ').trim();
const short=(v,max=265)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
const canonical=t=>aliases.get(t)||t;
export function meaningfulTerms(q){
 const parts=normalize(q).split(/\s+/).filter(x=>x.length>2&&!stop.has(x));
 return [...new Set(parts.map(canonical))].slice(0,7);
}
export function sourceTerm(q){
 const tokens=meaningfulTerms(q);
 return (tokens.length?tokens.join(' '):normalize(q)).slice(0,70);
}
function queryPlans(q){
 const tokens=meaningfulTerms(q);
 if(!tokens.length)return [];
 const terms=[tokens.slice(0,3).join(' '),tokens[0]];
 if(tokens.length>1)terms.push(tokens[tokens.length-1]);
 return [...new Set(terms.filter(Boolean))].slice(0,3);
}
// Exact query phrase matching was excluding useful evidence even when a provider
// returned matching subject references. Rank by anchored subject words instead.
export function rankSourceEvidence(items,q,limit=6){
 const concepts=meaningfulTerms(q);
 if(!concepts.length)return [];
 const words=concepts.slice(0,5);
 return (items||[]).map((x,i)=>{
  const haystack=new Set(normalize([x.title,x.excerpt,x.reference].join(' ')).split(/\s+/).map(canonical));
  const matched=words.filter(w=>haystack.has(w));
  const ratio=matched.length/words.length;
  const score=matched.length*3+ratio+(x.kind==='hadith'?0.2:0)-(i*0.00001);
  return {x,score,matched};
 }).filter(x=>x.matched.length>0&&x.x.excerpt&&String(x.x.excerpt).length>=14)
   .sort((a,b)=>b.score-a.score)
   .slice(0,limit)
   .map(x=>({...x.x,matched_terms:x.matched}));
}
async function fetchBounded(url){
 const res=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(6500),cf:{cacheEverything:true,cacheTtl:1800}});
 if(!res.ok)throw Error('provider_http_'+res.status);
 if(Number(res.headers.get('content-length')||0)>350000)throw Error('provider_payload_too_large');
 const body=await res.text();
 if(body.length>350000)throw Error('provider_payload_too_large');
 const data=JSON.parse(body);
 if(data.success!==true||!data.data)throw Error('provider_schema');
 return data.data;
}
function convert(group,records){
 return records.map(x=>{
  if(group==='quran_verses'){
   const chapter=Number(x.surah_number),ayah=Number(x.ayah);
   if(!(chapter>=1&&chapter<=114&&ayah>=1&&ayah<=286))return null;
   return {provider:'UmmahAPI / Qur’an search',kind:'quran',reference:chapter+':'+ayah,title:'Qur’an '+chapter+':'+ayah,excerpt:short(x.translation),source_url:'https://quran.com/'+chapter+'/'+ayah,review_status:'upstream_unreviewed'};
  }
  if(group==='hadith_collections'){
   const coll=String(x.collection||'').toLowerCase(),number=String(x.hadithnumber??'');
   if(!/^[a-z]+$/.test(coll)||!/^[0-9.]+$/.test(number))return null;
   return {provider:'UmmahAPI / Hadith search',kind:'hadith',reference:coll+':'+number,title:short(x.collection_name||coll,100)+' · '+number,excerpt:short(x.english,270),source_url:origin+'/api/hadith/'+coll+'/'+number,reported_grade:short(x.grade,70),review_status:'upstream_unreviewed'};
  }
  const id=String(x.id||'');
  if(!/^\d+$/.test(id))return null;
  return {provider:'UmmahAPI / Du‘a search',kind:'dua',reference:short(x.source,100),title:short(x.title,120),excerpt:short(x.translation,270),source_url:origin+'/api/duas/'+id,review_status:'upstream_unreviewed'};
 }).filter(Boolean);
}
export async function liveSourceSearch(q,domain=''){
 const plans=queryPlans(q),term=sourceTerm(q);
 if(!plans.length)return {term,results:[],providers:[],fetched_at:new Date().toISOString()};
 const groups=[
  {id:'quran_verses',endpoint:t=>'/api/quran/search?q='+encodeURIComponent(t)+'&limit=8',field:'results',limit:8},
  {id:'hadith_collections',endpoint:t=>'/api/hadith/search?q='+encodeURIComponent(t)+'&limit=12',field:'hadiths',limit:12},
  {id:'duas',endpoint:t=>'/api/duas/search?q='+encodeURIComponent(t),field:'results',limit:8}
 ];
 const all=await Promise.all(groups.map(async group=>{
  const unique=new Map();let status='available',total=0,tried=0;
  for(const search of plans.slice(0,2)){
   tried++;
   try{
    const data=await fetchBounded(origin+group.endpoint(search));
    const arr=data[group.field];
    if(!Array.isArray(arr))throw Error('provider_schema');
    total=Math.max(total,Number(data.total_found??data.results_count??arr.length)||0);
    for(const rec of convert(group.id,arr.slice(0,group.limit))){
      const key=rec.kind+'|'+rec.reference+'|'+rec.title;
      if(!unique.has(key))unique.set(key,rec);
    }
    // A provider can return a search match without its snippet containing
    // the complete question wording. Check meaningful subject relevance.
    if(rankSourceEvidence([...unique.values()],q,1).length)break;
   }catch(e){status='temporarily_unavailable';if(tried===1)continue;}
  }
  return {id:group.id,status,records:[...unique.values()],total,queries:tried};
 }));
 const raw=all.flatMap(g=>g.records);
 const evidence=rankSourceEvidence(raw,q,9);
 return {term,results:evidence,providers:all.map(({id,status,total,queries})=>({id,status,match_count:total,queries})),fetched_at:new Date().toISOString(),review_notice:'Source-linked provider excerpts only; neither scholarly authentication nor clinical effectiveness is established.'};
}
export const CONNECTORS=[
 {id:'ummah_quran',title:'Qur’an verse index',source:'UmmahAPI',mode:'live_search',coverage:'Provider Qur’an search index',verification:'provider_text_pending_review',source_url:'https://ummahapi.com/api/docs'},
 {id:'ummah_hadith',title:'Hadith collection index',source:'UmmahAPI',mode:'live_search',coverage:'Provider indexed narrations in multiple collections; grade is not independently verified',verification:'provider_text_pending_review',source_url:'https://ummahapi.com/hadith-api'},
 {id:'ummah_dua',title:'Supplication index',source:'UmmahAPI',mode:'live_search',coverage:'Provider indexed supplications and reference labels',verification:'provider_text_pending_review',source_url:'https://ummahapi.com/duas-api'},
 {id:'hadeethenc',title:'Hadith encyclopedia',source:'HadeethEnc',mode:'official_category_api',coverage:'Translated hadith and category browsing; provenance and terms apply',verification:'publisher_source',source_url:'https://hadeethenc.com/en/home'},
 {id:'sunnah_com',title:'Sunnah.com',source:'Sunnah.com',mode:'access_required',coverage:'API key approval required',verification:'permission_pending',source_url:'https://sunnah.com/developers'},
 {id:'dorar',title:'Dorar Hadith Encyclopedia',source:'Dorar.net',mode:'access_required',coverage:'Provider token required',verification:'permission_pending',source_url:'https://dorar.net/api-services/hadith'},
 {id:'quran_foundation',title:'Quran Foundation Content & Search',source:'Quran Foundation',mode:'access_required',coverage:'Licensed Qur’an content/search; production permissions required',verification:'permission_pending',source_url:'https://api-docs.quran.com/'},
 {id:'pubmed',title:'PubMed research index',source:'NCBI / NIH',mode:'not_connected',coverage:'Clinical research indexing not yet connected to Quranically',verification:'independent_medical_review_required',source_url:'https://pubmed.ncbi.nlm.nih.gov/'}
];
