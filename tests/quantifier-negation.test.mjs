import test from 'node:test';
import assert from 'node:assert/strict';
import {checkQuantifierNegation as check,checkQuantifierWriting} from '../games/shared/quantifier-negation.js';
test('both negations accept symbols, typed aliases, parentheses and bound-variable renaming',()=>{
 for(const s of ['∃x ∈ D: ¬P(x)','exists x in D: not P(x)','(∃y ∈ D: (¬(P(y))))','\\exists x \\in D \\colon \\neg P(x)'])assert.equal(check(s,'∀').ok,true,s);
 for(const s of ['∀x ∈ D: ¬P(x)','forall y in D: !P(y)'])assert.equal(check(s,'∃').ok,true,s);
});
test('feedback distinguishes unchanged quantifier, domain, negation and free-variable mistakes',()=>{
 assert.match(check('∀x ∈ D: ¬P(x)','∀').message,/מחליפים את הכמת/);
 assert.match(check('∃x ∈ U: ¬P(x)','∀').message,/התחום נשאר D/);
 assert.match(check('∃x ∈ D: P(x)','∀').message,/צריך גם לשלול/);
 assert.match(check('∃y ∈ D: ¬P(x)','∀').message,/אותו משתנה/);
 assert.equal(check('¬(∀x ∈ D: P(x))','∀').partial,true);
 assert.equal(check('¬∃x ∈ D: P(x)','∃').partial,true);
 for(const s of ['', '∃x ∈ D: ¬Q(x)','∃x ∈ D: ¬¬P(x)','∃x ∈ D: ¬P(x))','alert(1)','∃x ∈ D: ¬P(x) garbage'])assert.equal(check(s,'∀').ok,false,s);
});

test('two-quantifier writing validates order, domains, binding and negation',()=>{
 for(const answer of ['∀x ∈ S: ∃y ∈ M: L(x,y)','forall student in S: exists item in M: L(student,item)','(∀a ∈ S: (∃b ∈ M: L(a,b)))'])assert.ok(checkQuantifierWriting(answer,'menu').ok,answer);
 for(const answer of ['∃x ∈ S: ∀y ∈ M: ¬L(x,y)','exists a in S: forall b in M: not L(a,b)'])assert.ok(checkQuantifierWriting(answer,'menu-negation').ok,answer);
 for(const answer of ['∃y ∈ M: ∀x ∈ S: L(x,y)','∀x ∈ M: ∃y ∈ S: L(x,y)','∀x ∈ S: ∃x ∈ M: L(x,x)','∀x ∈ S: ∃y ∈ M: L(y,x)','∀x ∈ S: ∃y ∈ M: L(x,z)','∀x ∈ S: ∃y ∈ M: L(x)','∀x ∈ S: ∃y ∈ M: L(x,y,z)','∀x ∈ S: ∃y ∈ M: ¬L(x,y)'])assert.equal(checkQuantifierWriting(answer,'menu').ok,false,answer);
 assert.equal(checkQuantifierWriting('¬(∀x ∈ S: ∃y ∈ M: L(x,y))','menu-negation').partial,true);
 assert.equal(checkQuantifierWriting('∃x ∈ S: ∀y ∈ M: L(x,y)','menu-negation').ok,false);
 assert.equal(check('∃x ∈ D: ¬P(x,y)','∀').ok,false);
});

import {checkQuantifierEvidence} from '../games/shared/quantifier-evidence.js';
test('written evidence accepts every valid witness and checks membership before the condition',()=>{
 for(const n of ['11','14'])assert.ok(checkQuantifierEvidence(n,'witness').ok);
 assert.ok(checkQuantifierEvidence('2','counter').ok);
 for(const kind of ['witness','counter']){
  for(const n of ['', '2,6','{2}','not a number'])assert.equal(checkQuantifierEvidence(n,kind).ok,false);
  assert.match(checkQuantifierEvidence('100',kind).message,/אינו שייך/);
  assert.equal(checkQuantifierEvidence('6',kind).ok,false);
 }
});

test('parenthesized quantifier answers need no colons',()=>{
 assert.ok(check('∃x ∈ D (¬P(x))','∀').ok);
 assert.ok(check('∀x ∈ D (¬P(x))','∃').ok);
 assert.ok(checkQuantifierWriting('∀x ∈ S ∃y ∈ M (L(x,y))','menu').ok);
 assert.ok(checkQuantifierWriting('∃x ∈ S (∀y ∈ M (¬L(x,y)))','menu-negation').ok);
});
