import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RELATION_DRAWINGS,checkRelationDrawing,relationGraphSvg} from '../games/shared/relation-drawing.js';
import {SET_TASKS} from '../games/shared/sets-data.js';
import {checkSetAnswer} from '../games/shared/sets.js';

test('relation drawings require precisely the directed pairs, including loops',()=>{
  for(const {pairs}of RELATION_DRAWINGS){
    assert.ok(checkRelationDrawing([...pairs].reverse(),pairs).ok);
    assert.ok(checkRelationDrawing([...pairs,pairs[0]],pairs).ok,'repeating a pair does not change a relation');
    for(let i=0;i<pairs.length;i++)assert.equal(checkRelationDrawing(pairs.filter((_,j)=>j!==i),pairs).ok,false);
    assert.equal(checkRelationDrawing([...pairs,[4,4]],pairs).ok,false);
  }
  assert.equal(checkRelationDrawing([[2,1]],[[1,2]]).ok,false,'reversing an arrow changes the pair');
  assert.equal(checkRelationDrawing([[1,2],[2,3],[1,3]],[[1,2],[2,3]]).ok,false,'a two-arrow route does not add a pair');
  assert.equal(checkRelationDrawing([[1,2]],[[1,1]]).ok,false,'a loop is distinct from an ordinary edge');
  assert.equal(checkRelationDrawing([[1,5]],[[1,2]]).ok,false,'both endpoints belong to the set');
  assert.ok(checkRelationDrawing([],[]).ok);
});

test('diagrams retain isolated vertices, represent every pair once, and match the written examples',()=>{
  for(const [file,pairs,id]of [
    ['relation-on-set-example.svg',[[1,1],[1,2],[2,3]],'example-relation-arrow'],
    ['relation-on-set-reading.svg',[[1,2],[2,1],[3,3]],'reading-relation-arrow'],
  ]){
    const svg=relationGraphSvg(pairs,{id});
    assert.equal((svg.match(/data-vertex=/g)||[]).length,4);
    assert.deepEqual([...svg.matchAll(/data-pair="([^"]+)"/g)].map(m=>m[1]),pairs.map(p=>p.join(',')));
    assert.equal(readFileSync(new URL('../images/'+file,import.meta.url),'utf8').trim(),svg);
  }
  const interactive=relationGraphSvg([],{interactive:true,selected:2});
  assert.equal((interactive.match(/role="button"/g)||[]).length,4);
  assert.equal((interactive.match(/aria-pressed="true"/g)||[]).length,1);
  assert.match(interactive,/data-vertex="2"[^>]+aria-pressed="true"/);
  assert.ok(checkSetAnswer('{(1,2),(2,1),(3,3)}',SET_TASKS['relation-read-diagram'].items[0].answer).ok);
});

test('worked relation answers satisfy the defining condition and include both coordinates',()=>{
  const A=[0,1,2,3,4],pairs=A.flatMap(a=>A.filter(b=>a+b===4).map(b=>`(${a},${b})`));
  assert.ok(checkSetAnswer('{'+pairs.join(',')+'}',SET_TASKS['relation-sum-four'].items[0].answer).ok);
  const coordinates=new Set([[1,2],[3,1],[3,3]].flat());
  assert.ok(checkSetAnswer('{'+[...coordinates].join(',')+'}',SET_TASKS['relation-smallest-set'].items[0].answer).ok);
});
