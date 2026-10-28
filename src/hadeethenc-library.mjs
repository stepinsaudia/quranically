// HadeethEnc official categories and report details, bounded read-only adapter.
// Do not equate a provider's explanation with a Quranically-approved ruling.
const origin='https://hadeethenc.com';
const excerpt=(x,n=280)=>String(x??'').replace(/\s+/g,' ').trim().slice(0,n);
async function getJson(path){
 const response=await fetch(origin+path,{headers:{accept:'application/json'},signal:AbortSignal.timeout(10000),cf:{cacheEverything:true,cacheTtl:900}});
 if(!response.ok)throw Error('hadeethenc_http_'+response.status);
 if(Number(response.headers.get('content-length')||0)>280000)throw Error('hadeethenc_payload_limit');
 const raw=await response.text();if(raw.length>280000)throw Error('hadeethenc_payload_limit');
 return JSON.parse(raw);
}
export async function curatedHadithList(category,page=1){
 const cat=Number(category),num=Number(page);
 if(!Number.isSafeInteger(cat)||cat<1||cat>9999||!Number.isSafeInteger(num)||num<1||num>2000)throw Error('Invalid category or page');
 try{
  const q=new URLSearchParams({language:'en',category_id:String(cat),page:String(num),per_page:'20'});
  const data=await getJson('/api/v1/hadeeths/list/?'+q);
  if(!Array.isArray(data?.data))throw Error('hadeethenc_schema');
  const records=data.data.slice(0,20).map(x=>{
   const id=String(x.id||'');
   if(!/^\d{1,9}$/.test(id)||!x.title)return null;
   return {id,title:excerpt(x.title,240),source_url:origin+'/api/v1/hadeeths/one/?language=en&id='+id,language:'en',
    provider:'HadeethEnc',review_status:'provider_translation_not_independently_reviewed'};
  }).filter(Boolean);
  const meta=data.meta||{};
  const pageCount=Number(meta.last_page||0);
  const totalCount=Number(meta.total_items??meta.total??0);
  return {status:'available',category_id:String(cat),page:num,page_size:20,
   records,reported_total:Number.isFinite(totalCount)&&totalCount>=0?totalCount:null,
   last_page:Number.isSafeInteger(pageCount)&&pageCount>=1?pageCount:null,
   has_next_page:Boolean(meta.next_page_url)||(Number(meta.current_page||num)<Number(meta.last_page||num))};
 }catch(e){return {status:'temporarily_unavailable',category_id:String(cat),page:num,records:[],reported_total:null,last_page:null,has_next_page:false,error_code:'provider_unavailable'};}
}
export async function curatedHadithDetail(id){
 const key=String(id||'');
 if(!/^\d{1,9}$/.test(key))throw Error('Invalid HadeethEnc record id');
 try{
  const data=await getJson('/api/v1/hadeeths/one/?language=en&id='+key);
  const record=data?.data&&typeof data.data==='object'&&!Array.isArray(data.data)?data.data:data;
  if(!record||String(record.id)!==key||!record.hadeeth)throw Error('hadeethenc_schema');
  return {status:'available',id:key,title:excerpt(record.title,230),
    passage:excerpt(record.hadeeth,1200),
    explanation:excerpt(record.explanation,1600),
    hints:(Array.isArray(record.hints)?record.hints:[]).slice(0,4).map(x=>excerpt(x,280)).filter(Boolean),
    reported_grade:excerpt(record.grade,120),
    reported_attribution:excerpt(record.attribution,180),
    source_url:origin+'/api/v1/hadeeths/one/?language=en&id='+key,
    provider:'HadeethEnc',review_status:'publisher_translation_not_independently_reviewed',
    notice:'This is material from the named source provider, not a Quranically-authenticated ruling or medical treatment.'};
 }catch{return {status:'temporarily_unavailable',id:key,source_url:origin+'/api/v1/hadeeths/one/?language=en&id='+key,notice:'Official source record is temporarily unavailable. Open the provider link to retry directly.'};}
}

export async function publisherCategoryTree(rootIds){
 // The official API publishes parent_id links, so the full descendancy can be
 // discovered without inventing more hard-coded topic categories.
 const roots=new Set((rootIds||[]).map(x=>String(x)));
 try{
  const all=await getJson('/api/v1/categories/list/?language=en');
  if(!Array.isArray(all)||all.length>3000)throw Error('category_schema');
  const records=all.map(x=>{
   const id=String(x.id??'');
   const parent=x.parent_id===null?null:String(x.parent_id??'');
   if(!/^\d{1,6}$/.test(id)||parent!==null&&!/^\d{1,6}$/.test(parent))return null;
   const count=Number(x.hadeeths_count);
   return {id,parent_id:parent,title:excerpt(x.title,170),
    reported_count:Number.isFinite(count)&&count>=0?count:null};
  }).filter(x=>x&&x.title);
  const byId=new Map(records.map(x=>[x.id,x]));
  const memo=new Map();
  function rootFor(id){
   if(memo.has(id))return memo.get(id);
   const seen=new Set();let at=id;
   while(at&&!seen.has(at)){
    if(roots.has(at)){memo.set(id,at);return at;}
    seen.add(at);at=byId.get(at)?.parent_id||null;
   }
   memo.set(id,null);return null;
  }
  const scoped=records.map(x=>({...x,shelf_root:rootFor(x.id)})).filter(x=>x.shelf_root!==null);
  return {status:'available',categories:scoped,reported_nodes:scoped.length,
   source_url:origin+'/api/v1/categories/list/?language=en',
   notice:'Provider category counts are reported by the publisher; categories may overlap and are not unique Quranically articles.'};
 }catch{return {status:'temporarily_unavailable',categories:[],reported_nodes:0,
  notice:'Publisher hierarchy unavailable. The approved root collections remain accessible.'};}
}
