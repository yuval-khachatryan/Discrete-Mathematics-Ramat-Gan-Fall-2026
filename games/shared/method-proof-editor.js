import {parse} from './logic.js';
import {proofFormula} from './proof-notation.js';
import {METHOD_EXERCISES} from './method-exercises.js';
import {mountKnightProof} from './knight-proof-editor.js';
export function initialMethodSteps(exercise){
 if(exercise.fixedSteps)return exercise.fixedSteps;
 if(exercise.method!=='raa')return [];
 const goal=parse(exercise.goal.formula,{flatten:false});
 return [{formula:proofFormula(goal.type==='not'?goal.arg:{type:'not',arg:goal}),rule:'assume',refs:[]}];
}
export function initMethodProof(box){
 const exercise=METHOD_EXERCISES[box.dataset.methodProof];if(!exercise)return;
 // Reuse the scoped proof editor with given premises and an explicit goal.
 // No island semantics or inferred puzzle answer is involved.
 mountKnightProof(box,{exercise,people:exercise.atoms.map(a=>({id:a.id,name:a.text})),statements:[]},{
  exercise,fixedSteps:initialMethodSteps(exercise),premises:exercise.premises.map(p=>p.formula),model:exercise.solution,
  rules:exercise.rules,hints:exercise.hints,
 });
}
