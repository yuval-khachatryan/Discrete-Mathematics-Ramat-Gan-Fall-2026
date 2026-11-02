import test from 'node:test';
import assert from 'node:assert/strict';
import {checkKnightFormula,checkIntroRow,checkIntroConclusion} from '../games/shared/knight-intro.js';
import {KNIGHT_PUZZLES} from '../games/shared/knight-workshop-data.js';
import * as K from '../games/gate/knights.js';
const level=KNIGHT_PUZZLES['both-knaves'];
test('intro formalization accepts equivalent statements but rejects malformed and wrong translations',()=>{
 for(const s of ['!A & !B','!(A | B)','¬b ∧ ¬a'])assert.ok(checkKnightFormula(s,level).ok,s);
 for(const s of ['', 'A &', '!A | !B','A & B','C','!(A | B) & (C | !C)','('.repeat(121)])assert.equal(checkKnightFormula(s,level).ok,false,s);
});
test('compact table requires both a correct truth value and a correct consistency choice',()=>{
 for(const env of K.rows(level)){
  const truth=!env.A&&!env.B,consistent=!env.A&&env.B;
  const check=(v,c)=>checkIntroRow(level,'!(A | B)',env,v,c);
  assert.ok(check(String(truth),String(consistent)).ok);
  assert.equal(check('',String(consistent)).field,'value');
  assert.equal(check(String(!truth),String(consistent)).ok,false);
  assert.equal(check(String(truth),'').field,'fits');
  assert.equal(check(String(truth),String(!consistent)).ok,false);
 }
});

test('the final answer requires both roles and accepts only the surviving assignment',()=>{
 for(const A of ['', 'true','false'])for(const B of ['', 'true','false'])
  assert.equal(checkIntroConclusion(level,{A,B}).ok,A==='false'&&B==='true');
});
