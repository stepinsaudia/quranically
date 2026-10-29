// Read-only diagnostics; no full source text copied into workflow logs.
for(const [name,url] of [
 ['opendua-search','https://api.opendua.org/v2/search?q=morning'],
 ['opendua-search-sleep','https://api.opendua.org/v2/search?q=sleep'],
 ['opendua-collections','https://api.opendua.org/v2/collections'],
 ['opendua-detail','https://api.opendua.org/v2/entries/entry-000001']
]){
 try{
  const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(10000)});
  const parsed=await response.json();
  const shape=x=>Array.isArray(x)?['array',x.length,Object.keys(x[0]||{})]:x&&typeof x==='object'?['object',Object.keys(x).slice(0,18)]:[typeof x];
  console.log(JSON.stringify({name,http:response.status,root:shape(parsed),items:shape(parsed?.items),pagination:shape(parsed?.pagination),data:shape(parsed?.data),results:shape(parsed?.results),entries:shape(parsed?.entries)}));
 }catch(e){console.log(JSON.stringify({name,error:String(e.message).slice(0,80)}));}
}

try{
 const res=await fetch('https://api.opendua.org/v2/entries/entry-000001',{signal:AbortSignal.timeout(9000)});
 const entry=await res.json();
 const keys=x=>x&&typeof x==='object'?Object.keys(x):[];
 const v=entry.variations?.[0]||{},st=v.steps?.[0]||{},unit=st.items?.[0]||{};
 console.log(JSON.stringify({name:'opendua_nested_fields',entry_keys:keys(entry),variations_count:entry.variations?.length||0,variation_keys:keys(v),steps_count:v.steps?.length||0,step_keys:keys(st),unit_keys:keys(unit),dua_keys:keys(unit.dua),nested_entry_steps:keys(entry.steps?.[0]),reference_keys:keys(entry.references?.[0])}));
}catch(e){console.log(JSON.stringify({name:'opendua_nested_fields',error:e.message}));}
