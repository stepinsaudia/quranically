// Read-only production verification: GET requests only; no credentials or writes.
const ORIGIN = 'https://qst-living-knowledge-v1.stepinsaudia.workers.dev';
async function get(path) {
  const r = await fetch(ORIGIN + path, {signal: AbortSignal.timeout(18000), redirect:'follow'});
  const raw = await r.text();
  let data = null; try { data=JSON.parse(raw); } catch {}
  console.log(path, 'HTTP', r.status, 'bytes', raw.length);
  return {r,raw,data};
}
const checks=[];
async function check(label,fn) {
  try {const ok=await fn(); checks.push({label,ok}); console.log(ok?'PASS':'FAIL',label);}
  catch (e) {checks.push({label,ok:false}); console.log('FAIL',label,String(e));}
}
await check('Homepage renders',async()=>{const {r,raw}=await get('/');return r.status===200&&raw.toLowerCase().includes('<html');});
await check('Health shows seeded DB',async()=>{const {r,data}=await get('/api/health');return r.status===200&&data?.status==='ok'&&data.journeys>0;});
await check('Published journeys available',async()=>{const {r,data}=await get('/api/journeys');return r.status===200&&Array.isArray(data?.journeys)&&data.journeys.length>0;});
await check('Hardship evidence returned',async()=>{const {r,data}=await get('/api/journey/hardship');return r.status===200&&data?.journey?.slug==='hardship'&&Array.isArray(data.evidence)&&data.evidence.length>0;});
await check('Admin sign-in protected or deliberately locked',async()=>{const {r,raw}=await get('/admin');return [401,403,503].includes(r.status)||(r.status===200&&raw.includes('Editorial sign in'));});
await check('Admin API denied',async()=>{const {r}=await get('/api/admin/journeys');return [401,403,503].includes(r.status);});
console.log(JSON.stringify({origin:ORIGIN,checks},null,2));
if(checks.some(c=>!c.ok))process.exitCode=1;
