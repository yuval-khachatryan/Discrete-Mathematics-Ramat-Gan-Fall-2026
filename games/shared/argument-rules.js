import {deductionCandidates} from './deduction-hints.js';
import { parse, format, compare, variables, assignments, evaluate, validIdentifier, sameFormulaStructure } from "./logic.js";
import { RULES, checkStep, checkReplacements, trimBlankSteps } from "./proof-rules.js";

export const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].filter(x => x !== "T" && x !== "F");
export const INFERENCE_RULES = [
  { id: "mp", name: "כלל הניתוק", description:"אם ⁦A → B⁩ וגם ⁦A⁩, אז ⁦B⁩.", help: "מגרירה ומההנחה שלה מסיקים את המסקנה.", premises: ["P → Q", "P"], conclusion: "Q" },
  { id: "mt", name: "כלל השלילה", description:"אם ⁦A → B⁩ וגם ⁦¬B⁩, אז ⁦¬A⁩.", help: "מגרירה ומשלילת המסקנה שלה מסיקים את שלילת ההנחה.", premises: ["P → Q", "¬Q"], conclusion: "¬P" },
  { id: "hs", name: "כלל השרשרת", description:"אם ⁦A → B⁩ וגם ⁦B → C⁩, אז ⁦A → C⁩.", help: "מחברים שתי גרירות: המסקנה של הראשונה היא ההנחה של השנייה.", premises: ["P → Q", "Q → R"], conclusion: "P → R" },
  {id:'and-out',name:'הוצאת חלק מ״וגם״',count:1,help:'מפסוק עם ״וגם״ מסיקים כל אחד מחלקיו בנפרד.'},
  {id:'and-in',name:'חיבור באמצעות ״וגם״',count:2,help:'משני פסוקים שהוכחנו מסיקים את החיבור שלהם באמצעות ״וגם״.'},
  {id:'iff-use',name:'שימוש באם ורק אם',count:2,help:'שני חלקי הפסוק מקבלים אותו ערך אמת. אפשר להסיק מכל אחד מהם על האחר.'},
];
export const sourceCount = rule => rule.startsWith('eq:') ? 1 : (INFERENCE_RULES.find(r=>r.id===rule)?.count || 2);
export const ruleName = id => id === "eq:replacements" ? "החלפות מפורטות" : INFERENCE_RULES.find(r => r.id === id)?.name || RULES.find(r => `eq:${r.id}` === id)?.name || "";
export const rename = (formula, mapping) => format(formula, mapping);

export function checkMapping(exercise, mapping) {
  const names = exercise.atoms.map(a => mapping[a.id]);
  if (names.some(n => !validIdentifier(n))) return { ok: false, message: "כתבו שם באותיות אנגליות גדולות, באורך 1–16 תווים, שמתחיל באות. אפשר להוסיף ספרות וקו תחתון. T, F, TRUE, FALSE ושמות הקשרים NOT, AND, OR, XOR, IMPLIES, IFF שמורים." };
  if (new Set(names).size !== names.length) return { ok: false, message: "שני משפטים קיבלו אותו שם. כתבו שם שונה לכל משפט." };
  return { ok: true, message: "לכל משפט יש עכשיו שם משלו. אפשר לתרגם את הנתונים." };
}

function readFormula(text, allowed) {
  if (!text.trim()) return { ok: false, message: "כתבו נוסחה בשדה הזה." };
  if (text.length > 240) return { ok: false, message: "הנוסחה ארוכה מדי. כתבו צעד קצר אחד." };
  let tree;
  try { tree = parse(text.trim().toUpperCase()); }
  catch { return { ok: false, message: "לא הצלחתי לקרוא את הנוסחה. בדקו את הסוגריים והסימנים; כתבו נוסחה אחת, בלי סימן שוויון." }; }
  if (variables(tree).some(n => !allowed.includes(n))) return { ok: false, message: "השתמשו רק בשמות שמופיעים בסימוני התרגיל." };
  return { ok: true, tree, formula: text.trim().toUpperCase() };
}

export function checkTranslations(exercise, mapping, premises, goal) {
  const checked = checkMapping(exercise, mapping);
  if (!checked.ok) return { ...checked, items: [] };
  const expected = [...exercise.premises, exercise.goal];
  const actual = [...premises, goal];
  if (premises.length !== exercise.premises.length) return { ok: false, message: "יש לתרגם את כל הנתונים.", items: [] };
  const items = expected.map((entry,i) => {
    const read = readFormula(actual[i], Object.values(mapping));
    if (!read.ok) return read;
    if(sameFormulaStructure(read.formula,entry.formula,mapping))return {ok:true,formula:read.formula,message:"התרגום מתאים למשפט."};
    const comparison = compare(read.tree, rename(entry.formula, mapping));
    return comparison.equal ? {ok:false,message:"הנוסחה שקולה למשפט, אבל כאן נדרשת הצרנה ישירה: שמרו על הקשרים ועל סדר החלקים שבניסוח. החלפה בנוסחה שקולה אפשר לבצע בהמשך, בצעד מנומק."}
      : { ok: false, row: comparison.row, message: "הנוסחה אינה מבטאת את המשפט הזה. בדקו מה כל אות מייצגת, על מה פועלת השלילה ולאיזה כיוון הגרירה. במצב הבא הנוסחה והמשפט נותנים תוצאות שונות:" };
  });
  return { ok: items.every(x => x.ok), items };
}

const same = (a,b) => format(a) === format(b);
function consequences(rule, ...sources) {
  return deductionCandidates(rule,sources).map(f=>parse(f));
}

// A bank of possibilities, not a list of approved steps. Each selection still
// needs a rule and earlier sources. Include intermediate results from different
// routes as well as plausible distractors; typing remains unrestricted.
export function formulaBank(exercise, mapping) {
  const sources = [...exercise.premises.map(p => p.formula), ...exercise.solution.map(s => s.formula)].map(f => parse(f));
  const candidates = new Set([
    ...exercise.atoms.flatMap(a => [a.id, `!${a.id}`]),
    ...sources.map(f => format(f)), exercise.goal.formula,
  ]);
  for (const p of sources) {
    if (p.type === "imp") candidates.add(format({ type: "imp", left: p.right, right: p.left }));
    for (const q of sources) for (const rule of INFERENCE_RULES) {
      for (const result of consequences(rule.id, p, q)) candidates.add(format(result));
    }
  }
  return [...new Set([...candidates].map(f => rename(f, mapping)))].sort((a,b) => a.localeCompare(b, "en"));
}

export function checkArgument(exercise, mapping, premises, goal, inputSteps) {
  // Recheck translations on every submission: the editor state is not evidence.
  const translation = checkTranslations(exercise,mapping,premises,goal);
  if (!translation.ok) return { ok: false, complete: false, phase: "translation", translation, results: [] };
  const steps=trimBlankSteps(inputSteps);
  let goalStep=null;
  const allowed = Object.values(mapping);
  const known = new Map(translation.items.slice(0,-1).map((p,i) => [`p${i+1}`,p.formula]));
  const results = [];
  if (!steps.length) return { ok: false, complete: false, results, message: "הוסיפו צעד כדי להתחיל את ההוכחה." };
  for (const step of steps) {
    let result = readFormula(step.formula,allowed);
    const isRewrite = step.rule.startsWith("eq:");
    const count = sourceCount(step.rule);
    if(step.rule==='eq:replacements')result={ok:true};
    if (!step.id || known.has(step.id)) result = { ok: false, message: "לכל שורת הוכחה צריך להיות מזהה נפרד." };
    else if (result.ok && !ruleName(step.rule)) result = { ok: false, message: "בחרו את הכלל שמצדיק את הצעד." };
    else if (result.ok && (step.refs.length !== count || new Set(step.refs).size !== count || step.refs.some(ref => !known.has(ref)))) {
      result = { ok: false, message: count===1 ? "בחרו שורת מקור קודמת אחת. אי אפשר להשתמש בשורה עצמה או בשורה שעדיין לא הוכחה." : "בחרו שתי שורות מקור קודמות ושונות. אי אפשר להשתמש בשורה עצמה או בשורה שעדיין לא הוכחה." };
    } else if (result.ok && isRewrite) {
      const rewrite = step.rule === 'eq:replacements'
        ? checkReplacements(known.get(step.refs[0]),step.formula,step.replacements||[],allowed)
        : checkStep(known.get(step.refs[0]),step.formula,step.rule.slice(3),allowed);
      result = { ...result, ...rewrite, ok: rewrite.kind === "valid" };
    } else if (result.ok) {
      const sources = step.refs.map(id => parse(known.get(id)));
      const candidates = consequences(step.rule,...sources);
      if (candidates.some(candidate => same(candidate,result.tree))) {
        result.message = "הנוסחה נובעת משורות המקור לפי הכלל שבחרתם.";
        if(step.rule==='mt')for(const [p,q]of [[sources[0],sources[1]],[sources[1],sources[0]]]){
          if(p.type!=='imp'||!deductionCandidates('mt',[p,q]).some(f=>same(parse(f),result.tree)))continue;
          if(p.right.type==='not'&&same(p.right.arg,q))result.message+=` השתמשנו גם בשלילה כפולה: ⁦${format(q)} ≡ ${format({type:'not',arg:p.right})}⁩.`;
          if(p.left.type==='not'&&same(p.left.arg,result.tree))result.message+=` שלילת תנאי הגרירה היא ⁦${format({type:'not',arg:p.left})}⁩, והיא שקולה ל־⁦${format(result.tree)}⁩.`;
        }
      }
      else {
        const row = assignments(allowed).find(env => sources.every(s => evaluate(s,env)) && !evaluate(result.tree,env));
        result = { ok: false, row, message: row
          ? "המסקנה אינה נובעת מן המקורות שבחרתם. במצב הבא כל המקורות אמת, אבל המסקנה שלכם שקר:"
          : candidates.length
            ? "המסקנה שקולה לתוצאה של הכלל, אבל שיניתם גם את הניסוח. כתבו קודם את התוצאה הישירה של הכלל, ואז הוסיפו צעד שקילות."
            : "הכלל שבחרתם אינו מתאים למבנה של שורות המקור. קראו את התזכורת לכלל, ובדקו אם בחרתם את השורות המתאימות. אם צריך לשנות ניסוח, הוסיפו קודם צעד שקילות." };
      }
    }
    results.push(result);
    if (!result.ok) {let targetReached=false;try{targetReached=compare(step.formula,translation.items.at(-1).formula).equal;}catch{}
      return {ok:false,complete:goalStep!==null,goalStep,targetReached,results};}
    known.set(step.id,result.formula);
    if(goalStep===null&&compare(result.formula,translation.items.at(-1).formula).equal)goalStep=results.length;
  }
  return {ok:true,complete:goalStep!==null,goalStep,results};
}
