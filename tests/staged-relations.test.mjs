import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkRegistrationRelations} from '../games/shared/relation-practice.js';
import {SET_TASKS} from '../games/shared/sets-data.js';
import {checkSetAnswer,key,parseObject} from '../games/shared/sets.js';

test('relation construction and follow-up membership answers agree',()=>{
  const successor=SET_TASKS['relation-successor-roster'].items[0];
  assert.ok(checkSetAnswer('{(3,4),(1,2),(2,3)}',successor.answer).ok);
  for(const bad of ['{1,2,3}','{(1,2),(2,3)}','{(1,2),(2,3),(4,3)}'])assert.equal(checkSetAnswer(bad,successor.answer).ok,false);
  const members=new Set(parseObject(successor.answer).items.map(key));
  for(const [i,pair]of ['(3,4)','(2,1)'].entries()){
    const q=SET_TASKS['relation-successor-membership'].items[i];
    assert.equal(q.options[q.answer]==='כן',members.has(key(parseObject(pair))));
  }
  const union=SET_TASKS['relation-union-roster'].items[0];
  assert.ok(checkSetAnswer('{(3,1),(1,3)}',union.answer).ok);
  const inProduct=([a,b])=>[1,2].includes(a)&&b===3;
  const expected=[[1,3],[3,1]].map(inProduct);
  expected.push(expected.every(Boolean));
  assert.deepEqual(SET_TASKS['relation-union-membership'].items.map(q=>q.options[q.answer]==='כן'),expected);
});

test('registration accepts exactly the two distinct solutions in either order',()=>{
  const subsets=Array.from({length:64},(_,mask)=>Array.from({length:6},(_,i)=>i).filter(i=>mask&(1<<i)));
  const accepted=[];
  for(const a of subsets)for(const b of subsets)if(checkRegistrationRelations([a,b]).ok)accepted.push([a,b]);
  assert.deepEqual(accepted,[[[0,1,2],[0,1,3]],[[0,1,3],[0,1,2]]]);
  assert.equal(checkRegistrationRelations([[0,1,2],[0,1,6]]).ok,false);
});

test('every chapter 3 question accepts input, and section 3.2 retains all dependent stages',()=>{
  const source=readFileSync(new URL('../03-relations.qmd',import.meta.url),'utf8');
  const questions=[...source.matchAll(/^(:{3,}) \{[^\n]*\.thmqst[^\n]*\}\n([\s\S]*?)^\1\s*$/gm)];
  assert.ok(questions.length>=9);
  for(const [, ,body]of questions)assert.match(body,/data-sets=|data-set-proof=|data-set-lab=|\.registration-input/);
  const section=source.slice(source.indexOf('### שאלות פתורות {#sec-relations-worked-questions}'),source.indexOf('## יחסים על קבוצה'));
  assert.equal((section.match(/data-staged-exercise="true"/g)||[]).length,3);
  assert.equal((section.match(/\.exercise-first/g)||[]).length,3);
  assert.equal((section.match(/\.exercise-second hidden="true"/g)||[]).length,3);
  for(const id of ['relation-successor-roster','relation-successor-membership','relation-union-roster','relation-union-membership'])assert.ok(section.includes(`data-sets="${id}"`));
  assert.match(section,/data-set-proof="relation-union"/);
  assert.match(section,/#written-proof-relation-union \.foldable/);
  assert.doesNotMatch(section,/\.solve\b/);
});
