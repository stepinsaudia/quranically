// Read-only provider compatibility probe. Does not use D1 or deploy any Worker.
import assert from 'node:assert/strict';
import {searchHadeethEnc} from '../src/hadeethenc-discovery.mjs';
const timeout=AbortSignal.timeout(14000);
const base='https://hadeethenc.com/api/v1';
async function probe(url){
 const r=await fetch(url,{headers:{accept:'application/json'},signal:timeout});
 if(!r.ok)throw Error(url+' HTTP '+r.status);
 const d=await r.json();
 return d;
}
const cats=await probe(base+'/categories/list/?language=en');
assert(Array.isArray(cats),'HadeethEnc category list must be array');
const category=cats.find(x=>/clothing/i.test(x.title)&&/^\d+$/.test(String(x.id)));
assert(category,'Live HadeethEnc English category "Clothing" not returned');
const listing=await probe(base+'/hadeeths/list/?language=en&category_id='+category.id+'&page=1&per_page=20');
assert(Array.isArray(listing?.data),'Live HadeethEnc listing shape changed');
assert(listing.data.some(x=>/^\d+$/.test(String(x?.id))),'Live category contained no numbered hadith');
const first=listing.data.find(x=>/^\d+$/.test(String(x?.id)));
const full=await probe(base+'/hadeeths/one/?language=en&id='+first.id);
assert.equal(String(full.id),String(first.id),'Live HadeethEnc record id mismatch');
assert(typeof full.hadeeth==='string'&&full.hadeeth.length>=10,'Live full Hadith not returned');
const live=await searchHadeethEnc('clothing and garments');
if(live.status!=='available')throw Error('Live subject search did not return details: '+live.status);
const q=await probe('https://api.alquran.cloud/v1/ayah/2:255/editions/quran-uthmani,en.pickthall');
assert.equal(q.code,200);
assert(Array.isArray(q.data)&&q.data.length===2);
assert(q.data.every(x=>Number(x.surah?.number)===2&&Number(x.numberInSurah)===255));
console.log('PROVIDER PASS: HadeethEnc category',category.id,'hadith',first.id,'matched',live.results.length,'; Qur’an 2:255 Arabic + English aligned.');
