// Canonical header/footer and homepage data are rendered before first paint by the Worker.
// Client JavaScript is limited to accessible progressive controls; it never swaps site chrome.
(()=>{'use strict';
 function menu(){
  const header=document.querySelector('header.qst-shell-header[data-canonical-shell="server"]');
  if(!header)return;
  const button=header.querySelector('.qst-shell-menu');
  if(!button)return;
  button.addEventListener('click',()=>{
   const open=header.classList.toggle('qst-open');
   button.setAttribute('aria-expanded',String(open));
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',menu);
 else menu();
})();
