// Source-first Hadith discovery. Live original text is loaded only from HadeethEnc.com.
// The read-only metadata index covers the publisher's English title catalogue,
// rather than guessing a category and inspecting only its first page.
// Publisher translation and explanations are never edited or made into Quranically rulings.
import titleCatalog from './data/hadeethenc-title-index.json' with {type:'json'};
import {subjectTokens} from './article-match.mjs';
const API='https://hadeethenc.com/api/v1';
const MAX_SIZE=800000;
const validId=v=>/^\d{1,8}$/.test(String(v||''));
const relevantTokens=value=>subjectTokens(value).filter(t=>t.length>=4);
const catalogInfo=()=>({
 publisher:'HadeethEnc.com',
 title_count:titleCatalog.records.length,
 root_subjects:titleCatalog.coverage.length,
 retrieved_utc:titleCatalog.retrieved_utc,
 source_url:titleCatalog.source_url,
 original_titles_only:true,
 translation_version:'not_supplied_by_live_api'
});
async function apiJson(path,fetcher){
 const result=await fetcher(API+path,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000),cf:{cacheEverything:true,cacheTtl:1800}});
 if(!result?.ok)throw Error('hadeethenc_http_'+(result?.status||'unknown'));
 if(Number(result.headers?.get('content-length')||0)>MAX_SIZE)throw Error('hadeethenc_response_too_large');
 const raw=await result.text();
 if(raw.length>MAX_SIZE)throw Error('hadeethenc_response_too_large');
 return JSON.parse(raw);
}
export function titleRelevance(terms,title){
 const present=new Set(relevantTokens(title));
 const hits=terms.filter(t=>present.has(t));
 if(!hits.length)return 0;
 // Multi-subject questions must not become a random generic Hadith result.
 if(terms.length>=3&&hits.length<2)return 0;
 return hits.length*18+(hits.length===terms.length?14:0)-Math.min(8,Math.max(0,present.size-hits.length)/8);
}
function categoryScore(queryTokens,cat){
 const tokens=relevantTokens(cat.title),matches=queryTokens.filter(t=>tokens.includes(t));
 if(!matches.length)return 0;
 return matches.length*10+Math.min(6,matches.length*3/Math.max(1,tokens.length))-Math.min(8,Number(cat.hadeeths_count||0)/200);
}
async function detailFor(item,fetcher,mode){
 try{
  const d=await apiJson('/hadeeths/one/?language=en&id='+item.id,fetcher);
  if(!d||String(d.id)!==String(item.id)||typeof d.hadeeth!=='string'||!d.hadeeth.trim())return null;
  if(d.hadeeth.length>11000||String(d.explanation||'').length>18000)return null;
  return {provider:'HadeethEnc.com',kind:'hadith',reference:'HadeethEnc '+item.id,
   title:d.title||item.title,original_hadith:d.hadeeth,
   publisher_explanation:typeof d.explanation==='string'?d.explanation:'',
   publisher_benefits:Array.isArray(d.hints)&&d.hints.length<=30&&d.hints.every(x=>typeof x==='string'&&x.length<=3000)?d.hints:[],
   reported_grade:typeof d.grade==='string'?d.grade:'',
   publisher_attribution:typeof d.attribution==='string'?d.attribution:'',
   source_url:'https://hadeethenc.com/en/browse/hadith/'+item.id,
   category:item._category||'HadeethEnc English',
   translation_edition:'Live English publisher API · version not provided in response',
   review_status:'publisher_grading_not_independently_checked',
   discovery_mode:mode
  };
 }catch{return null;}
}
async function categoryFallback(terms,fetcher){
 let categories;
 try{
  const data=await apiJson('/categories/list/?language=en',fetcher);
  if(!Array.isArray(data))throw Error('invalid_categories');
  categories=data.filter(x=>validId(x?.id)&&typeof x?.title==='string')
   .map(x=>({...x,_score:categoryScore(terms,x)})).filter(x=>x._score>=5)
   .sort((a,b)=>b._score-a._score).slice(0,2);
 }catch{return {status:'temporarily_unavailable',results:[],categories:[]};}
 if(!categories.length)return {status:'no_topic_category',results:[],categories:[]};
 const listings=await Promise.all(categories.map(async cat=>{
  try{
   const d=await apiJson('/hadeeths/list/?language=en&category_id='+cat.id+'&page=1&per_page=40',fetcher);
   if(!Array.isArray(d?.data))throw Error('invalid_list');
   return d.data.filter(x=>validId(x?.id)&&typeof x?.title==='string').map(x=>({...x,_category:cat.title,_score:titleRelevance(terms,x.title)}));
  }catch{return null;}
 }));
 const titles=[...new Map(listings.filter(Boolean).flat().filter(x=>x._score>=10).sort((a,b)=>b._score-a._score).map(x=>[String(x.id),x])).values()].slice(0,3);
 const details=await Promise.all(titles.map(item=>detailFor(item,fetcher,'category_fallback')));
 return {status:details.some(Boolean)?'available':listings.every(x=>x===null)?'temporarily_unavailable':'no_relevant_hadith',
   results:details.filter(Boolean),
   categories:categories.map(x=>({id:x.id,title:x.title,source_url:'https://hadeethenc.com/en/browse/category/'+x.id}))};
}
export async function searchHadeethEnc(query,fetcher=fetch,options={}){
 const terms=relevantTokens(query).slice(0,5), catalog=catalogInfo();
 if(!terms.length)return {status:'no_search_term',results:[],matched_categories:[],publisher:'HadeethEnc.com',catalog};
 const records=Array.isArray(options.titleIndex)?options.titleIndex:titleCatalog.records;
 const indexed=records.filter(x=>validId(x.id)&&typeof x.title==='string')
  .map(x=>({...x,_score:titleRelevance(terms,x.title)}))
  .filter(x=>x._score>=12).sort((a,b)=>b._score-a._score||Number(a.id)-Number(b.id)).slice(0,3);
 if(indexed.length){
  const details=await Promise.all(indexed.map(item=>detailFor(item,fetcher,'full_title_index')));
  const found=details.filter(Boolean);
  if(found.length)return {status:'available',results:found,matched_categories:[],publisher:'HadeethEnc.com',
   search_method:'indexed_original_english_titles',catalog,
   source_notice:'Exact unmodified publisher report and explanation fetched by record ID. Publisher grading is not independent Quranically authentication. Live API does not expose a numbered English translation version.'};
  return {status:'temporarily_unavailable',results:[],matched_categories:[],publisher:'HadeethEnc.com',
   search_method:'indexed_original_english_titles',catalog};
 }
 const fallback=await categoryFallback(terms,fetcher);
 return {status:fallback.status,results:fallback.results,matched_categories:fallback.categories,
  search_method:'official_category_fallback',publisher:'HadeethEnc.com',catalog,
  source_notice:'Publisher English report, explanation and grade are retrieved by exact ID and not independently authenticated by Quranically. Live API version is not exposed; inspect publisher record for updates.'};
}
