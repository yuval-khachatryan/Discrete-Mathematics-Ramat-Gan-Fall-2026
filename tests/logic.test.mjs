// node --test tests/   — checks the propositional engine every game relies on.
import test from "node:test";
import assert from "node:assert/strict";
import { parse, evaluate, variables, truthTable, compare, nnf, format, assignments } from "../games/shared/logic.js";

const col = f => truthTable(f).map(r => (r.value ? "T" : "F")).join("");

test("connectives match their truth tables (rows TT, TF, FT, FF)", () => {
  assert.equal(col("A & B"), "TFFF");
  assert.equal(col("A | B"), "TTTF");
  assert.equal(col("A -> B"), "TFTT");
  assert.equal(col("A <-> B"), "TFFT");
  assert.equal(col("!A"), "FT");
});

test("symbols and ASCII spellings parse to the same thing", () => {
  assert.deepEqual(parse("¬A ∧ (B ∨ C) → A"), parse("!A & (B | C) -> A"));
});

test("precedence: not > and > or > implies > iff; implies is right-associative", () => {
  assert.ok(compare("A | B & C", "A | (B & C)").equal);
  assert.ok(compare("!A & B", "(!A) & B").equal);
  assert.ok(compare("A -> B -> C", "A -> (B -> C)").equal);
  assert.ok(!compare("A -> B -> C", "(A -> B) -> C").equal);
  assert.ok(compare("A -> B <-> !A | B", "(A -> B) <-> (!A | B)").equal);
});

test("chains flatten into one n-ary node", () => {
  const f = parse("A & B & (C & D)");
  assert.equal(f.type, "and");
  assert.equal(f.args.length, 4);
});

test("assignment order: first variable slowest, columns start with T", () => {
  assert.deepEqual(assignments(["A", "B"]), [
    { A: true, B: true }, { A: true, B: false }, { A: false, B: true }, { A: false, B: false },
  ]);
  assert.deepEqual(variables("(B | A) & !B"), ["B", "A"]);
});

test("De Morgan, contrapositive, and implication as a disjunction", () => {
  assert.ok(compare("!(A & B)", "!A | !B").equal);
  assert.ok(compare("!(A | B)", "!A & !B").equal);
  assert.ok(compare("A -> B", "!B -> !A").equal);
  assert.ok(compare("A -> B", "!A | B").equal);
  const r = compare("A -> B", "B -> A");
  assert.ok(!r.equal);
  assert.notEqual(evaluate("A -> B", r.row), evaluate("B -> A", r.row));
});

test("nnf keeps the meaning and puts ¬ only on variables", () => {
  const samples = ["!(A & B)", "!(A | !B) -> C", "A <-> B", "!(A <-> B)", "!!A", "!(A -> (B & !C))", "!T | A"];
  for (const s of samples) {
    const g = nnf(s);
    assert.ok(compare(s, g).equal, s);
    (function walk(n) {
      if (n.type === "not") assert.equal(n.arg.type, "var", s);
      else if (n.args) n.args.forEach(walk);
      assert.ok(n.type !== "imp" && n.type !== "iff", s);
    })(g);
  }
});

test("format uses the book's symbols and only needed parentheses", () => {
  assert.equal(format("(A | B) & !C"), "(A ∨ B) ∧ ¬C");
  assert.equal(format("A | B & C"), "A ∨ (B ∧ C)");      // the book always brackets ∧ inside ∨
  assert.equal(format("(A & !B) | (!A & B)"), "(A ∧ ¬B) ∨ (¬A ∧ B)");
  assert.equal(format("!(A & B)"), "¬(A ∧ B)");
  assert.equal(format("A -> B -> C"), "A → B → C");
  assert.equal(format("(A -> B) -> C"), "(A → B) → C");
  assert.equal(format("!!A"), "¬¬A");
});

test("bad input fails loudly", () => {
  assert.throws(() => parse("A &"));
  assert.throws(() => parse("(A | B"));
  assert.throws(() => parse("A B"));
  assert.throws(() => parse("a & b"));
});

test("exclusive or: differs from ∨ only in the row where both are true", () => {
  assert.equal(col("A ^ B"), "FTTF");
  assert.equal(col("A ⊕ B"), "FTTF");
  assert.ok(compare("A ^ B", "(A & !B) | (!A & B)").equal);
  assert.ok(compare("A ^ B", "(A | B) & !(A & B)").equal);
  assert.ok(compare("!(A ^ B)", "A <-> B").equal);
  for (const f of ["A ^ B", "!(A ^ B)", "(A ^ B) ^ C", "A & (B ^ C)"]) assert.ok(compare(f, nnf(f)).equal, f);
  assert.equal(format("A ^ B"), "A ⊕ B");
  assert.equal(format("(A ^ B) | C"), "(A ⊕ B) ∨ C");
  assert.equal(format("A ^ (B & C)"), "A ⊕ (B ∧ C)");
});

// Both textbook notations name the same connective, including mixed formulas.
test("underlined-or is accepted as the XOR alias", () => {
  assert.equal(col("A ⊻ B"), "FTTF");
  assert.equal(format("A ⊻ B"), "A ⊕ B");
  assert.equal(col("(A ⊻ B) | C"), col("(A ⊕ B) | C"));
});
