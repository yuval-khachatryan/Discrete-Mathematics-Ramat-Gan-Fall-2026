// A step is one named equivalence applied in either direction to one subtree.
// Truth-table agreement alone does not justify the selected rule.
import { parse, compare, variables, format, evaluate } from "./logic.js";

export const RULES = [
  { id: "double", name: "שלילה כפולה", pairs: [["!!A", "A"]] },
  { id: "commute", name: "חילוף", pairs: [["A & B", "B & A"], ["A | B", "B | A"]] },
  { id: "associate", name: "קיבוץ", pairs: [["(A & B) & C", "A & (B & C)"], ["(A | B) | C", "A | (B | C)"]] },
  { id: "distribute", name: "פילוג", pairs: [["A & (B | C)", "(A & B) | (A & C)"], ["A | (B & C)", "(A | B) & (A | C)"]] },
  { id: "demorgan", name: "דה מורגן", pairs: [["!(A & B)", "!A | !B"], ["!(A | B)", "!A & !B"], ["A | B", "!(!A & !B)"], ["A & B", "!(!A | !B)"]] },
  { id: "implication", name: "גרירה כ״או״", pairs: [["A -> B", "!A | B"]] },
  { id: "contrapositive", name: "גרירה נגדית", pairs: [["A -> B", "!B -> !A"]] },
  { id: "iff", name: "אם ורק אם", pairs: [["A <-> B", "(A -> B) & (B -> A)"]] },
  { id: "tautology", name: "טאוטולוגיה", pairs: [["A | !A", "T"]] },
  { id: "contradiction", name: "סתירה", pairs: [["A & !A", "F"]] },
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

function rootApplies(before, after, pairs) {
  for (const [a, b] of pairs) {
    for (const [from, to] of [[a,b], [b,a]]) {
      const bindings = new Map();
      if (match(from, before, bindings) && match(to, after, bindings)) return true;
    }
  }
  return false;
}
function applies(before, after, pairs) {
  if (rootApplies(before, after, pairs)) return true;
  if (before.type !== after.type) return false;
  const a = children(before), b = children(after);
  if (!a.length || a.length !== b.length) return false;
  const changed = a.map((node, i) => same(node, b[i]) ? -1 : i).filter(i => i >= 0);
  return changed.length === 1 && applies(a[changed[0]], b[changed[0]], pairs);
}

// Generate one justified rewrite, retaining grouping and order. Schemas whose
// reverse direction introduces an unbound letter cannot supply a concrete hint.
function instantiate(pattern, bindings) {
  if (pattern.type === "var") return bindings.get(pattern.name);
  const parts = children(pattern).map(n => instantiate(n, bindings));
  if (parts.some(n => !n)) return null;
  return rebuild(pattern, parts);
}
function rebuild(node, parts) {
  if (node.args) return { ...node, args: parts };
  if (node.arg) return { ...node, arg: parts[0] };
  if (node.left) return { ...node, left: parts[0], right: parts[1] };
  return node;
}
function* rewrites(node, pairs) {
  for (const [a,b] of pairs) for (const [from,to] of [[a,b],[b,a]]) {
    const bindings = new Map();
    if (match(from, node, bindings)) {
      const result = instantiate(to, bindings);
      if (result) yield result;
    }
  }
  const parts = children(node);
  for (let i=0; i<parts.length; i++) for (const changed of rewrites(parts[i], pairs)) {
    yield rebuild(node, parts.map((p,j) => i === j ? changed : p));
  }
}
function removeDouble(node) {
  if (node.type === "not" && node.arg.type === "not") return removeDouble(node.arg.arg);
  return rebuild(node, children(node).map(removeDouble));
}
function skippedDouble(before, after, pairs) {
  for (const mid of rewrites(before, pairs)) {
    if (!same(mid, after) && same(removeDouble(mid), after)) return mid;
  }
  // Also recognize a double negation that must be inserted before a reverse law.
  for (const mid of rewrites(after, pairs)) {
    if (!same(mid, before) && same(removeDouble(mid), before)) return mid;
  }
  return null;
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
    const intermediate = !other && skippedDouble(before, after, patterns.get(ruleId));
    if (intermediate) return { kind: "missing-step", intermediate: format(intermediate),
      message: "התוצאה נכונה ושקולה לנוסחה הקודמת. עם זאת, יש לפרט את ההחלפות שמצדיקות את המעבר. אם שיניתם חלקים נפרדים של נוסחת המקור, בחרו ״החלפות מפורטות״. אם השלילה הכפולה נוצרה רק במהלך הצעד, הסירו אותה בצעד הבא. אפשר להיעזר בשורת הביניים שלהלן." };
    return { kind: "wrong-rule", message: other
      ? `הנוסחאות שקולות, אבל החוק שבחרתם אינו מסביר את השינוי. המעבר הזה מתאים לחוק ״${other.name}״.`
      : "הנוסחאות שקולות, אבל לא מצאתי כאן הפעלה אחת של החוק שבחרתם. אפשר לבחור ״החלפות מפורטות״ כדי להצדיק שינויים בחלקים נפרדים. אם אחד השינויים פועל על תוצאה חדשה, הוסיפו שורת ביניים." };
  }
  return { kind: "valid", message: `הצעד נכון, והחוק ״${RULES.find(r => r.id === ruleId).name}״ מתאים לשינוי.`, formula: format(after) };
}

export function checkStart(input, start, target, reversible = false) {
  if (!input.trim()) return { valid: false, message: "כתבו תחילה את הנוסחה שממנה אתם מתחילים." };
  let parsed;
  try { parsed = tree(input.trim().toUpperCase()); }
  catch { return { valid: false, message: "כתבו נוסחה אחת בלבד, ובדקו את הסוגריים והסמלים." }; }
  if (same(parsed, tree(start))) return { valid: true, start: input.trim().toUpperCase(), target };
  if (reversible && same(parsed, tree(target))) return { valid: true, start: input.trim().toUpperCase(), target: start };
  return { valid: false, message: "נקודת המוצא שהזנתם אינה נכונה." };
}

export function reachesGoal(formula,target) {
  try { return goalKey(tree(formula.trim().toUpperCase())) === goalKey(tree(target)); }
  catch { return false; }
}
export function trimBlankSteps(steps) {
  const result=steps.slice();
  const blank = step => !step.formula.trim() && (!step.rule || step.rule === 'replacements')
    && !(step.replacements || []).some(r => r.path || r.before || r.after || r.rule);
  while(result.length && blank(result.at(-1)))result.pop();
  return result;
}
export function checkProof(start, target, inputSteps) {
  const steps=trimBlankSteps(inputSteps),allowed=variables(start),results=[];
  let previous=start,goalStep=null;
  if(!steps.length)return {valid:false,complete:false,targetReached:false,results};
  for(const [i,step] of steps.entries()) {
    const result=step.rule==='replacements'
      ? checkReplacements(previous,step.formula,step.replacements||[],allowed)
      : checkStep(previous,step.formula,step.rule,allowed);
    results.push(result);
    if(result.kind!=='valid')return {valid:false,complete:goalStep!==null,goalStep,targetReached:reachesGoal(step.formula,target),results};
    previous=step.formula.trim().toUpperCase();
    if(goalStep===null&&reachesGoal(previous,target))goalStep=i+1;
  }
  return {valid:true,complete:goalStep!==null,goalStep,targetReached:reachesGoal(previous,target),results};
}

// Paths identify occurrences, including identical text in different positions.
export function expressionParts(source) {
  const result=[];
  function visit(n,path){result.push({path,formula:format(n),node:n});children(n).forEach((c,i)=>visit(c,path+'.'+i));}
  visit(tree(source.trim().toUpperCase()),'r');return result;
}
export const overlappingPaths=(a,b)=>a===b||a.startsWith(b+'.')||b.startsWith(a+'.');
export function checkReplacements(beforeText,afterText,replacements,allowed) {
  if(!afterText.trim())return {kind:'empty',message:'כתבו את הנוסחה שמתקבלת לאחר כל ההחלפות.'};
  if(afterText.length>240||beforeText.length>240)return {kind:'syntax',message:'כתבו נוסחה קצרה יותר.'};
  let before,after,parts;
  try {before=tree(beforeText);after=tree(afterText.trim().toUpperCase());parts=expressionParts(beforeText);}
  catch {return {kind:'syntax',message:'בדקו את הנוסחאות ואת הסוגריים.'};}
  if(!replacements.length)return {kind:'rule',message:'הוסיפו לפחות החלפה אחת ובחרו את החלק, התוצאה והחוק.'};
  if(replacements.length>24)return {kind:'rule',message:'פצלו את העבודה לכמה שורות.'};
  const chosen=new Map();
  for(const [index,change]of replacements.entries()) {
    const fail=(message,kind='replacement')=>({kind,message,replacementIndex:index});
    const part=parts.find(p=>p.path===change.path);
    if(!part)return fail('בחרו חלק שמופיע בנוסחה שלפני הצעד הזה.');
    if([...chosen.keys()].some(p=>overlappingPaths(p,change.path)))return fail('החלקים שנבחרו חופפים. אין להחליף באותו צעד גם חלק וגם ביטוי שמכיל אותו.');
    if(change.before && change.before!==part.formula)return fail('שורת המקור השתנתה. בחרו מחדש את החלק להחלפה.');
    if(!change.after?.trim())return fail('כתבו במה מחליפים את החלק שנבחר.');
    if(change.after.length>240)return fail('הביטוי ארוך מדי. פצלו לצעדים קצרים.');
    let replacement;try{replacement=tree(change.after.trim().toUpperCase());}catch{return fail('לא ניתן לקרוא את הביטוי החלופי. בדקו סוגריים וסמלים.');}
    if(variables(replacement).some(v=>!allowed.includes(v)))return fail('השתמשו רק באותיות של התרגיל.');
    if(!patterns.has(change.rule))return fail('בחרו חוק עבור ההחלפה הזו.');
    if(same(part.node,replacement))return fail('החלק שנבחר לא השתנה. מחקו את ההחלפה המיותרת.');
    if(!rootApplies(part.node,replacement,patterns.get(change.rule))){
      const other=RULES.find(r=>rootApplies(part.node,replacement,patterns.get(r.id)));
      return fail(other ? `ההחלפה נכונה, אבל הנימוק אינו מתאים. כאן משתמשים ב״${other.name}״.`
        : 'החוק אינו מצדיק את ההחלפה של החלק שנבחר. בחרו את החלק המדויק שעליו פועל החוק. שינוי בתוצאה של החלפה קודמת שייך לצעד הבא.');
    }
    chosen.set(change.path,replacement);
  }
  function replace(n,path){return chosen.get(path)||rebuild(n,children(n).map((c,i)=>replace(c,path+'.'+i)));}
  if(!same(replace(before,'r'),after))return {kind:'replacement',message:'ההחלפות שסימנתם אינן נותנות את הנוסחה שכתבתם. בדקו שלא שיניתם חלק נוסף או הפעלתם חוק על תוצאה שנוצרה רק בצעד הזה.'};
  return {kind:'valid',formula:format(after),message:'הצעד נכון. כל ההחלפות מוצדקות ופועלות על חלקים נפרדים של נוסחת המקור.'};
}
export function stepReason(step) {
  if(step.rule==='replacements'||step.rule==='eq:replacements')return (step.replacements||[]).map(c=>{
    let after=c.after;try{after=format(tree(c.after.trim().toUpperCase()));}catch{}
    return `${RULES.find(r=>r.id===c.rule)?.name||''}: ⁦${c.before} ↦ ${after}⁩`;
  }).join('; ');
  return RULES.find(r=>r.id===step.rule)?.name||'';
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
