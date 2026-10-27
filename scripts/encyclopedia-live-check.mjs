// Read-only production acceptance for the canonical Quranically reference encyclopedia.
// No database or content edits; Admin login/logout creates and then revokes an ephemeral session.
const origin='https://qst-living-knowledge-v1.stepinsaudia.workers.dev';
const password=(process.env.QST_ADMIN_PASSWORD||'').trim();
if(password.length<20)throw Error('GitHub Admin secret unavailable');
async function read(path,cookie='',redirect='follow'){
 const res=await fetch(origin+path,{headers:cookie?{cookie}:{},redirect,signal:AbortSignal.timeout(20000)});
 const raw=await res.text();let data=null;try{data=JSON.parse(raw)}catch{}
 return {res,raw,data};
}
function check(ok,msg){if(!ok)throw Error('FAIL '+msg);console.log('PASS '+msg);}
const home=await read('/');check(home.res.status===200&&home.raw.includes('THE ISLAMIC REFERENCE ENCYCLOPEDIA'),'Canonical encyclopedia homepage and identity');
const index=await read('/encyclopedia');check(index.res.status===200&&index.raw.includes('QURANICALLY'),'Reference index route');
const deep=await read('/encyclopedia/black-seed');check(deep.res.status===200&&deep.raw.includes('articleView'),'Permanent human-readable encyclopedia article route');
const reader=await read('/study.html');check(reader.res.status===200&&reader.raw.includes('QURANICALLY'),'Quran Reader preserved');
const guidance=await read('/guidance');check(guidance.res.status===200&&guidance.raw.includes('When life feels overwhelming'),'Original guided journeys preserved');
const old=await read('/tibb');check(old.res.status===200&&old.res.url.includes('/encyclopedia?domain=prophetic_medicine'),'Legacy Tibb URL points to canonical encyclopedia');
const assets=await Promise.all([read('/encyclopedia.js'),read('/encyclopedia.css'),read('/favicon.svg')]);
check(assets.every(x=>x.res.status===200),'Encyclopedia JS, CSS and vector brand assets delivered');
const subjects=await read('/api/encyclopedia/subjects');check(subjects.res.status===200&&subjects.data?.subjects?.length===5,'Five live encyclopedia disciplines');
const catalog=await read('/api/encyclopedia');check(catalog.res.status===200&&catalog.data?.entries?.length===15,'Fifteen live cross-domain reference articles');
const byName=await read('/api/encyclopedia?q=talbina');check(byName.res.status===200&&byName.data?.entries?.[0]?.slug==='talbina','Search for historic medicine terms');
const medical=await read('/api/encyclopedia?domain=prophetic_medicine');check(medical.res.status===200&&medical.data?.entries?.length===8,'Eight source-linked Prophetic Medicine articles');
const religious=await read('/api/encyclopedia?domain=quranic_themes');check(religious.res.status===200&&religious.data?.entries?.length>=2,'Quranic concepts indexed separately');
const article=await read('/api/encyclopedia/black-seed');
check(article.res.status===200&&article.data?.sections?.length>=5&&article.data?.citations?.length>=2&&article.data?.related?.length>0,'Black-seed deep article, five sections, bibliography and cross-links');
check(article.data.entry.review_status==='editorial_draft'&&article.data.citations.every(x=>x.verification_status==='pending'),'Unreviewed material honestly marked pending');
check(article.data.passages?.length>0&&article.data.passages[0].arabic_excerpt.length>10,'Original Arabic quoted on-site and linked to exact bibliography');
const existing=await read('/api/journeys');check(existing.res.status===200&&existing.data?.journeys?.length===4,'Prior guidance API and D1 preserved');
const tibb=await read('/api/tibb');check(tibb.res.status===200&&tibb.data?.entries?.length===8,'Existing ingredient database preserved');
const unauth=await read('/api/admin/encyclopedia_articles');check(unauth.res.status===401,'Anonymous callers cannot access Admin');
const login=await fetch(origin+'/api/admin/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({password}),signal:AbortSignal.timeout(20000)});
check(login.status===200,'Verified private native Admin login');
const cookie=(login.headers.get('set-cookie')||'').split(';')[0];check(cookie.startsWith('__Host-qst_admin='),'Secure session cookie');
try{
 const boot=await read('/api/admin/bootstrap',cookie);
 check(boot.res.status===200&&boot.data?.encyclopedia_articles?.length===15&&boot.data?.encyclopedia_sections?.length>=70,'Canonical Admin owns same article corpus and ordered sections');
 check(boot.data?.encyclopedia_citations?.length>=30&&boot.data?.encyclopedia_links?.length>=15,'Admin bibliographies and cross-references connected');
check(boot.data?.encyclopedia_passages?.length>=12,'Admin maintains transmitted Arabic separately from editorial explanations');
 const audit=await read('/api/admin/audit',cookie);
 check(audit.res.status===200&&Array.isArray(audit.data?.records),'Revision audit available');
}finally{
 const logout=await fetch(origin+'/api/admin/logout',{method:'POST',headers:{origin,'content-type':'application/json',cookie},signal:AbortSignal.timeout(20000)});
 check(logout.status===200,'Admin logout');
 check((await read('/api/admin/encyclopedia_articles',cookie)).res.status===401,'Admin session revoked');
}
console.log('QURANICALLY ENCYCLOPEDIA LIVE ACCEPTANCE: COMPLETE PASS');
