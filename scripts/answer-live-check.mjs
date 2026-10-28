// Read-only acceptance for live, full on-page answers and canonical editorial data.
const origin='https://qst-living-knowledge-v1.stepinsaudia.workers.dev';
const pass=(process.env.QST_ADMIN_PASSWORD||'').trim();
if(pass.length<20)throw Error('Missing private Admin QA secret');
async function req(path,cookie){
 const r=await fetch(origin+path,{headers:cookie?{cookie}:{},signal:AbortSignal.timeout(16000)});
 if(!r.ok)throw Error(path+': HTTP '+r.status);
 return r.json();
}
for(const spec of [
 {q:'i have weak eyesight',domain:'prophetic_medicine',slug:'weak-eyesight-prophetic-medicine',sections:6,refs:6},
 {q:'diabetes',domain:'prophetic_medicine',slug:'diabetes-and-prophetic-medicine',sections:5,refs:3},
 {q:'clothing for men',domain:'seerah',slug:'mens-clothing-prophetic-era',sections:5,refs:4}
]){
 const result=await req('/api/encyclopedia/answer?'+new URLSearchParams({q:spec.q,domain:spec.domain}));
 if(result.outcome!=='full_article_answer'||result.answer?.slug!==spec.slug||result.answer?.sections?.length<spec.sections||result.answer?.citations?.length<spec.refs)
   throw Error('Full live answer missing or wrong for '+spec.q);
 if(result.answer.review_status!=='editorial_draft')throw Error('Incorrect review disclosure for '+spec.q);
 console.log('PASS on-page full answer:',spec.q,':',result.answer.sections.length,'sections /',result.answer.citations.length,'sources');
}
const none=await req('/api/encyclopedia/answer?'+new URLSearchParams({q:'purple shoelaces for camel boats',domain:'prophetic_medicine'}));
if(none.outcome!=='no_editorial_answer')throw Error('Unresearched query falsely claimed an answer');
console.log('PASS no fabricated answer for unknown question');
const login=await fetch(origin+'/api/admin/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({password:pass}),signal:AbortSignal.timeout(16000)});
if(login.status!==200)throw Error('Protected Admin login not available');
const cookie=(login.headers.get('set-cookie')||'').split(';')[0];if(!cookie.startsWith('__Host-qst_admin='))throw Error('Secure session missing');
try{
 const data=await req('/api/admin/bootstrap',cookie);
 if(!data.encyclopedia_articles?.some(x=>x.slug==='weak-eyesight-prophetic-medicine')||!data.encyclopedia_citations?.some(x=>x.id==='weak-eyesight-prophetic-medicine-r1'))throw Error('Public response not backed by canonical Admin records');
 console.log('PASS same D1 article and sources managed in canonical Admin');
}finally{
 const out=await fetch(origin+'/api/admin/logout',{method:'POST',headers:{origin,'content-type':'application/json',cookie},signal:AbortSignal.timeout(16000)});
 if(out.status!==200)throw Error('Could not revoke Admin QA session');
}
console.log('PASS FULL ON-PAGE ANSWER ACCEPTANCE');
