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
  steps:['journey_id','instruction','category','sort_order'],
  tibb_entries:['slug','title','arabic_name','scientific_name','category','tags','tradition_summary','reference_label','reference_url','source_arabic','source_meaning','health_context','safety_note','availability_note','seller_eligible','review_stage','status','sort_order'],
  encyclopedia_articles:['slug','title','arabic_title','subtitle','domain','entry_type','abstract','identity_text','alternate_names','editorial_note','review_status','status','sort_order'],
  encyclopedia_sections:['article_id','heading','section_type','body','sort_order'],
  encyclopedia_citations:['article_id','citation_type','source_title','citation_ref','source_url','source_note','verification_status','sort_order'],
  encyclopedia_links:['article_id','target_article_id','relation_label','sort_order'],
  tibb_offers:['entry_id','seller_name','product_name','country','offer_url','price_note','verification_status','status']
};
const tableFor={journeys:'journeys',sources:'sources',evidence:'evidence',steps:'steps',tibb_entries:'tibb_entries',tibb_offers:'tibb_offers',encyclopedia_articles:'encyclopedia_articles',encyclopedia_sections:'encyclopedia_sections',encyclopedia_citations:'encyclopedia_citations',encyclopedia_links:'encyclopedia_links'};
const enumVals={
 status:['draft','published','archived'],publish_status:['draft','published','archived'],
 review_status:['review_needed','reviewed','editorial_pending','scholar_reviewed','medical_reviewed'],
 source_type:['quran','hadith','seerah','tafsir','medical','classical'],
 use_policy:['approved_import','api_only','link_only','research_only'],
 evidence_type:['quran','seerah','sunnah','dua','tibb','clinical'],
 seller_eligible:['yes','no'],
 review_stage:['pending','source_reviewed','clinical_reviewed','dual_reviewed'],
 verification_status:['pending','verified','rejected']
};
const needed={journeys:['title','slug'],sources:['title','source_url','source_type'],evidence:['journey_id','source_id','evidence_type','title','reference'],steps:['journey_id','instruction'],
 tibb_entries:['slug','title','category','tradition_summary','reference_label','reference_url','safety_note'],
 encyclopedia_articles:['slug','title','domain','entry_type','abstract'],
 encyclopedia_sections:['article_id','heading','section_type','body'],
 encyclopedia_citations:['article_id','citation_type','source_title','citation_ref','source_url'],
 encyclopedia_links:['article_id','target_article_id'],
 tibb_offers:['entry_id','seller_name','product_name','offer_url']};
const textLimit={arabic:6000,meaning:5000,explanation:8000,summary:1800,clinical_note:1600,review_note:1000,tags:500,tradition_summary:2200,health_context:2200,safety_note:2200,availability_note:1200,source_arabic:3500,source_meaning:1800,abstract:2000,identity_text:1500,editorial_note:1800,body:6800,source_note:1800};
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
    const localEnums={
      encyclopedia_articles:{domain:['prophetic_medicine','quranic_themes','sunnah','seerah','living_guidance'],entry_type:['ingredient','practice','devotion','concept','historical','guidance'],review_status:['editorial_draft','source_checked','scholar_reviewed','dual_reviewed']},
      encyclopedia_sections:{section_type:['overview','scripture','transmission','historical','interpretation','science','safety','practice','methodology']},
      encyclopedia_citations:{citation_type:['quran','hadith','clinical','reference','classical'],verification_status:['pending','source_checked','expert_checked']}
    };
    if(localEnums[table]?.[k]){
      if(!localEnums[table][k].includes(txt))throw new Error('Invalid '+k);
    }else if(enumVals[k]&&!enumVals[k].includes(txt))throw new Error('Invalid '+k);
    if(table==='tibb_entries'&&k==='category'&&!['food','care','practice','spiritual'].includes(txt))throw new Error('Invalid medicine category');
    if(['source_url','audio_url','reference_url','offer_url'].includes(k)&&!allowedUrl(txt))throw new Error('Only HTTPS source URLs are allowed');
    if(['slug','journey_id','source_id','entry_id','article_id','target_article_id'].includes(k)&&!validId(txt))throw new Error('Invalid identifier');
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
// Native single-admin login. Only a derived PBKDF2 record is ever stored in Worker Secrets.
const ADMIN_COOKIE='__Host-qst_admin';
const SESSION_SECONDS=8*60*60;
const nowSeconds=()=>Math.floor(Date.now()/1000);
const toHex=u8=>Array.from(u8,x=>x.toString(16).padStart(2,'0')).join('');
async function sha256Hex(value){return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.encode(value))));}
async function passwordMatches(password,record){
  const parts=String(record||'').split(':');
  if(parts.length!==4||parts[0]!=='pbkdf2-sha256' || !/^[a-f0-9]{32}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3]))return false;
  const rounds=Number(parts[1]);if(!Number.isInteger(rounds)||rounds!==100000)return false;
  const salt=Uint8Array.from(parts[2].match(/../g),x=>parseInt(x,16));
  const key=await crypto.subtle.importKey('raw',bytes.encode(password),'PBKDF2',false,['deriveBits']);
  const derived=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:rounds,hash:'SHA-256'},key,256));
  const expected=Uint8Array.from(parts[3].match(/../g),x=>parseInt(x,16));
  let diff=0;for(let i=0;i<derived.length;i++)diff|=derived[i]^expected[i];return diff===0;
}
async function validateNativeAdmin(request,env){
  if(!env.ADMIN_PASSWORD_RECORD)return {error:'Native administrator password has not been securely provisioned',status:503};
  const cookie=request.headers.get('cookie')||'';
  const token=(cookie.match(/(?:^|;\s*)__Host-qst_admin=([A-Za-z0-9_-]{40,90})/)||[])[1];
  if(!token)return {error:'Admin sign-in required',status:401};
  const tokenHash=await sha256Hex(token);
  const session=await env.DB.prepare('SELECT expires_at FROM admin_sessions WHERE token_hash=?').bind(tokenHash).first();
  if(!session||Number(session.expires_at)<=nowSeconds())return {error:'Admin session expired or invalid',status:401};
  return {email:'Quranically administrator'};
}
async function validateEditor(request,env){
  return env.ADMIN_PASSWORD_RECORD ? validateNativeAdmin(request,env) : validateAccess(request,env);
}
async function adminAuthAction(request,env,url){
  const path=url.pathname;
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(!originValid(request))return json({error:'Origin verification failed'},403);
  if(path==='/api/admin/logout'){
    const actor=await validateNativeAdmin(request,env);
    if(!actor.error){const token=((request.headers.get('cookie')||'').match(/(?:^|;\s*)__Host-qst_admin=([A-Za-z0-9_-]{40,90})/)||[])[1];if(token)await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await sha256Hex(token)).run();}
    return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json','set-cookie':`${ADMIN_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`,'cache-control':'no-store'}});
  }
  if(path!=='/api/admin/login')return json({error:'Unknown auth route'},404);
  if(!env.ADMIN_PASSWORD_RECORD)return json({error:'Administrator login is not configured'},503);
  let password='';try{const body=await parseBody(request);password=typeof body.password==='string'?body.password.trim():'';}catch{return invalid('Invalid login request');}
  if(password.length<1||password.length>256)return invalid('Invalid password length');
  // D1-backed per-IP attempt limit; never store raw addresses or entered passwords.
  // Report only a non-sensitive operation code if the backing service rejects login.
  let authPhase='request-fingerprint';
  try {
  const addr=request.headers.get('cf-connecting-ip')||'unknown';
  const fingerprint=await sha256Hex('qst-admin-ip:'+addr);
  const now=nowSeconds();
  authPhase='attempt-read';
  const attempt=await env.DB.prepare('SELECT failures,expires_at FROM admin_auth_attempts WHERE fingerprint=?').bind(fingerprint).first();
  if(attempt&&Number(attempt.expires_at)>now&&Number(attempt.failures)>=8)return json({error:'Too many attempts. Try again later.'},429);
  authPhase='password-verify';
  const good=await passwordMatches(password,env.ADMIN_PASSWORD_RECORD);
  if(!good){
    authPhase='failed-attempt-write';
    await env.DB.prepare('INSERT INTO admin_auth_attempts(fingerprint,failures,expires_at) VALUES(?,?,?) ON CONFLICT(fingerprint) DO UPDATE SET failures=CASE WHEN expires_at<? THEN 1 ELSE failures+1 END,expires_at=CASE WHEN expires_at<? THEN ? ELSE expires_at END').bind(fingerprint,1,now+900,now,now,now+900).run();
    return json({error:'Incorrect password'},401);
  }
  authPhase='reset-attempt';
  await env.DB.prepare('DELETE FROM admin_auth_attempts WHERE fingerprint=?').bind(fingerprint).run();
  authPhase='session-token';
  const random=new Uint8Array(32);crypto.getRandomValues(random);
  const token=Array.from(random,b=>String.fromCharCode(b)).join('');
  const encoded=btoa(token).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
  const tokenHash=await sha256Hex(encoded);
  authPhase='session-write';
  await env.DB.prepare('INSERT INTO admin_sessions(token_hash,created_at,expires_at) VALUES(?,?,?)').bind(tokenHash,now,now+SESSION_SECONDS).run();
  return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','set-cookie':`${ADMIN_COOKIE}=${encoded}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}`}});
  } catch(err) {
    // Never expose the raw exception, password, or token to callers or logs.
    console.error('qst-admin-signin-error',authPhase,err?.name||'Error');
    return json({error:'Administrator login temporarily unavailable',code:authPhase},503);
  }
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
      const all=await Promise.all(Object.keys(field).map(async n=>{const order=['steps','encyclopedia_sections','encyclopedia_citations','encyclopedia_links'].includes(n)?'sort_order,id':'updated_at DESC';return [n,(await env.DB.prepare(`SELECT * FROM ${n} ORDER BY ${order} LIMIT 300`).all()).results];}));
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
  // A commercial listing may be public only after explicit independent
  // verification and only for a seller-eligible ingredient—not for procedures
  // or devotional practices. The public API applies the same filter.
  if(entity==='tibb_offers'){
    const previous=request.method==='POST'?null:await env.DB.prepare('SELECT entry_id,verification_status,status FROM tibb_offers WHERE id=?').bind(id).first();
    const targetEntry=values.entry_id||previous?.entry_id;
    const targetVerification=values.verification_status||previous?.verification_status||'pending';
    const targetStatus=values.status||previous?.status||'draft';
    if(targetStatus==='published'){
      if(targetVerification!=='verified')return invalid('Seller verification required before publishing');
      const parent=await env.DB.prepare('SELECT seller_eligible,status FROM tibb_entries WHERE id=?').bind(targetEntry).first();
      if(!parent||parent.seller_eligible!=='yes'||parent.status!=='published')return invalid('Offers require a published seller-eligible ingredient');
      const offerUrl=values.offer_url||(request.method==='POST'?'':(await env.DB.prepare('SELECT offer_url FROM tibb_offers WHERE id=?').bind(id).first())?.offer_url);
      if(!offerUrl||!allowedUrl(offerUrl))return invalid('A valid HTTPS seller URL is required');
    }
  }
  if(entity==='encyclopedia_articles'&&(values.status==='published')){
    if(request.method==='POST')return invalid('Create the article as draft and add sections and citations before publication');
    const sections=await env.DB.prepare('SELECT COUNT(*) AS n FROM encyclopedia_sections WHERE article_id=?').bind(id).first();
    const refs=await env.DB.prepare('SELECT COUNT(*) AS n FROM encyclopedia_citations WHERE article_id=?').bind(id).first();
    if((sections?.n||0)<3||(refs?.n||0)<1)return invalid('Publication requires at least three sections and one traceable reference');
  }
  if(entity==='encyclopedia_links'&&values.article_id===values.target_article_id)return invalid('Cannot link an article to itself');
  const fields=Object.keys(values);const vals=Object.values(values);
  try{
    if(request.method==='POST'){
      await env.DB.prepare(`INSERT INTO ${entity}(id,${fields.join(',')}) VALUES(?,${fields.map(()=>'?').join(',')})`).bind(id,...vals).run();
      await audit(env.DB,identity.email,'create',entity,id);
    }else{
      if(!route[1])return invalid('Record ID required');
      const before=await env.DB.prepare(`SELECT id FROM ${entity} WHERE id=?`).bind(id).first();
      if(!before)return json({error:'Record not found'},404);
      const hasUpdated=['sources','journeys','evidence','tibb_entries','tibb_offers','encyclopedia_articles'].includes(entity);
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

  if(pathname==='/api/encyclopedia/subjects'){
    const groups=(await env.DB.prepare("SELECT domain,COUNT(*) AS entries FROM encyclopedia_articles WHERE status='published' GROUP BY domain ORDER BY domain").all()).results;
    return json({subjects:groups,review_policy:'Content is editorially sourced; independent expert verification is pending unless explicitly shown.'});
  }
  if(pathname==='/api/encyclopedia'){
    const q=(url.searchParams.get('q')||'').trim().slice(0,100);
    const domain=(url.searchParams.get('domain')||'').trim();
    const letter=(url.searchParams.get('letter')||'').trim().toUpperCase();
    if(domain&&!['prophetic_medicine','quranic_themes','sunnah','seerah','living_guidance'].includes(domain))return invalid('Invalid encyclopedia subject');
    if(letter&&!/^[A-Z]$/.test(letter))return invalid('Invalid alphabetical index');
    let query="SELECT id,slug,title,arabic_title,subtitle,domain,entry_type,abstract,alternate_names,review_status,updated_at FROM encyclopedia_articles WHERE status='published'";
    const params=[];
    if(domain){query+=' AND domain=?';params.push(domain);}
    if(letter){query+=' AND UPPER(SUBSTR(title,1,1))=?';params.push(letter);}
    if(q){query+=' AND (title LIKE ? OR arabic_title LIKE ? OR subtitle LIKE ? OR alternate_names LIKE ? OR abstract LIKE ?)';const pat='%'+q.replace(/[%_]/g,'')+'%';params.push(pat,pat,pat,pat,pat);}
    query+=' ORDER BY title ASC LIMIT 120';
    const entries=(await env.DB.prepare(query).bind(...params).all()).results;
    return json({entries,filters:{q,domain,letter},notice:'Source-linked encyclopedia under editorial review. Do not equate citation with clinical approval.'});
  }
  if(pathname.startsWith('/api/encyclopedia/')){
    const slug=decodeURIComponent(pathname.slice('/api/encyclopedia/'.length));
    if(!validId(slug))return invalid('Invalid encyclopedia entry');
    const entry=await env.DB.prepare("SELECT * FROM encyclopedia_articles WHERE slug=? AND status='published'").bind(slug).first();
    if(!entry)return json({error:'Entry not published'},404);
    const [sections,citations,links]=await Promise.all([
      env.DB.prepare('SELECT id,heading,section_type,body,sort_order FROM encyclopedia_sections WHERE article_id=? ORDER BY sort_order,id').bind(entry.id).all(),
      env.DB.prepare('SELECT id,citation_type,source_title,citation_ref,source_url,source_note,verification_status,sort_order FROM encyclopedia_citations WHERE article_id=? ORDER BY sort_order,id').bind(entry.id).all(),
      env.DB.prepare("SELECT l.relation_label,a.slug,a.title,a.domain FROM encyclopedia_links l JOIN encyclopedia_articles a ON a.id=l.target_article_id WHERE l.article_id=? AND a.status='published' ORDER BY l.sort_order,l.id").bind(entry.id).all()
    ]);
    if(!sections.results.length||!citations.results.length)return json({error:'Encyclopedia entry incomplete'},503);
    return json({entry,sections:sections.results,citations:citations.results,related:links.results,editorial_notice:'Primary source references, interpretation and contemporary medical evidence are separate layers. Scholar and clinical review statuses are not inferred.'});
  }
  if(pathname==='/api/tibb'){
    const q=(url.searchParams.get('q')||'').trim().slice(0,90);
    const category=(url.searchParams.get('category')||'').trim();
    if(category&& !['food','care','practice','spiritual'].includes(category))return invalid('Invalid category');
    let query="SELECT id,slug,title,arabic_name,scientific_name,category,tags,tradition_summary,reference_label,review_stage,seller_eligible FROM tibb_entries WHERE status='published'";
    const params=[];
    if(category){query+=' AND category=?';params.push(category);}
    if(q){
      query+=" AND (title LIKE ? OR arabic_name LIKE ? OR scientific_name LIKE ? OR tags LIKE ? OR tradition_summary LIKE ? OR reference_label LIKE ?)";
      const pattern='%'+q.replace(/[%_]/g,'')+'%';params.push(...Array(6).fill(pattern));
    }
    query+=' ORDER BY sort_order,title LIMIT 48';
    const result=await env.DB.prepare(query).bind(...params).all();
    return json({entries:result.results,q,category,notice:'Editorial source-linked pilot. Review pending is not clinical validation.'});
  }
  if(pathname.startsWith('/api/tibb/offers/')){
    const slug=decodeURIComponent(pathname.slice('/api/tibb/offers/'.length));
    if(!validId(slug))return invalid('Invalid entry slug');
    const entry=await env.DB.prepare("SELECT id,seller_eligible FROM tibb_entries WHERE slug=? AND status='published'").bind(slug).first();
    if(!entry)return json({error:'Not found'},404);
    if(entry.seller_eligible!=='yes')return json({offers:[],notice:'Commercial listings are not applicable to this practice.'});
    const offers=(await env.DB.prepare("SELECT seller_name,product_name,country,offer_url,price_note FROM tibb_offers WHERE entry_id=? AND status='published' AND verification_status='verified' ORDER BY seller_name LIMIT 20").bind(entry.id).all()).results;
    return json({offers,notice:offers.length?'Offers are independent third-party sellers; not medical endorsements.':'No independently verified seller listings yet.'});
  }
  if(pathname.startsWith('/api/tibb/')){
    const slug=decodeURIComponent(pathname.slice('/api/tibb/'.length));
    if(!validId(slug))return invalid('Invalid entry slug');
    const entry=await env.DB.prepare("SELECT * FROM tibb_entries WHERE slug=? AND status='published'").bind(slug).first();
    if(!entry)return json({error:'Not found'},404);
    return json({entry,notice:'Religious source and contemporary clinical evidence are separate. Educational content is not individual medical advice.'});
  }
  if(pathname==='/api/sources'){
    return json({sources:(await env.DB.prepare('SELECT id,title,organization,source_url,source_type,use_policy,review_status FROM sources ORDER BY title').all()).results});
  }
  return json({error:'Unknown API route'},404);
}
// Cloudflare Static Assets redirects *.html to extensionless paths. Follow only
// whitelisted asset redirects inside the trusted ASSETS binding, never through
// the public Worker route (which would create an Admin login redirect loop).
async function serveProtectedAdminAsset(request,env,assetPath){
  const origin=new URL(request.url).origin;
  for(let i=0;i<3;i++){
    const res=await env.ASSETS.fetch(new Request(new URL(assetPath,origin),request));
    if([301,302,307,308].includes(res.status)){
      const loc=res.headers.get('location');
      if(!loc)return new Response('Admin asset redirect unavailable',{status:503});
      const next=new URL(loc,origin);
      if(next.origin!==origin||!['/admin','/admin.html','/admin-login','/admin-login.html'].includes(next.pathname))
        return new Response('Invalid Admin asset redirect',{status:503});
      assetPath=next.pathname;
      continue;
    }
    return new Response(res.body,{status:res.status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
  }
  return new Response('Admin asset redirect loop',{status:503});
}
export default {
  async fetch(request,env){
    const url=readUrl(request),path=url.pathname;
    try{
      if(path==='/api/admin/login'||path==='/api/admin/logout')return await adminAuthAction(request,env,url);
      if(path==='/admin'||path==='/admin.html'||path.startsWith('/api/admin')){
        const actor=await validateEditor(request,env);
        if(path.startsWith('/api/admin'))return adminApi(request,env,url,actor);
        if(actor.error){
          if(path==='/admin'&&env.ASSETS){
            return await serveProtectedAdminAsset(request,env,'/admin-login');
          }
          return new Response('Administrator sign-in required',{status:actor.status,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
        }
        return await serveProtectedAdminAsset(request,env,'/admin');
      }
      if(path==='/tibb'||path==='/tibb/'||path==='/tibb.html'){
        const entry=(url.searchParams.get('entry')||'').trim();
        const target=validId(entry)?('/encyclopedia/'+entry):('/encyclopedia?domain=prophetic_medicine');
        return Response.redirect(new URL(target,url.origin),302);
      }
      if(path==='/encyclopedia'||path==='/encyclopedia/'||/^\\/encyclopedia\\/[a-z0-9-]{1,85}\\/?$/.test(path)){
        // Dedicated human-readable article URL, served through the canonical encyclopedia shell.
        return env.ASSETS.fetch(new Request(new URL('/encyclopedia',url.origin),request));
      }
      if(path.startsWith('/api/'))return await publicApi(request,env,url);
      // Never serve admin HTML directly without Access checking.
      return env.ASSETS.fetch(request);
    }catch(e){return path.startsWith('/api/')?json({error:'Service unavailable'},503):new Response('Service unavailable',{status:503});}
  }
};
