// Read-only diagnostics; no full source text copied into workflow logs.
for(const [name,url] of [
 ['opendua-search','https://api.opendua.org/v2/search?q=patience'],
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
