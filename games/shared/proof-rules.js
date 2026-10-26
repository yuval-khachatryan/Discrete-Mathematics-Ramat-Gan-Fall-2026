// A step is one named equivalence applied in either direction to one subtree.
// Truth-table agreement alone does not justify the selected rule.
import { parse, compare, variables, format, evaluate } from "./logic.js";

export const RULES = [
  { id: "double", name: "שלילה כפולה", pairs: [["!!A", "A"]] },
  { id: "commute", name: "חילוף", pairs: [["A & B", "B & A"], ["A | B", "B | A"]] },
  { id: "associate", name: "קיבוץ", pairs: [["(A & B) & C", "A & (B & C)"], ["(A | B) | C", "A | (B | C)"]] },
  { id: "distribute", name: "פילוג", pairs: [["A & (B | C)", "(A & B) | (A & C)"], ["A | (B & C)", "(A | B) & (A | C)"]] },
  { id: "demorgan", name: "דה מורגן", pairs: [["!(A & B)", "!A | !B"], ["!(A | B)", "!A & !B"]] },
  { id: "implication", name: "גרירה כ״או״", pairs: [["A -> B", "!A | B"]] },
  { id: "contrapositive", name: "גרירה נגדית", pairs: [["A -> B", "!B -> !A"]] },
  { id: "iff", name: "אם ורק אם", pairs: [["A <-> B", "(A -> B) & (B -> A)"]] },
  { id: "complement", name: "טאוטולוגיה וסתירה", pairs: [["A | !A", "T"], ["A & !A", "F"]] },
  { id: "identity", name: "איבר ניטרלי", pairs: [["F | A", "A"], ["A | F", "A"], ["T & A", "A"], ["A & T", "A"]] },
];

// Preserve explicit grouping for the association rule; the usual parser still
// flattens connectives for circuits and all other consumers.
function binary(n) {
  if (n.args) return n.args.map(binary).reduce((a, b) => ({ type: n.type, args: [a, b] }));
  if (n.type === "not") return { ...n, arg: binary(n.arg) };
  if (n.left) return { ...n, left: binary(n.left), right: binary(n.right) };
  return n;
}
const tree = src => binary(parse(src, { flatten: false }));
const key = n => JSON.stringify(n);
const same = (a, b) => key(a) === key(b);
const children = n => n.args || (n.arg ? [n.arg] : n.left ? [n.left, n.right] : []);
const patterns = new Map(RULES.map(r => [r.id, r.pairs.map(([a,b]) => [tree(a), tree(b)])]));

function match(pattern, value, bindings) {
  if (pattern.type === "var") {
    if (bindings.has(pattern.name)) return same(bindings.get(pattern.name), value);
    bindings.set(pattern.name, value);
    return true;
  }
  if (pattern.type !== value.type) return false;
  if (pattern.type === "const") return pattern.value === value.value;
  const p = children(pattern), v = children(value);
  return p.length === v.length && p.every((node, i) => match(node, v[i], bindings));
}

function applies(before, after, pairs) {
  for (const [a, b] of pairs) {
    for (const [from, to] of [[a,b], [b,a]]) {
      const bindings = new Map();
      if (match(from, before, bindings) && match(to, after, bindings)) return true;
    }
  }
  if (before.type !== after.type) return false;
  const a = children(before), b = children(after);
  if (!a.length || a.length !== b.length) return false;
  const changed = a.map((node, i) => same(node, b[i]) ? -1 : i).filter(i => i >= 0);
  return changed.length === 1 && applies(a[changed[0]], b[changed[0]], pairs);
}

// Only completion ignores ordering/grouping of ∧ and ∨. Rule checking above
// requires those changes to be justified, rather than silently allowing them.
function goalKey(n) {
  if (n.args) {
    const parts = [];
    const collect = x => x.type === n.type ? x.args.forEach(collect) : parts.push(goalKey(x));
    collect(n);
    return `${n.type}(${parts.sort().join(",")})`;
  }
  if (n.arg) return `not(${goalKey(n.arg)})`;
  if (n.left) return `${n.type}(${goalKey(n.left)},${goalKey(n.right)})`;
  return key(n);
}

export function checkStep(beforeText, afterText, ruleId, allowed) {
  if (!afterText.trim()) return { kind: "empty", message: "כתבו את הנוסחה שמתקבלת אחרי הצעד הזה." };
  if (afterText.length > 240) return { kind: "syntax", message: "הנוסחה ארוכה מדי לצעד אחד. פצלו את העבודה לצעדים קצרים." };
  let before, after;
  try { before = tree(beforeText); after = tree(afterText.trim().toUpperCase()); }
  catch { return { kind: "syntax", message: "לא הצלחתי לקרוא את הנוסחה. כתבו נוסחה אחת בלבד, בלי סימן שוויון, ובדקו את הסוגריים והקשרים." }; }
  const extra = variables(after).filter(v => !allowed.includes(v));
  if (extra.length) return { kind: "variables", message: `בשאלה הזאת משתמשים רק באותיות ${allowed.join(", ")}. בדקו שלא הוספתם אות אחרת.` };
  if (!patterns.has(ruleId)) return { kind: "rule", message: "בחרו את החוק שמסביר את המעבר מהשורה הקודמת לשורה הזאת." };
  if (same(before, after)) return { kind: "unchanged", message: "הנוסחה לא השתנתה. כתבו את התוצאה של הפעלת החוק, או מחקו את הצעד המיותר." };
  const comparison = compare(before, after);
  if (!comparison.equal) return { kind: "different", row: comparison.row,
    message: `הנוסחה החדשה אינה שקולה לקודמת. במצב הבא הנוסחה הקודמת ${evaluate(before, comparison.row) ? "נכונה" : "שגויה"}, והנוסחה החדשה ${evaluate(after, comparison.row) ? "נכונה" : "שגויה"}:` };
  if (!applies(before, after, patterns.get(ruleId))) {
    const other = RULES.find(r => applies(before, after, patterns.get(r.id)));
    return { kind: "wrong-rule", message: other
      ? `הנוסחאות שקולות, אבל החוק שבחרתם אינו מסביר את השינוי. המעבר הזה מתאים לחוק ״${other.name}״.`
      : "הנוסחאות שקולות, אבל לא מצאתי כאן הפעלה אחת של החוק שבחרתם. שנו חלק אחד בכל צעד. אם השתמשתם בכמה חוקים, או שיניתם גם את סדר החלקים, הוסיפו שורות ביניים." };
  }
  return { kind: "valid", message: `הצעד נכון, והחוק ״${RULES.find(r => r.id === ruleId).name}״ מתאים לשינוי.`, formula: format(after) };
}

export function checkProof(start, target, steps) {
  const allowed = variables(start);
  const results = [];
  let previous = start;
  if (!steps.length) return { valid: false, complete: false, results };
  for (const step of steps) {
    const result = checkStep(previous, step.formula, step.rule, allowed);
    results.push(result);
    if (result.kind !== "valid") return { valid: false, complete: false, results };
    previous = step.formula.trim().toUpperCase();
  }
  return { valid: true, complete: goalKey(tree(previous)) === goalKey(tree(target)), results };
}

// A grouped display for the rule reference; format() intentionally hides
// redundant associative parentheses in other parts of the site.
function ruleFormula(n) {
  if (n.type === "var") return n.name;
  if (n.type === "const") return n.value ? "T" : "F";
  if (n.arg) return `¬${ruleFormula(n.arg)}`;
  const [a,b] = children(n);
  return `(${ruleFormula(a)} ${{and:"∧",or:"∨",imp:"→",iff:"↔"}[n.type]} ${ruleFormula(b)})`;
}
export const ruleExamples = id => (patterns.get(id) || []).map(([a,b]) => `${ruleFormula(a)} ≡ ${ruleFormula(b)}`);
