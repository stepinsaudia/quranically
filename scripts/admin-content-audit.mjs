// Read-only audit of the EXISTING authenticated Quranically editorial database.
// No record writes, deployments, secrets in output, or publication changes.
const origin='https://qst-living-knowledge-v1.stepinsaudia.workers.dev';
const password=(process.env.QST_ADMIN_PASSWORD||'').trim();
if(password.length<20)throw Error('Required private GitHub Admin credential unavailable');
const headers={origin,'content-type':'application/json'};
async function read(path,cookie=''){
  const r=await fetch(origin+path,{headers:cookie?{cookie}:{},signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error(path+' returned HTTP '+r.status);
  return r.json();
}
const login=await fetch(origin+'/api/admin/login',{method:'POST',headers,body:JSON.stringify({password}),signal:AbortSignal.timeout(20000)});
if(login.status!==200)throw Error('Cannot authenticate live audit; HTTP '+login.status);
const cookie=(login.headers.get('set-cookie')||'').split(';')[0];
if(!cookie.startsWith('__Host-qst_admin='))throw Error('Missing protected session');
const findings=[],critical=[];
try{
  const data=await read('/api/admin/bootstrap',cookie);
  const groups=['journeys','evidence','sources','steps'];
  for(const group of groups)if(!Array.isArray(data[group]))throw Error('Missing Admin collection '+group);
  // Verify each Admin module's own live route, not just the consolidated bootstrap.
  for(const group of groups){
    const endpoint=await read('/api/admin/'+group,cookie);
    if(!Array.isArray(endpoint.records)||endpoint.records.length!==data[group].length)
      throw Error('Module mismatch: '+group);
  }
  const history=await read('/api/admin/audit',cookie);
  if(!Array.isArray(history.records))throw Error('Audit history endpoint unavailable');
  console.log('Authenticated Admin modules: journeys, evidence, sources, steps, audit history — ALL PASS');
  const [journeys,evidence,sources,steps]=groups.map(k=>data[k]);
  const journeyMap=new Map(journeys.map(x=>[x.id,x])), sourceMap=new Map(sources.map(x=>[x.id,x]));
  const count=(a,p)=>a.filter(p).length;
  for(const e of evidence){
    if(!journeyMap.has(e.journey_id))critical.push('Orphan evidence journey: '+e.id);
    if(!sourceMap.has(e.source_id))critical.push('Orphan evidence source: '+e.id);
    if(!e.reference||!e.title)critical.push('Missing citation fields: '+e.id);
    if(e.evidence_type==='quran'&&!e.arabic)critical.push('Missing Quranic Arabic: '+e.id);
    if(e.publish_status==='published'&&sourceMap.get(e.source_id)?.use_policy==='research_only')critical.push('Research-only source publicly referenced: '+e.id);
    if(e.publish_status==='published'&&e.review_status==='editorial_pending')findings.push('Published evidence awaiting scholarly or clinical review: '+e.id);
  }
  for(const s of steps)if(!journeyMap.has(s.journey_id))critical.push('Orphan practical step: '+s.id);
  for(const j of journeys){
    const citations=evidence.filter(e=>e.journey_id===j.id&&e.publish_status==='published');
    if(j.status==='published'&&!citations.length)critical.push('Published journey lacks cited evidence: '+j.id);
    if(!steps.some(s=>s.journey_id===j.id))findings.push('Journey lacks practical steps: '+j.id);
  }
  const pendingSources=sources.filter(s=>s.review_status!=='reviewed');
  for(const s of pendingSources)findings.push('Source needs editorial review: '+s.id);
  const stats={
    journeys:{total:journeys.length,published:count(journeys,x=>x.status==='published'),draft:count(journeys,x=>x.status==='draft'),archived:count(journeys,x=>x.status==='archived')},
    evidence:{total:evidence.length,published:count(evidence,x=>x.publish_status==='published'),pending_review:count(evidence,x=>x.review_status==='editorial_pending'),quran:count(evidence,x=>x.evidence_type==='quran'),seerah:count(evidence,x=>x.evidence_type==='seerah'),sunnah:count(evidence,x=>x.evidence_type==='sunnah'),dua:count(evidence,x=>x.evidence_type==='dua'),clinical:count(evidence,x=>x.evidence_type==='clinical'),tibb:count(evidence,x=>x.evidence_type==='tibb')},
    sources:{total:sources.length,review_needed:pendingSources.length,link_only:count(sources,x=>x.use_policy==='link_only')},
    steps:{total:steps.length},
    by_journey:journeys.map(j=>({id:j.id,status:j.status,evidence:count(evidence,e=>e.journey_id===j.id),steps:count(steps,s=>s.journey_id===j.id)})),
    critical_integrity_findings:critical,
    editorial_review_findings:findings
  };
  console.log('READ-ONLY QURANICALLY ADMIN CONTENT AUDIT');
  console.log(JSON.stringify(stats,null,2));
  if(critical.length)process.exitCode=2;
}finally{
  const out=await fetch(origin+'/api/admin/logout',{method:'POST',headers:{...headers,cookie},signal:AbortSignal.timeout(20000)});
  console.log('Admin audit session revoked:',out.status===200?'YES':'NO');
}
