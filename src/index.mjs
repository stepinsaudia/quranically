import {liveSourceSearch,CONNECTORS} from './source-discovery.mjs';
// Dedicated Quran–Seerah–Tibb Worker: no bindings to any existing project.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const invalid=(detail='Invalid request')=>json({error:detail},400);
const readUrl=(request)=>new URL(request.url);
const validId=s=>typeof s==='string' && /^[a-z0-9][a-z0-9-]{0,85}$/.test(s);
const allowedUrl=s=>!s|| (typeof s==='string'&&s.length<1200&&/^https:\/\//i.test(s));
const field={
  discipline_pathways:['domain','label','href','status','sort_order'],
  page_seo:['title','description','social_image_url','social_image_alt','status'],
  homepage_disciplines:['title','description','image_url','image_alt','status','sort_order'],
  site_panels:['kicker','heading','subtitle','body','image_url','image_alt','status','sort_order'],
  site_links:['section','label','href','status','sort_order'],
  discipline_pages:['eyebrow','heading','introduction','pathway_labels','hero_image_url','hero_image_alt','status','sort_order'],
  journeys:['slug','title','kicker','summary','category','tags','clinical_note','status'],
  sources:['title','organization','source_url','source_type','license_notes','use_policy','review_status'],
  evidence:['journey_id','source_id','evidence_type','title','reference','arabic','transliteration','meaning','explanation','source_url','audio_url','source_grade','review_note','review_status','publish_status','sort_order'],
  steps:['journey_id','instruction','category','sort_order'],
  tibb_entries:['slug','title','arabic_name','scientific_name','category','tags','tradition_summary','reference_label','reference_url','source_arabic','source_meaning','health_context','safety_note','availability_note','seller_eligible','review_stage','status','sort_order'],
  encyclopedia_articles:['slug','title','arabic_title','subtitle','domain','entry_type','abstract','identity_text','alternate_names','editorial_note','review_status','status','sort_order'],
  encyclopedia_sections:['article_id','heading','section_type','body','sort_order'],
  encyclopedia_citations:['article_id','citation_type','source_title','citation_ref','source_url','source_note','verification_status','sort_order'],
  encyclopedia_links:['article_id','target_article_id','relation_label','sort_order'],
  encyclopedia_passages:['article_id','citation_id','passage_type','arabic_excerpt','editorial_meaning','context_note','review_status','status','sort_order'],
  tibb_offers:['entry_id','seller_name','product_name','country','offer_url','price_note','verification_status','status']
};
const tableFor={discipline_pathways:'discipline_pathways',page_seo:'page_seo',homepage_disciplines:'homepage_disciplines',site_panels:'site_panels',site_links:'site_links',discipline_pages:'discipline_pages',journeys:'journeys',sources:'sources',evidence:'evidence',steps:'steps',tibb_entries:'tibb_entries',tibb_offers:'tibb_offers',encyclopedia_articles:'encyclopedia_articles',encyclopedia_sections:'encyclopedia_sections',encyclopedia_citations:'encyclopedia_citations',encyclopedia_links:'encyclopedia_links',encyclopedia_passages:'encyclopedia_passages'};
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
const needed={discipline_pathways:['domain','label','href'],page_seo:['title','description'],homepage_disciplines:['title','description'],site_panels:['heading'],site_links:['section','label','href'],discipline_pages:['heading','introduction'],journeys:['title','slug'],sources:['title','source_url','source_type'],evidence:['journey_id','source_id','evidence_type','title','reference'],steps:['journey_id','instruction'],
 tibb_entries:['slug','title','category','tradition_summary','reference_label','reference_url','safety_note'],
 encyclopedia_articles:['slug','title','domain','entry_type','abstract'],
 encyclopedia_sections:['article_id','heading','section_type','body'],
 encyclopedia_citations:['article_id','citation_type','source_title','citation_ref','source_url'],
 encyclopedia_links:['article_id','target_article_id'],
 encyclopedia_passages:['article_id','citation_id','passage_type','arabic_excerpt'],
 tibb_offers:['entry_id','seller_name','product_name','offer_url']};
const textLimit={social_image_url:1200,social_image_alt:220,description:900,kicker:180,subtitle:900,image_url:1200,image_alt:220,label:150,href:450,section:80,introduction:1500,pathway_labels:350,hero_image_alt:200,eyebrow:140,heading:180,hero_image_url:1200,arabic:6000,meaning:5000,explanation:8000,summary:1800,clinical_note:1600,review_note:1000,tags:500,tradition_summary:2200,health_context:2200,safety_note:2200,availability_note:1200,source_arabic:3500,source_meaning:1800,abstract:2000,identity_text:1500,editorial_note:1800,body:6800,source_note:1800,arabic_excerpt:3800,editorial_meaning:1800,context_note:1600};
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
      encyclopedia_citations:{citation_type:['quran','hadith','clinical','reference','classical'],verification_status:['pending','source_checked','expert_checked']},
      encyclopedia_passages:{passage_type:['quran','hadith'],review_status:['pending','source_checked','scholar_reviewed']}
    };
    if(localEnums[table]?.[k]){
      if(!localEnums[table][k].includes(txt))throw new Error('Invalid '+k);
    }else if(enumVals[k]&&!enumVals[k].includes(txt))throw new Error('Invalid '+k);
    if(table==='discipline_pathways'&&k==='domain'&&!['quranic_themes','sunnah','seerah','prophetic_medicine','living_guidance'].includes(txt))throw new Error('Invalid discipline pathway');
    if(table==='site_links'&&k==='section'&&!['header','footer_explore','footer_resources','footer_about','footer_legal'].includes(txt))throw new Error('Invalid site link section');
    if(['site_links','discipline_pathways'].includes(table)&&k==='href'&&!( /^\/(?!\/)[a-zA-Z0-9/?#=&._%~-]*$/.test(txt) || /^https:\/\/[^\s<>"']+$/.test(txt)))throw new Error('Only internal paths or HTTPS links are accepted');
    if(table==='tibb_entries'&&k==='category'&&!['food','care','practice','spiritual'].includes(txt))throw new Error('Invalid medicine category');
    if(['source_url','audio_url','reference_url','offer_url','hero_image_url','image_url','social_image_url'].includes(k)&&!allowedUrl(txt))throw new Error('Only HTTPS source URLs are allowed');
    if(['slug','journey_id','source_id','entry_id','article_id','target_article_id','citation_id'].includes(k)&&!validId(txt))throw new Error('Invalid identifier');
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

  if(entity==='media'){
    if(request.method==='GET'){
      const rows=(await env.DB.prepare("SELECT id,alt_text,mime_type,byte_size,status,created_at FROM media_assets ORDER BY created_at DESC LIMIT 120").all()).results;
      return json({records:rows,notice:'Limited, Admin-uploaded WebP assets in canonical D1. Maximum 450 KB per file.'});
    }
    if(!originValid(request))return json({error:'Cross-origin edit blocked'},403);
    if(request.method==='POST'&&route[1]==='upload'){
      if((request.headers.get('content-type')||'').split(';')[0]!=='image/webp')return invalid('Optimised WebP image required');
      const length=Number(request.headers.get('content-length')||'0');
      if(length>450000)return invalid('WebP image exceeds 450 KB');
      const payload=new Uint8Array(await request.arrayBuffer());
      if(payload.byteLength<32||payload.byteLength>450000)return invalid('WebP image must be between 32 bytes and 450 KB');
      if(String.fromCharCode(...payload.subarray(0,4))!=='RIFF'||String.fromCharCode(...payload.subarray(8,12))!=='WEBP')return invalid('Invalid WebP signature');
      const count=await env.DB.prepare("SELECT COUNT(*) AS n FROM media_assets WHERE status='active'").first();
      if(Number(count?.n||0)>=100)return invalid('The managed image quota is full. Archive unused assets first.');
      const alt=String(request.headers.get('x-image-alt')||'').trim().slice(0,180);
      const id='m-'+crypto.randomUUID();
      await env.DB.prepare("INSERT INTO media_assets(id,alt_text,mime_type,byte_size,payload) VALUES(?,?,?,?,?)").bind(id,alt,'image/webp',payload.byteLength,payload).run();
      await audit(env.DB,identity.email,'upload','media_assets',id);
      return json({ok:true,id,url:new URL('/media/'+id+'.webp',url.origin).href,byte_size:payload.byteLength});
    }
    if(request.method==='PUT'&&route[1]){
      if(!validId(route[1]))return invalid('Invalid image ID');
      const body=await parseBody(request);
      if(body.status!=='archived'&&body.status!=='active')return invalid('Invalid image status');
      const found=await env.DB.prepare('SELECT id FROM media_assets WHERE id=?').bind(route[1]).first();
      if(!found)return json({error:'Media record not found'},404);
      await env.DB.prepare("UPDATE media_assets SET status=?,updated_at=datetime('now') WHERE id=?").bind(body.status,route[1]).run();
      await audit(env.DB,identity.email,'update','media_assets',route[1]);
      return json({ok:true,id:route[1]});
    }
    return json({error:'Unsupported media action'},405);
  }

  if(request.method==='GET'){
    if(entity==='whoami')return json({email:identity.email,protected:true});
    if(entity==='bootstrap'){
      const all=await Promise.all(Object.keys(field).map(async n=>{const order=['steps','encyclopedia_sections','encyclopedia_citations','encyclopedia_links','encyclopedia_passages'].includes(n)?'sort_order,id':'updated_at DESC';return [n,(await env.DB.prepare(`SELECT * FROM ${n} ORDER BY ${order} LIMIT 300`).all()).results];}));
      return json(Object.fromEntries(all));
    }
    if(entity==='audit')return json({records:(await env.DB.prepare('SELECT * FROM audit_log ORDER BY changed_at DESC LIMIT 150').all()).results});
    if(!field[entity])return json({error:'Unknown collection'},404);
    return json({records:(await env.DB.prepare(`SELECT * FROM ${entity} ORDER BY id LIMIT 300`).all()).results});
  }
  if(['discipline_pages','site_panels','homepage_disciplines','page_seo'].includes(entity)&&request.method==='POST')return json({error:'Discipline page identifiers are fixed. Edit existing canonical records instead.'},405);
  if(!['POST','PUT','PATCH'].includes(request.method)||!field[entity])return json({error:'Unsupported action'},405);
  if(!originValid(request))return json({error:'Cross-origin edit blocked'},403);
  let values;
  try{values=normalize(entity,await parseBody(request),request.method==='POST'?'POST':'PUT');}
  catch(err){return invalid(String(err.message||err));}
  const id=route[1]||crypto.randomUUID();
  if(!validId(id)&&!(['discipline_pages','homepage_disciplines'].includes(entity)&&['quranic_themes','sunnah','seerah','prophetic_medicine','living_guidance'].includes(id)))return invalid('Invalid record ID');
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
  if(entity==='encyclopedia_passages'){
    // Prevent cross-article misattribution: an excerpt may cite only a
    // bibliography record of its own article, of the same primary-text type.
    const old=request.method==='POST'?null:await env.DB.prepare('SELECT article_id,citation_id,passage_type,status FROM encyclopedia_passages WHERE id=?').bind(id).first();
    const articleId=values.article_id||old?.article_id;
    const citationId=values.citation_id||old?.citation_id;
    const kind=values.passage_type||old?.passage_type;
    if(articleId&&citationId){
      const source=await env.DB.prepare('SELECT article_id,citation_type FROM encyclopedia_citations WHERE id=?').bind(citationId).first();
      if(!source||source.article_id!==articleId)return invalid('Passage source must belong to the same encyclopedia article');
      if(kind&&source.citation_type!==kind)return invalid('Passage type must match its Quranic or Hadith citation');
    }
    const intended=values.status||old?.status||'draft';
    if(intended==='published'&&(!articleId||!citationId))return invalid('Published passages require a linked article and source');
  }
  if(entity==='encyclopedia_citations'&&values.article_id&&request.method!=='POST'){
    const used=await env.DB.prepare('SELECT COUNT(*) AS n FROM encyclopedia_passages WHERE citation_id=? AND article_id<>?').bind(id,values.article_id).first();
    const allUsed=await env.DB.prepare('SELECT COUNT(*) AS n FROM encyclopedia_passages WHERE citation_id=?').bind(id).first();
    if((allUsed?.n||0)>0){
      const old=await env.DB.prepare('SELECT article_id FROM encyclopedia_citations WHERE id=?').bind(id).first();
      if(old?.article_id!==values.article_id)return invalid('Cannot move a citation while original-text passages reference it');
    }
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
      const hasUpdated=['sources','journeys','evidence','tibb_entries','tibb_offers','encyclopedia_articles','discipline_pages','site_panels','site_links','homepage_disciplines','page_seo','discipline_pathways'].includes(entity);
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
  if(pathname==='/api/quran/chapters'){
    try{
      const r=await fetch('https://api.alquran.cloud/v1/surah',{headers:{accept:'application/json'},signal:AbortSignal.timeout(10000),cf:{cacheEverything:true,cacheTtl:86400}});
      if(!r.ok)throw Error('provider');
      const data=await r.json();
      if(data.code!==200||!Array.isArray(data.data)||data.data.length!==114)throw Error('invalid chapter list');
      const chapters=data.data.map(x=>({number:Number(x.number),englishName:String(x.englishName||'').slice(0,100),name:String(x.name||'').slice(0,120),numberOfAyahs:Number(x.numberOfAyahs)}));
      if(chapters.some((x,i)=>x.number!==i+1||x.numberOfAyahs<1||x.numberOfAyahs>286))throw Error('Invalid chapter metadata');
      return new Response(JSON.stringify({chapters,provider:'Al Quran Cloud'}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=3600'}});
    }catch{return json({error:'Chapter index temporarily unavailable',provider:'Al Quran Cloud'},502);}
  }
  // One controlled, same-origin Quran reading route for the canonical reader.
  // Upstream editions remain attributed; no external response is silently
  // promoted to an editorially verified Quranically transcription.
  if(pathname.startsWith('/api/quran/surah/')){
    const raw=pathname.slice('/api/quran/surah/'.length);
    if(!/^(?:[1-9]|[1-9][0-9]|1(?:0[0-9]|1[0-4]))$/.test(raw))return invalid('Chapter must be between 1 and 114');
    const chapter=Number(raw);
    const ids=['quran-uthmani','en.transliteration','en.pickthall'];
    const upstream='https://api.alquran.cloud/v1/surah/'+chapter+'/editions/'+ids.join(',');
    try{
      const res=await fetch(upstream,{headers:{accept:'application/json'},signal:AbortSignal.timeout(12000),cf:{cacheEverything:true,cacheTtl:3600}});
      if(!res.ok)return json({error:'Quran text provider unavailable',source:'Al Quran Cloud'},502);
      const txt=await res.text();
      if(txt.length>1000000)return json({error:'Upstream Quran response exceeded safety limit'},502);
      const rawData=JSON.parse(txt);
      if(rawData.code!==200||!Array.isArray(rawData.data)||rawData.data.length!==3)throw Error('Provider response invalid');
      const count=rawData.data[0]?.ayahs?.length||0;
      if(!count||count>286)throw Error('Verse count invalid');
      for(const [i,edition] of rawData.data.entries()){
        if(!Array.isArray(edition.ayahs)||edition.ayahs.length!==count||Number(edition.number)!==chapter)throw Error('Edition alignment invalid');
        if(i===0&&edition.ayahs.some((a,j)=>typeof a.text!=='string'||!a.text.trim()||Number(a.numberInSurah)!==j+1))throw Error('Primary Arabic verses invalid');
      }
      return new Response(JSON.stringify({code:200,data:rawData.data,provenance:{provider:'Al Quran Cloud / Islamic Network',edition_ids:ids,review_status:'External source; independent Quranically editorial verification pending'}}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=900','x-content-type-options':'nosniff'}});
    }catch{return json({error:'Quran provider unavailable or returned incomplete chapter data',source:'Al Quran Cloud',source_url:'https://alquran.cloud/api'},502);}
  }
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

  if(pathname==='/api/source-connectors'){
    const states=(await env.DB.prepare('SELECT source_id,last_checked_at,last_state FROM source_connector_checks').all()).results;
    const byId=new Map(states.map(x=>[x.source_id,x]));
    return json({connectors:CONNECTORS.map(c=>({...c,last_checked_at:byId.get(c.id)?.last_checked_at||null,last_state:byId.get(c.id)?.last_state||'not_checked'})),notice:'Provider availability and scholarly validation are distinct.'});
  }
  if(pathname==='/api/source-discovery'){
    const q=(url.searchParams.get('q')||'').trim();
    const domain=(url.searchParams.get('domain')||'').trim();
    if(q.length<2||q.length>95)return invalid('Enter a search term between 2 and 95 characters');
    if(domain&&!['prophetic_medicine','quranic_themes','sunnah','seerah','living_guidance'].includes(domain))return invalid('Invalid subject');
    // Coarse query cache prevents one reader action from turning into 3 provider API calls every time.
    const cache=typeof caches!=='undefined'?caches.default:null;
    const requestKey=new Request(new URL('/api/source-discovery?'+new URLSearchParams({q:q.toLowerCase(),domain}),url.origin));
    if(cache){const hit=await cache.match(requestKey);if(hit)return hit;}
    const result=await liveSourceSearch(q,domain);
    const response=new Response(JSON.stringify(result),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=1800','x-content-type-options':'nosniff'}});
    if(cache)await cache.put(requestKey,response.clone());
    return response;
  }
  // Full on-page answer, built entirely from the SAME canonical published
  // encyclopedia articles, sections and bibliography that Admin edits.
  // This is controlled retrieval, never fabricated 'AI' medical or religious advice.
  if(pathname==='/api/encyclopedia/answer'){
    const q=(url.searchParams.get('q')||'').trim().slice(0,110);
    const domain=(url.searchParams.get('domain')||'').trim();
    if(q.length<2)return invalid('Ask a question with at least two characters');
    const domains=['prophetic_medicine','quranic_themes','sunnah','seerah','living_guidance'];
    if(domain&&!domains.includes(domain))return invalid('Invalid subject');
    const normalize=value=>String(value||'').toLowerCase().replace(/[^a-z0-9\u00c0-\u024f\u0600-\u06ff]+/g,' ').replace(/\s+/g,' ').trim();
    const stop=new Set(['i','have','a','an','the','is','are','my','me','with','about','tell','can','you','please','what','how','do','to','in','on','of','for','and','prophetic','medicine','seerah','biography','please','want','need','help']);
    const meaningful=value=>normalize(value).split(' ').filter(t=>t.length>2&&!stop.has(t));
    const query=normalize(q),queryTokens=meaningful(q);
    const records=(await env.DB.prepare("SELECT * FROM encyclopedia_articles WHERE status='published'"+(domain?" AND domain=?":"")+" ORDER BY title LIMIT 1500").bind(...(domain?[domain]:[])).all()).results;
    let best=null;
    for(const a of records){
      const aliases=[a.title,...String(a.alternate_names||'').split(',')].map(normalize).filter(Boolean);
      // A related phrase must match whole normalized tokens, not accidental substrings.
      // Favour an entire topic over an incidental word within another topic.
      let score=0,method='';
      for(const alias of aliases){
        const tokens=meaningful(alias);
        if(!tokens.length)continue;
        let n=0;
        if(query===alias){n=150+Math.min(20,tokens.length*3);}
        else if(tokens.length>1&&queryTokens.length>=tokens.length&&tokens.every(t=>queryTokens.includes(t))){n=115+Math.min(20,tokens.length*2);}
        else if(queryTokens.length>1&&queryTokens.every(t=>tokens.includes(t))){n=75;}
        else if(queryTokens.length&&tokens.length){
          const hits=queryTokens.filter(t=>tokens.includes(t));
          if(hits.length===queryTokens.length&&hits.length>=2)n=70;
          else if(queryTokens.length===1&&hits.length===1&&tokens.length===1)n=55;
        }
        if(n>score){score=n;method=n>=100?'direct_subject':n>=70?'phrase_match':'subject_match';}
      }
      if(score>0&&(!best||score>best.score))best={article:a,score,method};
    }
    // Controlled related-topic recognition, used only if exact article matching
    // fails. Two distinct meaningful concepts must match the same sourced record.
    if(!best){
      const generic=new Set(['islam','islamic','prophet','muhammad','messenger','hadith','quran','qur','says','say','tells','teach','teaches','did','does']);
      const expansions={
        trading:'trade',commerce:'trade',commercial:'trade',business:'trade',merchant:'trade',merchants:'trade',selling:'trade',buying:'trade',buyer:'trade',buyers:'trade',seller:'trade',sellers:'trade',
        honesty:'honest',honestly:'honest',truthful:'honest',truthfulness:'honest',transparency:'honest',transparent:'honest',
        deception:'fraud',deceive:'fraud',deceptive:'fraud',deceiving:'fraud',cheating:'fraud',cheat:'fraud',deceit:'fraud',
        justice:'fair',fairness:'fair',ethical:'ethic',ethics:'ethic',
        remedies:'remedy',herbs:'remedy',supplements:'supplement',medical:'medicine',
        risks:'risk',safe:'safety'
      };
      const canon=t=>expansions[t]||t;
      const subjectTerms=[...new Set(queryTokens.filter(t=>!generic.has(t)).map(canon))];
      if(subjectTerms.length>=2&&subjectTerms.length<=6){
        let related=null;
        for(const a of records){
          const head=new Set(normalize([a.title,a.alternate_names].join(' ')).split(' ').map(canon));
          const body=new Set(normalize([a.title,a.alternate_names,a.subtitle,a.abstract].join(' ')).split(' ').map(canon));
          const matched=subjectTerms.filter(t=>body.has(t)),headMatched=matched.filter(t=>head.has(t));
          if(matched.length!==subjectTerms.length||!headMatched.length)continue;
          const score=25*matched.length+10*headMatched.length;
          if(!related||score>related.score)related={article:a,score,method:'related_subject'};
        }
        if(related)best=related;
      }
    }
    // A question about two named subjects should not collapse to the first
    // article. Assemble distinguishable, sourced records from the SAME D1 CMS.
    const comparisonRequested=/\b(?:and|versus|vs\.?|compare|difference between)\b/i.test(q);
    if(comparisonRequested){
      const named=records.map(a=>{
        const names=[a.title,...String(a.alternate_names||'').split(',')].map(normalize).filter(x=>x.length>=4);
        const matched=names.some(alias=>{
          const tokens=meaningful(alias);
          return tokens.length>0&&tokens.every(t=>queryTokens.includes(t));
        });
        return matched?a:null;
      }).filter(Boolean).slice(0,3);
      if(named.length>=2){
        const compared=await Promise.all(named.map(async entry=>{
          const [parts,references]=await Promise.all([
            env.DB.prepare('SELECT heading,section_type,body FROM encyclopedia_sections WHERE article_id=? ORDER BY sort_order,id LIMIT 7').bind(entry.id).all(),
            env.DB.prepare('SELECT citation_type,source_title,citation_ref,source_url,source_note,verification_status FROM encyclopedia_citations WHERE article_id=? ORDER BY sort_order,id LIMIT 12').bind(entry.id).all()
          ]);
          return {slug:entry.slug,title:entry.title,domain:entry.domain,abstract:entry.abstract,review_status:entry.review_status,sections:parts.results,citations:references.results};
        }));
        if(compared.every(a=>a.sections.length>=3&&a.citations.length>=1)){
          return json({outcome:'multi_article_answer',query:q,domain,
            articles:compared,answer:null,
            notice:'This is a comparative reading of independently attributed encyclopedia entries, not a new scholarly verdict or claim of medical efficacy.',
            provenance:'Canonical published D1 articles; original review status preserved on each source.'});
        }
      }
    }
    if(!best){
      // Search usable live evidence on demand instead of stopping at the small editorial index.
      // A provider excerpt is never silently promoted to a reviewed, complete Islamic answer.
      const discovery=await liveSourceSearch(q,domain);
      const terms=meaningful(q);
      const accepted=(discovery.results||[]).filter(x=>{
        const body=normalize([x.title,x.excerpt,x.reference].join(' '));
        return terms.length>0&&terms.every(t=>body.includes(t));
      }).slice(0,6);
      return json({outcome:accepted.length?'source_evidence':'no_editorial_answer',query:q,domain,
        notice:accepted.length?'Relevant external source excerpts were found, but no complete editorial article is ready. Source verification remains pending.':'No suitably matching reviewed editorial article or relevant available provider excerpts were located.',
        evidence:accepted,providers:discovery.providers||[],fetched_at:discovery.fetched_at||null,answer:null});
    }
    const entry=best.article;
    const [sections,citations,links,passages]=await Promise.all([
      env.DB.prepare('SELECT heading,section_type,body,sort_order FROM encyclopedia_sections WHERE article_id=? ORDER BY sort_order,id').bind(entry.id).all(),
      env.DB.prepare('SELECT citation_type,source_title,citation_ref,source_url,source_note,verification_status,sort_order FROM encyclopedia_citations WHERE article_id=? ORDER BY sort_order,id').bind(entry.id).all(),
      env.DB.prepare("SELECT l.relation_label,a.slug,a.title FROM encyclopedia_links l JOIN encyclopedia_articles a ON a.id=l.target_article_id WHERE l.article_id=? AND a.status='published' ORDER BY l.sort_order,l.id").bind(entry.id).all(),
      env.DB.prepare("SELECT passage_type,arabic_excerpt,editorial_meaning,review_status FROM encyclopedia_passages WHERE article_id=? AND status='published' ORDER BY sort_order,id").bind(entry.id).all()
    ]);
    if(sections.results.length<3||!citations.results.length)return json({outcome:'no_editorial_answer',query:q,domain,notice:'This topic does not yet have enough attributable sections for a full answer.',answer:null});
    return json({outcome:'full_article_answer',query:q,match:best.method,
      answer:{id:entry.id,slug:entry.slug,title:entry.title,arabic_title:entry.arabic_title,domain:entry.domain,abstract:entry.abstract,review_status:entry.review_status,updated_at:entry.updated_at,
        sections:sections.results,citations:citations.results,related:links.results,passages:passages.results},
      provenance:'Live, canonical D1 encyclopedia article; source texts and interpretations are not independently expert-approved unless explicitly indicated.'});
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
    if(q){query+=' AND (title LIKE ? OR arabic_title LIKE ? OR subtitle LIKE ? OR alternate_names LIKE ? OR abstract LIKE ? OR EXISTS(SELECT 1 FROM encyclopedia_sections s WHERE s.article_id=encyclopedia_articles.id AND (s.heading LIKE ? OR s.body LIKE ?)) OR EXISTS(SELECT 1 FROM encyclopedia_citations c WHERE c.article_id=encyclopedia_articles.id AND (c.source_title LIKE ? OR c.citation_ref LIKE ?)))';const pat='%'+q.replace(/[%_]/g,'')+'%';params.push(...Array(9).fill(pat));}
    if(q){
      query+=' ORDER BY CASE WHEN LOWER(title)=LOWER(?) THEN 0 WHEN title LIKE ? THEN 1 ELSE 2 END, title ASC';
      params.push(q,'%'+q.replace(/[%_]/g,'')+'%');
    }else query+=' ORDER BY title ASC';
    query+=' LIMIT 120';
    const entries=(await env.DB.prepare(query).bind(...params).all()).results;
    return json({entries,filters:{q,domain,letter},notice:'Source-linked encyclopedia under editorial review. Do not equate citation with clinical approval.'});
  }
  if(pathname.startsWith('/api/encyclopedia/')){
    const slug=decodeURIComponent(pathname.slice('/api/encyclopedia/'.length));
    if(!validId(slug))return invalid('Invalid encyclopedia entry');
    const entry=await env.DB.prepare("SELECT * FROM encyclopedia_articles WHERE slug=? AND status='published'").bind(slug).first();
    if(!entry)return json({error:'Entry not published'},404);
    const [sections,citations,links,passages]=await Promise.all([
      env.DB.prepare('SELECT id,heading,section_type,body,sort_order FROM encyclopedia_sections WHERE article_id=? ORDER BY sort_order,id').bind(entry.id).all(),
      env.DB.prepare('SELECT id,citation_type,source_title,citation_ref,source_url,source_note,verification_status,sort_order FROM encyclopedia_citations WHERE article_id=? ORDER BY sort_order,id').bind(entry.id).all(),
      env.DB.prepare("SELECT l.relation_label,a.slug,a.title,a.domain FROM encyclopedia_links l JOIN encyclopedia_articles a ON a.id=l.target_article_id WHERE l.article_id=? AND a.status='published' ORDER BY l.sort_order,l.id").bind(entry.id).all(),
      env.DB.prepare("SELECT p.id,p.citation_id,p.passage_type,p.arabic_excerpt,p.editorial_meaning,p.context_note,p.review_status,c.citation_ref,c.source_title FROM encyclopedia_passages p JOIN encyclopedia_citations c ON c.id=p.citation_id WHERE p.article_id=? AND p.status='published' ORDER BY p.sort_order,p.id").bind(entry.id).all()
    ]);
    if(!sections.results.length||!citations.results.length)return json({error:'Encyclopedia entry incomplete'},503);
    return json({entry,sections:sections.results,citations:citations.results,related:links.results,passages:passages.results,editorial_notice:'Primary source references, interpretation and contemporary medical evidence are separate layers. Scholar and clinical review statuses are not inferred.'});
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
  if(pathname==='/api/site-chrome'){
    const cards=(await env.DB.prepare("SELECT id,title,description,image_url,image_alt,sort_order FROM homepage_disciplines WHERE status='published' ORDER BY sort_order,id").all()).results;
    const seo=(await env.DB.prepare("SELECT id,title,description,social_image_url,social_image_alt FROM page_seo WHERE status='published' ORDER BY id").all()).results;
    const [panels,links]=await Promise.all([
      env.DB.prepare("SELECT id,kicker,heading,subtitle,body,image_url,image_alt FROM site_panels WHERE status='published' ORDER BY sort_order,id").all(),
      env.DB.prepare("SELECT id,section,label,href,sort_order FROM site_links WHERE status='published' ORDER BY section,sort_order,id").all()
    ]);
    return json({panels:panels.results,links:links.results,homepage_cards:cards,page_seo:seo,source:'canonical_d1'});
  }
  if(pathname==='/api/discipline-pages'){
    const [pages,pathways]=await Promise.all([
      env.DB.prepare("SELECT id,eyebrow,heading,introduction,hero_image_url,hero_image_alt,sort_order FROM discipline_pages WHERE status='published' ORDER BY sort_order,id").all(),
      env.DB.prepare("SELECT id,domain,label,href,sort_order FROM discipline_pathways WHERE status='published' ORDER BY domain,sort_order,id").all()
    ]);
    return json({pages:pages.results,pathways:pathways.results,source:'canonical_d1'});
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
// Canonical search-engine and browser metadata come from the same published D1
// article record as the visible encyclopedia, never from a parallel CMS.
const escMarkup=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
async function encyclopediaHtml(request,env,url,slug){
  const entry=await env.DB.prepare("SELECT slug,title,subtitle,abstract,domain,review_status,updated_at FROM encyclopedia_articles WHERE slug=? AND status='published'").bind(slug).first();
  if(!entry)return new Response('Reference article not found',{status:404,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
  const res=await env.ASSETS.fetch(new Request(new URL('/encyclopedia',url.origin),request));
  if(!res.ok)return res;
  let markup=await res.text();
  const headline=entry.title+' | Quranically — Islamic Reference Encyclopedia';
  const desc=String(entry.abstract||entry.subtitle||'').slice(0,280);
  const canonical=url.origin+'/encyclopedia/'+entry.slug;
  markup=markup.replace(/<title>[^<]*<\/title>/,'<title>'+escMarkup(headline)+'</title>');
  markup=markup.replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+escMarkup(desc)+'">');
  const schema={
    '@context':'https://schema.org','@type':'Article',headline:entry.title,
    description:desc,mainEntityOfPage:canonical,
    dateModified:String(entry.updated_at||'').replace(' ','T')+'Z',
    publisher:{'@type':'Organization',name:'Quranically'},
    about:entry.domain.replaceAll('_',' '),
    isAccessibleForFree:true
  };
  markup=markup.replace('</head>','<link rel="canonical" href="'+escMarkup(canonical)+'"><meta property="og:type" content="article"><meta property="og:title" content="'+escMarkup(headline)+'"><meta property="og:description" content="'+escMarkup(desc)+'"><script type="application/ld+json">'+JSON.stringify(schema).replace(/</g,'\\u003c')+'</script></head>');
  return new Response(markup,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300','x-content-type-options':'nosniff'}});
}
function pageSeoId(url){
  const path=url.pathname;
  if(path==='/'||path==='/index.html')return 'home';
  if(path==='/study.html'||path==='/study')return 'quran-reader';
  if(path==='/guidance'||path==='/guidance.html')return 'guidance';
  if(path==='/encyclopedia'||path==='/encyclopedia/'){
    const domain=url.searchParams.get('domain')||'';
    return ({quranic_themes:'quran-themes',sunnah:'hadith',seerah:'seerah',prophetic_medicine:'tibb',living_guidance:'living-guidance'})[domain]||'encyclopedia';
  }
  return null;
}
async function pageSeoResponse(env,url,response){
  const id=pageSeoId(url);
  if(!id||!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))return response;
  const seo=await env.DB.prepare("SELECT title,description,social_image_url,social_image_alt FROM page_seo WHERE id=? AND status='published'").bind(id).first();
  if(!seo)return response;
  let html=await response.text();
  const title=escMarkup(seo.title),description=escMarkup(seo.description);
  const canonical=url.origin+url.pathname+(url.pathname.startsWith('/encyclopedia')&&url.searchParams.get('domain')?'?domain='+encodeURIComponent(url.searchParams.get('domain')):'');
  html=html.replace(/<title>[^<]*<\/title>/i,'<title>'+title+'</title>');
  if(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i.test(html)){
    html=html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,'<meta name="description" content="'+description+'">');
  }
  const social=seo.social_image_url&&/^https:\/\//i.test(seo.social_image_url)?'<meta property="og:image" content="'+escMarkup(seo.social_image_url)+'"><meta property="og:image:alt" content="'+escMarkup(seo.social_image_alt)+'">':'';
  html=html.replace('</head>','<meta property="og:type" content="website"><meta property="og:title" content="'+title+'"><meta property="og:description" content="'+description+'"><link rel="canonical" href="'+escMarkup(canonical)+'">'+social+'</head>');
  const headers=new Headers(response.headers);
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','public, max-age=300');
  for(const key of ['content-length','content-encoding','etag'])headers.delete(key);
  return new Response(html,{status:response.status,headers});
}
async function sitemapResponse(env,url){
  const rows=(await env.DB.prepare("SELECT slug,updated_at FROM encyclopedia_articles WHERE status='published' ORDER BY slug LIMIT 1000").all()).results;
  const entries=['/','/encyclopedia','/study.html','/guidance'].map(path=>({path}));
  for(const r of rows)entries.push({path:'/encyclopedia/'+r.slug,lastmod:String(r.updated_at||'').slice(0,10)});
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+entries.map(({path,lastmod})=>'<url><loc>'+escMarkup(url.origin+path)+'</loc>'+(lastmod?'<lastmod>'+escMarkup(lastmod)+'</lastmod>':'')+'</url>').join('\n')+'\n</urlset>';
  return new Response(xml,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600','x-content-type-options':'nosniff'}});
}
export default {
  async scheduled(_event,env){
    // One metadata-only health probe per source per day. No copyrighted
    // corpus ingestion, no user search history, no automatic publication.
    const checks=[
      ['ummah_quran','https://ummahapi.com/api/quran/surahs'],
      ['ummah_hadith','https://ummahapi.com/api/hadith/collections'],
      ['ummah_dua','https://ummahapi.com/api/duas/categories'],
      ['hadeethenc','https://hadeethenc.com/api/v1/languages']
    ];
    for(const [id,endpoint] of checks){
      let state='unavailable',http=null;
      try{
        const res=await fetch(endpoint,{headers:{accept:'application/json'},signal:AbortSignal.timeout(7500)});
        http=res.status;state=res.ok?'healthy':'unavailable';
      }catch{}
      try{
        await env.DB.prepare("INSERT INTO source_connector_checks(source_id,last_checked_at,last_state,last_http_status,notes) VALUES(?,?,?,?,?) ON CONFLICT(source_id) DO UPDATE SET last_checked_at=excluded.last_checked_at,last_state=excluded.last_state,last_http_status=excluded.last_http_status,notes=excluded.notes")
          .bind(id,new Date().toISOString(),state,http,'Metadata availability check only; not religious text verification').run();
      }catch{} // A source-health probe must never interrupt public Quran access.
    }
  },
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
      if(path.startsWith('/media/')){
        const match=/^\/media\/([a-z0-9-]{3,85})\.webp$/.exec(path);
        if(!match)return new Response('Not found',{status:404});
        const row=await env.DB.prepare("SELECT payload FROM media_assets WHERE id=? AND status='active'").bind(match[1]).first();
        if(!row)return new Response('Not found',{status:404});
        const binary=row.payload instanceof Uint8Array?row.payload:Uint8Array.from(row.payload||[]);
        return new Response(binary,{headers:{'content-type':'image/webp','cache-control':'public,max-age=300','x-content-type-options':'nosniff','cross-origin-resource-policy':'same-origin'}});
      }
      if(path==='/robots.txt'){
        return new Response('User-agent: *\\nDisallow: /admin\\nDisallow: /api/admin/\\nSitemap: '+url.origin+'/sitemap.xml\\n',{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'public, max-age=3600'}});
      }
      if(path==='/sitemap.xml')return await sitemapResponse(env,url);
      if(path==='/tibb'||path==='/tibb/'||path==='/tibb.html'){
        const entry=(url.searchParams.get('entry')||'').trim();
        const target=validId(entry)?('/encyclopedia/'+entry):('/encyclopedia?domain=prophetic_medicine');
        return Response.redirect(new URL(target,url.origin),302);
      }
      if(path==='/encyclopedia'||path==='/encyclopedia/')return pageSeoResponse(env,url,await env.ASSETS.fetch(new Request(new URL('/encyclopedia',url.origin),request)));
      if(['/', '/index.html','/study.html','/study','/guidance','/guidance.html'].includes(path))return pageSeoResponse(env,url,await env.ASSETS.fetch(request));
      if(path.startsWith('/encyclopedia/')){
        const slug=path.slice('/encyclopedia/'.length).replace(/\/$/,'');
        if(!validId(slug))return new Response('Reference article not found',{status:404});
        return await encyclopediaHtml(request,env,url,slug);
      }
      if(path.startsWith('/api/'))return await publicApi(request,env,url);
      // Never serve admin HTML directly without Access checking.
      return env.ASSETS.fetch(request);
    }catch(e){return path.startsWith('/api/')?json({error:'Service unavailable'},503):new Response('Service unavailable',{status:503});}
  }
};
