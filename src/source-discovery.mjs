import {validVerse} from './quran-search.mjs';
// Quranically federated source discovery. No full-corpus mirroring and no AI-generated citations.
// The API returns small, attributed pointers to provider data, not approved encyclopedia articles.
const origin='https://ummahapi.com';
const stop=new Set(['for','the','a','an','of','in','on','and','or','to','from','with','about','men','women','people','islam','islamic','prophetic','medicine','seerah','biography','sunnah','hadith','how','what','can','does','do','i','my']);
export function sourceTerm(q){
  const cleaned=String(q||'').trim().replace(/\s+/g,' ').slice(0,95);
  const pieces=cleaned.split(' ').filter(x=>x.length>2&&!stop.has(x.toLowerCase()));
  return pieces.length?pieces.join(' ').slice(0,70):cleaned.slice(0,70);
}
const short=(v,max=230)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
async function fetchBounded(url){
  const res=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(9000),cf:{cacheEverything:true,cacheTtl:3600}});
  if(!res.ok)throw Error('provider_http_'+res.status);
  const size=Number(res.headers.get('content-length')||0);
  if(size>350000)throw Error('provider_payload_too_large');
  const body=await res.text();
  if(body.length>350000)throw Error('provider_payload_too_large');
  const data=JSON.parse(body);
  if(data.success!==true||!data.data)throw Error('provider_schema');
  return data.data;
}
export async function liveSourceSearch(q,domain=''){
  const term=sourceTerm(q);
  if(term.length<2)return {term,results:[],providers:[]};
  const groups=[
   {id:'quran_verses',endpoint:'/api/quran/search?q='+encodeURIComponent(term)+'&limit=8',enabled:true},
   {id:'hadith_collections',endpoint:'/api/hadith/search?q='+encodeURIComponent(term)+'&limit=12',enabled:true},
   {id:'duas',endpoint:'/api/duas/search?q='+encodeURIComponent(term),enabled:domain!=='seerah'&&domain!=='prophetic_medicine'}
  ];
  const responses=await Promise.all(groups.map(async group=>{
    if(!group.enabled)return {id:group.id,status:'not_queried',records:[],total:0};
    try{
      const body=await fetchBounded(origin+group.endpoint);
      const arr=group.id==='quran_verses'?body.results:group.id==='hadith_collections'?body.hadiths:body.results;
      if(!Array.isArray(arr))throw Error('provider_schema');
      const total=Number(body.total_found??body.results_count??arr.length);
      const records=arr.slice(0,group.id==='hadith_collections'?12:8).map(x=>{
        if(group.id==='quran_verses'){
          const chapter=Number(x.surah_number),ayah=Number(x.ayah);
          if(!validVerse(chapter,ayah))return null;
          return {provider:'UmmahAPI / Quran index',kind:'quran',reference:chapter+':'+ayah,title:'Quran '+chapter+':'+ayah,excerpt:short(x.translation,240),source_url:'https://quran.com/'+chapter+'/'+ayah,review_status:'upstream_unreviewed'};
        }
        if(group.id==='hadith_collections'){
          const coll=String(x.collection||'').toLowerCase();
          const number=String(x.hadithnumber||'');
          if(!/^[a-z]+$/.test(coll)||!/^[0-9.]+$/.test(number))return null;
          return {provider:'UmmahAPI / Hadith index',kind:'hadith',reference:coll+':'+number,title:short(x.collection_name||coll,90)+' · '+number,excerpt:short(x.english,245),source_url:origin+'/api/hadith/'+coll+'/'+number,reported_grade:short(x.grade,70),review_status:'upstream_unreviewed'};
        }
        const id=String(x.id||'');
        if(!/^\d+$/.test(id))return null;
        return {provider:'UmmahAPI / Dua index',kind:'dua',reference:short(x.source,100),title:short(x.title,120),excerpt:short(x.translation,245),source_url:origin+'/api/duas/'+id,review_status:'upstream_unreviewed'};
      }).filter(Boolean);
      return {id:group.id,status:'available',records,total:Number.isFinite(total)?Math.max(0,total):records.length};
    }catch{return {id:group.id,status:'temporarily_unavailable',records:[],total:null};}
  }));
  return {term,results:responses.flatMap(x=>x.records),providers:responses.map(({id,status,total})=>({id,status,match_count:total})),fetched_at:new Date().toISOString(),review_notice:'These are independently attributed provider search records, not Quranically-verified religious rulings or medical advice.'};
}
export const CONNECTORS=[
 {id:'ummah_quran',title:'Quran verse index',source:'UmmahAPI',mode:'live_search',coverage:'Quran search index; provider claims 6,236 verses',verification:'provider_text_pending_review',source_url:'https://ummahapi.com/api/docs'},
 {id:'ummah_hadith',title:'Hadith collection index',source:'UmmahAPI',mode:'live_search',coverage:'Provider claims 36,000+ narrations in 10 collections; not independently authenticated by Quranically',verification:'provider_text_pending_review',source_url:'https://ummahapi.com/hadith-api'},
 {id:'ummah_dua',title:'Supplication index',source:'UmmahAPI',mode:'live_search',coverage:'Provider indexed duas with source labels',verification:'provider_text_pending_review',source_url:'https://ummahapi.com/duas-api'},
 {id:'hadeethenc',title:'Hadith encyclopedia',source:'HadeethEnc',mode:'official_category_api',coverage:'Translated narrations grouped in curated categories; verbatim reuse requires exact attribution/version',verification:'publisher_source',source_url:'https://hadeethenc.com/en/home'},
 {id:'sunnah_com',title:'Sunnah.com',source:'Sunnah.com',mode:'access_required',coverage:'Partial checked collections; API key approval required',verification:'permission_pending',source_url:'https://sunnah.com/developers'},
 {id:'dorar',title:'Dorar Hadith Encyclopedia',source:'Dorar.net',mode:'access_required',coverage:'Hadith authenticity/grading search; token approval required',verification:'permission_pending',source_url:'https://dorar.net/api-services/hadith'},
 {id:'quran_foundation',title:'Quran Foundation Content & Search',source:'Quran Foundation',mode:'access_required',coverage:'Licensed Quran content/search including tafsir; production permissions required',verification:'permission_pending',source_url:'https://api-docs.quran.com/'},
 {id:'pubmed',title:'PubMed research index',source:'NCBI / NIH',mode:'contact_required',coverage:'Biomedical bibliographic research; registration/traffic and abstract rights apply',verification:'independent_medical_review_required',source_url:'https://pubmed.ncbi.nlm.nih.gov/'}
];
