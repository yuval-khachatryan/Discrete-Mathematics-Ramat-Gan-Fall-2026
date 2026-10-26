// node --test tests/   — "מי עובר בשער?" (knights and knaves): every level's
// advertised answer, checked by brute force over all 2^n assignments.
import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, assignments, parse, variables } from "../games/shared/logic.js";
import { LEVELS } from "../games/gate/levels.js";
import {
  solutions, firstConflict, consistent, answerFor, judgeAnswer,
  evaluationText, evaluationHTML, conflictSentence, rowWords, show,
} from "../games/gate/knights.js";

const byId = Object.fromEntries(LEVELS.map(l => [l.id, l]));
const T = true, F = false;

// What the book advertises, written independently of the solver:
// a unique solution, or the number of consistent assignments.
const ADVERTISED = {
  "both-knights": { unique: { A: F, B: T } },
  "both-knaves": { unique: { A: F, B: T } },
  "or-knave": { unique: { A: T, B: T } },
  "at-least-one": { unique: { A: T, B: F } },
  "three": { unique: { A: F, B: T, C: F } },
  "impossible": { count: 0 },
  "ambiguous": { count: 2 },
  "if-knight": { unique: { A: T, B: T } },
  "if-batya": { unique: { A: T, B: F } },
  "exactly-one": { unique: { A: F, B: T, C: F } },
};

// The plain definition, without the engine: knights' statements are true,
// knaves' are false.
function bruteForce(level) {
  const names = level.people.map(p => p.id);
  return assignments(names).filter(env =>
    level.statements.every(s => evaluate(s.formula, env) === env[s.by]));
}

test("level ids are exactly the ones the book embeds, in order", () => {
  assert.deepEqual(LEVELS.map(l => l.id), Object.keys(ADVERTISED));
});

test("every level is well formed", () => {
  for (const l of LEVELS) {
    assert.ok(l.title && l.goal && l.debrief, l.id);
    assert.equal(l.hints.length, 3, l.id + ": three hints");
    const ids = l.people.map(p => p.id);
    assert.equal(new Set(ids).size, ids.length, l.id + ": distinct people");
    for (const p of l.people) {
      assert.ok(p.name && (p.g === "m" || p.g === "f"), l.id + ": person " + p.id);
      assert.match(p.id, /^[A-Z]$/);
    }
    for (const s of l.statements) {
      assert.ok(ids.includes(s.by), `${l.id}: speaker ${s.by}`);
      assert.ok(s.text, `${l.id}: statement text`);
      parse(s.formula);
      for (const v of variables(s.formula)) assert.ok(ids.includes(v), `${l.id}: variable ${v} is a person`);
    }
    if (l.answers !== undefined) assert.equal(l.answers, "all");
  }
});

test("every advertised solution count and unique solution holds (brute force)", () => {
  for (const [id, want] of Object.entries(ADVERTISED)) {
    const level = byId[id];
    const brute = bruteForce(level);
    assert.deepEqual(solutions(level), brute, id + ": engine agrees with the definition");
    if (want.unique) {
      assert.equal(brute.length, 1, id + ": exactly one solution");
      assert.deepEqual(brute[0], want.unique, id + ": the advertised solution");
      assert.equal(level.answers, undefined, id + ": unique levels need no extra buttons");
    } else {
      assert.equal(brute.length, want.count, id + ": number of solutions");
      assert.equal(level.answers, "all", id + ": a 0 / ≥2 level must offer the extra buttons");
    }
  }
});

test("the extra answer buttons are right exactly when the count says so", () => {
  const imp = byId["impossible"], amb = byId["ambiguous"];
  assert.equal(answerFor(imp), "none");
  assert.equal(answerFor(amb), "many");
  assert.equal(judgeAnswer(imp, "none").correct, true);
  assert.equal(judgeAnswer(imp, "many").correct, false);
  assert.equal(judgeAnswer(amb, "many").correct, true);
  assert.equal(judgeAnswer(amb, "none").correct, false);
  for (const l of LEVELS.filter(l => l.answers === "all")) {
    const n = bruteForce(l).length;
    assert.equal(judgeAnswer(l, "none").correct, n === 0, l.id);
    assert.equal(judgeAnswer(l, "many").correct, n >= 2, l.id);
  }
  for (const l of LEVELS.filter(l => !l.answers)) assert.equal(answerFor(l), "one", l.id);
});

test("firstConflict names the first broken statement and its value", () => {
  const l1 = byId["both-knights"];
  // Both knights: Alon's "we are both knights" is true, Batya's "Alon is a knave" is false.
  let c = firstConflict(l1, { A: T, B: T });
  assert.equal(c.statement.by, "B");
  assert.equal(c.value, false);
  assert.equal(c.knight, true);
  // Alon knight, Batya knave: Alon's statement is false.
  c = firstConflict(l1, { A: T, B: F });
  assert.equal(c.statement.by, "A");
  assert.equal(c.value, false);
  // Both knaves: Alon's statement is false (fine), Batya's "Alon is a knave" is true.
  c = firstConflict(l1, { A: F, B: F });
  assert.equal(c.statement.by, "B");
  assert.equal(c.value, true);
  assert.equal(c.knight, false);
  assert.equal(firstConflict(l1, { A: F, B: T }), null);

  const l5 = byId["three"];
  c = firstConflict(l5, { A: T, B: F, C: T });
  assert.equal(c.statement.by, "A");      // "B and C are both knaves" is false
  assert.equal(c.value, false);
  c = firstConflict(l5, { A: F, B: T, C: T });
  assert.equal(c.statement.by, "C");      // "Alon is a knight" is false, Carmel a knight
  assert.equal(c.value, false);

  const l6 = byId["impossible"];
  assert.equal(firstConflict(l6, { A: T }).value, false);
  assert.equal(firstConflict(l6, { A: F }).value, true);

  // A silent person never conflicts: in "both-knaves" Batya says nothing.
  assert.equal(consistent(byId["both-knaves"], { A: F, B: T }), true);
});

test("the guard's sentences use the right gender and verdict", () => {
  const l1 = byId["both-knights"];
  assert.equal(conflictSentence(l1, { A: T, B: F }),
    "סימנתם את אלון כאביר, אבל אז הטענה שלו ״שנינו אבירים״ שקרית — ואביר אף פעם לא משקר.");
  assert.equal(conflictSentence(l1, { A: T, B: T }),
    "סימנתם את בתיה כאבירה, אבל אז הטענה שלה ״אלון נוכל״ שקרית — ואבירה אף פעם לא משקרת.");
  assert.equal(conflictSentence(l1, { A: F, B: F }),
    "סימנתם את בתיה כנוכלת, אבל אז הטענה שלה ״אלון נוכל״ אמיתית — ונוכלת אף פעם לא אומרת אמת.");
  assert.equal(conflictSentence(byId["or-knave"], { A: F, B: T }),
    "סימנתם את אלון כנוכל, אבל אז הטענה שלו ״אני נוכל, או שבתיה אבירה״ אמיתית — ונוכל אף פעם לא אומר אמת.");
  assert.equal(conflictSentence(l1, { A: F, B: T }), null);
  assert.equal(rowWords(l1, { A: F, B: T }), "אלון — נוכל, בתיה — אבירה");
});

test("the evaluation line substitutes, then reduces step by step", () => {
  const knaves = byId["both-knaves"].statements[0];
  assert.equal(evaluationText(knaves, { A: F, B: T }), "״שנינו נוכלים״ = ¬A ∧ ¬B = ¬F ∧ ¬T = T ∧ F = F");
  assert.equal(evaluationText(byId["ambiguous"].statements[0], { A: F }), "״אני אביר״ = A = F");
  assert.equal(evaluationText(byId["impossible"].statements[0], { A: T }), "״אני נוכל״ = ¬A = ¬T = F");
  const one = byId["exactly-one"].statements[1];
  assert.equal(show(one.formula), "(A ∧ ¬B ∧ ¬C) ∨ (¬A ∧ B ∧ ¬C) ∨ (¬A ∧ ¬B ∧ C)");
  assert.equal(evaluationText(one, { A: F, B: T, C: F }).split(" = ").pop(), "T");
  const html = evaluationHTML(knaves, { A: F, B: T });
  assert.match(html, /<span class="tv-T">T<\/span> ∧ <span class="tv-F">F<\/span>/);
  assert.match(html, /dir="ltr"/);
});
