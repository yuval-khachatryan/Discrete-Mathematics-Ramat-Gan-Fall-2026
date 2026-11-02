import test from 'node:test';
import assert from 'node:assert/strict';
import {checkKnightRow,checkKnightSelection,checkKnightEvidence} from '../games/shared/knight-workshop.js';
import {KNIGHT_PUZZLES} from '../games/shared/knight-workshop-data.js';
import {evaluate,assignments} from '../games/shared/logic.js';
const cases={
 'both-knaves':[[false,true]],
 'lecture-different':[[false,false]],
 'lecture-undetermined':[[false,true,true],[false,true,false]],
 'lecture-robot':[[true,true],[false,false]],
 'lecture-impossible':[],
};
for(const [id,expected]of Object.entries(cases))test(`${id}: all and only complete solution selections are accepted`,()=>{
 const level=KNIGHT_PUZZLES[id],rows=assignments(level.people.map(p=>p.id));
 const wanted=rows.map((r,i)=>expected.some(e=>level.people.every((p,j)=>r[p.id]===e[j]))?i:-1).filter(i=>i>=0);
 assert.equal(checkKnightSelection(level,[],false).ok,false,'blank is not a submitted no-solution claim');
 for(let mask=0;mask<2**rows.length;mask++){
  const selected=rows.map((_,i)=>mask&(1<<i)?i:-1).filter(i=>i>=0);
  assert.equal(checkKnightSelection(level,selected,!selected.length).ok,JSON.stringify(selected)===JSON.stringify(wanted));
 }
});
test('row checker requires the value of every statement and a valid reason; accepts either conflicting speaker',()=>{
 const level=KNIGHT_PUZZLES['lecture-impossible'];
 for(const env of assignments(['A','B'])){
  const values=level.statements.map(s=>String(evaluate(s.formula,env)));
  assert.equal(checkKnightRow(level,env,['',''],'fits').ok,false);
  assert.equal(checkKnightRow(level,env,values,'').ok,false);
  for(const p of level.people){
   const s=level.statements.find(s=>s.by===p.id),conflict=evaluate(s.formula,env)!==env[p.id];
   assert.equal(checkKnightRow(level,env,values,`${p.id}:${env[p.id]?'knight':'knave'}`).ok,conflict);
  }
 }
 const first=KNIGHT_PUZZLES['both-knaves'];
 assert.equal(checkKnightRow(first,{A:false,B:true},['false'],'fits').ok,true);
 assert.equal(checkKnightRow(first,{A:false,B:true},['true'],'fits').ok,false);
 assert.equal(checkKnightRow(first,{A:false,B:false},['true'],'A:knave').ok,true);
});

test('two witnesses must both work, differ on Carmel, and support the stated conclusions',()=>{
 const level=KNIGHT_PUZZLES['lecture-undetermined'];
 const a={A:'false',B:'true',C:'true'},b={A:'false',B:'true',C:'false'},c={A:'false',B:'true',C:'unknown'};
 assert.equal(checkKnightEvidence(level,[a,b],c).ok,true);
 assert.equal(checkKnightEvidence(level,[b,a],c).ok,true);
 assert.equal(checkKnightEvidence(level,[a,a],c).ok,false);
 assert.equal(checkKnightEvidence(level,[{...a,A:'true'},b],c).ok,false);
 assert.equal(checkKnightEvidence(level,[{...a,B:''},b],c).ok,false);
 assert.equal(checkKnightEvidence(level,[a,b],{...c,C:'true'}).ok,false);
 assert.equal(checkKnightEvidence(level,[a,b],{...c,A:'unknown'}).ok,false);
});
