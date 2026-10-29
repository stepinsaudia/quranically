// Candidate bulk source only. Do NOT import before resolving ODbL/DbCL obligations.
// Inspect structural metadata, attribution and upstream availability without copying texts.
const url='https://www.thehadithproject.com/api/v0/collection/bukhari.json';
try{
 const resp=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(18000)});
 const length=Number(resp.headers.get('content-length')||0);
 if(!resp.ok||length>18000000)throw Error('http_'+resp.status+'_bytes_'+length);
 const raw=await resp.text();
 if(raw.length>18000000)throw Error('payload_exceeds_18MB');
 const json=JSON.parse(raw);
 const root=Array.isArray(json)?json:Array.isArray(json.hadiths)?json.hadiths:Array.isArray(json.records)?json.records:Array.isArray(json.items)?json.items:[];
 const sample=root[0]||{};
 const ids=root.map(x=>x.n??x.number??x.id??x.hadithNumber??'');
 const distinct=new Set(ids.map(String));
 console.log(JSON.stringify({source:'The Hadith Project',status:'probe_only_not_imported',
   http:resp.status,bytes:raw.length,root_keys:Array.isArray(json)?['array']:Object.keys(json).slice(0,20),
   array_count:root.length,record_keys:Object.keys(sample).slice(0,45),
   distinct_identifiers:distinct.size,attributed_licensing:'Project CC BY 4.0; underlying Arabic ODbL 1.0 / DbCL 1.0 requires compliance review',
   review:'Machine-parsed chains are not scholarly authenticated, never display as verified without review'}));
}catch(e){console.log(JSON.stringify({source:'The Hadith Project',status:'probe_only_unavailable',error:String(e.message).slice(0,200)}));}
