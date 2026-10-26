/* rules.js — the logic of "מצאו עד": quantifiers over a small, fully shown
   domain, and the kind of evidence each claim needs. Pure: no DOM, so node can
   test it (tests/witness.test.mjs).
   ---------------------------------------------------------------------------
   A level's world:
       domain  [{id, name, g: "m"|"f", ...attributes}]   the students (x)
       ys      [{id, name}]                               the snacks (y), two-variable level only
       preds   {name: {attr, is, letter, def, yes, no}}   P(x) := x[attr] === is
       rels    {name: {attr, letter, def, yes, no}}       L(x, y) := x[attr] includes y.id
   yes / no are Hebrew sentence templates by gender, {m, f}: {n} = the
   student's name, {y} = the snack's name.

   A claim (data, not code):
       {type: "forall" | "exists", pred, neg?}   ∀x P(x), ∃x ¬P(x), ...
       {type: "not", of: claim}                  ¬∀x P(x)
       {type: "forall-exists", rel}              ∀x ∃y L(x, y)
       {type: "exists-forall", rel}              ∃y ∀x L(x, y)

   The rule the whole game teaches:
       ∀x P(x) false → one counterexample        ∃x P(x) true  → one witness
       ∀x P(x) true  → check every element       ∃x P(x) false → check every element
   (on a finite domain ∀ is a long ∧ and ∃ is a long ∨).

   Judges return {ok, code, kind, message, good}: code is a stable name for the
   tests, kind is the shell's colour for a not-ok message ("bad" | "info"),
   message is Hebrew HTML (what you did → why it fails → what to try), and
   good lists the ids that make the evidence work.
   --------------------------------------------------------------------------- */

/* ---- the world ----------------------------------------------------------- */

export const isF = x => x.g === "f";
const byG = (x, m, f) => (isF(x) ? f : m);

/** P(x) for a predicate given as data. */
export function holds(pred, x) {
  return x[pred.attr] === pred.is;
}

/** L(x, y) for a relation given as data. */
export function related(rel, x, y) {
  const v = x[rel.attr];
  return Array.isArray(v) && v.includes(y.id);
}

function predicateOf(level, claim, P) {
  if (P) return P;
  const d = level.preds && level.preds[claim.pred];
  if (!d) throw new Error(`unknown predicate: ${claim.pred}`);
  return x => holds(d, x);
}

/** The truth value of a claim over the level's world. An optional P replaces
    the one-place predicate by any function, to range over all possible worlds. */
export function evaluate(claim, level, P) {
  const D = level.domain;
  switch (claim.type) {
    case "forall":
    case "exists": {
      const p = predicateOf(level, claim, P);
      const q = x => (claim.neg ? !p(x) : p(x));
      return claim.type === "forall" ? D.every(q) : D.some(q);
    }
    case "not":
      return !evaluate(claim.of, level, P);
    case "forall-exists": {
      const r = level.rels[claim.rel];
      return D.every(x => level.ys.some(y => related(r, x, y)));
    }
    case "exists-forall": {
      const r = level.rels[claim.rel];
      return level.ys.some(y => D.every(x => related(r, x, y)));
    }
  }
  throw new Error(`unknown claim type: ${claim.type}`);
}

/** Push ¬ inside (generalised De Morgan): ¬∀x P ≡ ∃x ¬P, ¬∃x P ≡ ∀x ¬P. */
export function normal(claim) {
  if (claim.type !== "not") return claim;
  const c = normal(claim.of);
  if (c.type === "forall" || c.type === "exists")
    return { ...c, type: c.type === "forall" ? "exists" : "forall", neg: !c.neg };
  return { type: "not", of: c };
}

/** The body of a one-variable claim, as a test on one element. */
export function inner(level, claim, P) {
  const p = predicateOf(level, claim, P);
  return x => (claim.neg ? !p(x) : p(x));
}

/** The elements that settle a one-variable claim on their own: the witnesses
    of an ∃, the counterexamples of a ∀. Non-empty exactly when a single element
    is enough evidence (∃ true, ∀ false). */
export function decisive(level, claim) {
  const c = normal(claim), q = inner(level, c);
  return level.domain.filter(x => (c.type === "exists" ? q(x) : !q(x)));
}

/** What kind of evidence settles the claim in this world. */
export function evidenceKind(level, claim) {
  const c = normal(claim), v = evaluate(c, level);
  switch (c.type) {
    case "forall": return v ? "all" : "counterexample";
    case "exists": return v ? "witness" : "all";
    case "forall-exists": return v ? "witness-per-x" : "counterexample";
    case "exists-forall": return v ? "witness" : "counterexample-per-y";
  }
  throw new Error(`no evidence kind for ${c.type}`);
}

/** Every possible one-place predicate on the domain (2^n of them). */
export function* worlds(domain) {
  for (let mask = 0; mask < 1 << domain.length; mask++) {
    const yes = new Set(domain.filter((x, i) => (mask >> i) & 1).map(x => x.id));
    yield x => yes.has(x.id);
  }
}

/** Same truth value in every possible world. */
export function equivalent(a, b, level) {
  for (const P of worlds(level.domain)) if (evaluate(a, level, P) !== evaluate(b, level, P)) return false;
  return true;
}

export const isNegationOf = (option, target, level) => equivalent(option, { type: "not", of: target }, level);

/** "∀x P(x)", "¬∃x ¬P(x)", "∀x ∃y L(x, y)" */
export function formula(level, claim) {
  switch (claim.type) {
    case "forall":
    case "exists":
      return `${claim.type === "forall" ? "∀" : "∃"}x ${claim.neg ? "¬" : ""}${level.preds[claim.pred].letter}(x)`;
    case "not": return "¬" + formula(level, claim.of);
    case "forall-exists": return `∀x ∃y ${level.rels[claim.rel].letter}(x, y)`;
    case "exists-forall": return `∃y ∀x ${level.rels[claim.rel].letter}(x, y)`;
  }
  throw new Error(`unknown claim type: ${claim.type}`);
}

/* ---- Hebrew ------------------------------------------------------------- */

export const m = s => `<span class="m">${s}</span>`;
export const chip = v => `<span class="tv-${v ? "T" : "F"}">${v ? "T" : "F"}</span>`;

/** "אלון", "אלון ובתיה", "אלון, בתיה וכרמל" (word = "או" for "or") */
export function names(list, word) {
  const n = list.map(x => x.name);
  if (n.length < 2) return n.join("");
  const last = word ? ` ${word} ${n[n.length - 1]}` : ` ו${n[n.length - 1]}`;
  return n.slice(0, -1).join(", ") + last;
}

/** A sentence from a {m, f} template: fact(pred.no, x) → "בתיה לא הגישה את העבודה". */
export function fact(tpl, x, y) {
  return tpl[byG(x, "m", "f")].replace("{n}", x.name).replace("{y}", y ? y.name : "");
}

const CONSTRUCT = { 2: "שני", 3: "שלושת", 4: "ארבעת", 5: "חמשת", 6: "ששת", 7: "שבעת", 8: "שמונת", 9: "תשעת", 10: "עשרת" };
/** "כל ששת הכרטיסים", "כל ששת הסטודנטים" */
const every = (n, noun) => `כל ${CONSTRUCT[n] || n} ${noun}`;
const everyCard = n => every(n, "הכרטיסים");

function result(ok, code, message, kind, good) {
  return { ok, code, kind: ok ? undefined : kind, message, good: (good || []).map(x => x.id) };
}

/* ---- levels 1–4: one claim, a set of checked cards, a verdict ----------- */

/** markedIds: the cards the players checked; verdict: true (״הטענה נכונה״),
    false (״הטענה שגויה״) or null (not chosen yet). */
export function judgeEvidence(level, markedIds, verdict) {
  const c = normal(level.claim);
  const pred = level.preds[c.pred];
  const q = inner(level, c);
  const D = level.domain;
  const on = new Set(markedIds);
  const M = D.filter(x => on.has(x.id));
  const rest = D.filter(x => !on.has(x.id));
  const all = rest.length === 0;
  const L = pred.letter;
  const say = x => fact(holds(pred, x) ? pred.yes : pred.no, x);
  const val = x => m(`${L}(${x.name}) = ${chip(holds(pred, x))}`);
  const claimQ = `״${level.claimText}״`;
  const fits = M.filter(q), fails = M.filter(x => !q(x));

  if (!M.length)
    return result(false, "empty",
      "עוד לא בדקתם אף כרטיס. לחצו על כרטיס של סטודנט כדי לבדוק אותו: הכרטיסים שבדקתם הם הראיה שלכם.", "info");
  if (verdict !== true && verdict !== false)
    return result(false, "no-verdict",
      "מה המסקנה? בחרו מתחת לכרטיסים <b>הטענה נכונה</b> או <b>הטענה שגויה</b>, ואז לחצו <b>בדיקה</b>.", "info");

  if (c.type === "forall") {
    if (verdict === false) {
      if (fails.length) {
        const x = fails[0];
        let msg = `בדיוק! ${say(x)}: ${val(x)}. זו <b>דוגמה נגדית</b>, ודוגמה נגדית אחת מספיקה כדי להפריך ״לכל״. הטענה שגויה.`;
        if (fails.length > 1) msg += ` (מצאתם ${fails.length} דוגמאות נגדיות. גם אחת הייתה מספיקה.)`;
        else if (M.length > 1) msg += ` (את ${names(M.filter(y => y !== x))} לא היה צורך לבדוק.)`;
        return result(true, "ok", msg, null, fails);
      }
      if (all)
        return result(false, "all-fit",
          `בדקתם את ${everyCard(D.length)}, ואצל כולם ${m(`${L}(x) = ${chip(true)}`)}: אין כאן אף דוגמה נגדית. אז ${claimQ} נכון, והרובוט דווקא צודק. נסו <b>הטענה נכונה</b>.`, "bad");
      const did = M.length === 1
        ? `בדקתם את ${M[0].name}, אבל ${say(M[0])}: ${val(M[0])}.`
        : `בדקתם את ${names(M)}, ואצל כולם ${m(`${L}(x) = ${chip(true)}`)}.`;
      return result(false, "not-counter",
        `${did} כרטיס כזה מתאים לטענה, ולא מפריך אותה: דוגמה נגדית היא מישהו שאצלו ${m(`${L}(x) = ${chip(false)}`)}. בדקו עוד כרטיסים. ואם אין אף אחד כזה, אולי הרובוט דווקא צודק?`, "bad");
    }
    if (fails.length) {
      const x = fails[0];
      return result(false, "own-counter",
        `בחרתם <b>הטענה נכונה</b>, אבל בין הכרטיסים שבדקתם יש דוגמה נגדית: ${say(x)} (${val(x)}). אז ${claimQ} שקרי. נסו <b>הטענה שגויה</b>.`, "bad");
    }
    if (!all) {
      if (M.length === 1) {
        const x = M[0];
        const robot = level.robotExample === x.id ? " זו בדיוק ההוכחה של הרובוט, והיא לא מספיקה." : "";
        return result(false, "one-example",
          `דוגמה אחת לא מוכיחה ׳לכל׳. בדקתם רק את ${x.name}: ${say(x)}.${robot} הטענה מדברת על ${every(D.length, "הסטודנטים")}, ואולי אצל מישהו אחר זה לא כך. בדקו את כל הכרטיסים.`, "bad");
      }
      return result(false, "not-all",
        `בדרך הנכונה: בדקתם ${M.length} מתוך ${D.length}, ואצל כולם ${m(`${L}(x) = ${chip(true)}`)}. אבל ״לכל״ פירושו כולם: עוד לא בדקתם את ${names(rest)}.`, "info");
    }
    return result(true, "ok",
      `נכון! בדקתם את ${everyCard(D.length)}, ואצל כל אחד מהם ${m(`${L}(x) = ${chip(true)}`)}. על תחום סופי ״לכל״ הוא ״וגם״ ארוך, וכל החלקים שלו נכונים. הטענה נכונה, והפעם יש גם הוכחה.`, null, D);
  }

  /* exists */
  if (verdict === true) {
    if (fits.length) {
      const x = fits[0];
      let msg = `בדיוק! ${say(x)}: ${val(x)}. ${byG(x, "הוא <b>עד</b>", "היא <b>עדה</b>")}, ועד אחד מספיק כדי להוכיח ״יש״. הטענה נכונה.`;
      if (fits.length > 1) msg += ` (מצאתם ${fits.length} עדים. גם אחד היה מספיק.)`;
      else if (fails.length)
        msg += ` (${names(fails)} ${fails.length === 1 ? byG(fails[0], "אינו עד", "אינה עדה") : "אינם עדים"}, אבל זה לא משנה: מספיק עד אחד.)`;
      return result(true, "ok", msg, null, fits);
    }
    if (all)
      return result(false, "none-fit",
        `בדקתם את ${everyCard(D.length)}, ואצל כולם ${m(`${L}(x) = ${chip(false)}`)}: אין אף עד. אז ${claimQ} שקרי. נסו <b>הטענה שגויה</b>.`, "bad");
    const did = M.length === 1
      ? `בדקתם את ${M[0].name}, אבל ${say(M[0])}: ${val(M[0])}. לכן ${byG(M[0], "הוא לא עד", "היא לא עדה")}`
      : `בדקתם את ${names(M)}, ואצל כולם ${m(`${L}(x) = ${chip(false)}`)}, לכן אין ביניהם עד`;
    return result(false, "not-witness",
      `${did}: עד ל״יש״ חייב לקיים את ${m(`${L}(x)`)}. בדקו כרטיס אחר. מספיק למצוא אחד שמתאים.`, "bad");
  }
  if (fits.length) {
    const x = fits[0];
    return result(false, "own-witness",
      `בחרתם <b>הטענה שגויה</b>, אבל ${say(x)} (${val(x)}): ${byG(x, "הוא עד", "היא עדה")} לכך ש${claimQ} נכון! נסו <b>הטענה נכונה</b>.`, "bad");
  }
  if (!all) {
    if (M.length === 1) {
      const x = M[0];
      return result(false, "one-example",
        `בדקתם רק את ${x.name}: ${say(x)}. אבל זה לא מפריך ״יש״, כי אולי מישהו אחר כן. כדי להראות ש״אין אף אחד״ צריך לבדוק את כולם.`, "bad");
    }
    return result(false, "not-all",
      `בדרך הנכונה: בדקתם ${M.length} מתוך ${D.length}, ואצל כולם ${m(`${L}(x) = ${chip(false)}`)}. אבל אולי דווקא ${names(rest, "או")}? כדי להראות ש״אין אף אחד״ צריך לבדוק את כולם.`, "info");
  }
  return result(true, "ok",
    `נכון! בדקתם את ${everyCard(D.length)}, ואצל כולם ${m(`${L}(x) = ${chip(false)}`)}. על תחום סופי ״יש״ הוא ״או״ ארוך, וכל החלקים שלו שקריים. הטענה שגויה.`, null, D);
}

/** A correct answer for levels 1–4: the fewest cards that settle the claim. */
export function evidenceSolution(level) {
  const v = evaluate(level.claim, level);
  const kind = evidenceKind(level, level.claim);
  if (kind === "all") return { marked: level.domain.map(x => x.id), verdict: v };
  const d = decisive(level, level.claim);
  const pick = d.find(x => x.id === level.example) || d[0];
  return { marked: [pick.id], verdict: v };
}

/* ---- level 5: the negation of "everyone", then refute the robot ---------- */

/** option: index into level.options (or null); markedIds: cards picked in step 2.
    level.target is ∀x P(x) (״כולם הגישו״); level.claim is the robot's reading. */
export function judgeNegation(level, option, markedIds) {
  const opts = level.options;
  if (option == null || !opts[option])
    return result(false, "no-option",
      "<b>שלב 1:</b> בחרו נוסחה. איזו מהן אומרת בדיוק ״לא כולם הגישו״?", "info");
  const o = opts[option];
  if (!isNegationOf(o.claim, level.target, level))
    return result(false, "wrong-option",
      `בחרתם ${m(formula(level, o.claim))}. ${o.why} נסו נוסחה אחרת.`, "bad");

  const robot = normal(level.claim);              // ∀x ¬P(x)
  const pred = level.preds[robot.pred];
  const q = inner(level, robot);                  // ¬P(x)
  const D = level.domain;
  const on = new Set(markedIds || []);
  const M = D.filter(x => on.has(x.id));
  const say = x => fact(holds(pred, x) ? pred.yes : pred.no, x);
  const val = x => m(`${pred.letter}(${x.name}) = ${chip(holds(pred, x))}`);
  const right = m(formula(level, opts[option].claim));
  const robotF = m(formula(level, level.claim));

  if (!M.length)
    return result(false, "empty",
      `הנוסחה נכונה: ״לא כולם הגישו״ הוא ${right}. עכשיו <b>שלב 2</b>: לחצו על כרטיס שמפריך את הטענה של הרובוט, ״אף אחד לא הגיש״, ולחצו <b>בדיקה</b>.`, "info");
  const refute = M.filter(x => !q(x));            // someone who did submit
  if (!refute.length) {
    const x = M[0];
    return result(false, "not-counter",
      `${say(x)} (${val(x)}). נכון, ובזה ״לא כולם הגישו״ באמת מתקיים. אבל הרובוט טען יותר: ״אף אחד לא הגיש״, כלומר ${robotF}. כדי להפריך ״לכל״ צריך דוגמה נגדית: מישהו ש<b>כן</b> הגיש.`, "bad");
  }
  const x = refute[0];
  const missing = D.find(y => q(y));
  return result(true, "ok",
    `בדיוק! ${say(x)}: ${val(x)}. זו דוגמה נגדית ל־${robotF}, ולכן ״אף אחד לא הגיש״ שקרי. ובכל זאת ״לא כולם הגישו״ נכון: ${missing ? say(missing) : ""}. השלילה של ״כולם״ היא ״יש מישהו שלא״, ולא ״אף אחד״.`,
    null, refute);
}

export function negationSolution(level) {
  const option = level.options.findIndex(o => isNegationOf(o.claim, level.target, level));
  const d = decisive(level, level.claim);
  const pick = d.find(x => x.id === level.example) || d[0];
  return { option, marked: [pick.id] };
}

/* ---- level 6: who likes what, and the order of the quantifiers ---------- */

/** part 0: ∀x ∃y L(x, y), picks = {studentId: snackId}  (a snack each student likes)
    part 1: ∃y ∀x L(x, y), picks = {snackId: studentId}  (a student who doesn't like it) */
export function judgeOrder(level, part, picks) {
  const { claim } = level.parts[part];
  const r = level.rels[claim.rel];
  const D = level.domain, Y = level.ys;
  const X = id => D.find(x => x.id === id), Yof = id => Y.find(y => y.id === id);
  // each Hebrew argument isolated: otherwise "רמי, פלאפל" is one RTL run and the
  // arguments come out swapped inside the LTR formula
  const lf = (x, y) => m(`${r.letter}(<bdi>${x.name}</bdi>, <bdi>${y.name}</bdi>) = ${chip(related(r, x, y))}`);
  picks = picks || {};

  if (claim.type === "forall-exists") {
    const wrong = D.filter(x => picks[x.id] && !related(r, x, Yof(picks[x.id])));
    if (wrong.length) {
      const x = wrong[0], y = Yof(picks[x.id]);
      return result(false, "not-liked",
        `בחרתם בשורה של ${x.name} את ${y.name}, אבל ${fact(r.no, x, y)}: ${lf(x, y)}. בשורה של ${x.name} בחרו פריט עם לב.`, "bad");
    }
    const missing = D.filter(x => !picks[x.id]);
    if (missing.length)
      return result(false, "missing",
        `עוד חסר פריט בשורות של ${names(missing)}. ״כל סטודנט אוהב פריט כלשהו״ מדבר על כל סטודנט, ולכל אחד צריך לבחור פריט שהוא אוהב.`, "info");
    const list = D.map(x => `${x.name} ← ${Yof(picks[x.id]).name}`).join(" · ");
    return result(true, "ok",
      `חלק 1 נכון: לכל סטודנט מצאתם פריט שהוא אוהב (${list}). מותר לבחור פריטים שונים לסטודנטים שונים: ב־${m(formula(level, claim))} ה־${m("y")} יכול להיות תלוי ב־${m("x")}.`,
      null, D);
  }

  /* exists-forall, false: a counterexample for every snack */
  const wrong = Y.filter(y => picks[y.id] && related(r, X(picks[y.id]), y));
  if (wrong.length) {
    const y = wrong[0], x = X(picks[y.id]);
    return result(false, "likes-it",
      `בחרתם בעמודה של ${y.name} את ${x.name}, אבל ${fact(r.yes, x, y)}: ${lf(x, y)}. לכן ${byG(x, "הוא לא", "היא לא")} דוגמה נגדית. בעמודה של ${y.name} חפשו משבצת בלי לב.`, "bad");
  }
  const missing = Y.filter(y => !picks[y.id]);
  if (missing.length)
    return result(false, "missing",
      `עוד חסרה דוגמה נגדית בעמודות של ${names(missing)}. כדי להראות ש״אין פריט שכולם אוהבים״, כל פריט צריך דוגמה נגדית משלו.`, "info");
  const list = Y.map(y => `${y.name} ← ${X(picks[y.id]).name}`).join(" · ");
  return result(true, "ok",
    `חלק 2 נכון: לכל פריט יש מי שלא אוהב אותו (${list}). אז אין פריט שכולם אוהבים, ו־${m(formula(level, claim))} שקרי.`,
    null, Y);
}

/** One correct set of picks for both parts. */
export function orderSolution(level) {
  const r0 = level.rels[level.parts[0].claim.rel], r1 = level.rels[level.parts[1].claim.rel];
  const first = {}, second = {};
  for (const x of level.domain) {
    const y = level.ys.find(y => related(r0, x, y));
    if (y) first[x.id] = y.id;
  }
  for (const y of level.ys) {
    const x = level.domain.find(x => !related(r1, x, y));
    if (x) second[y.id] = x.id;
  }
  return [first, second];
}
