/**
 * QURANICALLY: strict batch builder for the five approved additive dossier
 * migrations. Rebuilds canonical local D1 and refuses any missing, duplicate,
 * unsourced, or improperly labelled source dossier.
 *
 * Output is an ephemeral SQL file for the existing D1 only. No network or
 * production writes are performed by this script.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const names=[
  '0014_seerah_primary_sources.sql',
  '0015_living_guidance_primary_sources.sql',
  '0016_tibb_health_safety_dossiers.sql',
  '0017_quranic_sunnah_source_dossiers.sql',
  '0018_ayat_al_kursi_source_dossier.sql'
];
export const dossierIds=[
  'hijrah-to-madinah','battle-of-badr-sourced-account','prophetic-guidance-neighbours',
  'anger-and-self-restraint','repentance-tawbah-in-islam','family-relationships-kindness',
  'honey-for-cough-evidence','hijama-cupping-safety','asthma-prophetic-medicine-boundaries',
  'patience-quranic-theme','riba-in-quranic-text','maryam-in-quran',
  'truthfulness-in-sunnah','backbiting-ghibah-sunnah','ayat-al-kursi-guide'
];
const assert=(condition,message)=>{if(!condition)throw Error(message)};
const root=process.cwd(),dir=path.join(root,'migrations');
const all=fs.readdirSync(dir).filter(x=>/^\d{4}_.*\.sql$/.test(x)).sort();
assert(names.every(x=>all.includes(x)),'One or more approved migration files are missing');
const db=new DatabaseSync(':memory:');
for(const name of all)db.exec(fs.readFileSync(path.join(dir,name),'utf8'));
const placeholders=dossierIds.map(()=>'?').join(',');
const rows=db.prepare(`SELECT id,slug,title,domain,status,review_status FROM encyclopedia_articles WHERE id IN (${placeholders}) ORDER BY id`).all(...dossierIds);
assert(rows.length===15,'Expected exactly 15 distinctive new source dossiers');
const sections=db.prepare(`SELECT article_id,COUNT(*) n FROM encyclopedia_sections WHERE article_id IN (${placeholders}) GROUP BY article_id`).all(...dossierIds);
const citations=db.prepare(`SELECT article_id,COUNT(*) n,MIN(verification_status) first_status,MAX(verification_status) last_status FROM encyclopedia_citations WHERE article_id IN (${placeholders}) GROUP BY article_id`).all(...dossierIds);
assert(sections.length===15&&sections.every(x=>x.n>=4),'Every dossier must have at least four distinct substantive sections');
assert(citations.length===15&&citations.every(x=>x.n>=2&&x.first_status==='pending'&&x.last_status==='pending'),'Every dossier needs 2+ source citations pending expert approval');
for(const article of rows)assert(article.status==='published'&&article.review_status==='editorial_draft'&&article.title?.length>6,'Incorrect publishing or review metadata: '+article.id);
const sql=names.map(name=>{
 const text=fs.readFileSync(path.join(dir,name),'utf8');
 const commands=text.split('\n').filter(line=>/^(INSERT OR IGNORE INTO |--|\s*$)/i.test(line));
 assert(commands.length===text.split('\n').length,'Unexpected migration statement in '+name);
 return '-- '+name+'\n'+text;
}).join('\n');
const output=process.env.QST_DOSSIER_SQL||'/tmp/quranically-approved-dossier-batch.sql';
fs.writeFileSync(output,sql);
console.log('Dossier batch PASS:',JSON.stringify({dossiers:rows.length,sections:sections.reduce((n,x)=>n+x.n,0),citations:citations.reduce((n,x)=>n+x.n,0),source_review:'editorial_draft',sql_bytes:Buffer.byteLength(sql),migration_files:names,output}));
db.close();
