import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSubstitution} from '../games/shared/practice-choice.js';
import {PRACTICE_CHOICES} from '../games/shared/practice-choices.js';

test('substitution checks the written proposition before its truth value',()=>{
 for(const q of PRACTICE_CHOICES.substitute.slice(0,2)){
  const s=q.substitution;
  assert.equal(checkSubstitution('',s),'empty');
  assert.equal(checkSubstitution(s.expected,s),'correct');
  assert.equal(checkSubstitution(s.expected.split('').join(' '),s),'correct');
  assert.equal(checkSubstitution(s.simplified,s),'simplified');
  for(const wrong of ['x+1=4','true','false','2','3','2+1=3','3+1=3','alert(1)'])assert.equal(checkSubstitution(wrong,s),'wrong');
  assert.ok(!q.prompt.includes(s.expected));
 }
});
