// Dedicated Quran–Seerah–Tibb Worker: no bindings to any existing project.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const invalid=(detail='Invalid request')=>json({error:detail},400);
const readUrl=(request)=>new URL(request.url);
const validId=s=>typeof s==='string' && /^[a-z0-9][a-z0-9-]{0,85}$/.test(s);
const allowedUrl=s=>!s|| (typeof s==='string'&&s.length<1200&&/^https:\/\//i.test(s));
const field={
  journeys:['slug','title','kicker','summary','category','tags','clinical_note','status'],
  sources:['title','organization','source_url','source_type','license_notes','use_policy','review_status'],
  evidence:['journey_id','source_id','evidence_type','title','reference','arabic','transliteration','meaning','explanation','source_url','audio_url','source_grade','review_note','review_status','publish_status','sort_order'],
  steps:['journey_id','instruction','category','sort_order']
};
const tableFor={journeys:'journeys',sources:'sources',evidence:'evidence',steps:'steps'};
const enumVals={
 status:['draft','published','archived'],publish_status:['draft','published','archived'],
 review_status:['review_needed','reviewed','editorial_pending','scholar_reviewed','medical_reviewed'],
 source_type:['quran','hadith','seerah','tafsir','medical','classical'],
 use_policy:['approved_import','api_only','link_only','research_only'],
 evidence_type:['quran','seerah','sunnah','dua','tibb','clinical']
};
const needed={journeys:['title','slug'],sources:['title','source_url','source_type'],evidence:['journey_id','source_id','evidence_type','title','reference'],steps:['journey_id','instruction']};
const textLimit={arabic:6000,meaning:5000,explanation:8000,summary:1800,clinical_note:1600,review_note:1000,tags:500};
function normalize(table,payload,method){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Expected an object');
  const keys=Object.keys(payload);
  if(!keys.length||keys.some(k=>!field[table].includes(k)))throw new Error('Unexpected or empty fields');
  const output={};
  for(const k of keys){
    const val=payload[k];
    if(k==='sort_order'){
      if(!Number.isSafeInteger(Number(val))||Math.abs(Number(val))>100000)throw new Error('Invalid sort order');
      output[k]=Number(val);continue;
    }
    if(typeof val!=='string'||val.length>(textLimit[k]||1200))throw new Error('Invalid '+k);
    const txt=val.trim();
    if(enumVals[k]&&!enumVals[k].includes(txt))throw new Error('Invalid '+k);
    if(['source_url','audio_url'].includes(k)&&!allowedUrl(txt))throw new Error('Only HTTPS source URLs are allowed');
    if(['slug','journey_id','source_id'].includes(k)&&!validId(txt))throw new Error('Invalid identifier');
    output[k]=txt;
  }
  if(method==='POST'&&needed[table].some(k=>!output[k]))throw new Error('Missing required field');
  return output;
}
function decode64(input){
  const raw=atob(input.replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(raw,ch=>ch.charCodeAt(0));
}
const bytes=new TextEncoder();
let keysCache={value:null,at:0,domain:''};
async function validateAccess(request,env){
  const domain=(env.ACCESS_TEAM_DOMAIN||'').trim().replace(/^https?:\/\//,'').replace(/\/$/,'');
  const audience=(env.ACCESS_AUD||'').trim();
  const email=(env.ADMIN_EMAIL||'').toLowerCase().trim();
  if(!domain||!audience||!email) return {error:'Access authentication is not configured',status:503};
  if(!/^[a-z0-9.-]+\.cloudflareaccess\.com$/i.test(domain))return {error:'Access domain is invalid',status:503};
  const token=request.headers.get('cf-access-jwt-assertion')||((request.headers.get('cookie')||'').match(/(?:^|;\s*)CF_Authorization=([^;]+)/)||[])[1];
  if(!token||token.length>10000)return {error:'Cloudflare Access sign-in required',status:401};
  try{
    const chunks=token.split('.');if(chunks.length!==3)return {error:'Invalid login token',status:401};
    const header=JSON.parse(new TextDecoder().decode(decode64(chunks[0])));
    const claims=JSON.parse(new TextDecoder().decode(decode64(chunks[1])));
    if(header.alg!=='RS256'||typeof header.kid!=='string')return {error:'Invalid login token',status:401};
    const now=Math.floor(Date.now()/1000);
    if(!(claims.exp>now) || (claims.nbf != null && claims.nbf>now))return {error:'Expired or premature login',status:401};
    if((claims.iss||'').replace(/\/$/,'')!==`https://${domain}`)return {error:'Untrusted login issuer',status:403};
    const aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
    if(!aud.includes(audience)||String(claims.email||'').toLowerCase()!==email)return {error:'Not an authorized editor',status:403};
    if(!keysCache.value||keysCache.domain!==domain||Date.now()-keysCache.at>600000){
      const r=await fetch(`https://${domain}/cdn-cgi/access/certs`);
      if(!r.ok)throw Error('JWKS unavailable');
      const jwks=await r.json();keysCache={value:jwks.keys,at:Date.now(),domain};
    }
    const key=keysCache.value.find(k=>k.kid===header.kid);
    if(!key)return {error:'Unknown signing key',status:403};
    const imported=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    const verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',imported,decode64(chunks[2]),bytes.encode(`${chunks[0]}.${chunks[1]}`));
    if(!verified)return {error:'Invalid token signature',status:403};
    return {email};
  }catch(e){return {error:'Access token verification failed',status:403};}
}
// Do not allow cross-origin writes even with an authenticated browser session.
function originValid(req){const o=req.headers.get('origin');return !!o&&o===new URL(req.url).origin;}
async function parseBody(req){
  if(!(req.headers.get('content-type')||'').includes('application/json'))throw Error('JSON body required');
  const n=Number(req.headers.get('content-length')||'0');
  if(n>24000)throw Error('Body too large');
  const body=await req.text();if(body.length>24000)throw Error('Body too large');
  return JSON.parse(body);
}
async function audit(db,actor,action,table,id){await db.prepare('INSERT INTO audit_log(id,actor,operation,table_name,record_id) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor,action,table,id).run();}
async function adminApi(request,env,url,identity){
  if(identity.error)return json({error:identity.error},identity.status);
  const route=url.pathname.replace(/^\/api\/admin\/?/,'').split('/').filter(Boolean);
  const entity=route[0]||'bootstrap';
  if(request.method==='GET'){
    if(entity==='whoami')return json({email:identity.email,protected:true});
    if(entity==='bootstrap'){
      const all=await Promise.all(Object.keys(field).map(async n=>[n,(await env.DB.prepare(`SELECT * FROM ${n} ORDER BY ${n==='steps'?'sort_order':'updated_at DESC'} LIMIT 300`).all()).results]));
      return json(Object.fromEntries(all));
    }
    if(entity==='audit')return json({records:(await env.DB.prepare('SELECT * FROM audit_log ORDER BY changed_at DESC LIMIT 150').all()).results});
    if(!field[entity])return json({error:'Unknown collection'},404);
    return json({records:(await env.DB.prepare(`SELECT * FROM ${entity} ORDER BY id LIMIT 300`).all()).results});
  }
  if(!['POST','PUT','PATCH'].includes(request.method)||!field[entity])return json({error:'Unsupported action'},405);
  if(!originValid(request))return json({error:'Cross-origin edit blocked'},403);
  let values;
  try{values=normalize(entity,await parseBody(request),request.method==='POST'?'POST':'PUT');}
  catch(err){return invalid(String(err.message||err));}
  const id=route[1]||crypto.randomUUID();
  if(!validId(id))return invalid('Invalid record ID');
  const fields=Object.keys(values);const vals=Object.values(values);
  try{
    if(request.method==='POST'){
      await env.DB.prepare(`INSERT INTO ${entity}(id,${fields.join(',')}) VALUES(?,${fields.map(()=>'?').join(',')})`).bind(id,...vals).run();
      await audit(env.DB,identity.email,'create',entity,id);
    }else{
      if(!route[1])return invalid('Record ID required');
      const before=await env.DB.prepare(`SELECT id FROM ${entity} WHERE id=?`).bind(id).first();
      if(!before)return json({error:'Record not found'},404);
      const hasUpdated=['sources','journeys','evidence'].includes(entity);
      await env.DB.prepare(`UPDATE ${entity} SET ${fields.map(k=>k+'=?').join(',')}${hasUpdated?",updated_at=datetime('now')":''} WHERE id=?`).bind(...vals,id).run();
      await audit(env.DB,identity.email,'update',entity,id);
    }
    return json({ok:true,id});
  }catch(e){return json({error:'Could not save. Check referenced IDs, uniqueness and required fields.'},409);}
}
async function publicApi(request,env,url){
  const pathname=url.pathname;
  if(pathname==='/api/health'){
    try{const ping=await env.DB.prepare('SELECT COUNT(*) AS count FROM journeys').first();return json({status:'ok',service:'qst-living-knowledge-v1',journeys:ping?.count||0});}
    catch(e){return json({status:'database_not_ready',service:'qst-living-knowledge-v1'},503);}
  }
  if(request.method!=='GET')return json({error:'Method not allowed'},405);
  if(pathname==='/api/journeys'){
    const q=(url.searchParams.get('q')||'').trim().slice(0,100);
    let results;
    if(q){const pattern='%'+q.replace(/[%_]/g,'')+'%'; results=(await env.DB.prepare("SELECT id,slug,title,kicker,summary,category,tags FROM journeys WHERE status='published' AND (title LIKE ? OR summary LIKE ? OR tags LIKE ? OR category LIKE ?) ORDER BY title LIMIT 24").bind(pattern,pattern,pattern,pattern).all()).results;}
    else results=(await env.DB.prepare("SELECT id,slug,title,kicker,summary,category,tags FROM journeys WHERE status='published' ORDER BY title LIMIT 24").all()).results;
    return json({journeys:results,q});
  }
  if(pathname.startsWith('/api/journey/')){
    const slug=decodeURIComponent(pathname.slice('/api/journey/'.length));
    if(!validId(slug))return invalid('Invalid journey');
    const journey=await env.DB.prepare("SELECT * FROM journeys WHERE slug=? AND status='published'").bind(slug).first();
    if(!journey)return json({error:'Not found'},404);
    const evidence=(await env.DB.prepare("SELECT e.*,s.title AS source_title,s.organization AS source_organization,s.source_url AS source_home,s.use_policy AS reuse_policy FROM evidence e JOIN sources s ON e.source_id=s.id WHERE e.journey_id=? AND e.publish_status='published' ORDER BY e.sort_order,e.id").bind(journey.id).all()).results;
    const steps=(await env.DB.prepare('SELECT id,instruction,category,sort_order FROM steps WHERE journey_id=? ORDER BY sort_order,id').bind(journey.id).all()).results;
    return json({journey,evidence,steps,pilot_notice:'Content is a referenced editorial pilot awaiting independent scholarly and, where needed, medical review.'});
  }
  if(pathname==='/api/sources'){
    return json({sources:(await env.DB.prepare('SELECT id,title,organization,source_url,source_type,use_policy,review_status FROM sources ORDER BY title').all()).results});
  }
  return json({error:'Unknown API route'},404);
}
export default {
  async fetch(request,env){
    const url=readUrl(request),path=url.pathname;
    try{
      if(path==='/admin'||path==='/admin.html'||path.startsWith('/api/admin')){
        const actor=await validateAccess(request,env);
        if(path.startsWith('/api/admin'))return adminApi(request,env,url,actor);
        if(actor.error)return new Response(`<html><meta charset="utf-8"><title>Protected Admin</title><body style="font:16px system-ui;padding:3rem;max-width:700px"><h1>Editorial Admin — protected</h1><p>${actor.status===503?'Cloudflare Access must be configured before administration is available.':'Please sign in through the configured Cloudflare Access application.'}</p></body></html>`,{status:actor.status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
        const assetURL=new URL('/admin.html',url.origin);return env.ASSETS.fetch(new Request(assetURL,request));
      }
      if(path.startsWith('/api/'))return await publicApi(request,env,url);
      // Never serve admin HTML directly without Access checking.
      return env.ASSETS.fetch(request);
    }catch(e){return path.startsWith('/api/')?json({error:'Service unavailable'},503):new Response('Service unavailable',{status:503});}
  }
};
