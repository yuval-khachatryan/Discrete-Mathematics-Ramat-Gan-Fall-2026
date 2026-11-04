import test from 'node:test';
import assert from 'node:assert/strict';
import {RULE_CHOICES,expressionParts,checkStep,checkReplacements,replacementSuggestions,ruleOptionLabel,checkProof} from '../games/shared/proof-rules.js';
const change=(s,path,after,rule)=>({path,before:expressionParts(s).find(p=>p.path===path).formula,after,rule});
test('complement laws accept both operand orders without accepting arbitrary tautologies',()=>{
 for(const s of ['A | !A','!A | A','!(A & B) | (A & B)'])assert.equal(checkStep(s,'T','tautology',['A','B']).kind,'valid');
 for(const s of ['A & !A','!A & A'])assert.equal(checkStep(s,'F','contradiction',['A']).kind,'valid');
 assert.notEqual(checkStep('(A | !A) & (B | !B)','T','tautology',['A','B']).kind,'valid');
 const s='!((!A | A) & (!A | !B))';
 assert.equal(checkReplacements(s,'!(T & (!A | !B))',[change(s,'r.0.0','T','tautology')]).kind,'valid');
});
test('narrow dropdown variants enforce the chosen connective and include right distributivity',()=>{
 assert.equal(checkStep('A | (B & C)','(A | B) & (A | C)','distribute:1',['A','B','C']).kind,'valid');
 assert.notEqual(checkStep('A | (B & C)','(A | B) & (A | C)','distribute:0',['A','B','C']).kind,'valid');
 assert.equal(checkStep('(B | C) & A','(B & A) | (C & A)','distribute:0',['A','B','C']).kind,'valid');
 assert.ok(RULE_CHOICES.every(c=>ruleOptionLabel(c).includes('≡')||c.id==='demorgan'));
});
test('quick substitutions are root-only, justified, and include multiple valid choices',()=>{
 assert.deepEqual(replacementSuggestions('!A | A','tautology'),['T']);
 assert.deepEqual(replacementSuggestions('!((!A | A) & B)','tautology'),[]);
 assert.deepEqual(replacementSuggestions('T','tautology'),[]); // infinitely many manual expansions
 const dm=replacementSuggestions('!(A & !B)','demorgan');
 assert.ok(dm.includes('¬A ∨ ¬¬B'));assert.ok(dm.includes('¬A ∨ B'));
 assert.ok(replacementSuggestions('A -> B','implication').length>=2);
 for(const c of RULE_CHOICES)for(const [a,b]of c.pairs)for(const source of [a,b]){
  for(const result of replacementSuggestions(source,c.id))assert.equal(checkReplacements(source,result,[change(source,'r',result,c.id)]).kind,'valid',`${source} → ${result} (${c.id})`);
 }
});
test('the reported 1.8.7 route finishes and mistakes receive local diagnoses',()=>{
 const path=[['!(!A | (A & !B))','r.0','(!A | A) & (!A | !B)','!((!A | A) & (!A | !B))','distribute:1'],
 ['!((!A | A) & (!A | !B))','r.0.0','T','!(T & (!A | !B))','tautology'],
 ['!(T & (!A | !B))','r.0','!A | !B','!(!A | !B)','identity'],
 ['!(!A | !B)','r','A & B','A & B','demorgan']];
 const proof=path.map(([s,p,a,f,r])=>({formula:f,rule:'replacements',replacements:[change(s,p,a,r)]}));
 assert.ok(checkProof(path[0][0],'A & B',proof).complete);
 const bad=checkReplacements('!A | A','F',[change('!A | A','r','F','tautology')]);assert.match(bad.message,/בהצבה/);
 const big=checkReplacements('!(A | !A)','!T',[change('!(A | !A)','r','!T','tautology')]);assert.match(big.message,/גדול מדי/);
});
