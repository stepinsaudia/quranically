// Quranically v2 production acceptance, no content mutation.
// Checks public frontend, isolated D1-backed medicine search, seller safeguards, protected Admin, and logout.
const origin='https://qst-living-knowledge-v1.stepinsaudia.workers.dev';
const password=(process.env.QST_ADMIN_PASSWORD||'').trim();
if(password.length<20)throw Error('Admin credential unavailable for protected QA');
async function get(path,cookie=''){
 const r=await fetch(origin+path,{headers:cookie?{cookie}:{},signal:AbortSignal.timeout(20000)});
 const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data=null}
 return {r,raw,data};
}
const homepage=await get('/');if(homepage.r.status!==200||!homepage.raw.includes('Prophetic Medicine'))throw Error('Canonical homepage integration unavailable');
console.log('PASS homepage integration');
const tibb=await get('/tibb');if(tibb.r.status!==200||!tibb.raw.includes('Knowledge before claims'))throw Error('Dedicated Tibb frontend unavailable');
console.log('PASS dedicated medicine frontend');
const assets=await Promise.all([get('/tibb.js'),get('/tibb.css')]);if(assets.some(x=>x.r.status!==200))throw Error('Medicine client assets unavailable');
console.log('PASS medicine frontend assets');
const list=await get('/api/tibb');if(list.r.status!==200||list.data?.entries?.length<8)throw Error('D1 medicine collection incomplete');
const x=list.data.entries;if(!x.some(e=>e.slug==='honey')||!x.some(e=>e.slug==='ruqyah'))throw Error('Missing published medicine references');
console.log('PASS live medicine catalog: '+x.length+' entries');
const search=await get('/api/tibb?q=black%20seed');if(search.r.status!==200||search.data.entries.length!==1||search.data.entries[0].slug!=='black-seed')throw Error('Search incorrect');
const classified=await get('/api/tibb?category=food');if(classified.r.status!==200||classified.data.entries.some(e=>e.category!=='food'))throw Error('Category filtering incorrect');
console.log('PASS medicine search and filters');
const detail=await get('/api/tibb/black-seed');if(detail.r.status!==200||!detail.data?.entry?.reference_url?.includes('bukhari:5688')||!detail.data?.entry?.safety_note||!detail.data?.entry?.source_arabic||!detail.data?.entry?.source_meaning)throw Error('Missing original reference or caution');
const sellers=await get('/api/tibb/offers/black-seed');if(sellers.r.status!==200||!Array.isArray(sellers.data?.offers))throw Error('Seller route failed');
if(sellers.data.offers.length)throw Error('Unexpected published seller offer in pilot');
const practice=await get('/api/tibb/offers/ruqyah');if(practice.r.status!==200||practice.data.offers.length!==0)throw Error('Ineligible practice has seller offers');
console.log('PASS primary reference detail and no unverified seller claims');
const blocked=await get('/api/admin/tibb_entries');if(blocked.r.status!==401)throw Error('Medicine Admin unprotected');
const login=await fetch(origin+'/api/admin/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({password}),signal:AbortSignal.timeout(20000)});
if(login.status!==200)throw Error('Admin login HTTP '+login.status);
const cookie=(login.headers.get('set-cookie')||'').split(';')[0];if(!cookie.startsWith('__Host-qst_admin='))throw Error('Secure Admin session cookie not received');
try{
 const admin=await get('/api/admin/bootstrap',cookie);
 if(admin.r.status!==200||admin.data?.tibb_entries?.length<8||!Array.isArray(admin.data?.tibb_offers))throw Error('Canonical Admin medicine modules not synced');
 console.log('PASS protected canonical Admin with '+admin.data.tibb_entries.length+' Tibb entries and '+admin.data.tibb_offers.length+' staged offers');
}finally{
 const logout=await fetch(origin+'/api/admin/logout',{method:'POST',headers:{origin,'content-type':'application/json',cookie},signal:AbortSignal.timeout(20000)});
 if(logout.status!==200)throw Error('Admin logout error');
 const after=await get('/api/admin/tibb_entries',cookie);if(after.r.status!==401)throw Error('Admin session not revoked');
 console.log('PASS session logout and revocation');
}
console.log('QURANICALLY V2 ACCEPTANCE PASS');
