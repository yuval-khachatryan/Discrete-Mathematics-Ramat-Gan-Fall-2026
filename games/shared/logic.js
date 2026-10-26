/* logic.js — propositional formulas for the games.
   ---------------------------------------------------------------------------
   Levels are authored as plain strings and parsed here, so a level file never
   hand-builds a tree:

       "(A | B) & !C"      "A -> B"      "!(A & B) <-> (!A | !B)"

   Accepted spellings (ASCII or the book's symbols):
       not  !  ¬  ~        and  &  ∧        or  |  ∨        xor  ^  ⊕  ⊻
       implies  ->  →      iff  <->  ↔      constants  T F  1 0
   Variables are a capital Latin letter optionally followed by digits (A, B, W1);
   T and F are the constants, so they cannot be variable names.

   Precedence, tightest first: ¬, ∧, ⊕, ∨, →, ↔. → is right-associative;
   ⊕ (exclusive or) is left-associative. format() always brackets a ⊕, ∧ or ∨
   that sits inside one of the others, so the precedence never has to be read.
   Chains of ∧ (or of ∨) are flattened into one n-ary node, which is what the
   circuit drawing wants (A ∧ B ∧ C is three contacts in one series run).

   Tree shapes:
       {type:"var", name}          {type:"const", value}
       {type:"not", arg}
       {type:"and", args:[...]}    {type:"or", args:[...]}
       {type:"imp", left, right}   {type:"iff", left, right}
       {type:"xor", left, right}
   --------------------------------------------------------------------------- */

const TOKEN = /\s*(<->|↔|->|→|[!¬~&∧|∨^⊕⊻()]|[A-Z][0-9]*|[TF01])/y;

function tokenize(src) {
  const out = [];
  TOKEN.lastIndex = 0;
  let pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(src);
    if (!m) throw new SyntaxError(`logic.js: cannot read "${src.slice(pos)}" in "${src}"`);
    out.push(m[1]);
    pos = TOKEN.lastIndex;
  }
  return out;
}

const NOT = new Set(["!", "¬", "~"]);
const AND = new Set(["&", "∧"]);
const OR = new Set(["|", "∨"]);
const IMP = new Set(["->", "→"]);
const XOR = new Set(["^", "⊕", "⊻"]);
const IFF = new Set(["<->", "↔"]);

export function parse(src, { flatten = true } = {}) {
  if (typeof src !== "string") return src;           // already a tree
  const t = tokenize(src);
  let i = 0;
  const peek = () => t[i];
  const take = () => t[i++];

  function iff() {
    let left = imp();
    while (IFF.has(peek())) { take(); left = { type: "iff", left, right: imp() }; }
    return left;
  }
  function imp() {
    const left = or();
    if (IMP.has(peek())) { take(); return { type: "imp", left, right: imp() }; }
    return left;
  }
  function nary(type, ops, next) {
    const first = next();
    if (!ops.has(peek())) return first;
    const args = [first];
    while (ops.has(peek())) { take(); args.push(next()); }
    return { type, args: flatten ? args.flatMap(a => (a.type === type ? a.args : [a])) : args };
  }
  function or() { return nary("or", OR, xor); }
  function xor() {
    let left = and();
    while (XOR.has(peek())) { take(); left = { type: "xor", left, right: and() }; }
    return left;
  }
  function and() { return nary("and", AND, unary); }
  function unary() {
    if (NOT.has(peek())) { take(); return { type: "not", arg: unary() }; }
    return atom();
  }
  function atom() {
    const tok = take();
    if (tok === undefined) throw new SyntaxError(`logic.js: "${src}" ends too early`);
    if (tok === "(") {
      const inner = iff();
      if (take() !== ")") throw new SyntaxError(`logic.js: missing ")" in "${src}"`);
      return inner;
    }
    if (tok === "T" || tok === "1") return { type: "const", value: true };
    if (tok === "F" || tok === "0") return { type: "const", value: false };
    if (/^[A-Z][0-9]*$/.test(tok)) return { type: "var", name: tok };
    throw new SyntaxError(`logic.js: unexpected "${tok}" in "${src}"`);
  }

  const tree = iff();
  if (i !== t.length) throw new SyntaxError(`logic.js: unexpected "${t[i]}" in "${src}"`);
  return tree;
}

/** Truth value of a formula under env = {A: true, B: false, ...}. */
export function evaluate(f, env) {
  f = parse(f);
  switch (f.type) {
    case "var":
      if (!(f.name in env)) throw new Error(`logic.js: no value for ${f.name}`);
      return !!env[f.name];
    case "const": return f.value;
    case "not": return !evaluate(f.arg, env);
    case "and": return f.args.every(a => evaluate(a, env));
    case "or": return f.args.some(a => evaluate(a, env));
    case "imp": return !evaluate(f.left, env) || evaluate(f.right, env);
    case "iff": return evaluate(f.left, env) === evaluate(f.right, env);
    case "xor": return evaluate(f.left, env) !== evaluate(f.right, env);
  }
  throw new Error(`logic.js: unknown node ${f.type}`);
}

/** Variable names in order of first appearance. */
export function variables(f) {
  f = parse(f);
  const seen = [];
  (function walk(n) {
    if (n.type === "var") { if (!seen.includes(n.name)) seen.push(n.name); }
    else if (n.type === "not") walk(n.arg);
    else if (n.args) n.args.forEach(walk);
    else if (n.left) { walk(n.left); walk(n.right); }
  })(f);
  return seen;
}

/** Every assignment of the given variables, in textbook order:
    the first variable changes slowest and every column starts with T. */
export function assignments(names) {
  const rows = [];
  const n = names.length;
  for (let k = 0; k < 2 ** n; k++) {
    const env = {};
    names.forEach((name, j) => { env[name] = ((k >> (n - 1 - j)) & 1) === 0; });
    rows.push(env);
  }
  return rows;
}

/** [{env, value}] for every assignment of `names` (default: the formula's own). */
export function truthTable(f, names) {
  f = parse(f);
  names = names || variables(f);
  return assignments(names).map(env => ({ env, value: evaluate(f, env) }));
}

/** Do f and g have the same value in every row? Returns {equal, row} where row
    is a separating assignment when they differ. */
export function compare(f, g) {
  f = parse(f); g = parse(g);
  const names = [...new Set([...variables(f), ...variables(g)])];
  for (const env of assignments(names)) {
    if (evaluate(f, env) !== evaluate(g, env)) return { equal: false, row: env };
  }
  return { equal: true, row: null };
}

/** Negation normal form: ¬ only directly on variables (De Morgan, double
    negation, A→B = ¬A∨B, A↔B = (A∧B)∨(¬A∧¬B)). The circuit drawing needs this,
    since a contact can be "A" or "not A" but there is no inverter for a
    whole sub-circuit. */
export function nnf(f) {
  f = parse(f);
  function pos(n) {
    switch (n.type) {
      case "var": case "const": return n;
      case "not": return neg(n.arg);
      case "and": case "or": return flat(n.type, n.args.map(pos));
      case "imp": return flat("or", [neg(n.left), pos(n.right)]);
      case "iff": return flat("or", [flat("and", [pos(n.left), pos(n.right)]), flat("and", [neg(n.left), neg(n.right)])]);
      case "xor": return flat("or", [flat("and", [pos(n.left), neg(n.right)]), flat("and", [neg(n.left), pos(n.right)])]);
    }
  }
  function neg(n) {
    switch (n.type) {
      case "var": return { type: "not", arg: n };
      case "const": return { type: "const", value: !n.value };
      case "not": return pos(n.arg);
      case "and": return flat("or", n.args.map(neg));
      case "or": return flat("and", n.args.map(neg));
      case "imp": return flat("and", [pos(n.left), neg(n.right)]);
      case "iff": return flat("or", [flat("and", [pos(n.left), neg(n.right)]), flat("and", [neg(n.left), pos(n.right)])]);
      case "xor": return flat("or", [flat("and", [pos(n.left), pos(n.right)]), flat("and", [neg(n.left), neg(n.right)])]);
    }
  }
  function flat(type, args) {
    return { type, args: args.flatMap(a => (a.type === type ? a.args : [a])) };
  }
  return pos(f);
}

const SYM = { and: " ∧ ", or: " ∨ ", xor: " ⊕ ", imp: " → ", iff: " ↔ " };
const RANK = { iff: 1, imp: 2, or: 3, xor: 3.5, and: 4, not: 5, var: 6, const: 6 };
const JUNCTION = new Set(["and", "or", "xor"]);

/** The formula with the book's symbols. Parentheses: only where needed, except
    that ∧ inside ∨ (and ∨ inside ∧) is always bracketed — the book's rule, since
    beginners misread A ∧ B ∨ C. */
export function format(f, names) {
  f = parse(f);
  const label = v => (names && names[v]) || v;
  function go(n, parentRank) {
    let s;
    switch (n.type) {
      case "var": return label(n.name);
      case "const": return n.value ? "T" : "F";
      case "not": return "¬" + go(n.arg, RANK.not);
      case "and": case "or":
        s = n.args.map(a => JUNCTION.has(a.type) && a.type !== n.type
          ? "(" + go(a, 0) + ")"
          : go(a, RANK[n.type] + 0.5)).join(SYM[n.type]);
        break;
      case "xor":
        s = [n.left, n.right].map((a, i) => JUNCTION.has(a.type) && !(a.type === "xor" && i === 0)
          ? "(" + go(a, 0) + ")"
          : go(a, RANK.xor + 0.5)).join(SYM.xor);
        break;
      case "imp": s = go(n.left, RANK.imp + 0.5) + SYM.imp + go(n.right, RANK.imp); break;
      case "iff": s = go(n.left, RANK.iff + 0.5) + SYM.iff + go(n.right, RANK.iff + 0.5); break;
    }
    return RANK[n.type] < parentRank ? "(" + s + ")" : s;
  }
  return go(f, 0);
}

export const TV = { true: "T", false: "F" };
