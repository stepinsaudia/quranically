// One canonical public header and footer, copied into static first-paint
// HTML at build time. Never add client-side header replacement/flicker.
import fs from 'node:fs';
import path from 'node:path';
import {canonicalHeader,QST_PUBLIC_FOOTER,QST_PUBLIC_PAGES} from '../src/qst-public-shell.mjs';
const write=process.argv.includes('--write'),check=process.argv.includes('--check');
if(write===check)throw Error('Use exactly one of --write or --check');
let dirty=0;
for(const [name,active] of Object.entries(QST_PUBLIC_PAGES)){
 const filename=path.join('public',name);
 const before=fs.readFileSync(filename,'utf8');
 const h=/<header class="qst-header" role="banner">[\s\S]*?<\/header>/g;
 const f=/<footer class="qst-site-footer" role="contentinfo">[\s\S]*?<\/footer>/g;
 if((before.match(h)||[]).length!==1||(before.match(f)||[]).length!==1)
  throw Error('Expected exactly one canonical header and footer in '+filename);
 const after=before.replace(h,()=>canonicalHeader(active)).replace(f,()=>QST_PUBLIC_FOOTER);
 if(before!==after){
  dirty++;
  if(write){fs.writeFileSync(filename,after);console.log('SYNC',filename)}
  else console.error('DRIFT',filename,'— run node scripts/sync-qst-shell.mjs --write from the canonical shell source');
 }else console.log('CANONICAL',filename);
}
if(check&&dirty)throw Error(dirty+' public pages drift from the one canonical first-paint header/footer source');
console.log('QST CANONICAL SHELL '+(write?'SYNCHRONIZED':'VERIFIED')+' across '+Object.keys(QST_PUBLIC_PAGES).length+' page families');
