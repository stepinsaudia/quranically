// Read-only production diagnostics. No login credentials or database writes.
const origin='https://qst-living-knowledge-v1.stepinsaudia.workers.dev';
for(const path of ['/admin','/admin-login.html','/admin-login','/api/admin/whoami','/api/health']){
 try{
  const res=await fetch(origin+path,{signal:AbortSignal.timeout(16000)});
  const body=await res.text();
  console.log(path,'status=',res.status,'final=',res.url,'type=',res.headers.get('content-type'),'location=',res.headers.get('location'),'snippet=',JSON.stringify(body.slice(0,380)));
 }catch(e){console.log(path,'ERROR',e.message)}
}
