// Fail-closed deployment gate for the already existing Quranically Worker/D1.
import {readFileSync} from 'node:fs';
const c=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
const expected={account:'fb9597e74bae3ea18ad7bb013213d776',worker:'qst-living-knowledge-v1',db:'qst-knowledge-v1-db',uuid:'6c7c8edb-e20c-4354-9d69-0bea89badfd9'};
if(c.account_id!==expected.account||c.name!==expected.worker)throw Error('Wrong Cloudflare account or Worker');
if(c.d1_databases?.length!==1 || c.d1_databases[0].database_name!==expected.db || c.d1_databases[0].database_id!==expected.uuid)throw Error('Unexpected D1 binding, or existing D1 UUID not set');
if(c.routes||c.route||c.zone_id)throw Error('Custom routes not permitted');
const {ACCESS_TEAM_DOMAIN:domain,ACCESS_AUD:aud,ADMIN_EMAIL:email}=c.vars||{};
if(!/^[a-z0-9.-]+\\.cloudflareaccess\\.com$/i.test(domain||''))throw Error('Missing or invalid Cloudflare Access team domain');
if(typeof aud!=='string'||aud.length<20)throw Error('Missing Cloudflare Access app AUD');
if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email||''))throw Error('Missing admin email allowlist');
console.log('Admin activation gate PASS: only the existing Quranically Worker and D1; approved Access settings provided.');
