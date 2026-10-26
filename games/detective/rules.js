/* rules.js — the deduction rules of "הבלש של הקפטריה". Pure: no DOM, runs in node.
   ---------------------------------------------------------------------------
   Atoms (per level) give every letter its two Hebrew sentences:
       { B: { pos: "הרובוט היה בביתן", neg: "הרובוט לא היה בביתן" }, ... }
   A literal is a letter or its negation: "B", "!B". neg("!B") === "B".
   A card is a fact or an implication between two literals:
       { kind: "fact", lit: "B" }          ״הרובוט היה בביתן״        B
       { kind: "if", from: "B", to: "C" }  ״אם …, אז …״               B → C
   card("B -> C"), card("!W -> !N"), card("B") build them from short strings.

       apply(rule, a, b, atoms)   rule = "mp" | "mt" | "hs"; the order of a, b
                                  does not matter. → {ok:true, card} or
                                  {ok:false, reason} (Hebrew HTML: what you did →
                                  why it does not fit → what to try)
       classify(premises, conclusion)  → "mp" | "mt" | "hs" | "affirm" | "deny" | "invalid"
       counterexample(premises, conclusion)  a truth-table row (logic.js) where all
                                  premises are true and the conclusion false, or null
       valid(premises, conclusion)  no such row
       shortestProof(premises, target)  a shortest list of rule applications
                                  (breadth-first over sets of cards)
       explainChoice(arg, choice, atoms)  the judge mode's verdict on an answer:
                                  {correct, html, why}; why = the reason alone

   tests/detective.test.mjs checks every successful apply() against the truth
   tables, both fallacies as invalid, and every level's advertised proof length.
   --------------------------------------------------------------------------- */

import { evaluate, assignments, variables } from "../shared/logic.js";

export const RULES = {
  mp: { id: "mp", name: "כלל הניתוק", latin: "Modus Ponens", top: ["X → Y", "X"], bottom: "Y",
    taut: "((X → Y) ∧ X) → Y", say: "מ־X → Y ומ־X מסיקים Y" },
  mt: { id: "mt", name: "כלל השלילה", latin: "Modus Tollens", top: ["X → Y", "¬Y"], bottom: "¬X",
    taut: "((X → Y) ∧ ¬Y) → ¬X", say: "מ־X → Y ומ־לא Y מסיקים לא X" },
  hs: { id: "hs", name: "כלל השרשרת", latin: "Hypothetical Syllogism", top: ["X → Y", "Y → Z"], bottom: "X → Z",
    taut: "((X → Y) ∧ (Y → Z)) → (X → Z)", say: "מ־X → Y ומ־Y → Z מסיקים X → Z" },
};
export const FALLACIES = {
  affirm: { id: "affirm", name: "כשל אישור המסקנה", top: ["X → Y", "Y"], bottom: "X", taut: "((X → Y) ∧ Y) → X" },
  deny: { id: "deny", name: "כשל שלילת ההנחה", top: ["X → Y", "¬X"], bottom: "¬Y", taut: "((X → Y) ∧ ¬X) → ¬Y" },
};
export const RULE_IDS = ["mp", "mt", "hs"];
export const nameOf = k => (RULES[k] || FALLACIES[k]).name;
export const isRule = k => k in RULES;

/* ---- literals and cards ------------------------------------------------- */
export const isNeg = lit => lit.startsWith("!");
export const atomOf = lit => lit.replace(/^!/, "");
export const neg = lit => (isNeg(lit) ? lit.slice(1) : "!" + lit);
export const fact = lit => ({ kind: "fact", lit });
export const imp = (from, to) => ({ kind: "if", from, to });

function readLit(s, src) {
  const t = s.trim().replace(/^[¬~]/, "!");
  if (!/^!?[A-Z][0-9]*$/.test(t) || /^!?[TF]$/.test(t) || /^!?[XYZ]$/.test(t))
    throw new SyntaxError(`rules.js: "${s}" in "${src}" is not a literal (X, Y, Z are kept for the rule patterns, T and F are constants)`);
  return t;
}
/** "B" → fact, "!W -> !N" → implication. Cards pass through unchanged. */
export function card(src) {
  if (typeof src !== "string") return src;
  const parts = src.split(/->|→/);
  if (parts.length === 1) return fact(readLit(parts[0], src));
  if (parts.length === 2) return imp(readLit(parts[0], src), readLit(parts[1], src));
  throw new SyntaxError(`rules.js: cannot read card "${src}"`);
}

export const key = c => (c.kind === "fact" ? c.lit : c.from + ">" + c.to);
export const same = (a, b) => key(a) === key(b);

/* ---- words and formulas ------------------------------------------------- */
export const q = s => `״${s}״`;
export function litText(atoms, lit) {
  const a = atoms[atomOf(lit)];
  if (!a) throw new Error(`rules.js: no sentence for ${atomOf(lit)}`);
  return isNeg(lit) ? a.neg : a.pos;
}
export function cardText(atoms, c) {
  return c.kind === "fact" ? litText(atoms, c.lit) : `אם ${litText(atoms, c.from)}, אז ${litText(atoms, c.to)}`;
}
export const litFormula = lit => (isNeg(lit) ? "¬" : "") + atomOf(lit);
export const cardFormula = c => (c.kind === "fact" ? litFormula(c.lit) : `${litFormula(c.from)} → ${litFormula(c.to)}`);
/** The same card in logic.js syntax, for the truth tables. */
export const cardLogic = c => (c.kind === "fact" ? c.lit : `${c.from} -> ${c.to}`);

/* Literals and cards inside the Hebrew reasons: the sentence in ״…״, or the
   formula (LTR) when the caller has no sentences (tests, the solver). */
const words = atoms => ({
  L: lit => (atoms ? q(litText(atoms, lit)) : `<span class="m">${litFormula(lit)}</span>`),
  C: c => (atoms ? q(cardText(atoms, c)) : `<span class="m">${cardFormula(c)}</span>`),
});

/* ---- the three rules ---------------------------------------------------- */
const HEAD = {
  mp: "כלל הניתוק צריך גרירה ואת ההנחה שלה.",
  mt: "כלל השלילה צריך גרירה ואת השלילה של המסקנה שלה.",
  hs: "כלל השרשרת צריך שתי גרירות, שהמסקנה של האחת היא ההנחה של השנייה.",
};
const fail = reason => ({ ok: false, reason });
const linked = (a, b) => a.to === b.from || b.to === a.from;

/** Apply a rule to two cards (in either order). */
export function apply(rule, a, b, atoms) {
  a = card(a); b = card(b);
  const { L, C } = words(atoms);
  const head = HEAD[rule];
  if (!head) throw new Error(`rules.js: unknown rule ${rule}`);
  const ifs = [a, b].filter(c => c.kind === "if");
  const facts = [a, b].filter(c => c.kind === "fact");

  if (rule === "hs") {
    if (facts.length === 2)
      return fail(`${head} בחרתם שתי עובדות, ${C(a)} ו${C(b)}. בחרו שני כרטיסי ״אם… אז…״.`);
    if (facts.length === 1)
      return fail(`${head} בחרתם עובדה, ${C(facts[0])}. עם גרירה ועובדה עובדים כלל הניתוק או כלל השלילה: נסו אחד מהם.`);
    if (a.to === b.from && b.to === a.from)
      return fail(`${head} כאן כל גרירה מובילה אל השנייה, והשרשרת חוזרת להתחלה: יוצא ״אם ${atoms ? litText(atoms, a.from) : litFormula(a.from)}, אז ${atoms ? litText(atoms, a.from) : litFormula(a.from)}״, וזה לא מלמד כלום. נסו זוג אחר.`);
    if (a.to === b.from) return { ok: true, card: imp(a.from, b.to) };
    if (b.to === a.from) return { ok: true, card: imp(b.from, a.to) };
    const near = a.to === neg(b.from) ? [a, b] : b.to === neg(a.from) ? [b, a] : null;
    if (near)
      return fail(`${head} המסקנה של גרירה אחת היא ${L(near[0].to)}, וההנחה של השנייה היא ${L(near[1].from)}: זו השלילה שלה, לא אותו משפט. כדי לשרשר, צריך בדיוק אותו משפט. נסו זוג אחר.`);
    if (a.from === b.from)
      return fail(`${head} לשתי הגרירות שבחרתם אותה הנחה, ${L(a.from)}, ואף אחת מהן לא ממשיכה את השנייה. נסו זוג אחר.`);
    if (a.to === b.to)
      return fail(`${head} לשתי הגרירות שבחרתם אותה מסקנה, ${L(a.to)}, ואף אחת מהן לא ממשיכה את השנייה. נסו זוג אחר.`);
    return fail(`${head} בגרירות שבחרתם המסקנות הן ${L(a.to)} ו${L(b.to)}, וההנחות הן ${L(a.from)} ו${L(b.from)}: אין משפט שהוא גם מסקנה של אחת וגם הנחה של השנייה. נסו זוג אחר.`);
  }

  // mp and mt: one implication and one fact
  if (!ifs.length)
    return fail(`${head} בחרתם שתי עובדות, ${C(a)} ו${C(b)}. החליפו אחת מהן בכרטיס ״אם… אז…״.`);
  if (!facts.length)
    return fail(`${head} בחרתם שתי גרירות, ואין ביניהן עובדה. ` + (linked(a, b)
      ? "שתי גרירות שממשיכות זו את זו הן בדיוק המקום של כלל השרשרת: נסו אותו."
      : "החליפו אחת מהן בכרטיס עובדה."));
  const g = ifs[0], f = facts[0].lit;

  if (rule === "mp") {
    if (f === g.from) return { ok: true, card: fact(g.to) };
    if (f === neg(g.to))
      return fail(`${head} בחרתם את ${L(f)}, וזו השלילה של המסקנה, לא ההנחה. עם השלילה של המסקנה עובד כלל השלילה: נסו אותו.`);
    if (f === g.to)
      return fail(`${head} בחרתם את ${L(f)}, וזו המסקנה של הגרירה, לא ההנחה שלה. מהמסקנה אי אפשר לחזור אל ההנחה ${L(g.from)}: זה כשל אישור המסקנה. חפשו כרטיס שאומר ${L(g.from)}, או הסיקו אותו קודם.`);
    if (f === neg(g.from))
      return fail(`${head} בחרתם את ${L(f)}, וזו השלילה של ההנחה ${L(g.from)}. מהשלילה של ההנחה לא נובע כלום על המסקנה: להסיק ממנה ${L(neg(g.to))} זה כשל שלילת ההנחה. נסו זוג אחר.`);
    return fail(`${head} בחרתם את ${L(f)}, אבל ההנחה של הגרירה היא ${L(g.from)}. חפשו כרטיס שאומר בדיוק ${L(g.from)}, או הסיקו אותו קודם.`);
  }

  // mt
  if (f === neg(g.to)) return { ok: true, card: fact(neg(g.from)) };
  if (f === g.from)
    return fail(`${head} בחרתם את ${L(f)}, וזו ההנחה עצמה. עם ההנחה עובד כלל הניתוק: נסו אותו.`);
  if (f === g.to)
    return fail(`${head} בחרתם את ${L(f)}, וזו המסקנה עצמה, לא השלילה שלה. מהמסקנה לא נובע כלום על ההנחה (זה היה כשל אישור המסקנה). כלל השלילה צריך את ${L(neg(g.to))}: חפשו כרטיס כזה, או הסיקו אותו קודם.`);
  if (f === neg(g.from))
    return fail(`${head} בחרתם את ${L(f)}, וזו השלילה של ההנחה. כלל השלילה הולך בכיוון ההפוך: מהשלילה של המסקנה, ${L(neg(g.to))}, אל השלילה של ההנחה. חפשו את ${L(neg(g.to))}. (ולהסיק מ${L(f)} את ${L(neg(g.to))} זה כשל שלילת ההנחה.)`);
  return fail(`${head} בחרתם את ${L(f)}, אבל השלילה של המסקנה של הגרירה היא ${L(neg(g.to))}. חפשו כרטיס שאומר בדיוק את זה, או הסיקו אותו קודם.`);
}

/* ---- arguments: the two valid shapes, the chain, and the two fallacies --- */
/** What the fact is, seen from the implication: "from" | "to" | "negFrom" | "negTo" | null. */
export function roleOf(g, lit) {
  if (lit === g.from) return "from";
  if (lit === g.to) return "to";
  if (lit === neg(g.from)) return "negFrom";
  if (lit === neg(g.to)) return "negTo";
  return null;
}
export const NEEDS = { mp: "from", mt: "negTo", affirm: "to", deny: "negFrom" };
const roleLit = (g, role) => ({ from: g.from, to: g.to, negFrom: neg(g.from), negTo: neg(g.to) })[role];

/** Which pattern an argument with two premises follows. */
export function classify(premises, conclusion) {
  if (premises.length !== 2) return "invalid";
  const [a, b] = premises.map(card), c = card(conclusion);
  for (const r of RULE_IDS) {
    const res = apply(r, a, b);
    if (res.ok && same(res.card, c)) return r;
  }
  const ifs = [a, b].filter(x => x.kind === "if"), facts = [a, b].filter(x => x.kind === "fact");
  if (ifs.length === 1 && facts.length === 1 && c.kind === "fact") {
    const g = ifs[0], f = facts[0].lit;
    if (f === g.to && c.lit === g.from) return "affirm";
    if (f === neg(g.from) && c.lit === neg(g.to)) return "deny";
  }
  return "invalid";
}

/* ---- truth tables (logic.js) -------------------------------------------- */
/** Variables of the cards, in order of first appearance. */
export function letters(cards) {
  return [...new Set(cards.map(card).flatMap(c => variables(cardLogic(c))))];
}
/** A row where every premise is true and the conclusion false, or null. */
export function counterexample(premises, conclusion) {
  const ps = premises.map(card).map(cardLogic), c = cardLogic(card(conclusion));
  for (const env of assignments(letters([...premises, conclusion]))) {
    if (ps.every(p => evaluate(p, env)) && !evaluate(c, env)) return env;
  }
  return null;
}
export const valid = (premises, conclusion) => counterexample(premises, conclusion) === null;

/* ---- the solver ---------------------------------------------------------- */
/** A shortest proof of `target` from `premises`: [{rule, a, b, card}] (a, b are
    cards already on the table), [] if the target is a premise, null if there is
    none within maxSteps. Breadth-first over sets of cards, so it is exact. */
export function shortestProof(premises, target, maxSteps = 6) {
  premises = premises.map(card); target = card(target);
  const goal = key(target);
  if (premises.some(c => key(c) === goal)) return [];
  const stateKey = cards => cards.map(key).sort().join("|");
  const seen = new Set([stateKey(premises)]);
  let frontier = [{ cards: premises, steps: [] }];
  for (let d = 1; d <= maxSteps && frontier.length; d++) {
    const next = [];
    for (const s of frontier) {
      const have = new Set(s.cards.map(key));
      for (let i = 0; i < s.cards.length; i++) for (let j = i + 1; j < s.cards.length; j++) {
        for (const rule of RULE_IDS) {
          const r = apply(rule, s.cards[i], s.cards[j]);
          if (!r.ok || have.has(key(r.card))) continue;
          const steps = [...s.steps, { rule, a: s.cards[i], b: s.cards[j], card: r.card }];
          if (key(r.card) === goal) return steps;
          const cards = [...s.cards, r.card], k = stateKey(cards);
          if (seen.has(k)) continue;
          seen.add(k);
          next.push({ cards, steps });
        }
      }
    }
    frontier = next;
  }
  return null;
}

/** Everything derivable from the premises (the closure under the three rules). */
export function closure(premises, limit = 200) {
  const cards = premises.map(card), have = new Set(cards.map(key));
  for (let grew = true; grew && cards.length < limit;) {
    grew = false;
    for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
      for (const rule of RULE_IDS) {
        const r = apply(rule, cards[i], cards[j]);
        if (r.ok && !have.has(key(r.card))) { have.add(key(r.card)); cards.push(r.card); grew = true; }
      }
    }
  }
  return cards;
}

/* ---- the judge mode ------------------------------------------------------ */
const IS = { from: "ההנחה של הגרירה", to: "המסקנה של הגרירה", negFrom: "השלילה של ההנחה", negTo: "השלילה של המסקנה" };
const START = { from: "מההנחה של הגרירה", to: "מהמסקנה של הגרירה", negFrom: "מהשלילה של ההנחה", negTo: "מהשלילה של המסקנה" };

/** "היונה לא אכלה את הכריך, ויש חרדל על המקור של היונה" for a truth-table row. */
export function situation(atoms, env) {
  const s = Object.keys(env).map(v => litText(atoms, env[v] ? v : "!" + v));
  return s.length < 2 ? s.join("") : s.slice(0, -1).join(", ") + ", ו" + s[s.length - 1];
}
const chip = v => `<span class="tv-${v ? "T" : "F"}">${v ? "T" : "F"}</span>`;
export const rowHTML = env => `<span class="m">${Object.keys(env).map(v => `${v} = ${chip(env[v])}`).join(", ")}</span>`;

/** The counter-situation of an invalid argument, in the story's words. */
export function counterHTML(arg, atoms) {
  const env = counterexample(arg.premises, arg.conclusion);
  if (!env) return "";
  const c = card(arg.conclusion);
  return `<span class="d-counter"><b>דוגמה נגדית:</b> ${situation(atoms, env)}. ${arg.counter ? arg.counter + " " : ""}` +
    `במצב כזה שני הנתונים נכונים, והמסקנה ${q(cardText(atoms, c))} שקרית. בטבלת האמת זו השורה ${rowHTML(env)}.</span>`;
}

/** Why a valid argument is valid / an invalid one is invalid, in one sentence. */
export function roleSentence(arg, atoms) {
  const ps = arg.premises.map(card);
  const g = ps.find(c => c.kind === "if"), f = ps.find(c => c.kind === "fact");
  if (!f) return "המסקנה של גרירה אחת היא ההנחה של השנייה.";
  const r = roleOf(g, f.lit);
  return r ? `הנתון ${q(litText(atoms, f.lit))} הוא ${IS[r]}.` : "";
}

/** The judge's answer to `choice` for an argument {premises, conclusion, answer}. */
export function explainChoice(arg, choice, atoms) {
  const ans = arg.answer, ps = arg.premises.map(card);
  const g = ps.find(c => c.kind === "if"), f = ps.find(c => c.kind === "fact");
  const concl = q(cardText(atoms, card(arg.conclusion)));
  const role = roleSentence(arg, atoms);
  const need = k => {
    if (k === "hs") return f ? "כלל השרשרת מחבר שתי גרירות, וכאן יש רק גרירה אחת." : "";
    if (!f) return `${nameOf(k)} מתחיל מגרירה ועובדה, וכאן יש שתי גרירות.`;
    return `${nameOf(k)} מתחיל ${START[NEEDS[k]]} (כאן: ${q(litText(atoms, roleLit(g, NEEDS[k])))}).`;
  };
  const counter = counterHTML(arg, atoms);

  // why: the reason without the verdict, for the verdict box next to the argument
  const why = isRule(ans)
    ? `${role} לכן המסקנה ${concl} נובעת: בכל מצב שבו שני הנתונים נכונים, גם היא נכונה.`
    : `${role} מהנתונים האלה המסקנה לא נובעת. ${counter}`;
  if (choice === ans) {
    return {
      correct: true, why,
      html: (isRule(ans)
        ? `נכון: הטיעון <b>תקף</b>, לפי <b>${nameOf(ans)}</b>. `
        : `נכון: הטיעון <b>לא תקף</b>, זה <b>${nameOf(ans)}</b>. `) + why,
    };
  }
  let html;
  if (isRule(choice) && !isRule(ans))
    html = `הרובוט שכנע אתכם, אבל הטיעון <b>לא תקף</b>. ${need(choice)} ${role} ${counter} נסו שוב: איזה כשל זה?`;
  else if (!isRule(choice) && isRule(ans))
    html = `דווקא <b>תקף</b>: אין אף מצב שבו שני הנתונים נכונים והמסקנה שקרית. ${need(choice)} ${role} נסו שוב: לפי איזה כלל?`;
  else if (isRule(choice))
    html = `נכון שהטיעון תקף, אבל לא לפי ${nameOf(choice)}. ${need(choice)} ${role} נסו כלל אחר.`;
  else
    html = `נכון שהטיעון לא תקף, אבל זה לא ${nameOf(choice)}. ${need(choice)} ${role} נסו את הכשל השני.`;
  return { correct: false, why, sameVerdict: isRule(choice) === isRule(ans), html: html.replace(/\s+/g, " ").trim() };
}
