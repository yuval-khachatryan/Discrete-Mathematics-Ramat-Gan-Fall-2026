import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assignments, evaluate } from "../games/shared/logic.js";
import { checkProof } from "../games/shared/proof-rules.js";
import { ARGUMENTS } from "../games/shared/argument-exercises.js";
import { PRACTICE_CHOICES } from "../games/shared/practice-choices.js";

const qmd = readFileSync(new URL("../01-logic.qmd", import.meta.url), "utf8");
const practice = qmd.slice(qmd.indexOf("## תרגול עצמי לפי נושאים"));
test("practice bank has eight topics, 48 exercises and 20 assisted proofs", () => {
  assert.equal((practice.match(/^### /gm) || []).length, 8);
  assert.equal((practice.match(/#practice-q-/g) || []).length, 48);
  assert.equal((practice.match(/\.argument-editor /g) || []).length, 16);
  assert.equal((practice.match(/\.proof-editor /g) || []).length, 4);
  assert.equal((practice.match(/\.choice-exercise /g) || []).length, 16);
  for(const exercise of practice.split(/^:::::: \{/m).slice(1)) {
    assert.match(exercise,/\.(choice-exercise|argument-editor|proof-editor|fq|ttq) /);
  }
  const ids = [...practice.matchAll(/#(practice-[\w-]+)/g)].map(m => m[1]);
  const definitions = [...practice.matchAll(/\{#(practice-[\w-]+)/g)].map(m => m[1]);
  assert.equal(new Set(definitions).size, definitions.length);
  for (const id of ids) assert.ok(definitions.includes(id), `broken link: ${id}`);
  for (const [id, ex] of Object.entries(ARGUMENTS).filter(([id]) => id.startsWith("practice-"))) {
    assert.ok(practice.includes(`data-argument="${id}"`));
    assert.ok(ex.hints.length >= 2);
    assert.deepEqual(ex.atoms.map(a => a.id), ["A", "B", "C"].slice(0, ex.atoms.length));
  }
});

test("choice questions have one answer and an explanation for every option, including every classification item",()=>{
  assert.equal(Object.keys(PRACTICE_CHOICES).length,16);
  assert.equal(Object.values(PRACTICE_CHOICES).flat().length,45);
  for(const [id,items] of Object.entries(PRACTICE_CHOICES)) {
    assert.ok(practice.includes(`data-choice="${id}"`));
    for(const item of items) {
      assert.equal(item.options.filter(o=>o.correct).length,1);
      assert.ok(item.options.every(o=>o.feedback.length>20));
    }
  }
  assert.deepEqual(PRACTICE_CHOICES.classify.map(q=>q.options.findIndex(o=>o.correct)),[0,1,2,3,3]);
  assert.deepEqual(PRACTICE_CHOICES['imp-values'].map(q=>q.options.find(o=>o.correct).text),['אמת','אמת','שקר','אמת']);
});

test("the four printed equivalence solutions justify each step, not just the final result", () => {
  const examples = [
    ["!(A | !B)", "!A & B", [["!A & !!B", "demorgan"], ["!A & B", "double"]]],
    ["!(A -> !B)", "A & B", [["!(!A | !B)", "implication"], ["!!A & !!B", "demorgan"], ["A & !!B", "double"], ["A & B", "double"]]],
    ["A -> (B & C)", "(A -> B) & (A -> C)", [["!A | (B & C)", "implication"], ["(!A | B) & (!A | C)", "distribute"], ["(A -> B) & (!A | C)", "implication"], ["(A -> B) & (A -> C)", "implication"]]],
    ["!(!A & !B)", "A | B", [["!!A | !!B", "demorgan"], ["A | !!B", "double"], ["A | B", "double"]]],
  ];
  for (const [start, target, steps] of examples) {
    assert.ok(practice.includes(`data-start="${start}" data-target="${target}"`));
    const result = checkProof(start, target, steps.map(([formula, rule]) => ({ formula, rule })));
    assert.ok(result.valid && result.complete, JSON.stringify(result));
  }
});

test("knight puzzles have respectively one, two and no consistent possibilities", () => {
  const models = said => assignments(["A", "B"]).filter(e =>
    evaluate(said[0], e) === e.A && evaluate(said[1], e) === e.B
  ).map(e => [e.A, e.B]);
  assert.deepEqual(models(["!B", "A | B"]), [[false, true]]);
  assert.deepEqual(models(["B", "A"]), [[true, true], [false, false]]);
  assert.deepEqual(models(["!B", "A"]), []);
});

test("quantifier answers respect domains, order and negation", () => {
  const d = [0, 1, 2, 3];
  assert.deepEqual([d.every(x => x >= 0), d.some(x => x*x === 4), d.every(x => x < 3), d.some(x => x > 3)], [true, true, false, false]);
  const numbers = [1, 2, 3];
  assert.ok(numbers.every(x => numbers.some(y => x + y === 4)));
  assert.equal(numbers.some(y => numbers.every(x => x + y === 4)), false);
  assert.ok(numbers.every(x => x <= 3));
  assert.equal(numbers.every(x => x <= 2), false);
  const menu = [[true, false], [false, true], [true, true]];
  assert.ok(menu.every(row => row.some(Boolean)));
  assert.equal([0, 1].some(y => menu.every(row => row[y])), false);
  const books = [[true, false], [false, true]];
  assert.ok([0, 1].every(y => books.some(row => !row[y])));
  assert.equal(books.some(row => row.every(read => !read)), false);
});

test("quantifiers name their worlds; the only omitted domain is an explicitly explained abbreviation",()=>{
  const body=qmd.replace(/::: \{\.thmrem title="לפעמים מקצרים את הכתיבה"\}[\s\S]*?\n:::/,'');
  assert.doesNotMatch(body,/\\(?:forall|exists) [xy](?!\\in)/);
  assert.ok(qmd.includes('D=\\{1,2,3,4\\}'));
  assert.ok(qmd.includes('על קבוצות ועל שייכות נלמד בהרחבה בהמשך הקורס'));
  for(const items of Object.values(PRACTICE_CHOICES))for(const item of items)for(const option of item.options) {
    assert.doesNotMatch(option.text,/[∀∃][xy](?!∈)/);
  }
});
