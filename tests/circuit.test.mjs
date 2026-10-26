// Checks the circuit levels: each one is solvable exactly when it says so,
// predict levels show both lamp states, and every formula can be laid out.
import test from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../games/circuit/levels.js";
import { layout, explain, networks, isLiteral, defaultView } from "../games/circuit/circuit.js";
import { parse, evaluate, assignments, variables, compare } from "../games/shared/logic.js";

test("level ids are unique and every level has the shell fields", () => {
  const ids = LEVELS.map(l => l.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const l of LEVELS) {
    assert.ok(l.title && l.goal && l.debrief, l.id);
    assert.equal(l.hints.length, 3, l.id);
    assert.ok(["play", "predict", "explore", "fill", "compare"].includes(l.mode), l.id);
  }
});

test("every formula uses exactly the declared levers and lays out", () => {
  for (const l of LEVELS) {
    const used = new Set([...variables(l.formula), ...(l.formula2 ? variables(l.formula2) : [])]);
    assert.deepEqual([...used].sort(), Object.keys(l.vars).sort(), l.id);
    for (const f of [l.formula, l.formula2].filter(Boolean)) {
      const b = layout(f);
      assert.ok(Number.isFinite(b.w) && Number.isFinite(b.h) && b.w > 0, l.id);
    }
  }
});

test("play levels: start is not already solved; solvable unless marked impossible", () => {
  for (const l of LEVELS.filter(x => x.mode === "play")) {
    const target = l.target !== false;
    const start = Object.fromEntries(Object.keys(l.vars).map(n => [n, !!l.start[n]]));
    assert.notEqual(evaluate(l.formula, start), target, `${l.id} starts solved`);
    const free = Object.keys(l.vars).filter(n => !(l.locked && l.locked[n]));
    const ok = assignments(free).some(r => evaluate(l.formula, { ...start, ...r }) === target);
    assert.equal(ok, !l.impossible, l.id);
  }
});

test("predict levels contain both an 'on' and an 'off' round and cover distinct rows", () => {
  for (const l of LEVELS.filter(x => x.mode === "predict")) {
    const vals = l.rounds.map(r => evaluate(l.formula, r));
    assert.ok(vals.includes(true) && vals.includes(false), l.id);
    const keys = l.rounds.map(r => JSON.stringify(r));
    assert.equal(new Set(keys).size, keys.length, l.id);
  }
});

test("explanations exist for every row of every level", () => {
  for (const l of LEVELS) {
    for (const env of assignments(Object.keys(l.vars))) {
      const s = explain(l.formula, env);
      assert.ok(typeof s === "string" && s.length > 10, l.id);
    }
  }
});

test("hand-checked: the fill level has exactly three lit rows", () => {
  const l = LEVELS.find(x => x.id === "fill");
  const lit = assignments(Object.keys(l.vars)).filter(r => evaluate(parse(l.formula), r));
  assert.equal(lit.length, 3);
});

test("compare levels: the stored answer is the truth-table answer, with a claim and 3 hints", () => {
  const cmp = LEVELS.filter(x => x.mode === "compare");
  assert.ok(cmp.length >= 4);
  for (const l of cmp) {
    assert.equal(compare(l.formula, l.formula2).equal, l.same, l.id);
    assert.ok(l.claim && l.hints.length === 3, l.id);
  }
  // the De Morgan pair the chapter relies on
  assert.equal(LEVELS.find(l => l.id === "dm-robot").same, false);
  assert.equal(LEVELS.find(l => l.id === "dm-and").same, true);
  assert.equal(LEVELS.find(l => l.id === "dm-or").same, true);
});

test("two circuits: in every row of every level exactly one of green / red is closed", () => {
  for (const l of LEVELS) {
    for (const f of [l.formula, l.formula2].filter(Boolean)) {
      const { green, red } = networks(f);
      for (const env of assignments(Object.keys(l.vars))) {
        const g = evaluate(green.node, env), r = evaluate(red.node, env);
        assert.notEqual(g, r, `${l.id}: ${f}`);
        assert.equal(g, evaluate(f, env), `${l.id}: green network is the formula`);
        const why = explain(f, env, "dual");
        assert.ok(why.startsWith(isLiteral(f) ? "המתג שולח" : g ? "המעגל הירוק" : "המעגל האדום"), l.id);
      }
    }
  }
});

test("the red network of A ∧ B is ¬A ∨ ¬B in parallel (De Morgan in the wiring)", () => {
  const { red } = networks("A & B");
  assert.equal(red.kind, "parallel");
  assert.deepEqual(red.kids.map(k => k.node.type), ["not", "not"]);
  assert.ok(isLiteral("A") && isLiteral("!A") && !isLiteral("A & B"));
});

test("views: use bulbs before equivalence and red/green signals when comparing truth values", () => {
  const boundary = LEVELS.findIndex(l => l.id === "dm-robot");
  assert.ok(boundary > 0);
  for (const l of LEVELS) assert.ok(l.view === undefined || ["switch", "lamp", "dual"].includes(l.view), l.id);
  for (const l of LEVELS.slice(0, boundary)) {
    assert.equal(l.view || defaultView(l.formula), "lamp", l.id);
  }
  for (const id of ["dm-robot", "dm-and", "dm-or"]) {
    assert.equal(LEVELS.find(l => l.id === id).view, "dual", id);
  }
});

test("the stairwell light is the exclusive or, and differs from ∨ only when both switches are up", () => {
  const l = LEVELS.find(x => x.id === "xor-stairs");
  const col = f => assignments(["A", "B"]).map(r => evaluate(f, r));
  assert.deepEqual(col(l.formula), [false, true, true, false]);
  assert.deepEqual(col("A | B"), [true, true, true, false]);
});
