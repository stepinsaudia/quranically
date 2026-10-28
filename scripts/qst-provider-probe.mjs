const base='https://ummahapi.com';
for(const [name,path] of [
 ['hadith-clothing','/api/hadith/search?q=clothing&limit=3'],
 ['hadith-men','/api/hadith/search?q=garment&limit=3'],
 ['quran-honey','/api/quran/search?q=honey&limit=3'],
 ['duas-worry','/api/duas/search?q=worry']]){
 try{
  const r=await fetch(base+path,{signal:AbortSignal.timeout(12000)});
  const j=await r.json();
  const d=j.data;
  const arr=Array.isArray(d)?d:Array.isArray(d?.results)?d.results:Array.isArray(d?.hadiths)?d.hadiths:Array.isArray(d?.verses)?d.verses:[];
  const first=arr[0]||{};
  console.log(JSON.stringify({name,status:r.status,keys:Object.keys(j),dataType:Array.isArray(d)?'array':typeof d,dataKeys:d&&typeof d==='object'&&!Array.isArray(d)?Object.keys(d):[],count:arr.length,firstKeys:Object.keys(first),firstIdentifiers:Object.fromEntries(Object.entries(first).filter(([k,v])=>/id|number|reference|collection|surah|verse|grade|book|title|source|url/.test(k)).map(([k,v])=>[k,typeof v==='string'?v.slice(0,120):v]))}));
 }catch(e){console.log(JSON.stringify({name,error:e.name}));}
}
