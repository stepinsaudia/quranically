// Read-only live diagnostics. Never claims that API reachability equals verified knowledge.
const base='https://qst-living-knowledge-v1.stepinsaudia.workers.dev';
const tests=[
 {domain:'sunnah',q:'fasting'},
 {domain:'seerah',q:'clothing for men'},
 {domain:'prophetic_medicine',q:'honey'},
 {domain:'living_guidance',q:'patience'}
];
for(const x of tests){
 try{
  const u=new URL('/api/source-discovery',base);u.search=new URLSearchParams(x);
  const res=await fetch(u,{signal:AbortSignal.timeout(18000)});
  const json=await res.json();
  console.log(JSON.stringify({domain:x.domain,query:x.q,http:res.status,providers:json.providers||[],visibleEvidence:(json.results||[]).length,examples:(json.results||[]).slice(0,2).map(z=>({kind:z.kind,reference:z.reference,excerpt:String(z.excerpt||'').slice(0,85)}))}));
 }catch(e){console.log(JSON.stringify({domain:x.domain,error:e.message}));}
}
