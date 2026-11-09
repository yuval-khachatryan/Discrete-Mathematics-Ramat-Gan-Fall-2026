import {elementContributions} from '../games/shared/set-counting-lab.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkCounterexample,evaluateSet} from '../games/shared/set-labs.js';
import {parseStatement} from '../games/shared/set-proof-syntax.js';
test('counterexamples must satisfy premises and supply an actual distinguishing witness',()=>{
 assert.equal(checkCounterexample('inclusion-error',{A:'{4}',B:'{9}',C:'{4,9}'},'4').ok,true);
 assert.equal(checkCounterexample('inclusion-error',{A:'{4}',B:'{9}',C:'{9}'},'4').ok,false);
 assert.equal(checkCounterexample('inclusion-error',{A:'{4}',B:'{9}',C:'{4,9}'},'9').ok,false);
 assert.equal(checkCounterexample('union-equal',{A:'{1}',B:'{2}'},'1').ok,true);
 assert.equal(checkCounterexample('union-equal',{A:'{1}',B:'{2}'},'3').ok,false);
 assert.equal(checkCounterexample('two-witnesses',{A:'{}',B:'{2}'},'0').ok,false);
 assert.equal(checkCounterexample('two-witnesses',{A:'{1}',B:'{2}'},'0').ok,true);
 assert.equal(checkCounterexample('strict-union-diff',{A:'{1}',B:'{}',C:'{1}'},'1').ok,true);
 assert.equal(checkCounterexample('difference-brackets',{A:'{1}',B:'{1}',C:'{1}'},'1').ok,true);
 assert.equal(checkCounterexample('union-equal',{A:'{1}',B:'{2}'},'{1}').ok,false);
});
test('roster expressions are parsed as sets and equivalent choices work',()=>{
 const env={A:new Set([1,2]),B:new Set([2,3]),U:new Set([1,2,3,4])};
 const calc=s=>evaluateSet(parseStatement('x ∈ ('+s+')').args[1],env);
 assert.deepEqual(calc('A ∩ B'),new Set([2]));
 assert.deepEqual(calc('A ∖ (A ∖ B)'),new Set([2]));
 assert.deepEqual(calc('A ∪ B'),new Set([1,2,3]));
 assert.throws(()=>calc('D'));
});

test('inclusion-exclusion counts every union element once and outside elements zero times',()=>{
 for(const size of [2,3])for(let bits=0;bits<2**size;bits++){
  const membership=Array.from({length:size},(_,i)=>!!(bits&(1<<i))),terms=elementContributions(membership);
  assert.equal(terms.reduce((sum,t)=>sum+t.sign*t.count,0),bits===0?0:1);
 }
 const triple=elementContributions([true,true,true]);
 assert.deepEqual(triple.filter(t=>t.sign===-1).map(t=>[t.name,t.count]),[['A ∩ B',1],['A ∩ C',1],['B ∩ C',1]]);
 assert.deepEqual(elementContributions([true,true,false]).map(t=>t.count),[1,1,0,1,0,0,0]);
});
