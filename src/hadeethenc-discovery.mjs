// Live, source-attributed Hadith exploration from the HadeethEnc.com official API.
// Publisher terms: do not modify translated content; credit HadeethEnc.com and
// identify the translation version. Do not present publisher grades as our own.
import {subjectTokens} from './article-match.mjs';
const API='https://hadeethenc.com/api/v1';
const EDITION='en v1.25.0 (publisher download edition; live API may be updated separately)';
const MAX_SIZE=800000;
const validId=v=>/^\d{1,8}$/.test(String(v||''));
function relevantTokens(value){return subjectTokens(value).filter(t=>t.length>=4);}
async function apiJson(path,fetcher){
 const result=await fetcher(API+path,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000),cf:{cacheEverything:true,cacheTtl:1800}});
 if(!result?.ok)throw Error('hadeethenc_http_'+(result?.status||'unknown'));
 if(Number(result.headers?.get('content-length')||0)>MAX_SIZE)throw Error('hadeethenc_response_too_large');
 const raw=await result.text();
 if(raw.length>MAX_SIZE)throw Error('hadeethenc_response_too_large');
 return JSON.parse(raw);
}
function categoryScore(queryTokens,cat){
 const tokens=relevantTokens(cat.title);
 if(!tokens.length)return 0;
 const matching=queryTokens.filter(t=>tokens.includes(t));
 if(!matching.length)return 0;
 // Prefer specific subject categories over generic parents.
 return matching.length*10+Math.min(6,matching.length*3/tokens.length)-Math.min(8,Number(cat.hadeeths_count||0)/200);
}
function hadithScore(queryTokens,item){
 const tokens=relevantTokens([item.title||'',item.hadeeth||''].join(' '));
 const matches=queryTokens.filter(t=>tokens.includes(t));
 return matches.length*10+(matches.length===queryTokens.length?5:0);
}
export async function searchHadeethEnc(query,fetcher=fetch){
 const terms=relevantTokens(query).slice(0,4);
 if(!terms.length)return {status:'no_search_term',results:[],matched_categories:[],publisher:'HadeethEnc.com'};
 let categories=[];
 try{
  const data=await apiJson('/categories/list/?language=en',fetcher);
  if(!Array.isArray(data))throw Error('invalid_categories');
  categories=data.filter(x=>validId(x?.id)&&typeof x?.title==='string')
   .map(x=>({...x,_score:categoryScore(terms,x)}))
   .filter(x=>x._score>=5)
   .sort((a,b)=>b._score-a._score).slice(0,2);
 }catch{return {status:'temporarily_unavailable',results:[],matched_categories:[],publisher:'HadeethEnc.com'};}
 if(!categories.length)return {status:'no_topic_category',results:[],matched_categories:[],publisher:'HadeethEnc.com'};
 const listings=await Promise.all(categories.map(async cat=>{
  try{
   const d=await apiJson('/hadeeths/list/?language=en&category_id='+cat.id+'&page=1&per_page=40',fetcher);
   if(!Array.isArray(d?.data))throw Error('invalid_list');
   return d.data.filter(x=>validId(x?.id)&&typeof x?.title==='string').map(x=>({...x,_category:cat.title,_score:hadithScore(terms,x)}));
  }catch{return null;}
 }));
 const candidates=[...new Map(listings.filter(Boolean).flat().filter(x=>x._score>=10).sort((a,b)=>b._score-a._score).map(x=>[x.id,x])).values()].slice(0,3);
 const detailed=await Promise.all(candidates.map(async item=>{
  try{
   const d=await apiJson('/hadeeths/one/?language=en&id='+item.id,fetcher);
   if(!d||String(d.id)!==String(item.id)||typeof d.hadeeth!=='string'||!d.hadeeth.trim())return null;
   const originalText=d.hadeeth,explanation=typeof d.explanation==='string'?d.explanation:'';
   if(originalText.length>11000||explanation.length>18000)return null;
   return {provider:'HadeethEnc.com',kind:'hadith',reference:'HadeethEnc '+item.id,
    title:d.title||item.title,original_hadith:originalText,publisher_explanation:explanation,
    publisher_benefits:Array.isArray(d.hints)&&d.hints.length<=30&&d.hints.every(x=>typeof x==='string'&&x.length<=3000)?d.hints:[],
    reported_grade:typeof d.grade==='string'?d.grade:'',
    publisher_attribution:typeof d.attribution==='string'?d.attribution:'',
    source_url:'https://hadeethenc.com/en/browse/hadith/'+item.id,
    category:item._category,translation_edition:EDITION,
    review_status:'publisher_grading_not_independently_checked'};
  }catch{return null;}
 }));
 const results=detailed.filter(Boolean);
 return {status:results.length?'available':listings.every(x=>x===null)?'temporarily_unavailable':'no_relevant_hadith',results,
   matched_categories:categories.map(x=>({id:x.id,title:x.title,source_url:'https://hadeethenc.com/en/browse/category/'+x.id})),
   publisher:'HadeethEnc.com',translation_edition:EDITION,
   source_notice:'Unmodified publisher text and scholarly explanation. The publisher grade has not been independently checked by Quranically; inspect the original page for current edition and full context.'};
}
