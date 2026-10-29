import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const pages=['index.html','encyclopedia.html','guidance.html','study.html'];
const canonicalLinks=[
'/encyclopedia','/study.html','/encyclopedia?domain=quranic_themes',
'/encyclopedia?domain=sunnah','/encyclopedia?domain=seerah',
'/encyclopedia?domain=prophetic_medicine','/guidance'
];
const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
test('every public page has one first-paint canonical masthead and stylesheet',()=>{
  for(const name of pages){
    const html=read(name);
    assert.equal((html.match(/<header class="qst-header" role="banner">/g)||[]).length,1,name);
    assert.equal((html.match(/href="\/canonical-header.css"/g)||[]).length,1,name);
    assert.ok(html.indexOf('href="/canonical-header.css"')<html.indexOf('</head>'),name);
    assert.equal((html.match(/<nav class="qst-nav" aria-label="Primary">/g)||[]).length,1,name);
    assert.doesNotMatch(html,/<header class="(?:header|site-header)">|<header><div class="container head">/,name);
    for(const href of canonicalLinks) assert.ok(html.includes('href="'+href+'"'),name+' missing '+href);
  }
});
test('canonical public header maintains matching structural markup',()=>{
 const normalized=pages.map(name=>{
   const html=read(name);const h=html.match(/<header class="qst-header" role="banner">[\s\S]*?<\/header>/);
   assert.ok(h,name);return h[0]
    .replace(/aria-current="page"/g,'')
    .replace(/<div class="qst-utility">[\s\S]*?<\/div><\/div><nav/, '<div class="qst-utility"></div></div><nav')
    .replace(/\s+/g,' ').trim();
 });
 normalized.slice(1).forEach((h,i)=>assert.equal(h,normalized[0],pages[i+1]));
});
test('required legacy interactions survive migration',()=>{
 assert.match(read('guidance.html'),/id="collectionBtn"/);
 assert.match(read('guidance.html'),/id="savedNum"/);
 assert.match(read('study.html'),/id="copyJourney"/);
 assert.match(read('study.html'),/id="openReaderPill"/);
});
