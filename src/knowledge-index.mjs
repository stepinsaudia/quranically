// Source-grounded corpus retrieval with open vocabulary and publisher rights controls.
// Plain indexed SQLite tables preserve the existing D1 backup/export process.
const stop=new Set(['a','about','after','all','an','and','are','as','at','be','because','before','by','can','could','did','do','does','for','from','had','has','have','how','i','in','into','is','it','me','my','of','on','or','our','please','say','should','show','that','the','their','them','there','these','this','to','us','was','were','what','when','where','which','who','why','will','with','would','you','your']);
const canonical=x=>String(x||'').toLowerCase().normalize('NFKC').replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const questionTerms=q=>[...new Set(canonical(q).split(/\s+/).filter(x=>x.length>=2&&!stop.has(x)))].slice(0,12);
export function passageTerms(record){
 const weight=new Map();
 function add(value,n){
  for(const t of questionTerms(value)){
   weight.set(t,Math.max(weight.get(t)||0,n));
   if(weight.size>=180)break;
  }
 }
 add(record.title,6);add(record.external_ref,5);add(record.translation_text,3);add(record.original_text,3);add(record.explanation_text,1);add(record.benefits_text,1);add(record.takhrij_text,2);
 return [...weight].map(([term,w])=>({term,weight:w}));
}
const validDomains=new Set(['quranic_themes','sunnah','seerah','prophetic_medicine','living_guidance']);
const hex=bytes=>[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
export async function addKnowledgePassages(db,sourceId,documents,actor){
 if(!/^[a-z0-9-]{3,80}$/.test(String(sourceId||'')))throw Error('Invalid collection');
 if(!Array.isArray(documents)||!documents.length||documents.length>5)throw Error('Import 1–5 passages at once');
 const source=await db.prepare('SELECT * FROM knowledge_sources WHERE id=? AND status=?').bind(sourceId,'active').first();
 if(!source||source.rights_mode!=='verified_verbatim'||!source.attribution)throw Error('This source is not authorised for indexed verbatim storage');
 if(!source.version_label||source.version_label==='publisher_version_required')throw Error('Confirm a specific publisher edition/version before importing');
 let tokenCount=0;
 const statements=[];
 for(const d of documents){
  if(!d||typeof d!=='object'||!validDomains.has(d.domain))throw Error('Invalid passage or domain');
  const ref=String(d.external_ref||''),title=String(d.title||''),original=String(d.original_text||''),
    translation=String(d.translation_text||''),explanation=String(d.explanation_text||''),benefits=String(d.benefits_text||''),grade=String(d.grade_text||''),takhrij=String(d.takhrij_text||''),url=String(d.source_url||'');
  if(ref.length<1||ref.length>180||title.length<2||title.length>350)throw Error('Invalid source reference or title');
  if(!original&&!translation)throw Error('A source passage requires real original or translated content');
  if([original,translation,explanation,benefits,takhrij].some(t=>t.length>14500)||original.length+translation.length+explanation.length+benefits.length+takhrij.length>30000)throw Error('Passage exceeds bounded storage limits');
  let parsed;try{parsed=new URL(url);}catch{throw Error('Invalid publisher URL');}
  if(parsed.protocol!=='https:'||url.length>900||parsed.hostname!==new URL(source.home_url).hostname)throw Error('Passage URL does not belong to declared publisher');
  const digest=hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([sourceId,ref,original,translation,explanation,benefits,grade,takhrij])))));
  const id=hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sourceId+'|'+ref)))).slice(0,40);
  const doc={...d,external_ref:ref,title,original_text:original,translation_text:translation,explanation_text:explanation,benefits_text:benefits,grade_text:grade,takhrij_text:takhrij};
  const normalized=canonical([title,ref,original,translation,explanation,benefits,takhrij].join(' ')).slice(0,39000);
  const terms=passageTerms(doc);if(!terms.length)throw Error('Empty indexable source');
  tokenCount+=terms.length;
  const statement='INSERT INTO knowledge_passages (id,source_id,external_ref,title,domain,original_text,translation_text,explanation_text,benefits_text,grade_text,takhrij_text,normalized_search,source_url,content_version,content_sha256,language,expert_review,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) '+
   "ON CONFLICT(id) DO UPDATE SET title=excluded.title,domain=excluded.domain,original_text=excluded.original_text,translation_text=excluded.translation_text,explanation_text=excluded.explanation_text,benefits_text=excluded.benefits_text,grade_text=excluded.grade_text,takhrij_text=excluded.takhrij_text,normalized_search=excluded.normalized_search,source_url=excluded.source_url,content_version=excluded.content_version,content_sha256=excluded.content_sha256,expert_review='unreviewed',status='published',updated_at=datetime('now')";
  statements.push(db.prepare(statement).bind(id,sourceId,ref,title,d.domain,original,translation,explanation,benefits,grade,takhrij,normalized,url,source.version_label,digest,source.language,'unreviewed','published'));
  statements.push(db.prepare('DELETE FROM knowledge_terms WHERE passage_id=?').bind(id));
  for(const t of terms)statements.push(db.prepare('INSERT INTO knowledge_terms(term,passage_id,weight) VALUES(?,?,?)').bind(t.term,id,t.weight));
 }
 if(typeof db.batch==='function')await db.batch(statements);
 else for(const item of statements)await item.run();
 const auditId=crypto.randomUUID();
 await db.prepare('INSERT INTO knowledge_ingest_audit(id,source_id,passage_count,token_count,actor,result) VALUES(?,?,?,?,?,?)')
  .bind(auditId,sourceId,documents.length,tokenCount,String(actor||'admin').slice(0,120),'success').run();
 return {inserted_or_updated:documents.length,indexed_terms:tokenCount,source_id:sourceId,audit_id:auditId};
}
export async function searchKnowledge(db,q,domain=''){
 const terms=questionTerms(q);
 if(!terms.length)return {results:[],matched_terms:[],total_indexed:0};
 if(domain&&!validDomains.has(domain))throw Error('Invalid discipline');
 const slots=terms.map(()=>'?').join(',');
 const sql='SELECT p.id,p.source_id,p.external_ref,p.title,p.domain,p.original_text,p.translation_text,p.explanation_text,'+
  'p.source_url,p.content_version,p.language,p.expert_review,s.publisher,s.collection_title,s.attribution,'+
  'COUNT(*) AS term_matches,SUM(k.weight) AS search_score FROM knowledge_terms k '+
  'JOIN knowledge_passages p ON p.id=k.passage_id JOIN knowledge_sources s ON s.id=p.source_id '+
  "WHERE k.term IN ("+slots+") AND p.status='published' AND s.status='active' AND s.rights_mode='verified_verbatim' "+
  (domain?'AND p.domain=? ':'')+
  'GROUP BY p.id ORDER BY term_matches DESC,search_score DESC,p.id LIMIT 12';
 const params=domain?[...terms,domain]:terms;
 const rows=(await db.prepare(sql).bind(...params).all()).results||[];
 let combined=[...rows];
 if(combined.length<10){
   // Reliable full-text fallback for bulk imports without a per-token index.
   // Uses ordinary D1 tables to retain verifiable database backups.
   const words=terms.slice(0,6);
   const where=words.map(()=>'p.normalized_search LIKE ?').join(' OR ');
   const fallbackSql='SELECT p.id,p.source_id,p.external_ref,p.title,p.domain,p.original_text,p.translation_text,p.explanation_text,p.benefits_text,p.grade_text,p.takhrij_text,'+
     'p.source_url,p.content_version,p.language,p.expert_review,p.normalized_search,s.publisher,s.collection_title,s.attribution '+
     'FROM knowledge_passages p JOIN knowledge_sources s ON s.id=p.source_id '+
     "WHERE p.status='published' AND s.status='active' AND s.rights_mode='verified_verbatim' "+
     (domain?'AND p.domain=? ':'')+'AND ('+where+') LIMIT 100';
   const bound=domain?[domain,...words.map(w=>'%'+w+'%')]:words.map(w=>'%'+w+'%');
   const supplemental=(await db.prepare(fallbackSql).bind(...bound).all()).results||[];
   const ids=new Set(combined.map(x=>x.id));
   for(const row of supplemental){
    if(ids.has(row.id))continue;
    const haystack=' '+row.normalized_search+' ';
    const hits=words.filter(w=>haystack.includes(' '+w+' '));
    if(!hits.length)continue;
    combined.push({...row,term_matches:hits.length,search_score:hits.length*2});
    ids.add(row.id);
   }
 }
 combined.sort((a,b)=>b.term_matches-a.term_matches||b.search_score-a.search_score||a.id.localeCompare(b.id));
 combined=combined.slice(0,12);
 const count=(await db.prepare("SELECT COUNT(*) AS n FROM knowledge_passages p JOIN knowledge_sources s ON s.id=p.source_id WHERE p.status='published' AND s.status='active' AND s.rights_mode='verified_verbatim'").first())?.n||0;
 return {results:combined.map(r=>({...r,matching_scope:r.term_matches===terms.length?'all_query_subject_words':'partial_query_subject_words',
  independent_review:r.expert_review==='unreviewed'?'not_yet_reviewed':r.expert_review})),
  matched_terms:terms,total_indexed:Number(count),
  provenance:'Exact passages indexed from rights-cleared source collections. An excerpt is not itself a scholarly verdict or clinical finding.'};
}
