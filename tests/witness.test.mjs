// node --test tests/   — "מצאו עד" (quantifiers): every claim's truth value by
// brute force over the level's data, the kind of evidence each level needs,
// that a witness / counterexample exists exactly when the level says, the
// order-of-quantifiers level, and the negation options checked over every
// possible world. The brute force here is written independently of rules.js.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LEVELS } from "../games/witness/levels.js";
import * as R from "../games/witness/rules.js";
import { SPRITES } from "../games/shared/sprites.js";
import { ART_NAMES } from "../games/witness/art.js";

const byId = Object.fromEntries(LEVELS.map(l => [l.id, l]));
const IDS = ["witness", "counter", "check-all", "nobody", "negation", "order"];

/* ---- an independent evaluator: plain loops over the raw data ------------ */
function bfPred(level, name) {
  const d = level.preds[name];
  return x => x[d.attr] === d.is;
}
function bf(level, claim, P) {
  const D = level.domain;
  if (claim.type === "not") return !bf(level, claim.of, P);
  if (claim.type === "forall" || claim.type === "exists") {
    const p = P || bfPred(level, claim.pred);
    let some = false, every = true;
    for (const x of D) {
      const v = claim.neg ? !p(x) : p(x);
      some = some || v;
      every = every && v;
    }
    return claim.type === "forall" ? every : some;
  }
  const likes = (x, y) => x[level.rels[claim.rel].attr].indexOf(y.id) >= 0;
  if (claim.type === "forall-exists") {
    for (const x of D) { let found = false; for (const y of level.ys) if (likes(x, y)) found = true; if (!found) return false; }
    return true;
  }
  if (claim.type === "exists-forall") {
    for (const y of level.ys) { let all = true; for (const x of D) if (!likes(x, y)) all = false; if (all) return true; }
    return false;
  }
  throw new Error(claim.type);
}
/** The rule of the game, written out once more. */
function kindByRule(type, value) {
  if (type === "forall") return value ? "all" : "counterexample";
  if (type === "exists") return value ? "witness" : "all";
  if (type === "forall-exists") return value ? "witness-per-x" : "counterexample";
  if (type === "exists-forall") return value ? "witness" : "counterexample-per-y";
}
function* subsets(list) {
  for (let mask = 0; mask < 1 << list.length; mask++) yield list.filter((_, i) => (mask >> i) & 1);
}

/** HTML with every <span class="m">…</span> (nested spans included) removed. */
function outsideFormulas(html) {
  let out = "", i = 0;
  while (i < html.length) {
    const j = html.indexOf('<span class="m', i);
    if (j < 0) { out += html.slice(i); break; }
    out += html.slice(i, j);
    let depth = 0, k = j;
    const re = /<span\b|<\/span>/g;
    re.lastIndex = j;
    let mt;
    while ((mt = re.exec(html))) {
      depth += mt[0] === "</span>" ? -1 : 1;
      if (depth === 0) { k = re.lastIndex; break; }
    }
    i = k;
  }
  return out;
}
const LOGIC = /[∀∃¬∧∨≡]/;
function formulasInsideM(html, where) {
  assert.doesNotMatch(outsideFormulas(html), LOGIC, `${where}: a logic symbol outside <span class="m">: ${html}`);
}

/* ---- structure ----------------------------------------------------------- */

test("level ids are exactly the ones the book embeds, in order", () => {
  assert.deepEqual(LEVELS.map(l => l.id), IDS);
});

test("every level is well formed", () => {
  for (const l of LEVELS) {
    assert.ok(l.title && l.goal && l.debrief && l.say && l.aside && l.asideWin, l.id);
    assert.equal(l.hints.length, 3, l.id + ": three hints");
    assert.match(l.goal, /התחום/, l.id + ": the goal states the domain");
    assert.ok(["evidence", "negation", "order"].includes(l.mode), l.id);
    assert.equal(l.domain.length, 6, l.id + ": six students");
    const ids = l.domain.map(x => x.id);
    assert.equal(new Set(ids).size, ids.length, l.id + ": distinct students");
    for (const x of l.domain) {
      assert.ok(x.name, l.id);
      assert.ok(x.g === "m" || x.g === "f", `${l.id}: ${x.id} has a gender`);
      assert.ok(SPRITES[x.avatar], `${l.id}: ${x.id} has a sprite`);
    }
    if (l.sayIcon) assert.ok(ART_NAMES.includes(l.sayIcon), l.id);
    if (l.ys) for (const y of l.ys) assert.ok(ART_NAMES.includes(y.art), `${l.id}: art for ${y.id}`);
  }
});

test("every formula in the texts sits inside one <span class=\"m\">", () => {
  for (const l of LEVELS) {
    for (const [k, html] of [["goal", l.goal], ["debrief", l.debrief], ["say", l.say], ...l.hints.map((h, i) => ["hint " + (i + 1), h])])
      formulasInsideM(html, `${l.id} ${k}`);
  }
});

test("no emoji anywhere in the game (drawn graphics only)", () => {
  const files = ["game.js", "levels.js", "rules.js", "art.js", "game.css", "index.html"];
  for (const f of files) {
    const text = readFileSync(new URL(`../games/witness/${f}`, import.meta.url), "utf8");
    const hit = text.match(/[\p{Extended_Pictographic}️]/u);
    assert.equal(hit, null, `${f}: emoji ${hit && hit[0]}`);
  }
});

test("no alcohol in the stories, hints or pictures", () => {
  const files = ["game.js", "levels.js", "art.js", "index.html"];
  for (const f of files) {
    const text = readFileSync(new URL(`../games/witness/${f}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /בירה|בירות|אלכוהול|(^|[\s״"(])יין([\s.,!?״"]|$)|\bbeer|\bwine|\balcohol|\bbarman/i, f);
  }
});

/* ---- levels 1–4 --------------------------------------------------------- */

const evidenceLevels = LEVELS.filter(l => l.mode === "evidence");

test("each claim's truth value (brute force) is what the level advertises", () => {
  for (const l of evidenceLevels) {
    assert.equal(bf(l, l.claim), l.expect.value, l.id);
    assert.equal(R.evaluate(l.claim, l), l.expect.value, l.id + " (engine)");
  }
  // and spelled out once by hand, from the data
  const D = id => byId[id].domain;
  assert.equal(D("witness").some(x => x.hw), true);
  assert.equal(D("counter").every(x => x.hw), false);
  assert.equal(D("check-all").every(x => x.locker), true);
  assert.equal(D("nobody").some(x => x.pizza === "pineapple"), false);
});

test("each level needs the kind of evidence it says", () => {
  assert.deepEqual(evidenceLevels.map(l => R.evidenceKind(l, l.claim)), ["witness", "counterexample", "all", "all"]);
  for (const l of evidenceLevels) {
    assert.equal(R.evidenceKind(l, l.claim), l.expect.evidence, l.id);
    assert.equal(kindByRule(l.claim.type, bf(l, l.claim)), l.expect.evidence, l.id + " (rule)");
  }
});

test("a single witness / counterexample exists exactly when the level says", () => {
  for (const l of evidenceLevels) {
    const p = bfPred(l, l.claim.pred);
    const singles = l.claim.type === "exists" ? l.domain.filter(p) : l.domain.filter(x => !p(x));
    const oneIsEnough = l.expect.evidence === "witness" || l.expect.evidence === "counterexample";
    assert.equal(singles.length > 0, oneIsEnough, l.id);
    assert.deepEqual(R.decisive(l, l.claim).map(x => x.id), singles.map(x => x.id), l.id + " (engine)");
    if (l.example) assert.ok(singles.some(x => x.id === l.example), `${l.id}: the hints name ${l.example}`);
  }
});

test("levels 1–4: every set of checked cards × verdict is judged by the rule", () => {
  for (const l of evidenceLevels) {
    const p = bfPred(l, l.claim.pred), value = bf(l, l.claim);
    for (const S of subsets(l.domain)) {
      const ids = S.map(x => x.id);
      for (const verdict of [true, false]) {
        const r = R.judgeEvidence(l, ids, verdict);
        let should;
        if (l.claim.type === "forall")
          should = verdict === false ? S.some(x => !p(x)) : S.length === l.domain.length && value;
        else
          should = verdict === true ? S.some(p) : S.length === l.domain.length && !value;
        assert.equal(r.ok, should, `${l.id}: [${ids}] verdict ${verdict}: ${r.code}`);
        assert.ok(r.message, l.id);
        if (!r.ok) assert.ok(r.kind === "bad" || r.kind === "info", `${l.id}: kind ${r.kind}`);
        formulasInsideM(r.message, `${l.id} [${ids}] ${verdict}`);
      }
      assert.equal(R.judgeEvidence(l, ids, null).ok, false);
    }
    assert.equal(R.judgeEvidence(l, [], true).kind, "info", l.id + ": nothing checked is not wrong, just not started");
    assert.equal(R.judgeEvidence(l, [l.domain[0].id], null).kind, "info", l.id + ": no verdict yet");
    const s = R.evidenceSolution(l);
    assert.equal(R.judgeEvidence(l, s.marked, s.verdict).ok, true, l.id + ": the solution");
  }
});

test("witness: a wrong pick is rejected with what, why and what to try", () => {
  const l = byId.witness;
  const r = R.judgeEvidence(l, ["alon"], true);
  assert.equal(r.ok, false);
  assert.equal(r.code, "not-witness");
  assert.equal(r.kind, "bad");
  assert.match(r.message, /אלון לא הגיש את העבודה/);
  assert.match(r.message, /בדקו כרטיס אחר/);
  const ok = R.judgeEvidence(l, ["batya"], true);
  assert.equal(ok.ok, true);
  assert.match(ok.message, /בתיה הגישה את העבודה/);   // her gender
  assert.match(ok.message, /היא <b>עדה<\/b>/);
  assert.deepEqual(ok.good, ["batya"]);
});

test("counter: picking someone who did submit is not a counterexample", () => {
  const l = byId.counter;
  assert.equal(R.judgeEvidence(l, ["alon"], false).code, "not-counter");
  const ok = R.judgeEvidence(l, ["carmel"], false);
  assert.equal(ok.ok, true);
  assert.match(ok.message, /דוגמה נגדית/);
  assert.equal(R.judgeEvidence(l, ["carmel"], true).code, "own-counter");
});

test("check-all: one example does not prove ׳לכל׳", () => {
  const l = byId["check-all"];
  for (const x of l.domain) {
    const r = R.judgeEvidence(l, [x.id], true);
    assert.equal(r.ok, false);
    assert.equal(r.code, "one-example");
    assert.match(r.message, /דוגמה אחת לא מוכיחה ׳לכל׳/);
  }
  assert.match(R.judgeEvidence(l, ["alon"], true).message, /ההוכחה של הרובוט/);
  const five = l.domain.slice(0, 5).map(x => x.id);
  assert.equal(R.judgeEvidence(l, five, true).kind, "info", "on the way, not wrong");
  assert.match(R.judgeEvidence(l, five, true).message, /רמי/, "names who is left");
  assert.equal(R.judgeEvidence(l, l.domain.map(x => x.id), true).ok, true);
  assert.equal(R.judgeEvidence(l, l.domain.map(x => x.id), false).code, "all-fit");
});

test("nobody: one card without pineapple does not refute ׳יש׳; all six do", () => {
  const l = byId.nobody;
  const r = R.judgeEvidence(l, ["batya"], false);
  assert.equal(r.code, "one-example");
  assert.match(r.message, /בתיה לא אוכלת פיצה עם אננס/);
  assert.equal(R.judgeEvidence(l, l.domain.map(x => x.id), false).ok, true);
  assert.equal(R.judgeEvidence(l, l.domain.map(x => x.id), true).code, "none-fit");
});

/* ---- level 5: negation -------------------------------------------------- */

test("negation: exactly one option is ¬∀x∈D P(x), checked over all 2^6 worlds", () => {
  const l = byId.negation;
  const matching = [];
  l.options.forEach((o, i) => {
    let always = true;
    for (const S of subsets(l.domain)) {
      const P = x => S.includes(x);
      if (bf(l, o.claim, P) !== !bf(l, l.target, P)) always = false;
    }
    if (always) matching.push(i);
    assert.equal(R.isNegationOf(o.claim, l.target, l), always, `option ${i} (engine)`);
  });
  assert.deepEqual(matching, [l.expect.correct]);
  assert.equal(R.formula(l, l.options[l.expect.correct].claim), "∃x∈D ¬P(x)");
  assert.equal(R.formula(l, l.target), "∀x∈D P(x)");
  const robot = l.options.findIndex(o => o.robot);
  assert.equal(robot, l.expect.robotOption);
  assert.equal(R.formula(l, l.options[robot].claim), "∀x∈D ¬P(x)");
  assert.deepEqual(l.options[robot].claim, l.claim, "the robot's option is the robot's reading");
  for (const [i, o] of l.options.entries()) if (i !== l.expect.correct) assert.ok(o.why, `option ${i} explains itself`);
  // generalised De Morgan, both ways
  assert.ok(R.equivalent({ type: "not", of: { type: "forall", pred: "submitted" } }, { type: "exists", pred: "submitted", neg: true }, l));
  assert.ok(R.equivalent({ type: "not", of: { type: "exists", pred: "submitted" } }, { type: "forall", pred: "submitted", neg: true }, l));
});

test("negation: in this class ׳לא כולם׳ is true, the robot's reading is false, and someone refutes it", () => {
  const l = byId.negation;
  assert.equal(bf(l, { type: "not", of: l.target }), l.expect.messageValue);
  assert.equal(bf(l, l.claim), l.expect.robotValue);
  assert.equal(R.evidenceKind(l, l.claim), l.expect.robotEvidence);
  const submitters = l.domain.filter(x => x.hw);
  assert.ok(submitters.length > 0);
  assert.deepEqual(R.decisive(l, l.claim).map(x => x.id), submitters.map(x => x.id));
  assert.ok(submitters.some(x => x.id === l.example), "the hints name a submitter");
});

test("negation: the judge", () => {
  const l = byId.negation, ok = l.expect.correct;
  assert.equal(R.judgeNegation(l, null, []).kind, "info");
  for (const i of l.options.keys()) if (i !== ok) {
    const r = R.judgeNegation(l, i, ["alon"]);
    assert.equal(r.ok, false); assert.equal(r.code, "wrong-option"); assert.equal(r.kind, "bad");
    formulasInsideM(r.message, `option ${i}`);
  }
  assert.equal(R.judgeNegation(l, ok, []).kind, "info");
  for (const x of l.domain) {
    const r = R.judgeNegation(l, ok, [x.id]);
    assert.equal(r.ok, x.hw, x.id);
    if (!x.hw) assert.equal(r.code, "not-counter");
    formulasInsideM(r.message, x.id);
  }
  const s = R.negationSolution(l);
  assert.equal(R.judgeNegation(l, s.option, s.marked).ok, true);
});

/* ---- level 6: order of quantifiers --------------------------------------- */

test("order: ∀x∈D ∃y∈M is true and ∃y∈M ∀x∈D is false (brute force)", () => {
  const l = byId.order;
  assert.deepEqual(l.parts.map(p => bf(l, p.claim)), l.expect.values);
  assert.deepEqual(l.expect.values, [true, false]);
  assert.deepEqual(l.parts.map(p => R.evaluate(p.claim, l)), [true, false], "engine");
  assert.deepEqual(l.parts.map(p => R.evidenceKind(l, p.claim)), l.expect.evidence);
  assert.deepEqual(l.parts.map(p => kindByRule(p.claim.type, bf(l, p.claim))), l.expect.evidence);
  for (const x of l.domain) assert.ok(x.snacks.length > 0, `${x.id} likes something`);
  for (const y of l.ys) assert.ok(l.domain.some(x => !x.snacks.includes(y.id)), `someone doesn't like ${y.id}`);
  assert.deepEqual(l.parts.map(p => R.formula(l, p.claim)), ["∀x∈D ∃y∈M L(x, y)", "∃y∈M ∀x∈D L(x, y)"]);
});

test("order: the judge accepts the hinted picks and the solution, and explains mistakes", () => {
  const l = byId.order;
  for (const picks of [l.example, R.orderSolution(l)]) {
    assert.equal(R.judgeOrder(l, 0, picks[0]).ok, true);
    assert.equal(R.judgeOrder(l, 1, picks[1]).ok, true);
  }
  // the hinted picks are genuinely right, checked on the raw data
  for (const [x, y] of Object.entries(l.example[0])) assert.ok(l.domain.find(s => s.id === x).snacks.includes(y), `${x} likes ${y}`);
  for (const [y, x] of Object.entries(l.example[1])) assert.ok(!l.domain.find(s => s.id === x).snacks.includes(y), `${x} doesn't like ${y}`);

  assert.equal(R.judgeOrder(l, 0, {}).kind, "info");
  const wrong0 = R.judgeOrder(l, 0, { ...l.example[0], rami: "falafel" });
  assert.equal(wrong0.code, "not-liked");
  assert.match(wrong0.message, /רמי לא אוהב פלאפל/);
  assert.match(wrong0.message, /<bdi>רמי<\/bdi>, <bdi>פלאפל<\/bdi>/, "two Hebrew arguments are isolated");
  const wrong1 = R.judgeOrder(l, 1, { ...l.example[1], coffee: "alon" });
  assert.equal(wrong1.code, "likes-it");
  assert.match(wrong1.message, /אלון אוהב קפה/);
  const missing = R.judgeOrder(l, 1, { pizza: "batya" });
  assert.equal(missing.kind, "info");
  for (const r of [wrong0, wrong1, missing, R.judgeOrder(l, 0, l.example[0]), R.judgeOrder(l, 1, l.example[1])])
    formulasInsideM(r.message, "order");
  // every single pick in every row / column, against the raw data
  for (const x of l.domain) for (const y of l.ys) {
    assert.equal(R.judgeOrder(l, 0, { ...l.example[0], [x.id]: y.id }).ok, x.snacks.includes(y.id), `${x.id}→${y.id}`);
    assert.equal(R.judgeOrder(l, 1, { ...l.example[1], [y.id]: x.id }).ok, !x.snacks.includes(y.id), `${y.id}→${x.id}`);
  }
});
