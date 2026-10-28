// Canonical editorial image library: safe WebP transform, protected D1 upload, reuse.
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let chooserInput=null;
function message(s){$('mediaMessage').textContent=s;}
async function api(url,opts){
 const response=await fetch(url,{credentials:'same-origin',...(opts||{})});
 const body=await response.json().catch(()=>({error:'Could not read server response'}));
 if(!response.ok)throw Error(body.error||'Request failed');
 return body;
}
async function load(){
 const d=await api('/api/admin/media');
 $('mediaItems').innerHTML=(d.records||[]).map(row=>{
  const url='/media/'+encodeURIComponent(row.id)+'.webp';
  return '<article class="media-item"><div class="media-thumbnail">'+(row.status==='active'?'<img src="'+esc(url)+'" alt="'+esc(row.alt_text)+'" loading="lazy">':'<span>Archived</span>')+'</div><div><strong>'+esc(row.alt_text||'Untitled visual')+'</strong><p>'+Math.ceil(row.byte_size/1024)+' KB · '+esc(row.status)+'</p><div class="record-actions"><button type="button" data-media-action="use" data-media-id="'+esc(row.id)+'" '+(row.status!=='active'?'disabled':'')+'>Use image</button><button type="button" data-media-action="copy" data-media-id="'+esc(row.id)+'">Copy URL</button><button type="button" data-media-action="status" data-media-id="'+esc(row.id)+'" data-status="'+(row.status==='active'?'archived':'active')+'">'+(row.status==='active'?'Archive':'Restore')+'</button></div></div></article>';
 }).join('')||'<p class="muted">No approved images uploaded yet.</p>';
}
function open(input=null){
 chooserInput=input;
 $('mediaPanel').hidden=false;
 $('mediaPanel').scrollIntoView({block:'start',behavior:'smooth'});
 load().catch(e=>message('Could not load media records: '+e.message));
}
async function optimise(file){
 if(!file||!file.type.startsWith('image/'))throw Error('Select a photograph or image.');
 if(file.size>15*1024*1024)throw Error('Original image is too large (15 MB maximum).');
 const url=URL.createObjectURL(file);
 let image;
 try{
  image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Image could not be decoded'));img.src=url;});
 }finally{URL.revokeObjectURL(url);}
 const scale=Math.min(1,1800/Math.max(image.naturalWidth,image.naturalHeight));
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
 canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
 canvas.getContext('2d',{alpha:false}).drawImage(image,0,0,canvas.width,canvas.height);
 for(const quality of [.84,.74,.64,.54,.44]){
  const blob=await new Promise(r=>canvas.toBlob(r,'image/webp',quality));
  if(blob&&blob.type==='image/webp'&&blob.size<=450000)return blob;
 }
 throw Error('Could not optimise this photo below 450 KB. Choose a simpler or smaller image.');
}
$('openMediaLibrary').addEventListener('click',()=>open());
$('closeMediaLibrary').addEventListener('click',()=>{$('mediaPanel').hidden=true;chooserInput=null;});
$('uploadMedia').addEventListener('click',async()=>{
 const file=$('mediaFile').files?.[0];
 if(!file){message('Choose an image file first.');return;}
 const btn=$('uploadMedia');btn.disabled=true;message('Optimising image locally…');
 try{
  const blob=await optimise(file);
  message('Uploading optimised '+Math.ceil(blob.size/1024)+' KB image…');
  const d=await api('/api/admin/media/upload',{method:'POST',headers:{'content-type':'image/webp','x-image-alt':$('mediaAlt').value.trim()},body:blob});
  message('Image saved to the canonical D1 library.');
  if(chooserInput){chooserInput.value=d.url;chooserInput.dispatchEvent(new Event('change',{bubbles:true}));}
  $('mediaFile').value='';
  await load();
 }catch(e){message('Upload failed: '+e.message);}finally{btn.disabled=false;}
});
$('mediaItems').addEventListener('click',async e=>{
 const b=e.target.closest('[data-media-action]');if(!b)return;
 const id=b.dataset.mediaId,url=new URL('/media/'+id+'.webp',location.origin).href;
 try{
  if(b.dataset.mediaAction==='use'){
   if(chooserInput){chooserInput.value=url;chooserInput.dispatchEvent(new Event('change',{bubbles:true}));message('Image selected in the editor. Save the form to publish it.');}
   else{await navigator.clipboard.writeText(url);message('Image URL copied. Paste it into a hero/card image field.');}
  }else if(b.dataset.mediaAction==='copy'){await navigator.clipboard.writeText(url);message('Image URL copied.');}
  else{
   if(b.dataset.status==='archived'&&!confirm('Archive this image? Any published placement will stop displaying it until restored.'))return;
   await api('/api/admin/media/'+encodeURIComponent(id),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({status:b.dataset.status})});
   await load();message('Image status updated.');
  }
 }catch(err){message(err.message);}
});
window.QuranicallyMedia={openFor:input=>open(input)};
})();