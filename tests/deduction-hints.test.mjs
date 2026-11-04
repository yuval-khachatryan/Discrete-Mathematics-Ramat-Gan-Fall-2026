import test from 'node:test';
import assert from 'node:assert/strict';
import {deductionCandidates} from '../games/shared/deduction-hints.js';
import {proofFormula} from '../games/shared/proof-notation.js';
import {checkDeduction} from '../games/shared/knight-deduction.js';
import {ruleFormulaLabel} from '../games/shared/inference-view.js';
const cases=[
 ['mp',['A -> B','A'],['B']],['mp',['A','A -> B'],['B']],['mt',['A -> B','!B'],['¬A']],
 ['hs',['A -> B','B -> C'],['A → C']],['and-out',['A & B & C'],['A','B','C']],
 ['and-in',['A','B'],['A ∧ B','B ∧ A']],['iff-use',['A <-> (!A & !B)','A'],['¬A ∧ ¬B']],
 ['iff-use',['A <-> B','!A'],['¬B']],['iff-use',['A <-> B','!B'],['¬A']],
 ['false',['A','!A'],['F']],['cases',['A -> C','!A -> C'],['C']],
];
test('all finite direct outcomes are offered and accepted by the actual rule checker',()=>{
 for(const [rule,sources,expected]of cases){
  assert.deepEqual(deductionCandidates(rule,sources),expected,rule);
  for(const formula of expected)assert.ok(checkDeduction(sources,[{rule,formula,refs:sources.map((_,i)=>i+1)}],['A','B','C'],'T').ok,rule+': '+formula);
 }
 assert.deepEqual(deductionCandidates('mp',['A -> B','B']),[]);
 assert.deepEqual(deductionCandidates('mt',['A -> B','B']),[]);
 assert.deepEqual(deductionCandidates('table',['A']),[]);
 assert.deepEqual(deductionCandidates('assume',[]),[]);
});
test('closure suggestions require an open assumption in the checker',()=>{
 const premise=['A & !A'],prefix=[{rule:'assume',formula:'A',refs:[]},{rule:'and-out',formula:'!A',refs:[1]},{rule:'false',formula:'F',refs:[2,3]}];
 assert.deepEqual(deductionCandidates('raa',['A','F']),['¬A']);
 assert.ok(checkDeduction(premise,[...prefix,{rule:'raa',formula:'!A',refs:[2,4]}],['A'],'!A').ok);
 assert.equal(checkDeduction(['A','F'],[{rule:'raa',formula:'!A',refs:[1,2]}],['A'],'!A').ok,false);
 assert.deepEqual(deductionCandidates('conditional',['A','B & C']),['A → (B ∧ C)']);
});
test('display and stored deduction sources retain the written parentheses',()=>{
 assert.equal(proofFormula('A <-> (!A & !B)'),'A ↔ (¬A ∧ ¬B)');
 assert.equal(proofFormula('((A)) -> (B | C)'),'((A)) → (B ∨ C)');
 const r=checkDeduction(['A -> (B & C)','A'],[{rule:'mp',formula:'(B & C)',refs:[1,2]}],['A','B','C'],'B & C');
 assert.ok(r.ok);assert.equal(r.lines.at(-1).formula,'(B & C)');
 assert.equal(proofFormula(r.lines.at(-1).formula),'(B ∧ C)');
 assert.equal(ruleFormulaLabel({id:'mp',name:'כלל הניתוק'}),'כלל הניתוק — ⁦((P → Q) ∧ P) → Q⁩');
});


test('Modus Tollens hints accept either direction of an opposite pair',()=>{
 assert.deepEqual(deductionCandidates('mt',['C -> !B','B']),['¬C']);
 assert.deepEqual(deductionCandidates('mt',['B','C -> !B']),['¬C']);
 assert.deepEqual(deductionCandidates('mt',['C -> !B','!B']),[]);
});
