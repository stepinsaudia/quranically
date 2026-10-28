// Provider connectivity is not editorial approval. This probe makes no writes.
const checks=[
 ['HadeethEnc category','https://hadeethenc.com/api/v1/hadeeths/list/?language=en&category_id=7&page=1&per_page=2'],
 ['HadeethEnc detail','https://hadeethenc.com/api/v1/hadeeths/one/?language=en&id=2962'],
 ['Europe PMC bibliography','https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=honey&format=json&pageSize=2&resultType=lite']
];
for(const [name,url] of checks){
 try{
  const resp=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(9000)});
  const body=await resp.text();
  let parsed={};
  try{parsed=JSON.parse(body);}catch{}
  const shape=name==='HadeethEnc category'?Array.isArray(parsed.data):
    name==='HadeethEnc detail'?Boolean(parsed.hadeeth||parsed.data?.hadeeth):
    Array.isArray(parsed.resultList?.result);
  console.log(JSON.stringify({name,http:resp.status,shape_ok:shape,records:Array.isArray(parsed.data)?parsed.data.length:Array.isArray(parsed.resultList?.result)?parsed.resultList.result.length:null,bytes:body.length}));
 }catch(e){console.log(JSON.stringify({name,status:'unavailable',reason:String(e.message).slice(0,110)}));}
}