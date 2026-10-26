/* game.js — "מצאו עד": the campus robot makes claims about the six students,
   and the players answer with the right KIND of evidence: a witness, a
   counterexample, or every card checked. The logic and the Hebrew verdicts
   live in rules.js, the levels in levels.js, the small pictures in art.js.
   This file draws them and wires them to the shell. */

import { startGame, el } from "../shared/shell.js";
import { sprite } from "../shared/sprites.js";
import { art } from "./art.js";
import { LEVELS } from "./levels.js";
import * as R from "./rules.js";

const m = s => `<span class="m">${s}</span>`;
const byG = (x, ms, fs) => (x.g === "f" ? fs : ms);
const pic = (svg, cls) => el("span", { class: cls, "aria-hidden": "true", html: svg });
const tv = v => (v == null
  ? `<span class="w-unk">?</span>`
  : `<span class="tv-${v ? "T" : "F"}">${v ? "T" : "F"}</span>`);

const GRUMBLE = [
  "הכרטיסים שבחרתם עדיין אינם מצדיקים את התשובה. קראו את ההסבר.",
  "הממ. אני מחשב מחדש… לא, עדיין לא משוכנע.",
  "בדקו אם צריך כאן דוגמה אחת או בדיקה של כל הכרטיסים.",
  "יש הבדל בין מה שהכרטיסים מראים לבין המסקנה שבחרתם.",
];

/* ---- what a card shows -------------------------------------------------- */
const PIZZA = { olives: "זיתים", corn: "תירס", mushrooms: "פטריות", pepper: "פלפל", onion: "בצל", pineapple: "אננס" };
const ATTR = {
  hw: x => (x.hw
    ? { ico: "hwYes", text: byG(x, "הגיש עבודה", "הגישה עבודה") }
    : { ico: "hwNo", text: byG(x, "לא הגיש עבודה", "לא הגישה עבודה") }),
  locker: x => (x.locker ? { ico: "locker", text: "יש תא אחסון" } : { ico: "noLocker", text: "אין תא אחסון" }),
  pizza: x => ({ ico: "pizza-" + x.pizza, text: PIZZA[x.pizza] ? "פיצה עם " + PIZZA[x.pizza] : "פיצה בלי תוספות" }),
};

/* ---- the robot and its speech bubble ------------------------------------ */
function robotScene(level, formulaHTML) {
  const aside = el("span", { html: level.aside });
  const node = el("div", { class: "w-scene" }, [
    pic(sprite("robot"), "w-robot"),
    el("div", { class: "w-bubble" }, [
      el("p", { class: "w-say" }, [
        el("span", { class: "w-sr", text: "הרובוט אומר: " }),
        level.sayIcon ? pic(art(level.sayIcon), "w-say-ico") : null,
        el("b", { html: level.say }),
      ]),
      el("p", { class: "w-aside" }, [aside]),
      formulaHTML ? el("p", { class: "w-formula", html: formulaHTML }) : null,
    ]),
  ]);
  return { node, set(html) { aside.innerHTML = html; } };
}

/** One student card: the whole card is the button that checks it. */
function studentCard(level, x, key, onclick) {
  const res = el("span", { class: "w-res" });
  const role = el("span", { class: "w-role", hidden: true });
  const attrs = el("span", { class: "w-attrs" }, level.show.map(k => {
    const a = ATTR[k](x);
    return el("span", { class: "w-attr" + (k === key ? " w-key" : "") }, [pic(art(a.ico), "w-ico"), el("span", { text: a.text })]);
  }));
  const btn = el("button", { type: "button", class: "w-card", "aria-pressed": "false", onclick }, [
    role,
    el("span", { class: "w-who" }, [pic(sprite(x.avatar), "w-face"), el("span", { class: "w-name", text: x.name })]),
    attrs,
    res,
  ]);
  return { btn, res, role };
}

function domainRow(level, tally) {
  return el("div", { class: "w-domain-row" }, [el("h3", { class: "w-domain", text: level.domainText }), tally]);
}

function domainNote(level) {
  return el("p", { class: "w-world", html: level.mode === "order"
    ? `${m("D")} הוא עולם הסטודנטים שבטבלה, ו־${m("M")} הוא עולם הפריטים בתפריט. ${m("x ∈ D")} אומר ש־${m("x")} הוא אחד הסטודנטים; ${m("y ∈ M")} אומר ש־${m("y")} הוא אחד הפריטים.`
    : `${m("D")} הוא עולם הדיון: ששת הסטודנטים שבכרטיסים. ${m("x ∈ D")} אומר ש־${m("x")} הוא אחד מהם. ״לכל״ ו״קיים״ מתייחסים רק לסטודנטים האלה.` });
}

/* ======================================================================== */
/* levels 1–4: check cards, then a verdict                                   */
/* ======================================================================== */
function mountEvidence(level, ui) {
  const D = level.domain;
  const c = R.normal(level.claim);
  const pred = level.preds[c.pred];
  const q = R.inner(level, c);
  const isAll = c.type === "forall";
  const marked = new Set();
  let verdict = null, roles = null, grumble = 0;

  const robot = robotScene(level,
    `<span class="w-fl">בנוסחה: <span class="m w-big">${R.formula(level, level.claim)}</span></span> ` +
    `<span class="w-fl">כאשר ${m(pred.letter + "(x)")} = ״${pred.def}״</span>`);

  const tally = el("span", { class: "w-tally" });
  const cards = {};
  const roster = el("div", { class: "w-roster" }, D.map(x => {
    const k = studentCard(level, x, pred.attr, () => toggle(x.id));
    cards[x.id] = k;
    return k.btn;
  }));

  /* the long ∧ / ∨ that the claim is, on a finite domain */
  const terms = el("div", { class: "w-terms" });
  const expansion = el("section", { class: "w-exp", "aria-label": isAll ? "״לכל״ כ״וגם״ ארוך" : "״יש״ כ״או״ ארוך" }, [
    el("p", { class: "w-exp-title", html: isAll
      ? "על תחום סופי ״לכל״ הוא <b>״וגם״ ארוך</b>. כל כרטיס שבודקים ממלא בו חלק אחד:"
      : "על תחום סופי ״יש״ הוא <b>״או״ ארוך</b>. כל כרטיס שבודקים ממלא בו חלק אחד:" }),
    terms,
  ]);

  const vid = `w-v-${level.id}`;
  const vYes = el("button", { type: "button", "aria-pressed": "false", text: "הטענה נכונה", onclick() { setVerdict(true); } });
  const vNo = el("button", { type: "button", "aria-pressed": "false", text: "הטענה שגויה", onclick() { setVerdict(false); } });
  const verdictBox = el("div", { class: "w-verdict" }, [
    el("span", { class: "w-verdict-label", id: vid, text: "המסקנה שלכם:" }),
    el("div", { class: "g-choice", role: "group", "aria-labelledby": vid }, [vYes, vNo]),
  ]);

  ui.stage.append(el("div", { class: "w-board" }, [domainNote(level), robot.node, domainRow(level, tally), roster, expansion, verdictBox]));

  function value() {     // the long ∧ / ∨ so far: true, false or null (not settled yet)
    const seen = D.filter(x => marked.has(x.id));
    if (isAll) return seen.some(x => !q(x)) ? false : seen.length === D.length ? true : null;
    return seen.some(q) ? true : seen.length === D.length ? false : null;
  }

  function draw() {
    for (const x of D) {
      const k = cards[x.id], on = marked.has(x.id);
      k.btn.setAttribute("aria-pressed", String(on));
      k.btn.classList.toggle("w-on", on);
      k.res.innerHTML = on
        ? `${art("magnifier").replace("<svg", '<svg class="w-ico"')}<span class="m">${pred.letter}(${x.name}) = ${tv(R.holds(pred, x))}</span>`
        : `<span class="w-q" aria-hidden="true">?</span>${byG(x, "לא נבדק", "לא נבדקה")}`;
      const r = roles && roles.ids.includes(x.id);
      k.role.hidden = !r;
      k.role.textContent = r ? (roles.kind === "witness" ? byG(x, "עד", "עדה") : "דוגמה נגדית") : "";
      k.btn.classList.toggle("w-star", !!r);
    }
    tally.textContent = `נבדקו ${marked.size} מתוך ${D.length}`;

    const op = isAll ? "∧" : "∨";
    const v = value();
    const parts = [el("span", { class: "m w-exp-f", text: R.formula(level, level.claim) + " =" })];
    D.forEach((x, i) => {
      if (i) parts.push(el("span", { class: "w-op", "aria-hidden": "true", text: op }));
      const on = marked.has(x.id);
      parts.push(el("span", { class: "w-term" + (on ? " w-term-on" : "") }, [
        el("span", { class: "m", text: `${c.neg ? "¬" : ""}${pred.letter}(${x.name})` }),
        el("span", { html: tv(on ? q(x) : null) }),
      ]));
    });
    parts.push(el("span", { class: "w-op", text: "=" }));
    parts.push(el("span", { class: "w-term w-total" + (v == null ? "" : " w-term-on") }, [
      el("span", { class: "w-total-label", text: v == null ? "עוד לא ידוע" : "ידוע!" }),
      el("span", { html: tv(v) }),
    ]));
    terms.replaceChildren(...parts);

    vYes.setAttribute("aria-pressed", String(verdict === true));
    vNo.setAttribute("aria-pressed", String(verdict === false));
  }

  function toggle(id) {
    if (marked.has(id)) marked.delete(id); else marked.add(id);
    roles = null;
    draw();
  }
  function setVerdict(v) {
    verdict = verdict === v ? null : v;
    roles = null;
    draw();
  }
  function showWin(r) {
    const kind = R.evidenceKind(level, level.claim);
    roles = kind === "all" ? null : { kind, ids: r.good };
    robot.set(level.asideWin);
  }

  function check() {
    const r = R.judgeEvidence(level, [...marked], verdict);
    if (r.ok) showWin(r);
    else if (r.kind === "bad") robot.set(GRUMBLE[grumble++ % GRUMBLE.length]);
    draw();
    return { ok: r.ok, message: r.message, kind: r.kind };
  }
  function reset() {
    marked.clear(); verdict = null; roles = null; grumble = 0;
    robot.set(level.aside);
    draw();
  }
  function solve() {
    reset();
    const s = R.evidenceSolution(level);
    s.marked.forEach(id => marked.add(id));
    verdict = s.verdict;
    const r = R.judgeEvidence(level, s.marked, s.verdict);
    showWin(r);
    draw();
    return "הפתרון: " + r.message;
  }

  reset();
  return { check, reset, solve };
}

/* ======================================================================== */
/* level 5: the negation of "everyone", then refute the robot                */
/* ======================================================================== */
function mountNegation(level, ui) {
  const D = level.domain;
  const pred = level.preds[level.target.pred];
  const marked = new Set();
  let chosen = null, roles = null, grumble = 0;

  const robot = robotScene(level,
    `<span class="w-fl">ההודעה: ״לא כולם הגישו״ = <span class="m w-big">${R.formula(level, { type: "not", of: level.target })}</span></span> ` +
    `<span class="w-fl">כאשר ${m(pred.letter + "(x)")} = ״${pred.def}״</span>`);

  const optBtns = level.options.map((o, i) => el("button", {
    type: "button", class: "w-opt", "aria-pressed": "false",
    onclick() { chosen = chosen === i ? null : i; roles = null; draw(); },
  }, [
    el("span", { class: "m w-opt-f", text: R.formula(level, o.claim) }),
    el("span", { class: "w-opt-he", text: o.text }),
    o.robot ? el("span", { class: "w-tag", text: "הפירוש של הרובוט" }) : null,
  ]));
  const s1 = `w-s1-${level.id}`;
  const step1 = el("section", { class: "w-step", "aria-labelledby": s1 }, [
    el("h3", { id: s1, html: "שלב 1: איזו נוסחה אומרת בדיוק ״לא כולם הגישו״?" }),
    el("div", { class: "w-opts", role: "group", "aria-labelledby": s1 }, optBtns),
  ]);

  const tally = el("span", { class: "w-tally" });
  const cards = {};
  const roster = el("div", { class: "w-roster" }, D.map(x => {
    const k = studentCard(level, x, pred.attr, () => toggle(x.id));
    cards[x.id] = k;
    return k.btn;
  }));
  const step2 = el("section", { class: "w-step" }, [
    el("h3", { text: "שלב 2: מי מפריך את הטענה ״אף אחד לא הגיש״?" }),
    domainRow(level, tally),
    roster,
  ]);

  ui.stage.append(el("div", { class: "w-board" }, [domainNote(level), robot.node, step1, step2]));

  function draw() {
    optBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(chosen === i)));
    for (const x of D) {
      const k = cards[x.id], on = marked.has(x.id);
      k.btn.setAttribute("aria-pressed", String(on));
      k.btn.classList.toggle("w-on", on);
      k.res.innerHTML = on
        ? `${art("magnifier").replace("<svg", '<svg class="w-ico"')}<span class="m">${pred.letter}(${x.name}) = ${tv(R.holds(pred, x))}</span>`
        : `<span class="w-q" aria-hidden="true">?</span>${byG(x, "לא נבחר", "לא נבחרה")}`;
      const r = roles && roles.includes(x.id);
      k.role.hidden = !r;
      k.role.textContent = r ? "דוגמה נגדית" : "";
      k.btn.classList.toggle("w-star", !!r);
    }
    tally.textContent = marked.size ? `נבחרו ${marked.size}` : "";
  }
  function toggle(id) {
    if (marked.has(id)) marked.delete(id); else marked.add(id);
    roles = null;
    draw();
  }

  function check() {
    const r = R.judgeNegation(level, chosen, [...marked]);
    if (r.ok) { roles = r.good; robot.set(level.asideWin); }
    else if (r.kind === "bad") robot.set(GRUMBLE[grumble++ % GRUMBLE.length]);
    draw();
    return { ok: r.ok, message: r.message, kind: r.kind };
  }
  function reset() {
    marked.clear(); chosen = null; roles = null; grumble = 0;
    robot.set(level.aside);
    draw();
  }
  function solve() {
    reset();
    const s = R.negationSolution(level);
    chosen = s.option;
    s.marked.forEach(id => marked.add(id));
    const r = R.judgeNegation(level, chosen, s.marked);
    roles = r.good;
    robot.set(level.asideWin);
    draw();
    return "הפתרון: " + r.message;
  }

  reset();
  return { check, reset, solve };
}

/* ======================================================================== */
/* level 6: who likes what, and the order of the quantifiers                 */
/* ======================================================================== */
function mountOrder(level, ui) {
  const D = level.domain, Y = level.ys;
  const rel = level.rels[level.parts[0].claim.rel];
  let part = 0, grumble = 0;
  let picks = [{}, {}];
  const done = [false, false];

  const robot = robotScene(level,
    `<span class="w-fl">${m(`${rel.letter}(x, y)`)} = ״${rel.def}״</span>`);

  const partStatus = [];
  const partBtns = level.parts.map((p, i) => {
    const st = el("span", { class: "w-part-st" });
    partStatus.push(st);
    return el("button", { type: "button", class: "w-part", "aria-pressed": "false", onclick() { part = i; draw(); } }, [
      el("span", { class: "w-part-n" }, [`חלק ${i + 1}`, st]),
      el("span", { class: "w-part-he", text: `״${p.text}״` }),
      el("span", { class: "m w-part-f", text: R.formula(level, p.claim) }),
    ]);
  });
  const task = el("p", { class: "w-task" });
  const tally = el("p", { class: "w-tally" });

  const cells = {};
  const thead = el("thead", {}, [el("tr", {}, [
    el("td", { class: "w-corner" }),
    ...Y.map(y => el("th", { scope: "col" }, [pic(art(y.art), "w-ico w-snack"), el("span", { text: y.name })])),
  ])]);
  const tbody = el("tbody", {}, D.map(x => {
    cells[x.id] = {};
    return el("tr", {}, [
      el("th", { scope: "row" }, [el("span", { class: "w-rowh" }, [pic(sprite(x.avatar), "w-face"), el("span", { text: x.name })])]),
      ...Y.map(y => {
        const liked = R.related(rel, x, y);
        const mark = el("span", { class: "w-mark", "aria-hidden": "true" });
        const b = el("button", {
          type: "button", class: "w-cell" + (liked ? " w-liked" : ""), "aria-pressed": "false",
          "aria-label": `${x.name} ו${y.name}: ${liked ? byG(x, "אוהב", "אוהבת") : byG(x, "לא אוהב", "לא אוהבת")}`,
          onclick() { pick(x, y); },
        }, [pic(art(liked ? "heart" : "dot"), "w-ico"), mark]);
        cells[x.id][y.id] = { b, mark };
        return el("td", {}, [b]);
      }),
    ]);
  }));
  const grid = el("div", { class: "w-grid-wrap" }, [el("table", { class: "w-grid" }, [
    el("caption", { class: "w-sr", text: "מי אוהב איזה פריט: שורה לכל סטודנט, עמודה לכל פריט" }),
    thead, tbody,
  ])]);
  const legend = el("p", { class: "w-legend" }, [
    pic(art("heart"), "w-ico"), " אוהב  ", pic(art("dot"), "w-ico"), " לא אוהב",
  ]);
  const sums = el("div", { class: "w-sums" });

  ui.stage.append(el("div", { class: "w-board" }, [
    domainNote(level),
    robot.node,
    el("div", { class: "w-parts", role: "group", "aria-label": "שני חלקי השלב" }, partBtns),
    task, grid, legend, tally, sums,
  ]));

  const Yof = id => Y.find(y => y.id === id), Xof = id => D.find(x => x.id === id);

  function pick(x, y) {
    if (part === 0) picks[0][x.id] = picks[0][x.id] === y.id ? undefined : y.id;
    else picks[1][y.id] = picks[1][y.id] === x.id ? undefined : x.id;
    done[part] = false;
    draw();
  }

  function draw() {
    partBtns.forEach((b, i) => {
      b.setAttribute("aria-pressed", String(part === i));
      partStatus[i].textContent = done[i] ? " ✓ הושלם" : "";
    });
    task.innerHTML = part === 0
      ? "<b>חלק 1:</b> בכל <b>שורה</b> בחרו פריט שהסטודנט אוהב. כך מראים ש־" + m("∀x∈D ∃y∈M L(x, y)") + " נכון."
      : "<b>חלק 2:</b> בכל <b>עמודה</b> בחרו סטודנט שלא אוהב את הפריט. כך מראים ש־" + m("∃y∈M ∀x∈D L(x, y)") + " שקרי.";
    for (const x of D) for (const y of Y) {
      const { b, mark } = cells[x.id][y.id];
      const on = part === 0 ? picks[0][x.id] === y.id : picks[1][y.id] === x.id;
      b.setAttribute("aria-pressed", String(on));
      mark.textContent = on ? (part === 0 ? "✓" : "✗") : "";
      mark.className = "w-mark" + (on ? (part === 0 ? " w-mark-yes" : " w-mark-no") : "");
    }
    const n = part === 0 ? D.filter(x => picks[0][x.id]).length : Y.filter(y => picks[1][y.id]).length;
    tally.textContent = part === 0
      ? `נבחר פריט ב־${n} מתוך ${D.length} השורות.`
      : `נבחרה דוגמה נגדית ב־${n} מתוך ${Y.length} העמודות.`;
    const lines = [];
    if (done[0]) lines.push(`<p><b>חלק 1 ✓</b> לכל סטודנט נבחר פריט שהוא אוהב: ${D.map(x => `${x.name} ← ${Yof(picks[0][x.id]).name}`).join(" · ")}</p>`);
    if (done[1]) lines.push(`<p><b>חלק 2 ✓</b> לכל ${m("y")} יש מי שלא אוהב אותו: ${Y.map(y => `${y.name} ← ${Xof(picks[1][y.id]).name}`).join(" · ")}</p>`);
    sums.innerHTML = lines.join("");
  }

  function check() {
    const r = R.judgeOrder(level, part, picks[part]);
    if (!r.ok) {
      if (r.kind === "bad") robot.set(GRUMBLE[grumble++ % GRUMBLE.length]);
      draw();
      return { ok: false, message: r.message, kind: r.kind };
    }
    done[part] = true;
    if (done[0] && done[1]) {
      robot.set(level.asideWin);
      draw();
      return { ok: true, message: r.message + " שני החלקים הושלמו: לכל סטודנט יש פריט שהוא אוהב, אך אין פריט אחד שכולם אוהבים." };
    }
    part = done[0] ? 1 : 0;
    draw();
    return { ok: false, kind: "info", message: `${r.message} עכשיו <b>חלק ${part + 1}</b>: ${part === 1 ? "בכל עמודה בחרו סטודנט שלא אוהב את הפריט." : "בכל שורה בחרו פריט שהסטודנט אוהב."}` };
  }
  function reset() {
    picks = [{}, {}]; done[0] = done[1] = false; part = 0; grumble = 0;
    robot.set(level.aside);
    draw();
  }
  function solve() {
    reset();
    picks = R.orderSolution(level);
    done[0] = done[1] = true;
    part = 1;
    robot.set(level.asideWin);
    draw();
    return "הפתרון: בחלק 1 נבחר תא עם לב בכל שורה, ולכן לכל סטודנט יש פריט שהוא אוהב. בחלק 2 נבחר תא בלי לב בכל עמודה, ולכן לכל פריט יש סטודנט שאינו אוהב אותו. אפשר לעבור בין החלקים כדי לראות את הבחירות. הסיכומים מופיעים מתחת לטבלה.";
  }

  reset();
  return { check, reset, solve };
}

function mount(level, ui) {
  if (level.mode === "negation") return mountNegation(level, ui);
  if (level.mode === "order") return mountOrder(level, ui);
  return mountEvidence(level, ui);
}

startGame({ id: "witness", title: "מצאו עד", levels: LEVELS, mount });
