import {initialMethodSteps} from '../games/shared/method-proof-editor.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {METHOD_EXERCISES} from '../games/shared/method-exercises.js';
import {checkDeduction} from '../games/shared/knight-deduction.js';
import {assignments,evaluate} from '../games/shared/logic.js';
const run=(e,steps=e.solution)=>checkDeduction(e.premises.map(p=>p.formula),steps,e.atoms.map(a=>a.id),e.goal.formula);
for(const [id,e]of Object.entries(METHOD_EXERCISES))test(`${id}: substantive, valid proof with a stated goal and satisfiable premises`,()=>{
 assert.ok(e.solution.length>=5);
 const result=run(e);assert.ok(result.ok&&result.complete,JSON.stringify(result));
 assert.equal(result.open.length,0);assert.ok(result.lines.some(l=>l.rule===e.method));
 const rows=assignments(e.atoms.map(a=>a.id)).filter(env=>e.premises.every(p=>evaluate(p.formula,env)));
 assert.ok(rows.length);assert.ok(rows.every(env=>evaluate(e.goal.formula,env)));
 assert.equal(run(e,e.solution.slice(0,-1)).complete,false);
});
test('case conclusions stay local until discharged; either order of cases works',()=>{
 const e=METHOD_EXERCISES.instructions;
 const bad=run(e,[...e.solution.slice(0,5),{formula:'D',rule:'mp',refs:[3,6]}]);assert.equal(bad.ok,false);assert.match(bad.results.at(-1).message,/נסגרה/);
 const reversed=[
 {formula:'!A',rule:'assume',refs:[]},{formula:'C',rule:'mp',refs:[2,5]},{formula:'D',rule:'mp',refs:[4,6]},{formula:'!A -> D',rule:'conditional',refs:[5,7]},
 {formula:'A',rule:'assume',refs:[]},{formula:'B',rule:'mp',refs:[1,9]},{formula:'D',rule:'mp',refs:[3,10]},{formula:'A -> D',rule:'conditional',refs:[9,11]},
 {formula:'D',rule:'cases',refs:[8,12]}];assert.ok(run(e,reversed).complete);
});
test('contradiction must cite opposite formulas and close the active assumption',()=>{
 const e=METHOD_EXERCISES.event;
 assert.equal(run(e,[...e.solution.slice(0,4),{formula:'F',rule:'false',refs:[5,6]}]).ok,false);
 assert.equal(run(e,[...e.solution.slice(0,5),{formula:'!A',rule:'raa',refs:[1,8]}]).ok,false);
});


test('Modus Tollens accepts a positive statement opposing a negated consequent',()=>{
 const premises=['C -> !B','B'];
 for(const refs of [[1,2],[2,1]]){
  const result=checkDeduction(premises,[{formula:'!C',rule:'mt',refs}],['B','C'],'!C');
  assert.ok(result.ok&&result.complete);assert.match(result.results[0].message,/שלילה כפולה/);
 }
 assert.equal(checkDeduction(['C -> !B','!B'],[{formula:'!C',rule:'mt',refs:[1,2]}],['B','C'],'!C').ok,false);
 assert.equal(checkDeduction(premises,[{formula:'C',rule:'mt',refs:[1,2]}],['B','C'],'C').ok,false);
});


test('fixed contradiction openings negate the stated goal, including a negative or compound goal',()=>{
 for(const [goal,want]of [['A','¬A'],['!A','A'],['A & B','¬(A ∧ B)'],['!(A & B)','A ∧ B']]){
  assert.deepEqual(initialMethodSteps({method:'raa',goal:{formula:goal}}),[{formula:want,rule:'assume',refs:[]}]);
 }
 assert.deepEqual(initialMethodSteps(METHOD_EXERCISES.instructions),[]);
});
