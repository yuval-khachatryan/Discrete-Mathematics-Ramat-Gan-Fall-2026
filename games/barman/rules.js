/* rules.js — the logic of the falafel-stand joke. Pure: no DOM, runs in node too.
   ---------------------------------------------------------------------------
   n mathematicians stand at the falafel stand. Person i secretly wants falafel (wants[i] ===
   true) or not. The barman asks one question:

       mode "all"   ״כולם רוצים פלאפל?״    the big ∧ :  W₁ ∧ W₂ ∧ … ∧ Wₙ
       mode "any"   ״מישהו רוצה פלאפל?״    the big ∨ :  W₁ ∨ W₂ ∨ … ∨ Wₙ

   They answer in order. Each one knows only their own wish and the answers
   said before them, and answers "yes" / "no" only when sure, else "dunno".

       answers(wants, mode)     -> ["dunno", "dunno", "yes"]   what they say
       knowledge(answers, mode) -> [true, false, null]        what the barman
                                   can deduce: true = wants, false = does not,
                                   null = cannot be known
       explainAnswers / explainKnowledge   the same, plus a rule id per person
       reason(ruleId, person)   the Hebrew reason for that rule, in the
                                person's grammatical gender
       solutions(target, mode)  every wish pattern that produces `target`

   tests/barman.test.mjs checks answers() and knowledge() against a brute-force
   possible-worlds model for every pattern up to n = 5.
   --------------------------------------------------------------------------- */

export const PEOPLE = [
  { name: "אוילר", f: false, sprite: "euler" },
  { name: "עדה", f: true, sprite: "ada" },
  { name: "גאוס", f: false, sprite: "gauss" },
  { name: "אמי", f: true, sprite: "emmy" },
  { name: "רמנוג׳ן", f: false, sprite: "ramanujan" },
];

export const QUESTION = {
  all: "כולם רוצים פלאפל?",
  any: "מישהו רוצה פלאפל?",
};

/* "{masculine|feminine}" → the form that fits the person. */
export function gendered(text, f) {
  return text.replace(/\{([^{}|]*)\|([^{}]*)\}/g, (_, m, w) => (f ? w : m));
}

export function answerText(answer, person) {
  if (answer === "yes") return "כן";
  if (answer === "no") return "לא";
  return person && person.f ? "לא יודעת" : "לא יודע";
}

/* ---- who says what ---------------------------------------------------- */

export function explainAnswers(wants, mode) {
  checkMode(mode);
  const out = [];
  for (let i = 0; i < wants.length; i++) {
    const said = out.map(x => x.answer);
    const last = i === wants.length - 1;
    let answer, rule;
    if (mode === "all") {
      if (said.includes("no")) [answer, rule] = ["no", "all-after-no"];
      else if (!wants[i]) [answer, rule] = ["no", "all-not-want"];
      else if (!last) [answer, rule] = ["dunno", "all-want-not-last"];
      else [answer, rule] = ["yes", "all-last-yes"];
    } else {
      if (said.includes("yes")) [answer, rule] = ["yes", "any-after-yes"];
      else if (wants[i]) [answer, rule] = ["yes", "any-wants"];
      else if (!last) [answer, rule] = ["dunno", "any-not-want-not-last"];
      else [answer, rule] = ["no", "any-last-no"];
    }
    out.push({ answer, rule });
  }
  return out;
}

export function answers(wants, mode) {
  return explainAnswers(wants, mode).map(x => x.answer);
}

/* ---- what the barman learns ------------------------------------------- */

export function explainKnowledge(said, mode) {
  checkMode(mode);
  const decisive = mode === "all" ? "no" : "yes";   // the answer that settles the question
  const first = said.indexOf(decisive);
  return said.map((a, i) => {
    if (first === -1 || i < first) {
      // "all": a "dunno" (or the final "yes") means "I want".
      // "any": a "dunno" (or the final "no") means "I don't want".
      return { know: mode === "all", rule: `${mode}-k-${a === "dunno" ? "dunno" : "last"}` };
    }
    if (i === first) return { know: mode === "any", rule: `${mode}-k-first` };
    return { know: null, rule: `${mode}-k-after` };
  });
}

export function knowledge(said, mode) {
  return explainKnowledge(said, mode).map(x => x.know);
}

/* ---- reverse direction: which wishes give these answers? --------------- */

export function patterns(n) {
  const out = [];
  for (let m = 0; m < 1 << n; m++) {
    out.push(Array.from({ length: n }, (_, i) => !(m & (1 << (n - 1 - i)))));
  }
  return out;   // starts with all-true, like a truth table
}

export function solutions(target, mode) {
  return patterns(target.length).filter(w => answers(w, mode).every((a, i) => a === target[i]));
}

/* People whose wish differs between solutions: it does not matter for the answers. */
export function freePeople(target, mode) {
  const sols = solutions(target, mode);
  return target.map((_, i) => i).filter(i => sols.some(w => w[i]) && sols.some(w => !w[i]));
}

/* ---- reasons, in Hebrew ------------------------------------------------ */

const REASONS = {
  // why a person answers what they answer
  "all-after-no":
    "מישהו {לפניו|לפניה} כבר ענה ״לא״, כך שכבר ברור שלא כולם רוצים. {הוא|היא} עונה ״לא״, בלי קשר למה {שהוא|שהיא} רוצה.",
  "all-not-want":
    "{הוא עצמו|היא עצמה} לא רוצה פלאפל, אז {הוא יודע|היא יודעת} בוודאות שלא כולם רוצים: ״לא״.",
  "all-want-not-last":
    "{הוא|היא} רוצה פלאפל, אבל זה לא מספיק: {הוא לא יודע|היא לא יודעת} מה רוצים מי {שאחריו|שאחריה}, ולכן {אינו יכול|אינה יכולה} לענות ״כן״ על ״כולם?״. גם ״לא״ {הוא לא יכול|היא לא יכולה} לענות. נשאר רק ״לא {יודע|יודעת}״.",
  "all-last-yes":
    "{הוא האחרון|היא האחרונה}, ואף אחד {לפניו|לפניה} לא ענה ״לא״, כלומר כל מי {שלפניו|שלפניה} רוצה (מי שלא רוצה היה עונה ״לא״). {הוא|היא} רוצה בעצמ{ו|ה}, אז {הוא יודע|היא יודעת} שכולם רוצים: ״כן!״.",
  "any-after-yes":
    "מישהו {לפניו|לפניה} כבר ענה ״כן״, כך שכבר ברור שמישהו רוצה. {הוא|היא} עונה ״כן״, בלי קשר למה {שהוא|שהיא} רוצה.",
  "any-wants":
    "{הוא עצמו|היא עצמה} רוצה פלאפל, אז {הוא יודע|היא יודעת} בוודאות שמישהו רוצה: ״כן״.",
  "any-not-want-not-last":
    "{הוא|היא} לא רוצה פלאפל, אבל זה לא מספיק: אולי מישהו {שאחריו|שאחריה} כן רוצה, ולכן {אינו יכול|אינה יכולה} לענות ״לא״ על ״מישהו?״. גם ״כן״ {הוא לא יכול|היא לא יכולה} לענות. נשאר רק ״לא {יודע|יודעת}״.",
  "any-last-no":
    "{הוא האחרון|היא האחרונה}, ואף אחד {לפניו|לפניה} לא ענה ״כן״, כלומר אף אחד {לפניו|לפניה} לא רוצה (מי שרוצה היה עונה ״כן״). גם {הוא|היא} לא רוצה, אז {הוא יודע|היא יודעת} שאף אחד לא רוצה: ״לא״.",

  // what the barman can deduce from an answer
  "all-k-dunno":
    "{הוא ענה|היא ענתה} ״לא {יודע|יודעת}״. אילו {הוא לא רצה|היא לא רצתה} פלאפל, {הוא היה יודע|היא הייתה יודעת} מיד שלא כולם רוצים, ועונה ״לא״. אז {הוא|היא} רוצה פלאפל.",
  "all-k-last":
    "{הוא ענה|היא ענתה} ״כן״ על ״כולם?״. אז כולם רוצים, וגם {הוא|היא}.",
  "all-k-first":
    "{הוא הראשון שענה|היא הראשונה שענתה} ״לא״. לפני כן איש לא אמר ״לא״, אז הדרך היחידה {שלו|שלה} לדעת שלא כולם רוצים היא {שהוא עצמו|שהיא עצמה} לא רוצה.",
  "all-k-after":
    "מישהו {לפניו|לפניה} כבר ענה ״לא״, אז {הוא היה|היא הייתה} עונה ״לא״ בכל מקרה, בין אם {רצה|רצתה} ובין אם לא. התשובה {שלו|שלה} אינה מגלה אם {הוא|היא} רוצה פלאפל.",
  "any-k-dunno":
    "{הוא ענה|היא ענתה} ״לא {יודע|יודעת}״. אילו {הוא רצה|היא רצתה} פלאפל, {הוא היה יודע|היא הייתה יודעת} מיד שמישהו רוצה, ועונה ״כן״. אז {הוא|היא} לא רוצה.",
  "any-k-last":
    "{הוא ענה|היא ענתה} ״לא״ על ״מישהו?״. אז אף אחד לא רוצה, וגם {הוא|היא} לא.",
  "any-k-first":
    "{הוא הראשון שענה|היא הראשונה שענתה} ״כן״. לפני כן איש לא אמר ״כן״, אז הדרך היחידה {שלו|שלה} לדעת שמישהו רוצה היא {שהוא עצמו|שהיא עצמה} רוצה.",
  "any-k-after":
    "מישהו {לפניו|לפניה} כבר ענה ״כן״, אז {הוא היה|היא הייתה} עונה ״כן״ בכל מקרה, בין אם {רצה|רצתה} ובין אם לא. התשובה {שלו|שלה} אינה מגלה אם {הוא|היא} רוצה פלאפל.",
};

export const RULE_IDS = Object.keys(REASONS);

export function reason(rule, person) {
  const text = REASONS[rule];
  if (!text) throw new Error(`rules.js: no reason for rule "${rule}"`);
  return gendered(text, !!(person && person.f));
}

function checkMode(mode) {
  if (mode !== "all" && mode !== "any") throw new Error(`rules.js: unknown mode "${mode}"`);
}
