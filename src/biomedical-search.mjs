// Evidence discovery for health questions. Europe PMC bibliographic metadata ONLY.
// Religious tradition, modern research, clinical evidence and treatment advice are
// separate classes: a paper title is NOT a cure claim, recommendation or clinical review.
import {subjectTokens} from './article-match.mjs';
const ORIGIN='https://www.ebi.ac.uk/europepmc/webservices/rest/search';
const clinicalWords=/\b(medicine|medical|health|illness|disease|symptom|symptoms|treatment|remedy|remedies|cure|heal|healing|diabet\w*|asthma|infection|blood pressure|vision|eyesight|cancer|surgery|therapy|supplement\w*)\b/i;
const ignore=new Set(['medical','medicine','health','disease','illness','symptom','symptoms','treatment','remedy','remedies','cure','healing','heal','tradition','traditional','study','studies','paper','papers','research','science','scientific','evidence','modern','clinical','professional','doctor','patient','please','find','show','using','used','about']);
const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
export function biomedicalKeywords(query,ingredients=[]){
 const subjects=subjectTokens(query).filter(x=>/^[a-z]{4,30}$/.test(x)&&!ignore.has(x));
 const ingredient=ingredients.find(x=>typeof x.scientific_name==='string'&&x.scientific_name.trim().length>=4);
 if(!ingredient)return subjects.slice(0,3);
 const scientific=clean(ingredient.scientific_name).replace(/[^a-zA-Z\s]/g,' ').trim().toLowerCase().split(/\s+/).filter(x=>x.length>=4);
 const covered=new Set(subjectTokens([ingredient.title,ingredient.arabic_name,ingredient.scientific_name].join(' ')));
 const context=subjects.filter(x=>!covered.has(x));
 return [...new Set([...scientific.slice(0,2),...context.slice(0,2)])].slice(0,4);
}
export async function searchBiomedicalEvidence(query,{ingredients=[],domain=''}={},fetcher=fetch){
 const requested=domain==='prophetic_medicine'||ingredients.length>0||clinicalWords.test(String(query||''));
 if(!requested)return {status:'not_applicable',results:[],provider:'Europe PMC'};
 const terms=biomedicalKeywords(query,ingredients);
 if(!terms.length)return {status:'no_keywords',results:[],provider:'Europe PMC'};
 const sourceQuery=terms.map(t=>t.replace(/[^a-z]/g,'')).filter(Boolean).join(' AND ');
 const params=new URLSearchParams({query:sourceQuery,format:'json',resultType:'lite',pageSize:'8'});
 try{
  const response=await fetcher(ORIGIN+'?'+params,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8500),cf:{cacheEverything:true,cacheTtl:1800}});
  if(!response?.ok)throw Error('europe_pmc_http_'+(response?.status||'unknown'));
  if(Number(response.headers?.get('content-length')||0)>500000)throw Error('europe_pmc_too_large');
  const raw=await response.text();if(raw.length>500000)throw Error('europe_pmc_too_large');
  const body=JSON.parse(raw);
  if(!Array.isArray(body?.resultList?.result))throw Error('europe_pmc_schema');
  const results=body.resultList.result.map(x=>{
   const source=String(x.source||'').toUpperCase(),id=String(x.id||''),title=clean(x.title);
   if(!/^(MED|PMC|PPR)$/.test(source)||!/^[a-zA-Z0-9.\-]{1,40}$/.test(id)||!title)return null;
   const low=title.toLowerCase();
   if(!terms.some(t=>low.includes(t)))return null;
   return {provider:'Europe PMC',kind:'biomedical_bibliography',title:title.slice(0,400),
    journal:clean(x.journalTitle).slice(0,180),publication_year:String(x.pubYear||'').slice(0,4),
    authors:clean(x.authorString).slice(0,240),reference:source+':'+id,
    source_url:'https://europepmc.org/article/'+source+'/'+id,
    doi:typeof x.doi==='string'?x.doi.slice(0,120):'',
    review_status:'bibliographic_metadata_only_not_clinically_appraised'};
  }).filter(Boolean).slice(0,6);
  return {status:'available',query_terms:terms,results,provider:'Europe PMC',
   review_notice:'This is biomedical publication metadata only. Study design, validity, treatment benefit and safety have NOT been appraised by Quranically. It is not Islamic primary evidence or individualized medical advice.'};
 }catch{
  return {status:'temporarily_unavailable',query_terms:terms,results:[],provider:'Europe PMC'};
 }
}
