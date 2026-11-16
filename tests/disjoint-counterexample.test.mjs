import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDisjointCounterexample as check} from '../games/shared/disjoint-counterexample.js';
test('counterexamples satisfy inclusion and refute non-disjointness',()=>{
 for(const b of ['{1}','{}','{-2,3}','{1,1}'])assert.ok(check('∅',b).ok);
 assert.match(check('{1}','{2}').message,/אינה מקיימת/);
 assert.match(check('{1}','{1,2}').message,/איבר משותף/);
 for(const a of ['', '1','{x}','{{}}','{100}','{0.5}','{1,2,3,4,5,6,7,8,9,10,11}'])assert.equal(check(a,'{}').ok,false,a);
});
