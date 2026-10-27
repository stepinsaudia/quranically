// Read-only public checks plus a login / session / logout roundtrip; does not mutate content.
const origin='https://qst-living-knowledge-v1.stepinsaudia.workers.dev';
const headers={origin,'content-type':'application/json'};
const password=(process.env.QST_ADMIN_PASSWORD || '').trim();
if(!password || password.length<20)throw Error('Missing administrator password in GitHub Secret');
const get=async(path,cookie='')=>fetch(origin+path,{headers:cookie?{cookie}:{},signal:AbortSignal.timeout(20000)});
const homepage=await get('/');if(homepage.status!==200)throw Error('Public homepage unavailable');
const health=await get('/api/health');if(health.status!==200||(await health.json()).status!=='ok')throw Error('Database unhealthy');
const loginPage=await get('/admin');if(loginPage.status!==200||!(await loginPage.text()).includes('Editorial sign in'))throw Error('Admin sign-in page unavailable');
const before=await get('/api/admin/whoami');if(before.status!==401)throw Error('Unauthenticated editor API not denied');
const login=await fetch(origin+'/api/admin/login',{method:'POST',headers,body:JSON.stringify({password}),signal:AbortSignal.timeout(20000)});
if(login.status!==200){const brief=(await login.text()).slice(0,280);throw Error('Admin login failed with HTTP '+login.status+': '+brief);}
const cookie=(login.headers.get('set-cookie')||'').split(';')[0];if(!cookie.startsWith('__Host-qst_admin='))throw Error('Session cookie missing');
const who=await get('/api/admin/whoami',cookie);if(who.status!==200)throw Error('Signed-in editor API denied');
const logout=await fetch(origin+'/api/admin/logout',{method:'POST',headers:{...headers,cookie},signal:AbortSignal.timeout(20000)});if(logout.status!==200)throw Error('Logout failed');
const after=await get('/api/admin/whoami',cookie);if(after.status!==401)throw Error('Session not revoked');
console.log('PASS: Quranically homepage, API, login, secure session, Admin authorization and logout.');
