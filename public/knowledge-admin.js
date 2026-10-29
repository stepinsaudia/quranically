// Existing Quranically Admin — canonical source corpus governance, no parallel CMS.
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let sources=[];
const notice=t=>{$('knowledgeStatus').textContent=t;};
async function api(path,options={}){
 const response=await fetch(path,{credentials:'same-origin',...options});
 const json=await response.json().catch(()=>({error:'Invalid server response'}));
 if(!response.ok)throw Error(json.error||'Request failed');
 return json;
}
async function refresh(){
 const data=await api('/api/admin/knowledge');
 sources=data.sources||[];
 const totals=new Map();
 for(const c of data.coverage||[])totals.set(c.source_id,(totals.get(c.source_id)||0)+Number(c.indexed||0));
 $('knowledgeSources').innerHTML=sources.map(s=>'<div class="knowledge-source"><strong>'+esc(s.collection_title)+'</strong><small>'+esc(s.publisher)+' · '+esc(s.rights_mode)+' · '+esc(s.version_label)+' · '+esc(s.language)+'</small><b>'+Number(totals.get(s.id)||0).toLocaleString()+' indexed passages</b></div>').join('');
 const selected=$('knowledgeSource').value;
 $('knowledgeSource').innerHTML=sources.filter(s=>s.rights_mode==='verified_verbatim').map(s=>'<option value="'+esc(s.id)+'">'+esc(s.collection_title)+'</option>').join('');
 if(sources.some(s=>s.id===selected))$('knowledgeSource').value=selected;
 $('knowledgeSource').dispatchEvent(new Event('change'));
}
function open(){ $('knowledgePanel').hidden=false; $('knowledgePanel').scrollIntoView({block:'start'}); refresh().catch(e=>notice('Unable to retrieve corpus governance: '+e.message));}
$('openKnowledge').addEventListener('click',open);
$('closeKnowledge').addEventListener('click',()=>{$('knowledgePanel').hidden=true;});
$('knowledgeSource').addEventListener('change',()=>{
 const source=sources.find(s=>s.id===$('knowledgeSource').value);
 $('knowledgeVersion').value=source?.version_label==='publisher_version_required'?'':(source?.version_label||'');
});
$('saveKnowledgeVersion').addEventListener('click',async()=>{
 const id=$('knowledgeSource').value,version=$('knowledgeVersion').value.trim();
 if(!/^v?[0-9]+(?:\.[0-9]+){0,4}$/.test(version)){notice('Enter the verified numeric version of the actual publisher release.');return;}
 try{
  await api('/api/admin/knowledge/sources/'+encodeURIComponent(id),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({version_label:version})});
  notice('Edition confirmed for '+id+'. Source text must remain verbatim and attributed.');
  await refresh();
 }catch(e){notice('Version update blocked: '+e.message);}
});
$('knowledgeImport').addEventListener('click',async()=>{
 const file=$('knowledgeFile').files?.[0],id=$('knowledgeSource').value,button=$('knowledgeImport');
 if(!file){notice('Select a licensed and source-verified JSON document file.');return;}
 if(file.size>10*1024*1024){notice('File exceeds 10 MB; split by collection.');return;}
 let documents;
 try{documents=JSON.parse(await file.text());}catch{notice('Invalid JSON file.');return;}
 if(!Array.isArray(documents)||!documents.length){notice('Expected a JSON array of real source documents.');return;}
 if(!confirm('Import '+documents.length+' exact source passages from '+id+'? Confirm you are authorised to reuse this publisher edition verbatim.'))return;
 button.disabled=true;
 try{
  for(let i=0;i<documents.length;i+=5){
   const chunk=documents.slice(i,i+5);
   // Existing Worker limit: max 24 KB per JSON request; never silently truncate a source.
   const body=JSON.stringify({source_id:id,documents:chunk});
   if(new TextEncoder().encode(body).length>23000)throw Error('At source record '+(i+1)+': a batch exceeds 23 KB. Split large passages into a smaller source file.');
   await api('/api/admin/knowledge/import',{method:'POST',headers:{'content-type':'application/json'},body});
   notice('Indexed '+Math.min(documents.length,i+5)+' / '+documents.length+' publisher records. Every source remains traceable.');
  }
  await refresh();
  notice('Corpus import complete: '+documents.length+' publisher records processed. Confirm live search coverage before publishing completion claims.');
 }catch(e){notice('Import halted: '+e.message+'. Previously successful batches remain indexed; review audit before retrying.');}
 finally{button.disabled=false;}
});
})();