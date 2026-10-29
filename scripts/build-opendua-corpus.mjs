// Lossless, rate-limited import of the official OpenDua Hisn al-Muslim dataset.
// English editorials/structure are CC BY 4.0; never use licensed audio or rewrite prayer texts.
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
const base='https://api.opendua.org',version='v0.0.4',out=process.env.QST_CORPUS_CHUNK_DIR||'/tmp/qst-opendua-parts';
const countExpected=267;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const sha=s=>createHash('sha256').update(s).digest('hex');
const lit=s=>"'"+String(s??'').replaceAll("'","''")+"'";
const norm=s=>String(s??'').toLowerCase().normalize('NFKC').replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const fields=['original_text','translation_text','explanation_text','normalized_search','publisher_record_json'];
let last=0;
async function source(path){
 for(let attempt=0;attempt<5;attempt++){
  const wait=Math.max(0,1200-(Date.now()-last));
  if(wait)await delay(wait);
  last=Date.now();
  const response=await fetch(base+path,{headers:{accept:'application/json'},signal:AbortSignal.timeout(20000)});
  if(response.status===429||response.status===503){await delay((attempt+1)*1700);continue;}
  if(!response.ok)throw Error('OpenDua HTTP '+response.status+' at '+path);
  const text=await response.text();
  if(text.length>300000)throw Error('Unexpected oversized OpenDua record');
  return JSON.parse(text);
 }
 throw Error('Rate-limited or unavailable: '+path);
}
function fieldTexts(entry){
 const arabic=[],translation=[],notes=[],seen=new Set();
 function add(list,s){
  if(typeof s!=='string'||!s.trim()||seen.has(s))return;
  list.push(s);seen.add(s);
 }
 function walk(node,depth=0){
  if(depth>10||node===null||typeof node!=='object')return;
  if(Array.isArray(node)){for(const value of node)walk(value,depth+1);return;}
  for(const [key,value] of Object.entries(node)){
   if(key==='arabic')add(arabic,value);
   else if(key==='translation'||key==='english')add(translation,value);
   else if(['instruction','explanation','description','note','narration'].includes(key))add(notes,value);
   else if(['steps','items','dua','variations','text','content'].includes(key))walk(value,depth+1);
  }
 }
 walk(entry.variations);walk(entry.steps);
 return {original:arabic.join('\n\n'),translation:translation.join('\n\n'),explanation:notes.join('\n\n')};
}
function statement(sql){
 if(Buffer.byteLength(sql,'utf8')>=7000)throw Error('D1 SQL statement exceeds 7KB byte budget');
 return sql+';\n';
}
function chunks(str,size=500){
 const chars=Array.from(String(str??'')),out=[];
 for(let i=0;i<chars.length;i+=size)out.push(chars.slice(i,i+size).join(''));
 return out;
}
function passage(entry){
 const id=entry.id;
 if(!/^entry-\d{6}$/.test(id))throw Error('Unknown OpenDua entry ID '+id);
 const {original,translation,explanation}=fieldTexts(entry);
 const title=String(entry.title||'');
 if(!title)throw Error('Title missing '+id);
 const ref=String(entry.sourceReference||id);
 const sourceUrl=base+'/v2/entries/'+id;
 const payload=JSON.stringify(entry);
 const index=norm([title,ref,original,translation,explanation,(entry.tags||[]).join(' ')].join(' ')).slice(0,39000);
 const digest=sha(JSON.stringify(['opendua-en',id,original,translation,explanation,payload]));
 const recId=sha('opendua-en|'+id).slice(0,40);
 const initial={id:recId,source_id:'opendua-en',external_ref:id,title,domain:'living_guidance',original_text:'',
  translation_text:'',explanation_text:'',normalized_search:'',publisher_record_json:'',source_url:sourceUrl,content_version:version,
  content_sha256:digest,language:'en',expert_review:'unreviewed',status:'draft'};
 const columns=Object.keys(initial);
 let sql=statement('INSERT INTO knowledge_passages ('+columns.join(',')+') VALUES ('+columns.map(k=>lit(initial[k])).join(',')+') '+
   'ON CONFLICT(id) DO UPDATE SET title=excluded.title,domain=excluded.domain,original_text=\'\',translation_text=\'\','+
   'explanation_text=\'\',normalized_search=\'\',publisher_record_json=\'\',source_url=excluded.source_url,'+
   'content_version=excluded.content_version,content_sha256=excluded.content_sha256,status=\'draft\',updated_at=datetime(\'now\')');
 const values={original_text:original,translation_text:translation,explanation_text:explanation,
   normalized_search:index,publisher_record_json:payload};
 for(const key of fields)for(const part of chunks(values[key])){
   sql+=statement('UPDATE knowledge_passages SET '+key+'='+key+'||'+lit(part)+' WHERE id='+lit(recId));
 }
 sql+=statement('UPDATE knowledge_passages SET status=\'published\' WHERE id='+lit(recId));
 return {sql,id,searchable:!!(original||translation),bytes:Buffer.byteLength(sql)};
}
const catalogue=await source('/v2/collections/hisn-al-muslim/entries');
if(!Array.isArray(catalogue.items)||catalogue.items.length!==countExpected)throw Error('Publisher count changed; expected 267, got '+catalogue.items?.length);
const ids=catalogue.items.map(x=>String(x.id));
if(new Set(ids).size!==ids.length||ids.some(id=>!/^entry-\d{6}$/.test(id)))throw Error('Nonunique or invalid publisher IDs');
await mkdir(out,{recursive:true});
const header=statement('UPDATE knowledge_sources SET version_label='+lit(version)+',publisher_notice='+lit('OpenDua dataset v0.0.4, by Ihsan Labs at the Human Development Fund. Based on Hisn al-Muslim by Sa’id ibn Ali ibn Wahf al-Qahtani. OpenDua editorial text and dataset structure licensed CC BY 4.0. Underlying religious texts are separately attributed; audio excluded.')+',updated_at=datetime(\'now\') WHERE id=\'opendua-en\' AND rights_mode=\'verified_verbatim\'');
let all=0,searchable=0,batch=[],parts=0,bytes=0;
async function flush(){
 if(!batch.length)return;
 parts++;
 await writeFile(join(out,'corpus-part-'+String(parts).padStart(4,'0')+'.sql'),(parts===1?header:'')+batch.join(''),'utf8');
 batch=[];
}
for(const id of ids){
 const entry=await source('/v2/entries/'+id);
 if(entry.id!==id)throw Error('Publisher entry ID changed: '+id);
 const x=passage(entry);
 all++;searchable+=Number(x.searchable);bytes+=x.bytes;
 batch.push(x.sql);
 if(batch.length>=10)await flush();
 if(all%50===0)console.log(JSON.stringify({progress:all,total:ids.length,parts,extractable:searchable}));
}
await flush();
if(all!==267||searchable<200||parts!==27)throw Error('Incomplete source collection import: '+JSON.stringify({all,searchable,parts}));
console.log(JSON.stringify({provider:'OpenDua',edition:version,records:all,searchable,parts,bytes,first_id:ids[0],last_id:ids.at(-1),original_json_preserved:true,rate_limited:true}));
