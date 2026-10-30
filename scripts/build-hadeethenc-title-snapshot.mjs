// Read-only source indexing. No production data, DB writes or Worker deployment.
// Keeps publisher titles unmodified and records live API provenance.
// This metadata snapshot is discovery-only; the public answer fetches the
// publisher's actual hadith, attribution and explanation when needed.
import fs from 'node:fs';
import path from 'node:path';
const origin='https://hadeethenc.com/api/v1';
const maxPages=80;
const perPage=100;
const pause=async()=>{}; // no artificial global throttling; sequential pages per root.
async function json(url){
 const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(16000)});
 if(!response.ok)throw Error('Publisher HTTP '+response.status+' on '+new URL(url).pathname);
 const raw=await response.text();
 if(raw.length>2000000)throw Error('Publisher result unexpectedly large');
 return JSON.parse(raw);
}
const roots=await json(origin+'/categories/roots/?language=en');
if(!Array.isArray(roots)||roots.length<4)throw Error('Missing top-level HadeethEnc subjects');
const entries=new Map();
const coverage=[];
for(const root of roots){
 if(!/^\d{1,8}$/.test(String(root.id)))throw Error('Unrecognized category id');
 let page=1,last=1,added=0;
 do{
  const uri=origin+'/hadeeths/list/?language=en&category_id='+root.id+'&page='+page+'&per_page='+perPage;
  const response=await json(uri);
  if(!Array.isArray(response.data)||!response.meta)throw Error('Unexpected publisher response for category '+root.id);
  const current=Number(response.meta.current_page||page);
  last=Number(response.meta.last_page||1);
  if(current!==page||!Number.isSafeInteger(last)||last<1||last>maxPages)throw Error('Incomplete or suspicious publisher pagination for '+root.id+': '+JSON.stringify(response.meta));
  for(const item of response.data){
   if(!/^\d{1,8}$/.test(String(item.id))||typeof item.title!=='string'||!item.title.trim())continue;
   const id=String(item.id);
   const old=entries.get(id);
   if(old){if(old.title!==item.title)throw Error('Publisher title collision '+id);if(!old.category_ids.includes(String(root.id)))old.category_ids.push(String(root.id));}
   else{entries.set(id,{id,title:item.title,category_ids:[String(root.id)]});added++;}
  }
  if(response.data.length===0&&page<last)throw Error('Publisher returned an empty nonfinal page in '+root.id);
  page++;
 }while(page<=last);
 coverage.push({id:String(root.id),title:root.title,pages:last,unique_hadith_added:added});
 console.log('Indexed '+root.title+' ('+last+' pages, '+added+' new records)');
 await pause();
}
if(entries.size<1000)throw Error('The source title index is too small; refusing incomplete output ('+entries.size+')');
const records=[...entries.values()].sort((a,b)=>Number(a.id)-Number(b.id));
const snapshot={publisher:'HadeethEnc.com',source_url:'https://hadeethenc.com/en/home',api:'https://hadeethenc.com/api/v1',language:'en',translation_version:'not_reported_by_live_api',source_policy:'metadata_only_original_titles_no_republication_of_hadith',retrieved_utc:new Date().toISOString(),coverage,records};
const dir=process.env.QST_SNAPSHOT_DIR||'artifacts';
fs.mkdirSync(dir,{recursive:true});
const filename=path.join(dir,'hadeethenc-title-index.json');
fs.writeFileSync(filename,JSON.stringify(snapshot));
const check=JSON.parse(fs.readFileSync(filename,'utf8'));
if(check.records.length!==records.length)throw Error('Snapshot roundtrip failed');
console.log('SOURCE INDEX PASS:',records.length,'unique official English titles across',coverage.length,'publisher root subjects. File:',filename);
