import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFormulaShortcuts} from '../games/shared/formula-shortcuts.js';
import {sameFormulaStructure} from '../games/shared/logic.js';
test('arrow shortcuts use the longest match and quoted words leave identifiers alone',()=>{
 assert.equal(normalizeFormulaShortcuts('A <-> B -> C').value,'A ↔ B → C');
 assert.equal(normalizeFormulaShortcuts('"NOT" A "AND" B "OR" C "XOR" D "IFF" E').value,'¬ A ∧ B ∨ C ⊕ D ↔ E');
 assert.equal(normalizeFormulaShortcuts('CANDY "and" NOTA').value,'CANDY ∧ NOTA');
 assert.equal(normalizeFormulaShortcuts('A AND B').value,'A AND B');
 assert.equal(normalizeFormulaShortcuts('״NOT״ A “IFF” B').value,'¬ A ↔ B');
 assert.equal(normalizeFormulaShortcuts('A "AN').value,'A "AN');
});
test('conversion preserves selection and caret around replaced tokens',()=>{
 assert.deepEqual(normalizeFormulaShortcuts('A -> B',4,4),{value:'A → B',start:3,end:3});
 assert.deepEqual(normalizeFormulaShortcuts('"NOT" A <-> B',6,13),{value:'¬ A ↔ B',start:2,end:7});
 assert.deepEqual(normalizeFormulaShortcuts('A <-> B',0,1),{value:'A ↔ B',start:0,end:1});
});
test('strict formalization permits spelling/parentheses but not rewrites or reordering',()=>{
 assert.ok(sameFormulaStructure(' (X → Y) ','A -> B',{A:'X',B:'Y'}));
 assert.ok(sameFormulaStructure('A ∧ (B)','A & B'));
 for(const [a,b]of [['!A | B','A -> B'],['!!A','A'],['B & A','A & B'],['A | (B | C)','(A | B) | C']])assert.equal(sameFormulaStructure(a,b),false);
});
