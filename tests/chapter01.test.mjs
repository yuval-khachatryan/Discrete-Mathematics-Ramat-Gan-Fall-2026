// The paper exercises in 01-logic.qmd, checked by brute force so the printed
// solutions cannot drift from the mathematics.
import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, assignments, truthTable, compare } from "../games/shared/logic.js";

// knights & knaves: every speaker's statement must equal "speaker is a knight"
function kk(names, said) {
  return assignments(names).filter(env => said.every(([who, f]) => evaluate(f, env) === env[who]))
    .map(env => names.map(n => (env[n] ? "T" : "F")).join(""));
}

test("worked example: 'we are both knaves' → Alon knave, Batya knight", () => {
  assert.deepEqual(kk(["A", "B"], [["A", "!A & !B"]]), ["FT"]);
});
test("exercise: 'Batya is a knight' / 'exactly one of us is a knight' → both knaves", () => {
  assert.deepEqual(kk(["A", "B"], [["A", "B"], ["B", "(A & !B) | (!A & B)"]]), ["FF"]);
});
test("exercise: 'we are all knights' / 'Alon is a knave' → Alon knave, Batya knight, Carmel unknown", () => {
  assert.deepEqual(kk(["A", "B", "C"], [["A", "A & B & C"], ["B", "!A"]]), ["FTT", "FTF"]);
});
test("exercise: both say 'we are both knights' → possible, same type, undetermined", () => {
  assert.deepEqual(kk(["A", "B"], [["A", "A & B"], ["B", "A & B"]]), ["TT", "FF"]);
});

const col = f => truthTable(f).map(r => (r.value ? "T" : "F")).join("");
test("worked table (A ∨ B) ∧ ¬C and the half-worked ¬A ∨ (A ∧ B)", () => {
  assert.equal(col("(A | B) & !C"), "FTFTFTFF");
  assert.equal(col("!A | (A & B)"), "TFTT");
  assert.ok(compare("!A | (A & B)", "A -> B").equal);
});
test("exercises: De Morgan preview, circuit table, tautology", () => {
  assert.ok(compare("!(A | B)", "!A & !B").equal);
  assert.equal(col("(A & B) | !C"), "TTFTFTFT");
  assert.equal(col("(A & B) | !A | !B"), "TTTT");
});
test("evaluation exercise with A=T, B=F, C=T", () => {
  const env = { A: true, B: false, C: true };
  assert.equal(evaluate("!A | B", env), false);
  assert.equal(evaluate("A & (B | C)", env), true);
  assert.equal(evaluate("!(A & !B)", env), false);
  assert.equal(evaluate("(!A | !B) & C", env), true);
  // the robot's mistake: ¬A ∧ B is not ¬(A ∧ B)
  assert.equal(evaluate("!A & B", { A: true, B: false }), false);
  assert.equal(evaluate("!(A & B)", { A: true, B: false }), true);
});
test("parentheses example: with A=T, C=T the two circuits differ", () => {
  for (const B of [true, false]) {
    assert.equal(evaluate("A | (B & !C)", { A: true, B, C: true }), true);
    assert.equal(evaluate("(A | B) & !C", { A: true, B, C: true }), false);
  }
});

/* ---- the sections added for the full logic lecture ------------------------ */
import { readFileSync } from "node:fs";
import { parse } from "../games/shared/logic.js";

test("knights & knaves with implication: the 'impossible' exercise has no consistent row", () => {
  assert.deepEqual(kk(["A", "B"], [["A", "A -> !B"], ["B", "A"]]), []);
});
test("propositional calculus examples", () => {
  assert.ok(compare("!(A -> B)", "A & !B").equal);
  assert.ok(compare("!(A & !B)", "A -> B").equal);
  assert.ok(compare("!(!A | (A & !B))", "A & B").equal);
  assert.ok(compare("A <-> B", "(A -> B) & (B -> A)").equal);
  assert.ok(compare("A -> !C", "C -> !A").equal);
  assert.ok(!compare("A -> B", "B -> A").equal);
});
// valid argument = every row with all premises true has the conclusion true
const valid = (premises, conclusion, names) =>
  assignments(names).every(env => !premises.every(p => evaluate(p, env)) || evaluate(conclusion, env));
test("deduction rules are valid, the two fallacies are not", () => {
  assert.ok(valid(["A -> B", "A"], "B", ["A", "B"]));
  assert.ok(valid(["A -> B", "!B"], "!A", ["A", "B"]));
  assert.ok(valid(["A -> B", "B -> C"], "A -> C", ["A", "B", "C"]));
  assert.ok(!valid(["A -> B", "B"], "A", ["A", "B"]));
  assert.ok(!valid(["A -> B", "!A"], "!B", ["A", "B"]));
  // the rain / game / guard exercise: chain + modus tollens
  assert.ok(valid(["G -> M", "M -> H", "!H"], "!G", ["G", "M", "H"]));
});
test("quantifier self-check on D = {1,2,3,4}", () => {
  const D = [1, 2, 3, 4];
  assert.equal(D.every(x => x < 5), true);
  assert.equal(D.some(x => x > 4), false);
  assert.equal(D.every(x => x % 2 === 0), false);
  assert.equal(D.some(x => x * x === 9), true);
  assert.equal(D.every(x => D.some(y => y > x)), false);
});
test("the last evaluation item: B → (A ∧ ¬C) with A=T, B=F, C=T", () => {
  assert.equal(evaluate("B -> (A & !C)", { A: true, B: false, C: true }), true);
});
test("every interactive exercise in the chapter has formulas that parse", () => {
  const qmd = ["01-logic.qmd","02-sets.qmd"].map(f=>readFileSync(new URL(`../${f}`,import.meta.url),"utf8")).join("\n");
  const cols = [...qmd.matchAll(/\.ttq[^}]*cols="([^"]+)"/g)].flatMap(m => m[1].split(";"));
  const answers = [...qmd.matchAll(/\.fq answer="([^"]+)"/g)].map(m => m[1]);
  const proofs = [...qmd.matchAll(/\.proof-editor data-start="([^"]+)" data-target="([^"]+)"/g)];
  assert.ok(proofs.length >= 6);
  for (const [, start, target] of proofs) assert.ok(compare(start, target).equal);
  assert.ok(cols.length > 10 && answers.length >= 5);
  for (const f of [...cols, ...answers]) assert.doesNotThrow(() => parse(f.trim()), f);
});

test("exclusive or in the chapter: the 'but not both' translation is B ⊕ C", () => {
  assert.ok(compare("(B | C) & !(B & C)", "B ^ C").equal);
  assert.equal(evaluate("T ^ F", {}), true);   // ״2 זוגי או 3 זוגי, אבל לא שניהם״
  assert.equal(evaluate("T ^ T", {}), false);  // ״2 זוגי או 4 זוגי, אבל לא שניהם״
});
