// Reader study is sourced by exact chapter:verse citations; never AI-derives a tafsir.
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const form=$('qrLearningForm'),input=$('qrLearningAyah'),select=$('qrSurah'),results=$('qrLearningResults');
 if(!form||!input||!select||!results)return;
 let id=0;
 async function load(){
   const surah=Number(select.value)||Number(new URLSearchParams(location.search).get('surah'))||1;
   const ayah=Number(input.value)||1;const seq=++id;
   if(!Number.isInteger(surah)||surah<1||surah>114||!Number.isInteger(ayah)||ayah<1||ayah>286){
    results.textContent='Check the chapter and verse number.';return;
   }
   results.textContent='Looking up actual cited studies for Qur’an '+surah+':'+ayah+'…';
   try{
    const response=await fetch('/api/quran/learning?'+new URLSearchParams({surah:String(surah),ayah:String(ayah)}),{headers:{accept:'application/json'}});
    if(!response.ok)throw Error('Study index unavailable');
    const data=await response.json();
    if(id!==seq)return;
    const studies=Array.isArray(data.studies)?data.studies:[];
    if(!studies.length){
      results.innerHTML='<p>No source-grounded practical lesson has been published for this exact verse yet. The Arabic verse and attributed translation remain available above; do not treat an unrelated article as Tafsir.</p>';
      return;
    }
    results.innerHTML=studies.map(x=>'<article class="qrLearningItem"><h4><a href="/encyclopedia/'+encodeURIComponent(x.slug)+'">'+esc(x.title)+'</a></h4><p>'+esc(x.everyday_application)+'</p><small>Editorial review: '+esc(x.review_status)+' · Verse '+esc(x.citation_ref)+'</small></article>').join('')+
      '<p class="qrLearningCaveat">Editorial learning pathways are not formal rulings, prescribed recitation counts or independently verified Tafsir.</p>';
   }catch(e){if(id===seq)results.textContent='Related study references could not be loaded. The Qur’an Reader is still available.';}
 }
 form.addEventListener('submit',e=>{e.preventDefault();load();});
 select.addEventListener('change',()=>{input.value='1';load();});
 const params=new URLSearchParams(location.search),jump=Number(params.get('ayah'));
 if(Number.isInteger(jump)&&jump>0&&jump<=286)input.value=String(jump);
 // Query URL determines initial verse even before asynchronous Surah selection completes.
 load();
})();
