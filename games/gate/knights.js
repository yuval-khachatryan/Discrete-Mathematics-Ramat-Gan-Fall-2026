/* knights.js — knights and knaves, as propositional logic. No DOM.
   ---------------------------------------------------------------------------
   A level has
       people:     [{id: "A", name: "אלון", g: "m"}, ...]      g = "m" | "f"
       statements: [{by: "A", text: "שנינו אבירים", formula: "A & B"}, ...]
   and the variable A means "A is a knight". An assignment {A: true, B: false}
   is consistent iff every statement's value equals "its speaker is a knight":
   knights say true things, knaves say false things. People with no statement
   never break consistency.

       solutions(level)              every consistent assignment, in the
                                     textbook row order of logic.js
       firstConflict(level, env)     the first statement that breaks env, or null
       evaluationText / evaluationHTML(statement, env)
                                     ״שנינו נוכלים״ = ¬A ∧ ¬B = ¬F ∧ ¬T = T ∧ F = F
       conflictHTML(level, env)      the Hebrew sentence the guard says
       judgeAnswer(level, "none" | "many")   the two extra answer buttons
   --------------------------------------------------------------------------- */

import { parse, evaluate, assignments } from "../shared/logic.js";

export const ids = level => level.people.map(p => p.id);
export const person = (level, id) => level.people.find(p => p.id === id);
export const rows = level => assignments(ids(level));
export const sameRow = (level, a, b) => ids(level).every(id => !!a[id] === !!b[id]);
export const rowIndex = (level, env) => rows(level).findIndex(r => sameRow(level, r, env));

/** The first statement whose value disagrees with its speaker's role, or null. */
export function firstConflict(level, env) {
  for (let index = 0; index < level.statements.length; index++) {
    const statement = level.statements[index];
    const value = evaluate(statement.formula, env);
    const knight = !!env[statement.by];
    if (value !== knight) return { index, statement, person: person(level, statement.by), value, knight };
  }
  return null;
}

export const consistent = (level, env) => firstConflict(level, env) === null;
export const solutions = level => rows(level).filter(env => consistent(level, env));

/** "none" (0 solutions), "one", or "many" (2 or more). */
export function answerFor(level) {
  const n = solutions(level).length;
  return n === 0 ? "none" : n === 1 ? "one" : "many";
}

/** The two extra buttons of an answers:"all" level. */
export function judgeAnswer(level, choice) {
  const actual = answerFor(level);
  return { correct: choice === actual, actual, count: solutions(level).length };
}

/* ---- words ---------------------------------------------------------------- */
const F = p => p.g === "f";
export const roleWord = (p, knight) => knight ? (F(p) ? "אבירה" : "אביר") : (F(p) ? "נוכלת" : "נוכל");
export const his = p => (F(p) ? "שלה" : "שלו");
export const quote = s => `״${s}״`;

/** "אלון — נוכל, בתיה — אבירה" */
export function rowWords(level, env) {
  return level.people.map(p => `${p.name} — ${roleWord(p, !!env[p.id])}`).join(", ");
}

/** "שנינו נוכלים" said by a knave: the sentence the guard says. */
export function conflictSentence(level, env) {
  const c = firstConflict(level, env);
  if (!c) return null;
  const p = c.person, role = roleWord(p, c.knight);
  const verdict = c.knight
    ? `שקרית — ו${role} אף פעם לא ${F(p) ? "משקרת" : "משקר"}`
    : `אמיתית — ו${role} אף פעם לא ${F(p) ? "אומרת" : "אומר"} אמת`;
  return `סימנתם את ${p.name} כ${role}, אבל אז הטענה ${his(p)} ${quote(c.statement.text)} ${verdict}.`;
}

/* ---- formulas, step by step ----------------------------------------------- */
const SYM = { and: " ∧ ", or: " ∨ ", xor: " ⊕ ", imp: " → ", iff: " ↔ " };

/** Like logic.js format(), with the book's symbols, but every compound operand
    of a binary connective gets parentheses: (A ∧ ¬B) ∨ (¬A ∧ B) rather than
    A ∧ ¬B ∨ ¬A ∧ B, which beginners misread. `leaf(node)` draws var/const. */
export function show(f, leaf, inner = false) {
  f = parse(f);
  leaf = leaf || (n => (n.type === "var" ? n.name : n.value ? "T" : "F"));
  function go(n, inner) {
    switch (n.type) {
      case "var": case "const": return leaf(n);
      case "not": return "¬" + go(n.arg, true);
    }
    const s = n.args
      ? n.args.map(a => go(a, true)).join(SYM[n.type])
      : go(n.left, true) + SYM[n.type] + go(n.right, true);
    return inner ? "(" + s + ")" : s;
  }
  return go(f, inner);
}

const kids = n => (n.type === "not" ? [n.arg] : n.args ? n.args : n.left ? [n.left, n.right] : []);
function rebuild(n, k) {
  if (n.type === "not") return { type: "not", arg: k[0] };
  if (n.args) return { type: n.type, args: k };
  return { type: n.type, left: k[0], right: k[1] };
}
function substitute(n, env) {
  if (n.type === "var") return { type: "const", value: !!env[n.name] };
  if (n.type === "const") return n;
  return rebuild(n, kids(n).map(c => substitute(c, env)));
}
/** One layer of evaluation: every node whose operands are all known. */
function reduceOnce(n) {
  if (n.type === "const" || n.type === "var") return n;
  const k = kids(n);
  if (k.every(c => c.type === "const")) return { type: "const", value: evaluate(n, {}) };
  return rebuild(n, k.map(reduceOnce));
}

/** [formula, formula with T/F for the variables, ..., T or F] as trees. */
export function evaluationSteps(formula, env) {
  const steps = [parse(formula)];
  let t = substitute(steps[0], env);
  if (steps[0].type !== "const") steps.push(t);
  while (t.type !== "const") { t = reduceOnce(t); steps.push(t); }
  return steps;
}

const chip = v => `<span class="tv-${v ? "T" : "F"}">${v ? "T" : "F"}</span>`;
const chipLeaf = n => (n.type === "var" ? n.name : chip(n.value));

/** ״שנינו נוכלים״ = ¬A ∧ ¬B = ¬F ∧ ¬T = T ∧ F = F */
export function evaluationText(statement, env) {
  return quote(statement.text) + " = " + evaluationSteps(statement.formula, env).map(s => show(s)).join(" = ");
}

/** One formula as HTML that may wrap only between its top-level operands:
    <span class="k-step"><span class="m">(A ∧ ¬B)</span> <span class="m">∨ (¬A ∧ B)</span></span>.
    A k-step is an inline-block, so in a chain each step moves to the next line
    as a unit, and breaks inside only when it alone is wider than the line.
    `prefix` ("= ") is glued to the first operand. */
export function stepHTML(f, leaf = chipLeaf, prefix = "") {
  f = parse(f);
  const split = (f.type === "and" || f.type === "or") && f.args.some(a => a.args || a.left);
  const parts = split
    ? f.args.map((a, i) => (i ? SYM[f.type].trim() + " " : "") + show(a, leaf, true))
    : [show(f, leaf)];
  parts[0] = prefix + parts[0];
  return `<span class="k-step">${parts.map(p => `<span class="m">${p}</span>`).join(" ")}</span>`;
}

/** A statement's formula for a card: LTR, wraps between top-level operands. */
export function formulaHTML(f) {
  return `<span class="k-chain" dir="ltr">${stepHTML(f)}</span>`;
}

/** The evaluation line as HTML for Hebrew text: ״שנינו נוכלים״ בנוסחה: <chain>.
    The chain is one LTR block with T/F chips; it breaks at the "=" signs first.
    (A bare "״…״ = chain" would put the quote at the right end and the formula's
    start at the far left, which reads badly in RTL.) */
export function evaluationHTML(statement, env) {
  const chain = evaluationSteps(statement.formula, env).map((s, i) => stepHTML(s, chipLeaf, i ? "= " : "")).join(" ");
  return `<span class="k-q">${quote(statement.text)}</span> בנוסחה: <span class="k-chain" dir="ltr">${chain}</span>`;
}
