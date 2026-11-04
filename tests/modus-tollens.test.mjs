import test from 'node:test';
import assert from 'node:assert/strict';
import {deductionCandidates} from '../games/shared/deduction-hints.js';
import {checkDeduction} from '../games/shared/knight-deduction.js';
import {checkArgument} from '../games/shared/argument-rules.js';
import {format,variables} from '../games/shared/logic.js';
function checkBoth(premises,conclusion,expected){
 const names=[...new Set([...premises,conclusion].flatMap(f=>variables(f)))];
 const ex={atoms:names.map(id=>({id})),premises:premises.map(formula=>({formula})),goal:{formula:conclusion}};
 for(const refs of [[1,2],[2,1]]){
  assert.equal(checkDeduction(premises,[{formula:conclusion,rule:'mt',refs}],names,conclusion).ok,expected);
  assert.equal(checkArgument(ex,Object.fromEntries(names.map(n=>[n,n])),premises,conclusion,[{id:'s1',formula:conclusion,rule:'mt',refs:refs.map(n=>'p'+n)}]).ok,expected);
 }
}
test('both proof checkers and hints accept explicit or canceled double negation in Modus Tollens',()=>{
 for(const [premises,answers]of [
  [['A -> B','!B'],['!A']],
  [['A -> !B','B'],['!A']],
  [['!A -> B','!B'],['A','!!A']],
  [['!A -> !B','B'],['A','!!A']],
  [['!(A & B) -> !C','C'],['A & B','!!(A & B)']],
 ])for(const answer of answers){
  checkBoth(premises,answer,true);
  assert.ok(deductionCandidates('mt',premises).some(f=>format(f)===format(answer)));
 }
});
test('the relaxation does not accept an unopposed consequent or the wrong conclusion',()=>{
 for(const [premises,answer]of [[['!A -> B','B'],'A'],[['!A -> !B','!B'],'A'],[['!A -> B','!B'],'!A'],[['A -> B','!A'],'!B']])checkBoth(premises,answer,false);
});
