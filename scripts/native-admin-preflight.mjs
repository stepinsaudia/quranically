// Existing Quranically resources only. No provisioning of another Worker or database.
import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
if(config.account_id!=='fb9597e74bae3ea18ad7bb013213d776')throw Error('Wrong Cloudflare account');
if(config.name!=='qst-living-knowledge-v1')throw Error('Wrong Worker');
if(config.d1_databases?.length!==1 || config.d1_databases[0].database_name!=='qst-knowledge-v1-db' || config.d1_databases[0].database_id!=='6c7c8edb-e20c-4354-9d69-0bea89badfd9')throw Error('Wrong database or D1 UUID');
if(config.routes || config.route || config.zone_id)throw Error('Refusing custom domain routing');
if(config.assets?.directory!=='./public')throw Error('Unexpected static assets directory');
console.log('Preflight PASS: existing isolated Quranically Worker and D1 only.');
