import test from 'node:test';
import assert from 'node:assert/strict';
import {expressionParts,checkReplacements,checkProof,checkStart} from '../games/shared/proof-rules.js';
import {checkArgument} from '../games/shared/argument-rules.js';
import {argumentLines} from '../games/shared/argument-display.js';
const allowed=['A','B','C'];
const replace=(source,path,after,rule)=>({path,before:expressionParts(source).find(p=>p.path===path)?.formula,after,rule});
const source='!!A | !!B';
const both=[replace(source,'r.0','A','double'),replace(source,'r.1','B','double')];
test('parallel rewrites include two double negations and independent different laws',()=>{
 assert.equal(checkReplacements(source,'A | B',both,allowed).kind,'valid');
 const s='(A -> B) & !!C';
 assert.equal(checkReplacements(s,'(!A | B) & C',[replace(s,'r.0','!A | B','implication'),replace(s,'r.1','C','double')],allowed).kind,'valid');
 const inverse='A | B';
 assert.equal(checkReplacements(inverse,source,[replace(inverse,'r.0','!!A','double'),replace(inverse,'r.1','!!B','double')],allowed).kind,'valid');
});
test('replacement checker rejects sequential changes, overlaps, stale paths, wrong rules and unreported edits',()=>{
 assert.notEqual(checkReplacements('!(A & !B)','B | !A',[replace('!(A & !B)','r','B | !A','demorgan')],allowed).kind,'valid');
 assert.notEqual(checkReplacements('!!!!A','A',[replace('!!!!A','r','!!A','double'),replace('!!!!A','r.0.0','A','double')],allowed).kind,'valid');
 assert.notEqual(checkReplacements(source,'A | B',[both[0],both[0]],allowed).kind,'valid');
 assert.notEqual(checkReplacements(source,'B | A',both,allowed).kind,'valid');
 assert.notEqual(checkReplacements(source,'A | B',[{...both[0],rule:'demorgan'},both[1]],allowed).kind,'valid');
 assert.notEqual(checkReplacements(source,'A | B',[{...both[0],before:'¬¬C'},both[1]],allowed).kind,'valid');
 assert.notEqual(checkReplacements(source,'A | B',[{...both[0],path:'r.9'},both[1]],allowed).kind,'valid');
});
test('identical expressions are selected by occurrence, not by text',()=>{
 const s='!!A | !!A';
 assert.equal(checkReplacements(s,'A | !!A',[replace(s,'r.0','A','double')],allowed).kind,'valid');
 assert.notEqual(checkReplacements(s,'A | !!A',[replace(s,'r.1','A','double')],allowed).kind,'valid');
});
test('1.11.21 completes with two justified lines, even with a trailing empty line',()=>{
 const steps=[{formula:source,rule:'demorgan'},{formula:'A | B',rule:'replacements',replacements:both},{formula:'',rule:''}];
 const r=checkProof('!(!A & !B)','A | B',steps);assert.ok(r.valid&&r.complete);assert.equal(r.goalStep,2);
 const direct=checkProof('!(!A & !B)','A | B',[{formula:'A | B',rule:'demorgan'}]);assert.ok(direct.valid&&direct.complete);
 const reversed=checkStart('A | B','!(!A & !B)','A | B',true);
 const backwards=[{formula:source,rule:'replacements',replacements:[replace('A | B','r.0','!!A','double'),replace('A | B','r.1','!!B','double')]},{formula:'!(!A & !B)',rule:'demorgan'}];
 assert.ok(checkProof(reversed.start,reversed.target,backwards).complete);
 assert.equal(checkStart('A','!(!A & !B)','A | B',true).message,'נקודת המוצא שהזנתם אינה נכונה.');
});
test('a valid completed prefix survives later work, but invalid steps are still flagged',()=>{
 const steps=[{formula:source,rule:'demorgan'},{formula:'A | B',rule:'replacements',replacements:both},{formula:'C',rule:'double'}];
 const r=checkProof('!(!A & !B)','A | B',steps);assert.equal(r.valid,false);assert.equal(r.complete,true);assert.equal(r.goalStep,2);
});
test('deduction proofs accept parallel rewrites of an earlier source and preserve all reasons',()=>{
 const ex={atoms:[{id:'A',text:'א'},{id:'B',text:'ב'},{id:'C',text:'ג'}],premises:[{formula:source,text:'נתון ראשון'},{formula:'(A | B) -> C',text:'נתון שני'}],goal:{formula:'C',text:'המטרה'},solution:[]};
 const map={A:'A',B:'B',C:'C'},premises=ex.premises.map(p=>p.formula);
 const steps=[{id:'d1',formula:'A | B',rule:'eq:replacements',refs:['p1'],replacements:both},{id:'d2',formula:'C',rule:'mp',refs:['d1','p2']},{id:'d3',formula:'',rule:'',refs:['','']}];
 const r=checkArgument(ex,map,premises,'C',steps);assert.ok(r.ok&&r.complete);assert.equal(r.goalStep,2);
 const lines=argumentLines(ex,map,premises,steps.slice(0,2));assert.match(lines[2].reason,/¬¬A ↦ A/);assert.match(lines[2].reason,/¬¬B ↦ B/);
 const bad=checkArgument(ex,map,premises,'C',[{...steps[0],refs:['d2']}]);assert.equal(bad.ok,false);
});

test('default replacement mode ignores only untouched trailing rows',()=>{
 const done=[{formula:source,rule:'demorgan'},{formula:'A | B',rule:'replacements',replacements:both}];
 const empty={formula:'',rule:'replacements',replacements:[{path:'',before:'',after:'',rule:''}]};
 assert.ok(checkProof('!(!A & !B)','A | B',[...done,empty]).valid);
 const partial={...empty,replacements:[{path:'r',before:'A | B',after:'',rule:''}]};
 assert.equal(checkProof('!(!A & !B)','A | B',[...done,partial]).valid,false);
});

test('parallel replacements distinguish tautology from contradiction',()=>{
 const from='(A | !A) & (B & !B)',to='T & F';
 const changes=[replace(from,'r.0','T','tautology'),replace(from,'r.1','F','contradiction')];
 assert.equal(checkReplacements(from,to,changes,allowed).kind,'valid');
 const wrong=checkReplacements(from,to,[changes[0],{...changes[1],rule:'tautology'}],allowed);
 assert.equal(wrong.replacementIndex,1);assert.match(wrong.message,/סתירה/);
});

test('explicit and parallel replacements accept the added De Morgan forms',()=>{
 const before='!A | B',after='!(!!A & !B)';
 assert.equal(checkReplacements(before,after,[replace(before,'r',after,'demorgan')],allowed).kind,'valid');
 assert.equal(checkReplacements(after,before,[replace(after,'r',before,'demorgan')],allowed).kind,'valid');
 const s='(!A | B) & !!C';
 assert.equal(checkReplacements(s,'!(!!A & !B) & C',[replace(s,'r.0',after,'demorgan'),replace(s,'r.1','C','double')],allowed).kind,'valid');
});

test('valid local replacements expose the exact assembly and the differing part, without accepting it',()=>{
 const result=checkReplacements(source,'A | C',both,allowed);
 assert.equal(result.kind,'assembly');assert.equal(result.expected,'A ∨ B');
 assert.deepEqual(result.difference,{path:'r.1',expected:'B',actual:'C'});
 for(const output of ['', 'A |', 'B | A']){
  const r=checkReplacements(source,output,both,allowed);assert.equal(r.kind,'assembly');assert.equal(r.expected,'A ∨ B');
 }
 assert.equal(checkReplacements(source,'A | B',[{...both[0],rule:'demorgan'},both[1]],allowed).expected,undefined);
 const partial=checkReplacements(source,'A | B',[both[0]],allowed);
 assert.equal(partial.expected,'A ∨ ¬¬B'); // Never silently changes an unselected occurrence.
 assert.equal(checkProof(source,'A | B',[{formula:'A | C',rule:'replacements',replacements:both}]).complete,false);
});

test('deduction reports assembly feedback even when the whole-formula field is blank or malformed',()=>{
 const ex={atoms:[{id:'A',text:'א'},{id:'B',text:'ב'}],premises:[{formula:source,text:'נתון'}],goal:{formula:'A | B',text:'המטרה'}};
 for(const formula of ['', 'A |', 'A & B']){
  const r=checkArgument(ex,{A:'A',B:'B'},[source],'A | B',[{id:'d1',formula,rule:'eq:replacements',refs:['p1'],replacements:both}]);
  assert.equal(r.ok,false);assert.equal(r.results[0].expected,'A ∨ B');
 }
 const bad=checkArgument(ex,{A:'A',B:'B'},[source],'A | B',[{id:'d1',formula:'',rule:'eq:replacements',refs:['d1'],replacements:both}]);
 assert.equal(bad.results[0].expected,undefined);
});


test('XOR expands and contracts by all stated laws, including a selected compound occurrence',()=>{
 for(const expanded of ['(A | B) & !(A & B)','(A & !B) | (!A & B)','A <-> !B']){
  for(const [before,after]of [['A ^ B',expanded],[expanded,'A ^ B']]){
   assert.equal(checkReplacements(before,after,[replace(before,'r',after,'xor')],allowed).kind,'valid');
  }
 }
 const s='C -> (A ^ !B)',after='C -> ((A & !!B) | (!A & !B))';
 assert.equal(checkReplacements(s,after,[replace(s,'r.1','(A & !!B) | (!A & !B)','xor')],allowed).kind,'valid');
 assert.notEqual(checkReplacements('A ^ B','A | B',[replace('A ^ B','r','A | B','xor')],allowed).kind,'valid');
});


test('inclusive OR rewrites directly to a conditional with a negated antecedent',()=>{
 for(const [before,after]of [['A | B','!A -> B'],['!A -> B','A | B']])assert.equal(checkReplacements(before,after,[replace(before,'r',after,'implication')],allowed).kind,'valid');
 const before='(A | B) & C',after='(!A -> B) & C';
 assert.equal(checkReplacements(before,after,[replace(before,'r.0','!A -> B','implication')],allowed).kind,'valid');
 assert.notEqual(checkReplacements('A | B','A -> B',[replace('A | B','r','A -> B','implication')],allowed).kind,'valid');
});


test('OR-to-implication allows either operand order in both directions without reversing implication alone',()=>{
 for(const [left,right]of [['A | B','!A -> B'],['A | B','!B -> A'],['A -> B','!A | B'],['A -> B','B | !A']]){
  for(const [before,after]of [[left,right],[right,left]])assert.equal(checkReplacements(before,after,[replace(before,'r',after,'implication')],allowed).kind,'valid',before+' => '+after);
 }
 assert.notEqual(checkReplacements('!A -> B','B -> !A',[replace('!A -> B','r','B -> !A','implication')],allowed).kind,'valid');
});

test('explicit De Morgan replacements accept immediate double-negation cancellation',()=>{
 for(const [before,after] of [['!(A & !B)','!A | B'],['!(!A | !B)','A & B'],['!(!A | !B)','!!A & B']]){
  assert.equal(checkReplacements(before,after,[replace(before,'r',after,'demorgan')],allowed).kind,'valid');
  assert.equal(checkReplacements(after,before,[replace(after,'r',before,'demorgan')],allowed).kind,'valid');
 }
 const s='!(A & !B) & !!C';
 assert.equal(checkReplacements(s,'(!A | B) & C',[replace(s,'r.0','!A | B','demorgan'),replace(s,'r.1','C','double')],allowed).kind,'valid');
 assert.notEqual(checkReplacements(s,'(!A | B) & C',[replace(s,'r','(!A | B) & C','demorgan')],allowed).kind,'valid');
});
