// node --test tests/   — "הבלש של הקפטריה" (deduction rules): every rule
// application checked against truth tables, both fallacies shown invalid,
// every level's proof length as advertised, and every judge answer.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluate, assignments, variables, parse } from "../games/shared/logic.js";
import { LEVELS } from "../games/detective/levels.js";
import * as D from "../games/detective/rules.js";

const byId = Object.fromEntries(LEVELS.map(l => [l.id, l]));

/* ---- an independent semantic check, straight from logic.js -------------- */
const formula = c => (c.kind === "fact" ? c.lit : `${c.from} -> ${c.to}`);
/** Does the conclusion hold in every row where all the premises hold? */
function entails(premises, conclusion) {
  const fs = premises.map(formula), g = formula(conclusion);
  const names = [...new Set([...fs, g].flatMap(f => variables(f)))];
  return assignments(names).every(env => !fs.every(f => evaluate(f, env)) || evaluate(g, env));
}
const isTautology = f => assignments(variables(f)).every(env => evaluate(f, env));

/* Every fact and implication over three letters: 6 facts + 36 implications. */
const LITS = ["A", "!A", "B", "!B", "C", "!C"];
const UNIVERSE = [...LITS.map(D.fact), ...LITS.flatMap(x => LITS.map(y => D.imp(x, y)))];

test("level ids are exactly the ones the book embeds, in order", () => {
  assert.deepEqual(LEVELS.map(l => l.id), ["mp", "mt", "hs", "judge", "chain", "culprit"]);
});

test("every level is well formed", () => {
  for (const l of LEVELS) {
    assert.ok(l.title && l.goal && l.debrief, l.id);
    assert.equal(l.hints.length, 3, l.id + ": three hints");
    assert.ok(l.mode === "derive" || l.mode === "judge", l.id + ": mode");
    const cards = l.mode === "derive" ? [...l.premises, l.target] : l.args.flatMap(a => [...a.premises, a.conclusion]);
    for (const v of D.letters(cards)) {
      assert.ok(l.atoms[v], `${l.id}: a sentence for ${v}`);
      assert.ok(!"XYZTF".includes(v), `${l.id}: ${v} is reserved`);
      assert.notEqual(l.atoms[v].pos, l.atoms[v].neg, `${l.id}: ${v} has two different sentences`);
    }
    if (l.mode === "derive") {
      assert.ok(l.guard && l.guardWin && l.suspect, l.id + ": scene");
      assert.ok(!l.premises.some(c => D.same(c, l.target)), l.id + ": the target is not already on the table");
      const keys = l.premises.map(D.key);
      assert.equal(new Set(keys).size, keys.length, l.id + ": no duplicate cards");
    }
  }
});

test("the three rules are tautologies and the two fallacies are not (logic.js)", () => {
  for (const r of Object.values(D.RULES)) assert.ok(isTautology(r.taut), r.name);
  for (const f of Object.values(D.FALLACIES)) assert.ok(!isTautology(f.taut), f.name);
  // the debriefs quote these: the fallacies fail exactly in the row X = F, Y = T
  for (const f of Object.values(D.FALLACIES)) assert.equal(evaluate(f.taut, { X: false, Y: true }), false);
});

test("every successful apply() is valid by truth table, in either order; every failure explains", () => {
  let ok = 0, bad = 0;
  for (const a of UNIVERSE) for (const b of UNIVERSE) {
    if (D.same(a, b)) continue;
    for (const rule of D.RULE_IDS) {
      const r1 = D.apply(rule, a, b), r2 = D.apply(rule, b, a);
      assert.equal(r1.ok, r2.ok, `${rule} ${D.key(a)} ${D.key(b)}: order must not matter`);
      if (r1.ok) {
        assert.ok(D.same(r1.card, r2.card), `${rule}: same card either way`);
        assert.ok(entails([a, b], r1.card), `${rule}: ${D.key(a)}, ${D.key(b)} ⊨ ${D.key(r1.card)}`);
        ok++;
      } else {
        // the pattern: the rule's need, what was picked, what to try
        assert.match(r1.reason, /^כלל (הניתוק|השלילה|השרשרת) צריך/, `${rule}: starts with what the rule needs`);
        assert.match(r1.reason, /בחרתם|בגרירות שבחרתם|לשתי הגרירות|כאן כל גרירה|המסקנה של גרירה/, `${rule}: says what was picked`);
        assert.match(r1.reason, /נסו|חפשו|החליפו|בחרו/, `${rule}: says what to try: ${r1.reason}`);
        bad++;
      }
    }
  }
  assert.ok(ok > 100 && bad > 1000, `exercised both branches (${ok} ok, ${bad} refused)`);
});

test("apply() finds exactly the three textbook shapes", () => {
  for (const x of LITS) for (const y of LITS) {
    const g = D.imp(x, y);
    assert.ok(D.same(D.apply("mp", g, D.fact(x)).card, D.fact(y)), "mp");
    assert.ok(D.same(D.apply("mt", g, D.fact(D.neg(y))).card, D.fact(D.neg(x))), "mt");
    for (const z of LITS) {
      if (z === x) continue;            // X → Y, Y → X closes a circle: refused on purpose
      assert.ok(D.same(D.apply("hs", g, D.imp(y, z)).card, D.imp(x, z)), "hs");
    }
  }
  assert.equal(D.neg(D.neg("A")), "A");
});

test("both fallacies are invalid by truth table, and classify() names them", () => {
  let n = 0;
  for (const x of ["A", "!A"]) for (const y of ["B", "!B"]) {
    const g = D.imp(x, y);
    const affirm = [[g, D.fact(y)], D.fact(x)];
    const deny = [[g, D.fact(D.neg(x))], D.fact(D.neg(y))];
    assert.equal(D.classify(...affirm), "affirm");
    assert.equal(D.classify(...deny), "deny");
    for (const [ps, c] of [affirm, deny]) {
      assert.ok(!entails(ps, c), "a fallacy is invalid");
      assert.ok(!D.valid(ps, c), "rules.js agrees");
      const env = D.counterexample(ps, c);
      assert.ok(ps.every(p => evaluate(formula(p), env)) && !evaluate(formula(c), env), "a real counter-row");
      n++;
    }
  }
  assert.equal(n, 8);
  // and over the whole universe: classify() and the truth tables never disagree
  for (const a of UNIVERSE) for (const b of UNIVERSE) for (const c of UNIVERSE) {
    const k = D.classify([a, b], c);
    if (k === "mp" || k === "mt" || k === "hs") assert.ok(entails([a, b], c), `${k} must be valid`);
    if ((k === "affirm" || k === "deny") && !D.same(a, c) && !D.same(b, c)) assert.ok(!entails([a, b], c), `${k} must be invalid`);
  }
});

test("every derive level: the target is provable in exactly the advertised number of steps", () => {
  for (const l of LEVELS.filter(x => x.mode === "derive")) {
    const proof = D.shortestProof(l.premises, l.target, l.steps + 2);
    assert.ok(proof, l.id + ": provable");
    assert.equal(proof.length, l.steps, l.id + ": shortest proof length");
    // the target really follows from the premises (semantics, not just the rules)
    assert.ok(entails(l.premises, l.target), l.id + ": the premises entail the target");
    // the premises are consistent: some row makes every card true
    const names = D.letters(l.premises);
    assert.ok(assignments(names).some(env => l.premises.every(c => evaluate(formula(c), env))), l.id + ": consistent story");
  }
});

test("every derive level: the solution that 'פתרון' shows is valid and as short as possible", () => {
  for (const l of LEVELS.filter(x => x.mode === "derive")) {
    const table = [...l.premises];
    assert.equal(l.solution.length, l.steps, l.id + ": solution length");
    for (const [rule, a, b] of l.solution) {
      const x = table[a - 1], y = table[b - 1];
      assert.ok(x && y && a !== b, `${l.id}: cards ${a}, ${b} exist`);
      const r = D.apply(rule, x, y, l.atoms);
      assert.ok(r.ok, `${l.id}: ${rule} on ${a}, ${b}: ${r.reason || ""}`);
      assert.ok(entails([x, y], r.card), `${l.id}: step is valid by truth table`);
      assert.ok(!table.some(c => D.same(c, r.card)), `${l.id}: each step adds a new card`);
      table.push(r.card);
    }
    assert.ok(D.same(table[table.length - 1], l.target), l.id + ": ends with the target");
  }
});

test("every card derivable on a level's table is valid, and reasons quote the story", () => {
  for (const l of LEVELS.filter(x => x.mode === "derive")) {
    for (const c of D.closure(l.premises)) assert.ok(entails(l.premises, c), `${l.id}: ${D.key(c)}`);
    // a wrong rule on the first two cards gives a reason in the level's own words
    const [a, b] = l.premises;
    for (const rule of D.RULE_IDS) {
      const r = D.apply(rule, a, b, l.atoms);
      if (!r.ok) {
        assert.doesNotMatch(r.reason, /undefined|class="m"/, `${l.id}/${rule}: story words, not formulas`);
        if (a.kind !== b.kind) assert.match(r.reason, /״/, `${l.id}/${rule}: quotes a sentence`);
      }
    }
  }
});

test("the culprit is the pigeon, and the fallacy trap is on the table", () => {
  const l = byId.culprit;
  assert.match(D.cardText(l.atoms, l.target), /^היונה אכלה/);
  const trap = D.apply("mp", D.card("P -> M"), D.card("M"), l.atoms);
  assert.equal(trap.ok, false);
  assert.match(trap.reason, /כשל אישור המסקנה/);
});

test("judge: four arguments, one of each kind, every stored answer matches classify()", () => {
  const l = byId.judge;
  assert.deepEqual(l.args.map(a => a.answer).sort(), ["affirm", "deny", "mp", "mt"]);
  for (const a of l.args) {
    assert.equal(D.classify(a.premises, a.conclusion), a.answer, a.robot);
    assert.equal(entails(a.premises, a.conclusion), D.isRule(a.answer), "valid exactly when it is a rule");
    if (!D.isRule(a.answer)) {
      assert.ok(a.counter, "a fallacy has a story for its counter-situation");
      assert.match(D.counterHTML(a, l.atoms), /דוגמה נגדית/);
    }
    for (const choice of ["mp", "mt", "hs", "affirm", "deny"]) {
      const r = D.explainChoice(a, choice, l.atoms);
      assert.equal(r.correct, choice === a.answer, `${a.answer} vs ${choice}`);
      assert.ok(r.html.length > 40 && r.why, "an explanation");
      assert.doesNotMatch(r.html, /undefined/);
      if (!r.correct && D.isRule(choice) && !D.isRule(a.answer)) assert.match(r.html, /דוגמה נגדית/, "wrong 'valid' shows the counter-situation");
    }
  }
});

test("card words: facts are the sentence, implications are ״אם …, אז …״", () => {
  const atoms = byId.mp.atoms;
  assert.equal(D.cardText(atoms, D.card("B")), "הרובוט היה בביתן");
  assert.equal(D.cardText(atoms, D.card("B -> C")), "אם הרובוט היה בביתן, אז יש על הרובוט פירורים");
  assert.equal(D.cardText(atoms, D.card("!C")), "אין על הרובוט פירורים");
  assert.equal(D.cardFormula(D.card("!W -> !N")), "¬W → ¬N");
  for (const s of ["X", "A -> B -> C", "!T", "a"]) assert.throws(() => D.card(s), SyntaxError);
  parse(D.cardLogic(D.card("!W -> !N")));
});

test("no emoji and nothing alcoholic in the game's sources", () => {
  for (const f of ["game.js", "levels.js", "rules.js", "art.js", "index.html", "game.css"]) {
    const src = readFileSync(new URL(`../games/detective/${f}`, import.meta.url), "utf8");
    // ✓ ✗ are text marks (the shell uses them too); anything else pictographic is an emoji
    const emoji = src.replace(/[✓✗]/g, "").match(/\p{Extended_Pictographic}/u);
    assert.equal(emoji, null, `${f}: emoji ${emoji && emoji[0]}`);
    assert.doesNotMatch(src, /beer|בירה|אלכוהול|יין אדום|וודקה/i, `${f}: no alcohol`);
  }
});
