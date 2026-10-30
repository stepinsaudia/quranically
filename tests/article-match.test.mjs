import {test} from 'node:test';import assert from 'node:assert/strict';
import {bestArticle,scoreArticle,subjectTokens,subjectOverlap} from '../src/article-match.mjs';
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

test('common Islamic transliterations share one explainable search vocabulary',()=>{
 assert.deepEqual(subjectTokens('What is the Sunnah about nikah and mahr?'),['marriage','dowry']);
 assert.deepEqual(subjectTokens('How is wudu done before salah?'),['ablution','prayer']);
 assert.deepEqual(subjectTokens('What is tawbah for ghibah?'),['repentance','backbiting']);
 assert.deepEqual(subjectTokens('Is riba forbidden?'),['usury','forbidden']);
});

test('relevance requires whole subjects, never substrings embedded in other words',()=>{
 assert.equal(subjectOverlap('men','medical treatment and supplements'),0);
 assert.equal(subjectOverlap('fast','breakfast foods'),0);
 assert.equal(subjectOverlap('men','mens clothing and modest dress'),1);
 assert.equal(subjectOverlap('black seed','black seed and honey'),2);
 assert.equal(subjectOverlap('riba and marriage','usury or nikah'),2);
});

test('multi-topic prompts never convert a single matching noun into an editorial answer',()=>{
 const scenarios=[
  'Can honey cure cancer without chemotherapy?',
  'Does honey cause epilepsy and kidney damage?',
  'Is diabetes inherited through a father after divorce?',
  'Can I replace insulin with black seed during Ramadan?',
  'Can I wear a medical compression garment during Hajj?'
 ];
 for(const q of scenarios){
  assert.equal(bestArticle(q,records),null,'Spurious complete-article match: '+q);
 }
});
test('short clear subject prompts still resolve genuine editorial records',()=>{
 assert.equal(bestArticle('I have diabetes; what does Islam say?',records)?.article.id,'diabetes');
 assert.equal(bestArticle('Tell me about honey',records)?.article.id,'honey');
 assert.equal(bestArticle('What clothing did men wear?',records)?.article.id,'clothing');
});
