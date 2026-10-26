import test from 'node:test';
import assert from 'node:assert/strict';
import { SUBSTITUTION_ROUNDS as rounds, substitutionState as state } from '../games/shared/open-statement.js';

test('unfilled and partially filled sentences keep their missing variables', () => {
  assert.deepEqual(state(rounds[0], {}).missing, ['x']);
  assert.equal(state(rounds[0], {}).truth, null);
  assert.deepEqual(state(rounds[1], { x: 3 }), { missing: ['y'], substituted: '3 + □ = 10', truth: null });
  assert.deepEqual(state(rounds[1], { y: 7 }).missing, ['x']);
  assert.equal(state(rounds[0], { x: null }).truth, null);
});
test('substitution accepts true and false propositions; equality is not greater than', () => {
  assert.equal(state(rounds[0], { x: 7 }).truth, true);
  assert.equal(state(rounds[0], { x: 2 }).truth, false);
  assert.equal(state(rounds[0], { x: 5 }).truth, false);
  assert.equal(state(rounds[1], { x: 3, y: 7 }).truth, true);
  assert.equal(state(rounds[1], { x: 3, y: 4 }).truth, false);
});
test('all occurrences of the same variable receive the same selected value', () => {
  assert.deepEqual(state(rounds[2], { x: 5 }), { missing: [], substituted: '5 + 5 = 10', truth: true });
  assert.deepEqual(state(rounds[2], { x: 7 }), { missing: [], substituted: '7 + 7 = 10', truth: false });
});
test('every round offers true and false results within its stated domain', () => {
  for (const r of rounds) {
    const choices = r.vars.reduce((rows, v) => rows.flatMap(row => r.domain.map(n => ({ ...row, [v]: n }))), [{}]);
    const truths = choices.map(row => state(r, row).truth);
    assert.ok(truths.includes(true) && truths.includes(false), r.title);
    assert.throws(() => state(r, { [r.vars[0]]: 999 }), RangeError);
  }
});
