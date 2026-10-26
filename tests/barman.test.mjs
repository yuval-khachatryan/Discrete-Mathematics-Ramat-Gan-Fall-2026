// node --test tests/   — checks the barman game's rules and level data.
//
// The rules in games/barman/rules.js are short case analyses. Here they are
// checked against an INDEPENDENT possible-worlds model that knows nothing about
// those cases:
//   * person i answers "yes" if the question is true in every world they
//     cannot rule out (same own wish, same earlier answers), "no" if it is
//     false in every such world, and "dunno" otherwise;
//   * the barman knows person i's wish iff every world that produces the
//     observed answers agrees on that wish.
import test from "node:test";
import assert from "node:assert/strict";
import {
  PEOPLE, QUESTION, answers, knowledge, explainAnswers, explainKnowledge, reason, RULE_IDS,
  gendered, answerText, solutions, freePeople,
} from "../games/barman/rules.js";
import { LEVELS } from "../games/barman/levels.js";

const MODES = ["all", "any"];
const MAX_N = 5;

function worlds(n) {
  const out = [];
  for (let m = 0; m < 1 << n; m++) out.push(Array.from({ length: n }, (_, i) => ((m >> i) & 1) === 1));
  return out;
}
const holds = (w, mode) => (mode === "all" ? w.every(Boolean) : w.some(Boolean));
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/* What each person says in world w, from possible worlds alone. */
function modelAnswers(w, mode) {
  const n = w.length, all = worlds(n), memo = new Map();
  function say(v, i) {
    const key = v.join() + "|" + i;
    if (memo.has(key)) return memo.get(key);
    const cannotRuleOut = all.filter(u => u[i] === v[i] && [...Array(i).keys()].every(j => say(u, j) === say(v, j)));
    const truth = cannotRuleOut.map(u => holds(u, mode));
    const out = truth.every(Boolean) ? "yes" : truth.every(t => !t) ? "no" : "dunno";
    memo.set(key, out);
    return out;
  }
  return w.map((_, i) => say(w, i));
}

/* What the barman can deduce from the answers he heard. */
function modelKnowledge(heard, mode) {
  const consistent = worlds(heard.length).filter(w => same(modelAnswers(w, mode), heard));
  assert.ok(consistent.length > 0, "the observed answers must come from some world");
  return heard.map((_, i) => (consistent.every(w => w[i]) ? true : consistent.every(w => !w[i]) ? false : null));
}

test("answers() matches the possible-worlds model, every pattern up to n = 5, both modes", () => {
  let count = 0;
  for (const mode of MODES) {
    for (let n = 1; n <= MAX_N; n++) {
      for (const w of worlds(n)) {
        assert.deepEqual(answers(w, mode), modelAnswers(w, mode), `${mode} ${w.map(x => (x ? "T" : "F")).join("")}`);
        count++;
      }
    }
  }
  assert.equal(count, 2 * (2 + 4 + 8 + 16 + 32));
});

test("knowledge() matches the brute-force barman, every pattern up to n = 5, both modes", () => {
  for (const mode of MODES) {
    for (let n = 1; n <= MAX_N; n++) {
      for (const w of worlds(n)) {
        const heard = modelAnswers(w, mode);
        const tag = `${mode} ${w.map(x => (x ? "T" : "F")).join("")} → ${heard.join(",")}`;
        const k = knowledge(heard, mode);
        assert.deepEqual(k, modelKnowledge(heard, mode), tag);
        // and whatever the barman claims to know is actually true
        k.forEach((v, i) => { if (v !== null) assert.equal(v, w[i], tag); });
      }
    }
  }
});

test("answers are truthful, and the last person always knows", () => {
  for (const mode of MODES) {
    for (let n = 1; n <= MAX_N; n++) {
      for (const w of worlds(n)) {
        const a = answers(w, mode);
        a.forEach(x => {
          if (x === "yes") assert.ok(holds(w, mode));
          if (x === "no") assert.ok(!holds(w, mode));
        });
        assert.notEqual(a[n - 1], "dunno");
        assert.equal(a[n - 1], holds(w, mode) ? "yes" : "no");
      }
    }
  }
});

test("solutions() and freePeople() agree with brute force", () => {
  for (const mode of MODES) {
    for (let n = 1; n <= MAX_N; n++) {
      const targets = new Set(worlds(n).map(w => answers(w, mode).join()));
      for (const t of targets) {
        const target = t.split(",");
        const sols = worlds(n).filter(w => same(modelAnswers(w, mode), target));
        assert.equal(solutions(target, mode).length, sols.length, t);
        for (const s of solutions(target, mode)) assert.deepEqual(answers(s, mode), target);
        const free = target.map((_, i) => i).filter(i => sols.some(w => w[i]) && sols.some(w => !w[i]));
        assert.deepEqual(freePeople(target, mode), free, t);
        // a person is free exactly when the barman cannot know their wish
        assert.deepEqual(free, knowledge(target, mode).flatMap((k, i) => (k === null ? [i] : [])), t);
      }
    }
  }
});

test("every rule has a Hebrew reason, in both genders, and every rule is used", () => {
  const used = new Set();
  for (const mode of MODES) {
    for (let n = 1; n <= MAX_N; n++) {
      for (const w of worlds(n)) {
        const ea = explainAnswers(w, mode);
        const ek = explainKnowledge(ea.map(x => x.answer), mode);
        [...ea, ...ek].forEach(x => used.add(x.rule));
      }
    }
  }
  assert.deepEqual([...used].sort(), [...RULE_IDS].sort());
  for (const rule of RULE_IDS) {
    for (const p of PEOPLE) {
      const r = reason(rule, p);
      assert.ok(r.length > 20, rule);
      assert.ok(!/[{}|]/.test(r), `${rule}: leftover template in "${r}"`);
      assert.ok(/[֐-׿]/.test(r), rule);
    }
  }
  assert.equal(gendered("{הוא יודע|היא יודעת}", false), "הוא יודע");
  assert.equal(gendered("{הוא יודע|היא יודעת}", true), "היא יודעת");
  assert.equal(reason("all-want-not-last", PEOPLE[0]).startsWith("הוא רוצה פלאפל, אבל זה לא מספיק"), true);
  assert.equal(reason("all-want-not-last", PEOPLE[1]).startsWith("היא רוצה פלאפל, אבל זה לא מספיק"), true);
});

test("people, genders and answer words", () => {
  assert.deepEqual(PEOPLE.map(p => p.name), ["אוילר", "עדה", "גאוס", "אמי", "רמנוג׳ן"]);
  assert.deepEqual(PEOPLE.map(p => p.f), [false, true, false, true, false]);
  assert.equal(answerText("dunno", PEOPLE[0]), "לא יודע");
  assert.equal(answerText("dunno", PEOPLE[1]), "לא יודעת");
  assert.equal(answerText("yes", PEOPLE[1]), "כן");
  assert.equal(answerText("no", PEOPLE[2]), "לא");
  assert.equal(QUESTION.all, "כולם רוצים פלאפל?");
  assert.equal(QUESTION.any, "מישהו רוצה פלאפל?");
});

const strip = html => html.replace(/<[^>]*>/g, "");

test("levels: ids, shape and texts", () => {
  assert.deepEqual(LEVELS.map(l => l.id), ["classic", "no-early", "after-no", "anyone", "anyone-serve", "design"]);
  for (const l of LEVELS) {
    assert.ok(["serve", "predict", "design"].includes(l.kind), l.id);
    assert.ok(MODES.includes(l.mode), l.id);
    assert.ok(Number.isInteger(l.n) && l.n >= 1 && l.n <= PEOPLE.length, l.id);
    assert.ok(l.title && l.goal && l.debrief && l.win, l.id);
    assert.equal(l.hints.length, 3, l.id);
    l.hints.forEach(h => assert.ok(h.length > 10, l.id));
    assert.ok(l.debrief.includes(l.mode === "all" ? "∧" : "∨"), `${l.id}: debrief names the connective`);
    assert.ok(l.debrief.includes('class="m"'), `${l.id}: formulas are wrapped in .m`);
  }
  // anyone contrasts both connectives
  const anyone = LEVELS.find(l => l.id === "anyone");
  assert.ok(anyone.debrief.includes("∧") && anyone.debrief.includes("∨"));
});

test("levels: stored data matches the rules", () => {
  for (const l of LEVELS) {
    const people = PEOPLE.slice(0, l.n);
    const goal = strip(l.goal);
    if (l.kind === "design") {
      assert.equal(l.target.length, l.n, l.id);
      const sols = solutions(l.target, l.mode);
      assert.ok(sols.length > 0, `${l.id}: target must be reachable`);
      assert.deepEqual(sols, l.expect.solutions, l.id);
      assert.deepEqual(freePeople(l.target, l.mode), l.expect.free, l.id);
      // the goal text spells out the target conversation
      l.target.forEach((a, i) => assert.ok(goal.includes(`${people[i].name}: ״${answerText(a, people[i])}`), `${l.id}: ${people[i].name}`));
      continue;
    }
    assert.equal(l.wants.length, l.n, l.id);
    const a = answers(l.wants, l.mode);
    assert.deepEqual(a, l.expect.answers, l.id);
    assert.deepEqual(a, modelAnswers(l.wants, l.mode), l.id);
    if (l.kind === "serve") {
      assert.deepEqual(knowledge(a, l.mode), l.expect.knowledge, l.id);
      a.forEach((x, i) => assert.ok(goal.includes(`${people[i].name}: ״${answerText(x, people[i])}`), `${l.id}: ${people[i].name}`));
    } else {
      l.wants.forEach((w, i) => assert.ok(goal.includes(`${people[i].name} ${w ? "רוצה" : people[i].f ? "אינה רוצה" : "אינו רוצה"}`), `${l.id}: ${people[i].name}`));
    }
  }
});

test("levels: the cases the book quotes", () => {
  const get = id => LEVELS.find(l => l.id === id);
  const txt = l => answers(l.wants, l.mode).map((a, i) => answerText(a, PEOPLE[i])).join(", ");
  assert.equal(txt(get("classic")), "לא יודע, לא יודעת, כן");
  assert.equal(txt(get("no-early")), "לא יודע, לא, לא");
  assert.equal(txt(get("after-no")), "לא יודע, לא, לא, לא");
  assert.equal(txt(get("anyone")), "לא יודע, כן, כן");
  assert.equal(txt(get("anyone-serve")), "לא יודע, לא יודעת, לא יודע, לא");
  assert.deepEqual(knowledge(answers(get("after-no").wants, "all"), "all"), [true, false, null, null]);
  assert.deepEqual(knowledge(answers(get("anyone-serve").wants, "any"), "any"), [false, false, false, false]);
  const d = get("design");
  assert.equal(d.target.map((a, i) => answerText(a, PEOPLE[i])).join(", "), "לא יודע, לא יודעת, לא יודע, לא, לא");
});
