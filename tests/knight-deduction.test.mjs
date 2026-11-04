import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDeduction} from '../games/shared/knight-deduction.js';
import {knightTarget,checkKnightStatements,knightEditorRules} from '../games/shared/knight-proof-editor.js';
import {KNIGHT_PROOFS,KNIGHT_PUZZLES} from '../games/shared/knight-workshop-data.js';
import {compare} from '../games/shared/logic.js';
const step=(formula,rule,...refs)=>({formula,rule,refs});
for(const [id,ex]of Object.entries(KNIGHT_PROOFS))test(`${id}: model proof and alternative truth-table route reach exactly the puzzle solutions`,()=>{
 const level=KNIGHT_PUZZLES[ex.level],allowed=level.people.map(p=>p.id),target=knightTarget(level);
 const translation=checkKnightStatements(level,level.statements.map(s=>s.formula));
 assert.ok(translation.every(s=>s.ok));translation.forEach((s,i)=>assert.ok(compare(s.premise,ex.premises[i]).equal));
 const model=checkDeduction(ex.premises,ex.model,allowed,target);
 assert.ok(model.ok,JSON.stringify(model.results));assert.ok(model.complete);assert.deepEqual(model.open,[]);
 const other=checkDeduction(ex.premises,[step(target,'table',...ex.premises.map((_,i)=>i+1))],allowed,target);
 assert.ok(other.complete);assert.equal(other.lines.at(-1).evidence.rows.length,2**allowed.length);
});
test('utterance formalization preserves the given structure and rejects equivalent rewrites',()=>{
 const level=KNIGHT_PUZZLES['lecture-different'];
 assert.ok(checkKnightStatements(level,['(B)','A ⊕ B']).every(s=>s.ok));
 assert.equal(checkKnightStatements(level,['B','(A & !B) | (!A & B)'])[1].ok,false);
 for(const text of ['', 'A', 'C', 'A &'])assert.equal(checkKnightStatements(level,[text,'A ^ B'])[0].ok,false);
 assert.equal(checkKnightStatements(level,['B','A | B'])[1].ok,false);
});
test('a false consequence is rejected with a real counterexample; rule names cannot hide invalid reasoning',()=>{
 const wrong=checkDeduction(['A -> B','B'],[step('A','table',1,2)],['A','B'],'A');
 assert.equal(wrong.ok,false);assert.deepEqual(wrong.results[0].evidence.counterexample.env,{A:false,B:true});
 assert.equal(checkDeduction(['A -> B','B'],[step('A','mp',1,2)],['A','B'],'A').ok,false);
 assert.equal(checkDeduction(['A','B'],[step('F','false',1,2)],['A','B'],'F').ok,false);
});
test('temporary assumptions cannot themselves complete the proof or escape a discharged scope',()=>{
 const open=checkDeduction([], [step('A','assume')],['A'],'A');assert.ok(open.ok);assert.equal(open.complete,false);
 const base=[step('A','assume'),step('B','mp',1,2),step('A -> B','conditional',2,3)];
 assert.ok(checkDeduction(['A -> B'],base,['A','B'],'A -> B').complete);
 const leak=checkDeduction(['A -> B'],[...base,step('B','copy',3)],['A','B'],'B');
 assert.equal(leak.ok,false);assert.match(leak.results.at(-1).message,/נסגרה/);
 const sibling=checkDeduction(['A -> B'],[...base,step('!A','assume'),step('B','copy',3)],['A','B'],'B');
 assert.equal(sibling.ok,false);
});
test('nested assumptions must be closed from the inside out; outer results remain available inside',()=>{
 const base=[step('A','assume'),step('B','assume'),step('A','copy',1)];
 assert.ok(checkDeduction([],base,['A','B'],'A').ok);
 assert.equal(checkDeduction([],[...base,step('A -> A','conditional',1,3)],['A','B'],'A').ok,false);
 const proof=[...base,step('B -> A','conditional',2,3),step('A -> (B -> A)','conditional',1,4)];
 assert.ok(checkDeduction([],proof,['A','B'],'A -> (B -> A)').complete);
});
test('contradiction discharges the exact open assumption, not an unrelated claim',()=>{
 const base=[step('A','assume'),step('F','false',1,2)];
 assert.ok(checkDeduction(['!A'],[...base,step('!A','raa',2,3)],['A','B'],'!A').complete);
 assert.equal(checkDeduction(['!A'],[...base,step('B','raa',2,3)],['A','B'],'B').ok,false);
});
test('cases must cover complementary assumptions and yield the same conclusion',()=>{
 assert.ok(checkDeduction(['A -> B','!A -> B'],[step('B','cases',1,2)],['A','B'],'B').complete);
 assert.equal(checkDeduction(['A -> B','B -> B'],[step('B','cases',1,2)],['A','B'],'B').ok,false);
 assert.equal(checkDeduction(['A -> B','!A -> A'],[step('B','cases',1,2)],['A','B'],'B').ok,false);
});
test('sources must be earlier, distinct and correct in number; invalid input gets feedback',()=>{
 for(const refs of [[],[1],[1,1],[1,3],[1,0],[1,1.5]])assert.equal(checkDeduction(['A -> B','A'],[{formula:'B',rule:'mp',refs}],['A','B'],'B').ok,false);
 for(const formula of ['', 'C', '('])assert.equal(checkDeduction(['A'],[step(formula,'copy',1)],['A'],'A').ok,false);
});
test('independent simultaneous replacements are accepted with their own justifications',()=>{
 const proof=[{formula:'A | B',rule:'eq:replacements',refs:[1],replacements:[{path:'r.0',after:'A',rule:'double'},{path:'r.1',after:'B',rule:'double'}]}];
 const result=checkDeduction(['!!A | !!B'],proof,['A','B'],'A | B');assert.ok(result.complete,JSON.stringify(result.results));
});

test('scoped proof rewrites preserve assembly feedback without accepting an incorrect or missing output',()=>{
 const replacements=[{path:'r.0',after:'A',rule:'double'},{path:'r.1',after:'B',rule:'double'}];
 for(const formula of ['', 'A |', 'A & B']){
  const r=checkDeduction(['!!A | !!B'],[{formula,rule:'eq:replacements',refs:[1],replacements}],['A','B'],'A | B');
  assert.equal(r.ok,false);assert.equal(r.results[0].expected,'A ∨ B');assert.equal(r.lines.length,1);
 }
});


test('the editor offers only introduced strategies, and every model uses available rules',()=>{
 for(const [id,ex]of Object.entries(KNIGHT_PROOFS)){
  const ids=knightEditorRules(ex).map(r=>r.id);
  for(const step of ex.model)assert.ok(ids.includes(step.rule),id+': '+step.rule);
  assert.equal(ids.includes('copy'),false);
  assert.equal(ids.includes('conditional'),['cases','impossible'].includes(id));
  assert.equal(ids.includes('cases'),['cases','impossible'].includes(id));
 }
});

test('source choices exclude future lines and closed scopes; discharge sources have the right roles',async()=>{
 const {deductionSourceChoices}=await import('../games/shared/knight-deduction.js');
 const steps=[step('A','assume'),step('B','mp',1,2),step('A -> B','conditional',2,3)];
 const state=checkDeduction(['A -> B'],steps,['A','B'],'A -> B');assert.ok(state.ok);
 const numbers=(before,rule,slot=0)=>deductionSourceChoices(state.lines,before,rule,slot).map(l=>l.number);
 assert.deepEqual(numbers(3,'mp'),[1,2]);
 assert.deepEqual(numbers(4,'conditional',0),[2]);assert.deepEqual(numbers(4,'conditional',1),[3]);
 assert.deepEqual(numbers(5,'mp'),[1,4]); // A and B depended on the closed assumption.
 assert.deepEqual(numbers(5,'raa'),[]);
 assert.deepEqual(numbers(3,'assume'),[]);
 const contradiction=checkDeduction(['!A'],[step('A','assume'),step('F','false',1,2)],['A'],'!A');
 assert.deepEqual(deductionSourceChoices(contradiction.lines,4,'raa',0).map(l=>l.number),[2]);
 assert.deepEqual(deductionSourceChoices(contradiction.lines,4,'raa',1).map(l=>l.number),[3]);
});
