// Read-only, provenance-checked full Qur'an verse translation index.
// Generated from publisher API; no production DB writes. Do not edit verse text.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {AYAH_COUNTS} from '../src/quran-search.mjs';
const SOURCE='https://api.alquran.cloud/v1/quran/en.pickthall';
const response=await fetch(SOURCE,{headers:{accept:'application/json'},signal:AbortSignal.timeout(55000)});
if(!response.ok)throw Error('Al Quran Cloud publisher HTTP '+response.status);
const raw=await response.text();
if(raw.length>5000000)throw Error('Unexpected size of complete translation: '+raw.length);
const data=JSON.parse(raw);
if(data?.code!==200||!Array.isArray(data.data?.surahs))throw Error('Invalid complete Quran edition schema');
if(data.data.surahs.length!==114)throw Error('Missing Surahs; expected 114, got '+data.data.surahs.length);
const records=[];
for(let i=0;i<114;i++){
 const s=data.data.surahs[i];
 if(Number(s?.number)!==i+1||!Array.isArray(s.ayahs)||s.ayahs.length!==AYAH_COUNTS[i])throw Error('Surah count mismatch at '+(i+1));
 for(let j=0;j<s.ayahs.length;j++){
  const v=s.ayahs[j];
  if(Number(v.numberInSurah)!==j+1||typeof v.text!=='string'||!v.text.trim())throw Error('Missing or out-of-order translation at '+(i+1)+':'+(j+1));
  records.push([i+1,j+1,v.text]);
 }
}
if(records.length!==6236)throw Error('Expected 6236 verified verses, got '+records.length);
const fullTextHash=createHash('sha256').update(records.map(x=>x.join('\t')).join('\n')).digest('hex');
const snapshot={publisher:'Al Quran Cloud',edition:'en.pickthall',translator:'Marmaduke Pickthall',source_url:SOURCE,source_type:'unmodified_english_translation',status:'publisher_text_not_tafsir',retrieved_at:new Date().toISOString(),surahs:114,verses:records.length,sha256:fullTextHash,records};
const dir='src/data';fs.mkdirSync(dir,{recursive:true});
const target=path.join(dir,'quran-verse-index.json');
fs.writeFileSync(target,JSON.stringify(snapshot));
if(JSON.parse(fs.readFileSync(target,'utf8')).records.length!==6236)throw Error('Snapshot verification failed');
console.log('QURAN VERSE CORPUS PASS: 114 Surahs, 6236 verified source passages; sha256='+fullTextHash+' bytes='+fs.statSync(target).size);
