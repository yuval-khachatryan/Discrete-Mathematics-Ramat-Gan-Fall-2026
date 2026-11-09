import test from 'node:test';
import assert from 'node:assert/strict';
import {checkQuantifierNegation as check} from '../games/shared/quantifier-negation.js';
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
