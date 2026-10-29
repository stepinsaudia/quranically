import {test} from 'node:test';import assert from 'node:assert/strict';
import {bestArticle,scoreArticle,subjectTokens} from '../src/article-match.mjs';
const records=[
 {id:'clothing',title:"Men's Clothing in the Prophetic Era",alternate_names:"clothing for men,mens clothing,men's clothing,qamis,thobe,seerah dress",abstract:"Narrations about clothing in the time of the Prophet"},
 {id:'diabetes',title:'Diabetes and Prophetic Medicine',alternate_names:'diabetes,diabetic,blood sugar,type 2 diabetes',abstract:'Islamic healing traditions and clinical treatment'},
 {id:'honey',title:'Honey',alternate_names:'asal,bee product,honey',abstract:'Quranic mention of the bee'}
];
test('natural wording resolves men’s dress to the real sourced Seerah article',()=>{
 for(const q of ['How should Muslim men dress?','Clothing for men in Seerah','What clothes did the Prophet wear?']){
  const winner=bestArticle(q,records);
  assert.equal(winner?.article.id,'clothing',q);
 }
});
test('diabetes questions resolve the condition, never an unrelated generic remedy',()=>{
 for(const q of ['I have diabetes; what does Islam say?','Diabetic blood sugar and Prophetic Medicine']){
  assert.equal(bestArticle(q,records)?.article.id,'diabetes',q);
 }
 assert.equal(bestArticle('Where was Maryam mentioned?',records),null);
 assert.equal(bestArticle('Completely unknown topic',records),null);
});
test('direct subject match outranks broad overlap and scores remain deterministic',()=>{
 assert(scoreArticle('honey',records[2]).score>scoreArticle('honey',records[1]).score);
 assert.deepEqual(subjectTokens('How should Muslim men dress?'),['men','clothing']);
});
