// Single canonical first-paint header/footer. Content is read from published D1 records
// BEFORE HTML is returned to the browser. No duplicate legacy or JS-replaced headers.
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const safeHref=value=>{
 const v=String(value||'');
 if(/^\/(?!\/)[a-zA-Z0-9/?#=&._%~-]*$/.test(v))return v;
 try{const u=new URL(v);return u.protocol==='https:'?u.href:''}catch{return ''}
};
const renderLink=(link,cls='')=>{
 const url=safeHref(link.href);
 return url?'<a href="'+escapeHtml(url)+'"'+(cls?' class="'+cls+'"':'')+'>'+escapeHtml(link.label)+'</a>':'';
};
const groups=[['footer_explore','Explore'],['footer_resources','Resources'],['footer_about','About'],['footer_legal','Legal']];
export async function renderCanonicalShell(env,url,response){
 if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))return response;
 let html=await response.text();
 if(!html.includes('<!--QST_CANONICAL_HEADER-->')||!html.includes('<!--QST_CANONICAL_FOOTER-->'))
   throw new Error('Canonical public HTML shell markers missing. Refusing legacy markup.');
 const [panelResult,linkResult]=await Promise.all([
  env.DB.prepare("SELECT id,kicker,heading,subtitle,body FROM site_panels WHERE status='published' AND id IN ('header','footer')").all(),
  env.DB.prepare("SELECT id,section,label,href,sort_order FROM site_links WHERE status='published' ORDER BY section,sort_order,id").all()
 ]);
 const panels=Object.fromEntries((panelResult.results||[]).map(p=>[p.id,p]));
 if(!panels.header||!panels.footer)throw new Error('Published canonical header/footer configuration is required');
 const links=linkResult.results||[], header=panels.header,footer=panels.footer;
 const here=url.pathname==='/'?'/':url.pathname.replace(/\.html$/,'');
 const nav=links.filter(x=>x.section==='header'&&safeHref(x.href)).map(x=>{
  const u=new URL(x.href,url.origin);
  const destination=u.pathname.replace(/\.html$/,'');
  const active=destination===here&&u.search===url.search;
  return renderLink(x,active?'qst-active':'');
 }).join('');
 const shellHeader='<header class="qst-shell-header" data-canonical-shell="server"><div class="qst-shell-inner">'+
 '<a class="qst-shell-brand" href="/" aria-label="Quranically home"><img src="/favicon.svg" alt="" width="37" height="37">'+
 '<span><strong>'+escapeHtml(header.heading)+'</strong><small>'+escapeHtml(header.kicker||header.subtitle)+'</small></span></a>'+
 '<nav class="qst-shell-nav" id="qstShellNav" aria-label="Main navigation">'+nav+'</nav>'+
 '<button type="button" class="qst-shell-menu" aria-controls="qstShellNav" aria-expanded="false">Menu</button></div></header>';
 const columns=groups.map(([key,label])=>{
  const records=links.filter(x=>x.section===key&&safeHref(x.href));
  return records.length?'<div class="qst-foot-column"><h4>'+label+'</h4>'+records.map(x=>renderLink(x)).join('')+'</div>':'';
 }).join('');
 const shellFooter='<footer class="qst-shell-footer" data-canonical-shell="server"><div class="qst-footer-inner">'+
 '<div class="qst-foot-intro"><a class="qst-foot-brand" href="/"><img src="/favicon.svg" alt="" width="33" height="33"><span>'+
 escapeHtml(footer.heading||'Quranically')+'</span></a><p>'+escapeHtml(footer.body||footer.subtitle)+'</p></div>'+
 columns+'</div><div class="qst-footer-bottom"><span>'+escapeHtml(footer.subtitle)+'</span><span>'+escapeHtml(footer.kicker)+'</span></div></footer>';
 html=html.replace('<!--QST_CANONICAL_HEADER-->',shellHeader).replace('<!--QST_CANONICAL_FOOTER-->',shellFooter);
 const headers=new Headers(response.headers);
 headers.set('content-type','text/html; charset=utf-8');
 headers.set('cache-control','no-store');
 headers.set('x-content-type-options','nosniff');
 for(const key of ['content-length','content-encoding','etag'])headers.delete(key);
 return new Response(html,{status:response.status,headers});
}
