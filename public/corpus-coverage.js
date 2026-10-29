// Actual canonical D1 passage coverage, not publisher catalogue claims or editorial card counts.
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
async function render(){
 const el=document.getElementById('corpusCoverage');if(!el)return;
 try{
  const response=await fetch('/api/knowledge/coverage',{headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('coverage unavailable');
  const data=await response.json();
  const existing=(data.sources||[]).filter(x=>Number(x.available_in_index)>0);
  const actual=existing.reduce((n,x)=>n+Number(x.available_in_index||0),0);
  if(!actual){el.textContent='The source-index import is not yet populated. Available external sources and editorial articles are shown separately.';return;}
  el.innerHTML='<strong>'+actual.toLocaleString()+' original source records indexed</strong>'+
   '<span>'+existing.map(x=>esc(x.publisher)+' '+Number(x.available_in_index).toLocaleString()).join(' · ')+'</span>'+
   '<small>Live records stored in Quranically D1; not article counts, independent scholarly verification or the entire Islamic literature.</small>';
 }catch{el.textContent='Source-index coverage is temporarily unavailable; this does not indicate that the source collections are empty.';}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();