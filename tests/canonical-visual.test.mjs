import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const files=['index.html','encyclopedia.html','guidance.html','study.html','tibb.html'];
const read=f=>fs.readFileSync('public/'+f,'utf8');
const extract=(s,start,end)=>{const i=s.indexOf(start),j=s.indexOf(end,i);assert(i>=0&&j>i,'Missing canonical region '+start);return s.slice(i,j+end.length);};
test('all public page families share precisely one canonical header and navigation DOM',()=>{
 const headers=files.map(f=>extract(read(f),'<header class="qst-header"','</header>').replaceAll(' aria-current="page"',''));
 assert.equal(new Set(headers).size,1,'One header component means byte-identical structure beyond current nav state');
 for(const [i,f] of files.entries()){
  const s=read(f);
  assert.equal((s.match(/<header class="qst-header"/g)||[]).length,1,f+' duplicates header');
  assert.equal((s.match(/<nav class="qst-nav"/g)||[]).length,1,f+' duplicates navigation');
  assert.equal((s.match(/<link rel="stylesheet" href="\/qst-visual-system.css">/g)||[]).length,1,f+' lacks canonical final CSS');
  assert(s.indexOf('/qst-visual-system.css')>s.indexOf('/canonical-header.css'),f+' visual system must load last');
 }
});
test('every public page has one identical canonical site footer, not a one-off page footer',()=>{
 const footers=files.map(f=>extract(read(f),'<footer class="qst-site-footer"','</footer>'));
 assert.equal(new Set(footers).size,1);
 for(const f of files){const s=read(f);assert.equal((s.match(/<footer class="qst-site-footer"/g)||[]).length,1,f+' footer mismatch');}
});
test('all public pages lock viewport scale and page identity with no deployment-time header replacement',()=>{
 for(const f of files){
  const s=read(f);
  assert.match(s,/<meta name="viewport" content="width=device-width,\s*initial-scale=1(?:\.0)?"/i,f);
  assert.match(s,/<body data-qst-page="(?:encyclopedia|guidance|reader|tibb)">/,f);
  assert(!s.includes('<script src="/canonical-header.js"'),'Header must be static and never replace itself on paint');
 }
});
test('Quran Reader does not point readers back into the legacy hidden guide layout',()=>{
 const s=read('study.html');
 assert(s.includes('Explore Living Guidance</a>'));
 assert(!s.includes('Return to guided study</a>'));
});
