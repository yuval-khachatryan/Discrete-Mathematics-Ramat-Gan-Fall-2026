import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseObject,key,checkSetAnswer,subsets,readable,checkCardinalityAnswer} from '../games/shared/sets.js';
import {SET_TASKS} from '../games/shared/sets-data.js';
const same=(a,b)=>key(parseObject(a))===key(parseObject(b));
test('sets ignore order and repeats, but preserve nesting and pair order',()=>{
 assert.ok(same('{2,1,2}','{1,2}'));
 assert.ok(same('{{1,2},{2,1},∅}','{{2,1},{}}'));
 for(const [a,b]of [['2','{2}'],['∅','{∅}'],['(1,2)','(2,1)'],['{1,2}','(1,2)']])assert.equal(same(a,b),false);
 assert.ok(same('{(1,2),(2,1)}','{(2,1),(1,2)}'));
 assert.ok(same('{−2,0}','{0,-2}'));
});
test('written answers reject missing, extra, malformed and executable input',()=>{
 assert.ok(checkSetAnswer('{8,4,8}','{4,8}').ok);
 for(const answer of ['', '{4}','{4,8,9}','4,8','{4,8','{4,,8}','alert(1)','(4,8)','{(1)}'])assert.equal(checkSetAnswer(answer,'{4,8}').ok,false,answer);
 assert.ok(checkSetAnswer('{∅,{∅}}','{{},{{}}}').ok);
 assert.equal(checkSetAnswer('{∅}','{{},{{}}}').ok,false);
});
test('power sets enumerate each distinct subset once, including both extremes',()=>{
 for(const xs of [[],['a'],['a','b','c']]){
  const family=subsets(xs);assert.equal(family.length,2**xs.length);assert.equal(new Set(family.map(key)).size,family.length);
  assert.ok(family.some(n=>n.items.length===0));assert.ok(family.some(n=>n.items.length===xs.length));
 }
});
test('Venn solutions follow the logical membership tests',()=>{
 const rows=[[true,false],[true,true],[false,true],[false,false]];
 const tests=[(a,b)=>a&&b,(a,b)=>a||b,(a,b)=>a&&!b,(a,b)=>b&&!a,a=>!a,(a,b)=>a!==b];
 const tasks=[...SET_TASKS['venn-basic'].tasks,...SET_TASKS['venn-difference'].tasks];
 tasks.forEach((t,i)=>assert.deepEqual(t.regions,rows.flatMap((r,j)=>tests[i](...r)?[j]:[])));
});
test('activities are linked and written exercise answers are well-formed sets',()=>{
 const qmd=readFileSync(new URL('../02-sets.qmd',import.meta.url),'utf8');
 for(const [id,t]of Object.entries(SET_TASKS)){
  assert.ok(qmd.includes(`data-sets="${id}"`),id);
  if(t.type==='write')for(const q of t.items)assert.ok(checkSetAnswer(q.answer,q.answer).ok,id);
  if(t.type==='choice')for(const q of t.items){assert.ok(q.answer>=0&&q.answer<q.options.length);assert.ok(q.why.length>15);}
 }
 const operations=SET_TASKS.operations.items;
 assert.ok(same(operations[0].answer,'{2,8}'));assert.ok(same(operations[1].answer,'{0,2,5,6,8}'));
 assert.ok(same(SET_TASKS['practice-operations'].items[0].answer,'{2,6}'));
 assert.ok(same(SET_TASKS['practice-power'].items[1].answer,'{∅,{∅}}'));
});
test('Hebrew prompts isolate mathematical expressions without losing text',()=>{
 const raw='A = {1, 4, 7}. האם {4} ∈ A?';const rendered=readable(raw);
 assert.equal(rendered.replace(/[\u2066-\u2069]/g,''),raw);assert.ok(rendered.includes('\u2066'));
});

test('written cardinality and elements are checked independently, including nested sets',()=>{
 const check=(n,s)=>checkCardinalityAnswer(n,s,'{4,{6,7}}');
 assert.ok(check('2','{{7,6},4}').ok);
 assert.ok(checkCardinalityAnswer('3','{8,2,5,2}','{2,5,8}').ok);
 assert.equal(check('3','{4,{6,7}}').count.ok,false);
 assert.equal(check('2','{4,6,7}').elements.ok,false);
 assert.equal(check('2','{4}').elements.ok,false);
 for(const n of ['','-1','2.5','2e0','2+0'])assert.equal(check(n,'{4,{6,7}}').count.ok,false,n);
 assert.equal(check('2','').elements.ok,false);
 assert.ok(checkCardinalityAnswer('0','{}','∅').ok);
});
