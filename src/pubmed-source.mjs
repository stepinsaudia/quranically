// NCBI PubMed public E-utilities: citation discovery only, not clinical assessment.
// Two bounded requests per query, no key, no abstract reproduction.
const base='https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
const clean=v=>String(v??'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,260);
async function read(url){
 const r=await fetch(url,{headers:{accept:'application/json','user-agent':'QuranicallyResearch/1.0 (public biomedical bibliography)'},signal:AbortSignal.timeout(9000),cf:{cacheEverything:true,cacheTtl:1800}});
 if(!r.ok)throw Error('pubmed_http_'+r.status);
 if(Number(r.headers.get('content-length')||0)>300000)throw Error('pubmed_payload_limit');
 const text=await r.text();if(text.length>300000)throw Error('pubmed_payload_limit');
 return JSON.parse(text);
}
export async function pubmedSourceSearch(q){
 const term=String(q??'').replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim().slice(0,90);
 if(term.length<3)return {id:'pubmed',status:'no_subject',total:0,records:[],queries:0};
 try{
  const search=new URL(base+'esearch.fcgi');
  search.search=new URLSearchParams({db:'pubmed',term,retmode:'json',retmax:'6',sort:'relevance',tool:'QuranicallyResearch'});
  const found=await read(search.href);
  const ids=Array.isArray(found.esearchresult?.idlist)?found.esearchresult.idlist.filter(x=>/^\d{1,12}$/.test(String(x))).slice(0,6):[];
  if(!ids.length)return {id:'pubmed',status:'available',total:Number(found.esearchresult?.count||0),records:[],queries:1};
  const summary=new URL(base+'esummary.fcgi');
  summary.search=new URLSearchParams({db:'pubmed',id:ids.join(','),retmode:'json',tool:'QuranicallyResearch'});
  const details=await read(summary.href);
  const records=ids.map(id=>{
   const r=details.result?.[id];if(!r?.title)return null;
   const title=clean(r.title),journal=clean(r.fulljournalname||r.source||'Biomedical journal'),date=clean(r.pubdate||'');
   return {provider:'NCBI PubMed',kind:'research',reference:'PMID '+id,title,
    excerpt:'Publication record: '+title+'. Journal: '+journal+(date?', '+date:'')+'. A citation alone does not establish effectiveness or safety.',
    source_url:'https://pubmed.ncbi.nlm.nih.gov/'+id+'/',review_status:'clinical_assessment_pending',
    evidence_scope:'publication_metadata_only',reported_reference:clean(r.doi||'')};
  }).filter(Boolean);
  return {id:'pubmed',status:'available',total:Number(found.esearchresult?.count||0),records,queries:2};
 }catch{return {id:'pubmed',status:'temporarily_unavailable',total:null,records:[],queries:2};}
}
