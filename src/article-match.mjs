// Canonical, explainable subject matcher. Never fabricates an answer from a weak hit.
// Reused by the full article-answer endpoint and unified evidence discovery.
const ignored=new Set(['the','and','for','from','with','what','where','which','when','why','how','does','do','did','can','could','would','should','please','tell','show','find','give','about','have','has','had','was','were','are','you','your','me','my','our','they','their','this','that','there','is','in','on','to','of','a','an','i','it','all','some','really','according','explain','meaning','teach','taught','prophetic','medicine','seerah','biography','sunnah','hadith','quran','qur','islam','islamic','muslim','rasulullah','prophet','muhammad','pbuh','peace','upon','him']);
const canonical=new Map([
 ['clothes','clothing'],['cloth','clothing'],['dress','clothing'],['dressing','clothing'],['garment','clothing'],['garments','clothing'],['wear','clothing'],['worn','clothing'],['outfit','clothing'],['outfits','clothing'],
 ['salah','prayer'],['salat','prayer'],['salaah','prayer'],['namaz','prayer'],
 ['sawm','fasting'],['roza','fasting'],['ramadhan','ramadan'],
 ['wudu','ablution'],['wudhu','ablution'],['wuzu','ablution'],
 ['nikah','marriage'],['nikkah','marriage'],['mahr','dowry'],
 ['riba','usury'],['ghibah','backbiting'],['tawbah','repentance'],['tauba','repentance'],['istighfar','forgiveness'],
 ['dua','supplication'],['duaa','supplication'],['jannah','paradise'],['qiyamah','resurrection'],
 ['mens','men'],['man','men'],['male','men'],['males','men'],['diabetic','diabetes'],['glucose','diabetes'],['glycemic','diabetes'],['eyes','eyesight'],['vision','eyesight'],['blurry','eyesight'],['blurred','eyesight'],['kalonji','blackseed'],['nigella','blackseed'],['cumin','blackseed'],['sabr','patience'],['worry','anxiety'],['worries','anxiety']
]);
export const normalizeSubject=value=>String(value||'').toLowerCase().replace(/[\u2018\u2019']/g,'').replace(/[^a-z0-9\u00c0-\u024f\u0600-\u06ff]+/g,' ').replace(/\s+/g,' ').trim();
export function subjectTokens(value){
 return [...new Set(normalizeSubject(value).split(' ').filter(x=>x.length>2&&!ignored.has(x)).map(x=>canonical.get(x)||x))];
}
function phrases(article){return [article.title,...String(article.alternate_names||'').split(',')].map(normalizeSubject).filter(Boolean);}
export function scoreArticle(query,article){
 const nq=normalizeSubject(query),qt=subjectTokens(query);
 if(!qt.length)return {score:0,method:'no_subject'};
 const aliases=phrases(article);
 let best=0,method='no_match';
 for(const alias of aliases){
  const at=subjectTokens(alias);if(!at.length)continue;
  const hits=qt.filter(t=>at.includes(t));
  let n=0;
  if(nq===alias)n=150;
  else if(alias.length>=7&&(nq.startsWith(alias+' ')||nq.endsWith(' '+alias)||nq.includes(' '+alias+' ')))n=105;
  else if(hits.length===qt.length&&hits.length>=2)n=88;
  else if(qt.length===1&&hits.length===1)n=70;
  else if(hits.length>=2&&hits.length/qt.length>=0.6)n=68;
  if(n>best){best=n;method=n>=105?'direct_subject':n>=88?'phrase_match':'subject_match';}
 }
 // Descriptive abstracts help rank among already plausible alias matches;
 // a generic word in an abstract alone must never invent an article match.
 if(best>0){const description=subjectTokens(article.abstract);const overlap=qt.filter(t=>description.includes(t)).length;best+=Math.min(8,overlap*2);}
 return {score:best,method};
}
export function bestArticle(query,records){
 let best=null;for(const article of records){const {score,method}=scoreArticle(query,article);if(score>0&&(!best||score>best.score))best={article,score,method};}
 return best;
}
