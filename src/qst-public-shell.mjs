/** Quranically single canonical public shell source.
 * One first-paint header, navigation, logo and footer. Dedicated disciplines
 * customize ONLY the active link; all geometry belongs to the common CSS.
 * To change markup: edit HERE, then run sync-qst-shell.mjs --write; CI --check.
 */
export const QST_PUBLIC_HEADER=`<header class="qst-header" role="banner"><div class="qst-top"><a class="qst-brand" href="/encyclopedia" aria-label="Quranically home"><img src="/favicon.svg" width="43" height="43" alt=""><span><strong>QURANICALLY</strong><small>THE ISLAMIC REFERENCE ENCYCLOPEDIA</small></span></a><span class="qst-edition">QURAN · SUNNAH · SEERAH · PROPHETIC MEDICINE</span><div class="qst-utility"><a href="/admin">Editorial Desk</a><button id="mobileMenu" class="qst-legacy-control" type="button" aria-label="Open navigation">Menu</button></div></div><nav class="qst-nav" aria-label="Primary"><div class="qst-links" id="navLinks"><a href="/encyclopedia">Explore</a><a href="/study.html">Qur’an</a><a href="/encyclopedia?domain=sunnah">Hadith & Sunnah</a><a href="/encyclopedia?domain=seerah">Seerah</a><a href="/tibb">Prophetic Medicine</a><a href="/guidance">Living Guidance</a></div></nav></header>`;
export const QST_PUBLIC_FOOTER=`<footer class="qst-site-footer" role="contentinfo"><div class="shell qst-footer-grid">
 <div class="qst-footer-intro"><a class="qst-footer-identity" href="/" aria-label="Quranically home"><img src="/favicon.svg" alt="" width="38" height="38"><span>QURANICALLY<small>THE ISLAMIC REFERENCE ENCYCLOPEDIA</small></span></a><p>A living library of revelation, authenticated reports and carefully attributed scholarship. Explore freely; examine every source.</p><span class="qst-footer-integrity">SOURCES BEFORE CLAIMS · REVIEW STATUSES VISIBLE</span></div>
 <div class="qst-footer-group"><h2>Discover</h2><a href="/encyclopedia">Encyclopedia</a><a href="/encyclopedia?domain=quranic_themes">Qur’anic Themes</a><a href="/encyclopedia?domain=sunnah">Sunnah &amp; Hadith</a><a href="/encyclopedia?domain=seerah">Seerah &amp; Biography</a></div>
 <div class="qst-footer-group"><h2>Learn &amp; apply</h2><a href="/study.html">Qur’an Reader</a><a href="/tibb">Prophetic Medicine</a><a href="/guidance">Living Guidance</a></div>
 <div class="qst-footer-group"><h2>Transparency</h2><a href="/encyclopedia#methodology">Editorial methodology</a><a href="/admin">Editorial Desk</a><p>Publication is not independent scholarly or clinical approval.</p></div>
 </div><div class="shell qst-footer-bottom"><span>© Quranically · Source-led Islamic knowledge</span><span>One identity. Five disciplines. Traceable references.</span></div></footer>`;
export const QST_PUBLIC_PAGES=Object.freeze({
 'index.html':'/encyclopedia',
 'encyclopedia.html':'/encyclopedia',
 'guidance.html':'/guidance',
 'study.html':'/study.html',
 'tibb.html':'/tibb'
});
export function canonicalHeader(active){
 const link='<a href="'+active+'">';
 if(!QST_PUBLIC_HEADER.includes(link))throw new Error('Unknown canonical discipline: '+active);
 return QST_PUBLIC_HEADER.replace(link,'<a href="'+active+'" aria-current="page">');
}
