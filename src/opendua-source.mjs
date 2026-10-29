// OpenDua freely available v2 dataset. Publisher English/transliteration: CC BY 4.0.
// Underlying Quranic/hadith recitations are separately attributed, never altered.
const root='https://api.opendua.org';
async function get(path){
 const response=await fetch(root+path,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000),cf:{cacheEverything:true,cacheTtl:1800}});
 if(!response.ok)throw Error('opendua_http_'+response.status);
 if(Number(response.headers.get('content-length')||0)>180000)throw Error('opendua_large');
 const body=await response.text();
 if(body.length>180000)throw Error('opendua_large');
 return JSON.parse(body);
}
const excerpt=s=>String(s??'').replace(/\s+/g,' ').trim().slice(0,450);
export async function searchOpenDua(q){
 const text=String(q||'').trim().slice(0,100);
 if(text.length<2)return {id:'opendua',status:'no_subject',records:[],total:0,queries:0};
 try{
  const data=await get('/v2/search?'+new URLSearchParams({q:text,page:'1',pageSize:'10'}));
  if(!Array.isArray(data.items))throw Error('opendua_search_schema');
  const items=data.items.slice(0,10).map(x=>{
   const id=String(x.entryId||x.id||x.entry?.id||'');
   if(!/^entry-\d{6}$/.test(id))return null;
   return {id,title:excerpt(x.title||x.entry?.title||'Hisn al-Muslim'),ref:excerpt(x.sourceReference||x.reference||'')};
  }).filter(Boolean);
  const results=await Promise.all(items.slice(0,5).map(async item=>{
   try{
    const entry=await get('/v2/entries/'+item.id);
    const snippets=[],arabic=[];
    for(const variant of (entry.variations||[]).slice(0,2)){
      for(const step of (variant.steps||[]).slice(0,8)){
        for(const unit of (step.items||[]).slice(0,8)){
          if(unit.dua?.translation)snippets.push(String(unit.dua.translation));
          if(unit.dua?.arabic)arabic.push(String(unit.dua.arabic));
        }
      }
    }
    const excerptText=excerpt(snippets.join(' '));
    if(!excerptText)return null;
    const ref=String(entry.sourceReference||item.ref||'');
    return {provider:'OpenDua / Hisn al-Muslim',kind:'dua',reference:'Hisn al-Muslim '+ref,
      title:excerpt(entry.title||item.title),excerpt:excerptText,arabic_excerpt:excerpt(arabic.join(' ')),
      source_url:root+'/v2/entries/'+item.id,review_status:'publisher_editorial_not_independently_reviewed',
      attribution:'OpenDua (Ihsan Labs), English licensed CC BY 4.0. Underlying source: Hisn al-Muslim.'};
   }catch{return null;}
  }));
  return {id:'opendua',status:'available',records:results.filter(Boolean),total:Number(data.pagination?.totalItems||data.items.length),queries:1};
 }catch{return {id:'opendua',status:'temporarily_unavailable',records:[],total:null,queries:1};}
}
