// Verifies a real full publisher corpus can answer arbitrary topic words, not seeded articles.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {searchKnowledge} from '../src/knowledge-index.mjs';
const file=process.argv[2]||'/tmp/quranically-hadeethenc.sql';
const db=new DatabaseSync(':memory:');
db.exec(readFileSync('migrations/0024_knowledge_corpus_inverted_index.sql','utf8'));
db.exec(readFileSync(file,'utf8'));
const env={prepare:sql=>({bind(...args){return{
 all:()=>({results:db.prepare(sql).all(...args)}),first:()=>db.prepare(sql).get(...args)||null,
 run:()=>db.prepare(sql).run(...args)
}},first:()=>db.prepare(sql).get()||null,all:()=>({results:db.prepare(sql).all()})})};
const n=db.prepare("SELECT COUNT(*) AS n FROM knowledge_passages WHERE source_id='hadeethenc-en'").get().n;
if(n<2200)throw Error('Incomplete publisher corpus import: '+n);
let matched=0;
for(const question of ['clothing','prayer','mosque','dates','marriage','journey']){
 const start=Date.now();
 const search=await searchKnowledge(env,question,'seerah');
 const results=search.results||[];
 matched+=Number(results.length>0);
 if(results.some(x=>!x.source_url.startsWith('https://hadeethenc.com/')||!x.original_text||!x.translation_text))throw Error('Unattributed or truncated source passage');
 console.log(JSON.stringify({question,matches:results.length,first_ref:results[0]?.external_ref||null,elapsed_ms:Date.now()-start,indexed:search.total_indexed}));
}
if(matched<3)throw Error('Natural-language topic retrieval fails on the full publisher corpus');
console.log('FULL CORPUS OPEN-TOPIC SEARCH PASS',n,'real source documents');
