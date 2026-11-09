import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStatement,show,validateTypes,equivalentShape,freeNames,substituteName,showWritten} from '../games/shared/set-proof-syntax.js';
import {checkSetProof,setStepHints,SET_PROOF_RULES,SET_RULE_CATEGORIES,setRuleCategory,checkSetEquivalence,setEquivalenceHints} from '../games/shared/set-proof-checker.js';
import {SET_PROOFS} from '../games/shared/set-proof-exercises.js';
import {MODELS,step,wrapInclusion} from './set-proof-models.mjs';
function verify(id,steps,part=0,mode='parts'){
 const result=checkSetProof(SET_PROOFS[id][mode][part],steps);assert.equal(result.ok,true,result.error?.message);assert.equal(result.reached,true,id);return result;
}
test('typed parser round trips, accepts shorthand, rejects undeclared symbols',()=>{
 for(const s of ['(x ∈ A) ∧ (x ∉ B)','x ∈ A ∖ (B ∪ C)','x ∈ (A ∪ B)ᶜ','X ∈ P(A)','(A ∩ B = A) ↔ (A ⊆ B)','¬((x ∈ A) → (x ∈ B))'])assert.deepEqual(parseStatement(show(parseStatement(s))),parseStatement(s));
 assert.deepEqual(parseStatement('x in A intersect B'),parseStatement('x ∈ A ∩ B'));
 assert.throws(()=>validateTypes(parseStatement('x ∈ x'),SET_PROOFS['hw-union'].parts[0]));
 assert.throws(()=>validateTypes(parseStatement('y ∈ A'),SET_PROOFS['hw-union'].parts[0]));
 assert.throws(()=>parseStatement('alert(1)'));
});
test('independent written proofs accept several routes',()=>{
 assert.deepEqual(Object.keys(MODELS).sort(),Object.keys(SET_PROOFS).sort());
 for(const [id,parts]of Object.entries(MODELS))parts.forEach((steps,i)=>verify(id,steps,i));
 const direct={...SET_PROOFS['inclusion-chain'].parts[0],rules:['subset-chain']};
 assert.equal(checkSetProof(direct,[step('subset-chain','A ⊆ C','G2','G1')]).reached,true);
 verify('hw-difference',wrapInclusion(SET_PROOFS['hw-difference'].parts[0],[step('difference','x ∈ C','S1'),step('difference','x ∉ B','S1'),step('assume','x ∈ A'),step('subset-use','x ∈ B','G1','S4'),step('false','F','S3','S5'),step('raa','x ∉ A','S4','S6'),step('difference','x ∈ C ∖ A','S2','S7')]));
});
test('equivalence is two-way, not just a correct implication',()=>{
 verify('double-difference',[
  step('difference','(x ∈ A) ∧ (x ∉ A ∖ B)','S1'),
  step('difference','(x ∈ A) ∧ ¬((x ∈ A) ∧ (x ∉ B))','S2'),
  step('eq:demorgan','(x ∈ A) ∧ ((x ∉ A) ∨ (x ∈ B))','S3'),
  step('eq:distribute','((x ∈ A) ∧ (x ∉ A)) ∨ ((x ∈ A) ∧ (x ∈ B))','S4'),
  step('eq:contradiction','F ∨ ((x ∈ A) ∧ (x ∈ B))','S5'),
  step('eq:identity','(x ∈ A) ∧ (x ∈ B)','S6'),
  step('intersection','x ∈ A ∩ B','S7'),
 ],0,'equivalence');
 const config=SET_PROOFS['double-difference'].equivalence[0];
 assert.equal(checkSetProof(config,[step('difference','x ∈ A','S1')]).ok,false);
});
test('no circular proof, no future citations, no leaking temporary assumptions',()=>{
 const c=SET_PROOFS['hw-union'].parts[0];
 assert.match(checkSetProof(c,[step('intersection','x ∈ A','R')]).error.message,/המטרה/);
 assert.equal(checkSetProof(c,[step('intersection','x ∈ A','S2')]).ok,false);
 assert.equal(checkSetProof(c,[step('assume','x ∈ A ∪ C')]).reached,false);
 const steps=[step('assume','x ∈ C'),step('conditional','(x ∈ C) → (x ∈ C)','S1','S1'),step('union','x ∈ A ∪ C','S1')];
 assert.match(checkSetProof(c,steps).error.message,/ענף שנסגר/);
 assert.equal(checkSetProof(c,[step('intersection','x ∈ C','S1')]).ok,false);
});
test('union cannot be treated as intersection; complement needs universe membership',()=>{
 const c=SET_PROOFS['union-target'].parts[0];
 assert.equal(checkSetProof(c,[step('union','x ∈ A','S1')]).ok,false);
 const cfg={...SET_PROOFS['proof-demorgan'].parts[0],givens:['x ∉ A'],start:null,goal:'x ∈ Aᶜ'};
 assert.equal(checkSetProof(cfg,[step('complement','x ∈ Aᶜ','G1')]).ok,false);
 cfg.givens.push('x ∈ U');assert.equal(checkSetProof(cfg,[step('complement','x ∈ Aᶜ','G1','G2')]).reached,true);
});
test('hints are checked by the same rule checker and never use the goal as a premise',()=>{
 const c=SET_PROOFS['hw-intersection'].parts[0];
 const hints=setStepHints(c,[],'intersection',['G1']);assert.ok(hints.includes('x ∈ A'));
 assert.ok(!hints.includes('x ∈ A ∩ C'));
});
test('R becomes citable only after a completed unscoped derivation',()=>{
 const c=SET_PROOFS['hw-intersection'].parts[0],base=MODELS['hw-intersection'][0];
 assert.equal(checkSetProof(c,[...base,step('intersection','x ∈ C','R')]).ok,true);
 assert.equal(checkSetProof(c,[step('assume','x ∈ A ∩ C'),step('intersection','x ∈ C','R')]).ok,false);
});
test('known set laws apply inside formulas, not merely as arbitrary equivalent answers',()=>{
 const c=SET_PROOFS['hw-union'].parts[0];
 assert.equal(checkSetProof(c,[MODELS['hw-union'][0][0],step('set-commute','x ∈ B ∩ A','S1')]).ok,true);
 assert.equal(checkSetProof(c,[MODELS['hw-union'][0][0],step('set-commute','x ∈ A ∪ B','S1')]).ok,false);
});
test('De Morgan equivalence can explicitly use the given universe membership',()=>{
 verify('proof-demorgan',[
  step('complement','x ∉ A ∪ B','S1','G1'),
  step('union','¬((x ∈ A) ∨ (x ∈ B))','S2'),
  step('eq:demorgan','(x ∉ A) ∧ (x ∉ B)','S3'),
  step('complement','(x ∈ Aᶜ) ∧ (x ∈ Bᶜ)','S4','G1'),
  step('intersection','x ∈ Aᶜ ∩ Bᶜ','S5'),
 ],0,'equivalence');
});
test('one rule may be applied to independent original subexpressions',()=>{
 const config={...SET_PROOFS['hw-intersection'].parts[0],givens:['¬¬(x ∈ A) ∧ ¬¬(x ∈ B)'],goal:'(x ∈ A) ∧ (x ∈ B)'};
 assert.equal(checkSetProof(config,[step('eq:double','(x ∈ A) ∧ (x ∈ B)','G1')]).reached,true);
});

test('restricted quantifiers round trip and compare up to bound-variable names',()=>{
 for(const text of ['∀x ∈ A: (x ∈ B)','(∀x ∈ A: (x ∈ B)) ∧ (x ∈ C)','∀x ∈ A: (∀y ∈ B: ((x ∈ C) → (y ∈ C)))']){
  const ast=parseStatement(text);validateTypes(ast,SET_PROOFS['inclusion-chain'].parts[0]);assert.deepEqual(parseStatement(show(ast)),ast);
 }
 assert.equal(equivalentShape(parseStatement('∀x ∈ A: (x ∈ B)'),parseStatement('∀y ∈ A: (y ∈ B)')),true);
 assert.equal(equivalentShape(parseStatement('∀y ∈ A: (x ∈ B)'),parseStatement('∀y ∈ A: (y ∈ B)')),false);
 assert.deepEqual(freeNames(parseStatement('∀x ∈ A: (x ∈ B)')),['A','B']);
 assert.throws(()=>substituteName(parseStatement('∀y ∈ A: (x ∈ B)'),'x',{type:'name',name:'y'}));
});

test('arbitrary-element proofs can use a fresh name or prove a conditional first',()=>{
 const c=SET_PROOFS['inclusion-chain'].parts[0];
 const proof=MODELS['inclusion-chain'][0].map(s=>({...s,variable:s.variable?'y':undefined,formula:s.formula.replace(/\bx\b/g,'y')}));
 assert.equal(checkSetProof(c,proof).reached,true);
 const quantified='∀y ∈ A: (y ∈ C)';
 const steps=[{rule:'open-forall',formula:quantified,variable:'y',style:'conditional',sources:[]},
  step('assume','y ∈ A'),step('subset-use','y ∈ B','G1','S2'),step('subset-use','y ∈ C','G2','S3'),
  step('conditional','(y ∈ A) → (y ∈ C)','S2','S4'),step('close-forall',quantified,'S1','S5'),step('subset-definition','A ⊆ C','S6')];
 assert.equal(checkSetProof(c,steps).reached,true);
 assert.equal(checkSetProof(c,[steps[0],step('subset-use','y ∈ B','G1','S1')]).ok,false,'a declaration is not a membership premise');
 assert.equal(checkSetProof(c,[...steps.slice(0,4),step('close-forall',quantified,'S1','S4')]).ok,false,'must discharge the membership assumption before generalizing');
});

test('generalization checks freshness, the local goal, and closed scopes',()=>{
 const c=SET_PROOFS['inclusion-chain'].parts[0],opening=MODELS['inclusion-chain'][0][0],quantified=opening.formula;
 assert.equal(checkSetProof(c,[opening,step('close-forall',quantified,'S1','S1')]).ok,false,'an unfinished membership proof cannot be closed');
 assert.equal(checkSetProof({...c,givens:[...c.givens,'x ∈ A']},[opening]).ok,false,'a given witness is not arbitrary');
 assert.equal(checkSetProof(c,[opening,step('conditional','(x ∈ A) → (x ∈ A)','S1','S1')]).ok,false,'ordinary implication closure cannot close an arbitrary-element frame');
 assert.equal(checkSetProof(c,[opening,step('assume','x ∈ C'),step('close-forall',quantified,'S1','S2')]).ok,false,'temporary assumptions cannot leak into the generalization');
 const complete=MODELS['inclusion-chain'][0];
 assert.equal(checkSetProof(c,[...complete,step('subset-use','x ∈ C','G2','S2')]).ok,false,'closed local facts are unavailable');
 assert.equal(checkSetProof(c,[...complete.slice(0,-2),step('close-forall','∀x ∈ B: (x ∈ C)','S1','S3')]).ok,false,'cannot change the domain when generalizing');
 assert.equal(checkSetProof(c,[{...opening,formula:'∀y ∈ {x}: (y ∈ C)',variable:'x'}]).ok,false,'cannot capture a free variable in the quantified goal');
});

test('universal facts can be instantiated only with membership in their domain',()=>{
 const c={...SET_PROOFS['inclusion-chain'].parts[0],givens:['∀x ∈ A: (x ∈ B)','y ∈ A'],objects:['y'],goal:'y ∈ B'};
 assert.equal(checkSetProof(c,[step('forall-use','y ∈ B','G1','G2')]).reached,true);
 assert.equal(checkSetProof({...c,givens:['∀x ∈ A: (x ∈ B)','y ∈ C']},[step('forall-use','y ∈ B','G1','G2')]).ok,false);
 const reverse={...c,givens:['∀x ∈ A: (x ∈ B)'],goal:'A ⊆ B'};
 assert.equal(checkSetProof(reverse,[step('subset-definition','A ⊆ B','G1')]).reached,true);
});

test('opening an arbitrary-element proof never requires a nonempty domain',()=>{
 const c={...SET_PROOFS['inclusion-chain'].parts[0],goal:'∅ ⊆ ∅'};
 const opening={rule:'open-forall',formula:'∀x ∈ ∅: (x ∈ ∅)',variable:'x',sources:[]};
 assert.equal(checkSetProof(c,[opening,step('close-forall',opening.formula,'S1','S1'),step('subset-definition','∅ ⊆ ∅','S2')]).reached,true);
});


test('both containment directions work without losing the written notation',()=>{
 for(const s of ['A ⊇ B','A supset B','A supseteq B',String.raw`A \supseteq B`])assert.deepEqual(parseStatement(s),parseStatement('B ⊆ A'));
 assert.deepEqual(parseStatement('A ⊉ B'),parseStatement('B ⊈ A'));
 assert.equal(showWritten('A ⊇ B'),'A ⊇ B');
 const c={...SET_PROOFS['hw-intersection'].parts[0],givens:['B ⊇ A','x ∈ A'],goal:'x ∈ B'};
 assert.equal(checkSetProof(c,[step('subset-use','x ∈ B','G1','G2')]).reached,true);
 const q={...c,givens:['A ⊆ B','A ⊇ B'],goal:'A = B'};
 assert.equal(checkSetProof(q,[step('double-inclusion','A = B','G1','G2')]).reached,true);
 const proof=MODELS['inclusion-chain'][0].map((s,i,all)=>i===all.length-1?{...s,formula:'C ⊇ A'}:s);
 const result=checkSetProof(SET_PROOFS['inclusion-chain'].parts[0],proof);
 assert.equal(result.reached,true);assert.equal(result.rows.at(-1).written,'C ⊇ A');
 assert.equal(checkSetProof(SET_PROOFS['inclusion-chain'].parts[0],[...proof.slice(0,-1),step('subset-definition','A ⊇ C','S4')]).ok,false);
});


test('every offered proof rule has an explicit category',()=>{
 for(const rule of SET_PROOF_RULES)assert.ok(SET_RULE_CATEGORIES.some(c=>c.id===setRuleCategory(rule.id)),rule.id);
});

test('goal reformulations are checked equivalences, not new premises',()=>{
 const c=SET_PROOFS['inclusion-chain'].parts[0];
 const change={kind:'restate-goal',rule:'subset-definition',formula:'∀x ∈ A: (x ∈ C)',sources:[]};
 const state=checkSetProof(c,[change]);assert.equal(state.ok,true);assert.equal(state.reached,false);
 assert.deepEqual(state.available.map(r=>r.id),['G1','G2']);assert.equal(state.rows.at(-1).id,'R1');
 assert.equal(checkSetProof(c,[change,step('forall-use','x ∈ C','R1','G1')]).ok,false);
 assert.equal(checkSetProof(c,[change,step('subset-definition','A ⊆ C','R')]).ok,false);
 assert.equal(checkSetProof(c,[{...change,formula:'∀x ∈ C: (x ∈ A)'}]).ok,false);
 const config={...SET_PROOFS['hw-intersection'].parts[0],goal:'x ∈ A ∩ C'};
 assert.equal(checkSetProof(config,[{kind:'restate-goal',rule:'intersection',formula:'x ∈ A',sources:[]}]).ok,false,'one direction is not equivalence');
 assert.equal(checkSetProof(config,[{kind:'restate-goal',rule:'intersection',formula:'(x ∈ A) ∧ (x ∈ C)',sources:[]}]).ok,true);
});

test('proved statements can be linked to R by a checked rule or a recorded chain',()=>{
 const c=SET_PROOFS['inclusion-chain'].parts[0];
 const change={kind:'restate-goal',rule:'subset-definition',formula:'∀x ∈ A: (x ∈ C)',sources:[]};
 const prefix=[change,...MODELS['inclusion-chain'][0].slice(0,-1)];
 for(const rule of ['subset-definition','goal-chain']){
  const result=checkSetProof(c,[...prefix,{kind:'match-goal',target:'R',rule,formula:'A ⊆ C',sources:['S4']}]);
  assert.equal(result.reached,true,result.error?.message);
 }
 assert.equal(checkSetProof(c,[change,{kind:'match-goal',target:'R',rule:'goal-chain',formula:'A ⊆ C',sources:['G1']}]).ok,false);
 assert.equal(checkSetProof(c,[...prefix,{kind:'match-goal',target:'R',rule:'eq:double',formula:'A ⊆ C',sources:['S4']}]).ok,false);
});

test('a reformulated local goal can close an arbitrary-element assumption',()=>{
 const c=SET_PROOFS['intersection-target'].parts[0],steps=[
  MODELS['intersection-target'][0][0],
  {kind:'restate-goal',rule:'intersection',formula:'(x ∈ B) ∧ (x ∈ C)',sources:[]},
  step('subset-use','x ∈ B','G1','S1'),step('subset-use','x ∈ C','G2','S1'),step('and-in','(x ∈ B) ∧ (x ∈ C)','S2','S3'),
  step('close-forall','∀x ∈ A: (x ∈ B ∩ C)','S1','S4'),step('subset-definition','A ⊆ B ∩ C','S5')];
 const result=checkSetProof(c,steps);assert.equal(result.reached,true,result.error?.message);
 assert.deepEqual(result.rows.find(r=>r.id==='S5').goalLinks,['R1']);
 assert.equal(checkSetProof(c,[...steps,step('and-out','x ∈ B','S4')]).ok,false);
});

test('reformulation hints are valid in both directions, including inside quantifiers',()=>{
 const c=SET_PROOFS['intersection-target'].parts[0];
 const original=parseStatement('A ⊆ B ∩ C');
 const hints=setEquivalenceHints(original,'subset-definition',c);
 assert.ok(hints.includes('∀x ∈ A: (x ∈ B ∩ C)'));
 const quantified=parseStatement(hints[0]);
 assert.equal(checkSetEquivalence('intersection',quantified,parseStatement('∀y ∈ A: ((y ∈ B) ∧ (y ∈ C))'),c),true);
 const logic=parseStatement('¬((x ∈ A) ∧ (x ∈ B))');
 const logicalHints=setEquivalenceHints(logic,'eq:demorgan',c);
 assert.ok(logicalHints.length);for(const h of logicalHints)assert.equal(checkSetEquivalence('eq:demorgan',logic,parseStatement(h),c),true);
 assert.equal(checkSetEquivalence('subset-definition',parseStatement('{x} ⊆ B'),parseStatement('∀x ∈ {x}: (x ∈ B)'),c),false,'no capture of a free variable');
});

test('reformulation hints respect object types and locally introduced variable names',()=>{
 const c={...SET_PROOFS['hw-union'].parts[0],objects:['y']};
 const before=parseStatement('y ∈ A ∩ B');
 const hints=setEquivalenceHints(before,'intersection',c);assert.ok(hints.includes('y ∈ A ∧ y ∈ B'));
 for(const text of setEquivalenceHints(before,'set-empty',c))assert.doesNotThrow(()=>validateTypes(parseStatement(text),c));
 assert.equal(checkSetEquivalence('intersection',parseStatement('(y ∈ A) ∧ (y ∈ B)'),parseStatement('(y ∈ B) ∧ (y ∈ A)'),c),false,'commuting atoms does not apply the intersection definition');
});

test('manual let opens from an inclusion, checks local goal and permits empty domains',()=>{
 const c=SET_PROOFS['inclusion-chain'].parts[0];
 const opening={kind:'let',rule:'open-forall',assumption:'y ∈ A',formula:'y ∈ C',sources:[]};
 const result=checkSetProof(c,[opening]);assert.equal(result.ok,true,result.error?.message);
 assert.equal(show(result.rows.at(-1).formula),'y ∈ A');
 verify('inclusion-chain',[opening,step('subset-use','y ∈ B','G1','S1'),step('subset-use','y ∈ C','G2','S2'),step('close-forall','∀y ∈ A: (y ∈ C)','S1','S3'),step('subset-definition','A ⊆ C','S4')]);
 for(const patch of [{assumption:'y ∈ C'},{formula:'y ∈ B'},{formula:''},{assumption:'A ∈ A'},{assumption:'x ∈ x'},{rule:'assume'}])assert.equal(checkSetProof(c,[{...opening,...patch}]).ok,false,JSON.stringify(patch));
 assert.equal(checkSetProof({...c,givens:['y ∈ A'],objects:['x','y']},[opening]).ok,false);
 assert.equal(checkSetProof({...c,goal:'∅ ⊆ C'},[{...opening,assumption:'y ∈ ∅'}]).ok,true);
 assert.equal(checkSetProof(c,[{...opening,assumption:'יהי y ∈ A'}]).ok,true);
});

test('contradictions use either two facts or one conjunction, including complements',()=>{
 const c=SET_PROOFS['complement-inclusion'].parts[0];
 const opening={kind:'let',rule:'open-forall',assumption:'x ∈ Bᶜ',formula:'x ∈ Aᶜ',sources:[]};
 const prefix=[opening,step('assume','x ∈ A'),step('subset-use','x ∈ B','G1','S2')];
 for(const refs of [['S1','S3'],['S3','S1']]){
  const contradiction=step('false','F',...refs);
  const close=step('raa','x ∉ A','S2','S4');
  const proof=[...prefix,contradiction,close,step('universe-member','x ∈ U','S1'),step('complement','x ∈ Aᶜ','S5','S6'),step('close-forall','∀x ∈ Bᶜ: (x ∈ Aᶜ)','S1','S7'),step('subset-definition','Bᶜ ⊆ Aᶜ','S8')];
  const result=verify('complement-inclusion',proof);assert.equal(show(result.rows.find(r=>r.id==='S5').formula),'x ∉ A');
  assert.ok(setStepHints(c,prefix,'false',refs).includes('F'));
 }
 const combined=[...prefix,step('and-in','(x ∈ B) ∧ (x ∈ Bᶜ)','S3','S1')];
 assert.equal(checkSetProof(c,[...combined,step('false','F','S4')]).ok,true);
 assert.ok(setStepHints(c,combined,'false',['S4']).includes('F'));
 const contradicted=[...prefix,step('false','F','S1','S3')];
 assert.match(checkSetProof(c,[...contradicted,step('conditional','x ∉ A','S2','S4')]).error.message,/סגירת הנחה בדרך השלילה/);
 assert.equal(checkSetProof(c,[...contradicted,step('conditional','(x ∈ A) → F','S2','S4')]).ok,true);
 assert.equal(checkSetProof(c,[...prefix,step('false','F','S2','S3')]).ok,false);
 assert.equal(checkSetProof(c,[opening,step('false','F','S1')]).ok,false);
 assert.equal(checkSetProof(c,[opening,step('assume','x ∈ Aᶜ'),step('subset-use','x ∈ B','G1','S2')]).ok,false);
 const atomic={...c,universe:undefined,givens:['x ∈ B','x ∉ B'],goal:'F'};
 assert.equal(checkSetProof(atomic,[step('false','F','G1','G2')]).reached,true);
 const conjunct={...atomic,givens:['(x ∈ B) ∧ (x ∉ B)']};
 assert.equal(checkSetProof(conjunct,[step('false','F','G1')]).reached,true);
});
