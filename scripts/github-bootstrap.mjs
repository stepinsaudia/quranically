/**
 * First-creation-only Cloudflare resource provisioner for the GitHub workflow.
 * The entire script FAILS CLOSED if either of the reserved names already exists,
 * if Cloudflare resources cannot be enumerated, or if the account differs.
 * Not a general-purpose deployer or re-run mechanism.
 */
import fs from 'node:fs';
import {join} from 'node:path';
const ACCOUNT='fb9597e74bae3ea18ad7bb013213d776';
const WORKER='qst-living-knowledge-v1';
const DB='qst-knowledge-v1-db';
const PLACEHOLDER='REPLACE_WITH_NEW_D1_DATABASE_UUID';
const API='https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const token=process.env.CLOUDFLARE_API_TOKEN;
if (!token || token.length<15) throw Error('Cloudflare token missing; no changes made');
if(process.env.CLOUDFLARE_ACCOUNT_ID!==ACCOUNT)throw Error('Account mismatch; no changes made');
if(process.env.GITHUB_ACTIONS!=='true'&&process.env.QST_BOOTSTRAP_TEST!=='1')throw Error('Only run through the dedicated GitHub workflow');
const configPath=join(process.cwd(),'wrangler.jsonc');
const conf=JSON.parse(fs.readFileSync(configPath,'utf8'));
if(conf.name!==WORKER || conf.account_id!==ACCOUNT || conf.d1_databases?.[0]?.database_name!==DB || conf.d1_databases?.[0]?.database_id!==PLACEHOLDER)throw Error('Unmodified dedicated Wrangler configuration required');
if(conf.routes || conf.route || conf.zone_id)throw Error('Cannot attach routes to another domain');
async function cf(path,options={}){
 const res=await fetch(API+path,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})},signal:AbortSignal.timeout(25000)});
 const body=await res.json().catch(()=>null);
 if(!res.ok || !body?.success)throw Error(`Cloudflare API refused ${options.method||'GET'} ${path}: status ${res.status}; ${JSON.stringify(body?.errors||[]).slice(0,800)}`);
 return body;
}
// This must be a complete list, not a filtered guess. Refuse ambiguous pagination.
const scripts=await cf('/workers/scripts');
if(!Array.isArray(scripts.result))throw Error('Unexpected Workers list shape; no changes made');
if(scripts.result_info?.total_pages>1)throw Error('Workers list pagination needs manual audit; refusing deployment');
if(scripts.result.some(w=>w.id===WORKER || w.name===WORKER))throw Error('Worker already exists; refusing to overwrite');
// Request exact-name match to avoid pagination omissions.
const dbs=await cf(`/d1/database?name=${encodeURIComponent(DB)}&per_page=100`);
if(!Array.isArray(dbs.result))throw Error('Unexpected D1 list shape');
if(dbs.result_info?.total_pages>1)throw Error('D1 list truncated; refusing to create');
if(dbs.result.some(d=>d.name===DB))throw Error('D1 already exists; refusing to overwrite or attach');
console.log('Preflight PASS: dedicated Worker and D1 names unused in locked account.');
// One and only account write: create the NEW database.
const created=await cf('/d1/database',{method:'POST',body:JSON.stringify({name:DB,primary_location_hint:'apac'})});
const uuid=created.result?.uuid;
if(!UUID.test(uuid||'') || created.result?.name!==DB)throw Error('D1 creation response ambiguous. STOP. Database may now exist; inspect the account and do not blindly retry.');
conf.d1_databases[0].database_id=uuid;
fs.writeFileSync(configPath,JSON.stringify(conf,null,2)+'\n');
console.log('Created dedicated D1 UUID:',uuid);
console.log('Temporary runtime configuration written; no existing Worker or D1 modified.');
