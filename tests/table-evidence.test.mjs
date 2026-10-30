import test from 'node:test';
import assert from 'node:assert/strict';
import {assignments} from '../games/shared/logic.js';
import {checkEvidence,evidenceAt} from '../games/shared/table-evidence.js';
const rows=assignments(['A','B']);
test('a requested truth value must be supported by the selected row',()=>{
 const spec={mode:'truth',formula:'(A & !B) | B',value:false};
 for(const [i,env]of rows.entries())assert.equal(checkEvidence(spec,rows,String(i)).ok,!env.A&&!env.B);
 assert.equal(checkEvidence(spec,rows,'none').ok,false);
 assert.equal(checkEvidence(spec,rows,'').ok,false);
 assert.ok(checkEvidence({mode:'truth',formula:'A | !A',value:false},rows,'none').ok);
 assert.ok(checkEvidence({mode:'truth',formula:'A & B',value:true},rows,'0').ok);
});
test('an argument counterexample requires every premise true and conclusion false',()=>{
 const spec={mode:'argument',premises:['A -> B','!A'],conclusion:'!B'};
 const good=rows.findIndex(r=>!r.A&&r.B);
 assert.ok(checkEvidence(spec,rows,String(good)).ok);
 assert.deepEqual(checkEvidence(spec,rows,String(good)).facts.map(f=>f.value),[true,true,false]);
 assert.equal(checkEvidence(spec,rows,'none').ok,false);
 assert.equal(checkEvidence(spec,rows,'').ok,false);
 for(let i=0;i<rows.length;i++)assert.equal(checkEvidence(spec,rows,String(i)).ok,i===good);
 const mp={mode:'argument',premises:['!A -> !B','!A'],conclusion:'!B'};
 assert.ok(checkEvidence(mp,rows,'none').ok);
 assert.equal(evidenceAt(mp,{A:false,B:true}).counter,false);
 assert.deepEqual(evidenceAt(mp,{A:false,B:true}).facts.map(f=>f.value),[false,true,false]);
});
test('a valid argument and equivalent formulas require checking all rows',()=>{
 assert.ok(checkEvidence({mode:'argument',premises:['A -> B','!B'],conclusion:'!A'},rows,'none').ok);
 assert.ok(checkEvidence({mode:'equivalence',left:'!(A | B)',right:'!A & !B'},rows,'none').ok);
 const spec={mode:'equivalence',left:'A',right:'B'};
 assert.equal(rows.filter((_,i)=>checkEvidence(spec,rows,String(i)).ok).length,2);
 assert.equal(checkEvidence(spec,rows,'none').ok,false);
 for(const value of ['x','-1','4','1.5'])assert.equal(checkEvidence(spec,rows,value).ok,false);
});
