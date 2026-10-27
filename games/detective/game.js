/* game.js — "הבלש של הקפטריה": the deduction rules as a detective story.
   The rules, the solver and every Hebrew reason live in rules.js; the cases in
   levels.js. This file draws the table of cards and the robot's arguments and
   wires them to the shell.

   Two modes:
     derive  pick two cards and a rule → a new card, until the target is proved
     judge   the robot's arguments: "תקף" + which rule, or "לא תקף" + which fallacy */

import { startGame, el } from "../shared/shell.js";
import { sprite } from "../shared/sprites.js";
import { LEVELS } from "./levels.js";
import * as D from "./rules.js";
import { ART } from "./art.js";

const q = D.q;
const stepsWord = k => (k === 1 ? "בצעד אחד" : `ב־${k} צעדים`);
const SUSPECTS = {
  robot: { name: "הרובוט", role: "החשוד" },
  pigeon: { name: "היונה", role: "החשודה" },
  student: { name: "הסטודנט", role: "החשוד" },
};

const GUARD_GOOD = [
  "אה־הא! ראיה חדשה לתיק.",
  "יפה. אני רושם את זה. בעט. בכתב יד יפה.",
  "עוד חוליה בשרשרת. הכריך שלי ינוקם!",
  "זה כבר מתחיל להיראות כמו חקירה אמיתית.",
];
const GUARD_BAD = [
  "הכלל שבחרתם אינו מתאים לזוג הכרטיסים. בדקו את הנימוק.",
  "כדי להסיק מסקנה, שני הכרטיסים צריכים להתאים לתבנית של הכלל.",
  "רגע. זה נשמע משכנע, אבל זה לא הכלל.",
  "בדקו איזה חלק של הגרירה מופיע בכרטיס השני.",
];

/* ---- pieces shared by both modes ---------------------------------------- */

/** A character with a speech bubble; returns {box, say}. */
function speech(who, name) {
  const line = el("span", { class: "d-line" });
  const box = el("div", { class: "d-scene" }, [
    el("div", { class: "d-speaker", "aria-hidden": "true", html: sprite(who) }),
    el("p", { class: "d-bubble" }, [el("b", { text: name + ": " }), line]),
  ]);
  return { box, say(s) { line.textContent = s; } };
}

function cardHTML(atoms, c) {
  if (c.kind === "fact") return D.litText(atoms, c.lit);
  return `<b class="d-kw">אם</b> ${D.litText(atoms, c.from)}, <b class="d-kw">אז</b> ${D.litText(atoms, c.to)}`;
}
const kindWord = c => (c.kind === "if" ? "אם… אז…" : "פסוק פשוט או שלילתו");

/** The inside of a card: head (number, kind, flags), sentence, formula, origin. */
function cardParts(atoms, c, { n, origin, flags = true, label } = {}) {
  return [
    el("span", { class: "d-card-head" }, [
      n ? el("span", { class: "d-num" }, [el("span", { class: "d-sr", text: "כרטיס " }), String(n)]) : null,
      el("span", { class: "d-kind", text: label || kindWord(c) }),
      flags ? el("span", { class: "d-flag d-flag-new", "aria-hidden": "true", text: "חדש" }) : null,
      flags ? el("span", { class: "d-flag d-flag-sel", "aria-hidden": "true", text: "✓ נבחר" }) : null,
    ]),
    el("span", { class: "d-text", html: cardHTML(atoms, c) }),
    el("span", { class: "d-formula" }, [el("span", { class: "m", text: D.cardFormula(c) })]),
    origin ? el("span", { class: "d-origin", text: originText(origin) }) : null,
  ];
}
function originText(o) {
  const [a, b] = [o.a, o.b].sort((x, y) => x - y);
  return `מכרטיסים ${a} ו־${b}, ב${D.RULES[o.rule].name}`;
}

/** The rule's pattern as an inference line: premises over a bar, conclusion below. */
function patternEl(r) {
  return el("span", { class: "m d-pat", "aria-hidden": "true" }, [
    el("span", { class: "d-pat-top" }, r.top.flatMap((t, i) => (i ? [el("span", { class: "d-pat-gap" }), t] : [t]))),
    el("span", { class: "d-pat-bot", text: r.bottom }),
  ]);
}
const RULE_SAY = {
  mp: "מהגרירה X → Y ומ־X מסיקים Y",
  mt: "מהגרירה X → Y ומ־לא Y מסיקים לא X",
  hs: "מהגרירות X → Y ו־Y → Z מסיקים X → Z",
};

/* ---- derive: the table of cards ----------------------------------------- */

function mountDerive(level, ui) {
  const atoms = level.atoms;
  const guard = speech("guard", "השומר");

  const sus = SUSPECTS[level.suspect];
  const stamp = el("span", { class: "d-stamp" + (level.stamp ? " d-stamp-" + level.stamp.kind : ""), hidden: true, text: level.stamp ? level.stamp.text : "" });
  const suspect = el("figure", { class: "d-suspect" }, [
    el("span", { class: "d-suspect-pic", "aria-hidden": "true", html: sprite(level.suspect) }),
    el("figcaption", {}, [el("span", { class: "d-suspect-role", text: sus.role }), el("b", { text: sus.name })]),
    stamp,
  ]);

  /* what to prove */
  const proofMark = el("span", { class: "d-proof-mark", hidden: true });
  const target = el("section", { class: "d-target", "aria-label": "מה צריך להוכיח" }, [
    el("span", { class: "d-target-ico", "aria-hidden": "true", html: ART.magnifier }),
    el("div", { class: "d-target-body" }, [
      el("h3", { class: "d-h", text: "מה צריך להוכיח" }),
      el("div", { class: `d-card d-${level.target.kind} d-goalcard` }, [
        ...cardParts(atoms, level.target, { flags: false }), proofMark,
      ]),
      el("p", { class: "d-target-note", text: `אפשר להוכיח ${stepsWord(level.steps)}.` }),
    ]),
  ]);

  /* the table */
  const grid = el("div", { class: "d-grid", role: "group", "aria-label": "הכרטיסים על השולחן" });
  const tableBox = el("section", { class: "d-table" }, [el("h3", { class: "d-h", text: "הכרטיסים על השולחן" }), grid]);

  /* the rules */
  const status = el("p", { class: "d-status" });
  const ruleList = el("div", { class: "d-rule-list" }, D.RULE_IDS.map(id => {
    const r = D.RULES[id];
    return el("button", {
      type: "button", class: "d-rule", "aria-label": `${r.name}: ${RULE_SAY[id]}`,
      onclick() { useRule(id); },
    }, [
      el("span", { class: "d-rule-words" }, [
        el("span", { class: "d-rule-name", text: r.name }),
        el("span", { class: "d-rule-latin", text: `(${r.latin})` }),
      ]),
      patternEl(r),
    ]);
  }));
  const rulesBox = el("section", { class: "d-rules", "aria-label": "הכללים" }, [el("h3", { class: "d-h", text: "הכללים" }), status, ruleList]);

  ui.stage.append(el("div", { class: "d-board" }, [
    el("div", { class: "d-top" }, [guard.box, suspect]),
    target,
    el("div", { class: "d-work" }, [tableBox, rulesBox]),
  ]));

  /* ---- state ------------------------------------------------------------ */
  let table = [], selected = [], good = 0, bad = 0;
  const byN = n => table.find(e => e.n === n);

  function add(card, origin, delay) {
    const e = { card, n: table.length + 1, origin };
    e.node = el("button", {
      type: "button", "aria-pressed": "false",
      class: `d-card d-${card.kind}` + (origin ? " d-derived d-enter" : ""),
      onclick() { toggle(e.n); },
    }, cardParts(atoms, card, { n: e.n, origin }));
    if (delay) e.node.style.animationDelay = `${delay * 0.4}s`;
    if (origin) {
      for (const o of table) o.node.classList.remove("d-new");
      e.node.classList.add("d-new");
    }
    table.push(e);
    grid.append(e.node);
    return e;
  }

  function toggle(n) {
    const i = selected.indexOf(n);
    if (i >= 0) selected.splice(i, 1);
    else { selected.push(n); if (selected.length > 2) selected.shift(); }
    drawSelection();
  }

  function drawSelection() {
    for (const e of table) e.node.setAttribute("aria-pressed", String(selected.includes(e.n)));
    const s = [...selected].sort((a, b) => a - b);
    status.innerHTML = s.length === 0 ? "בחרו שני כרטיסים מהשולחן, ואז לחצו על כלל."
      : s.length === 1 ? `בחרתם את כרטיס ${s[0]}. בחרו עוד כרטיס.`
        : `בחרתם בכרטיסים ${s[0]} ו־${s[1]}. עכשיו לחצו על כלל:`;
    rulesBox.classList.toggle("d-armed", s.length === 2);
  }

  /** The derived cards the proof of `e` actually uses. */
  function used(e) {
    const seen = new Set();
    (function walk(x) {
      if (!x.origin || seen.has(x.n)) return;
      seen.add(x.n); walk(byN(x.origin.a)); walk(byN(x.origin.b));
    })(e);
    return seen.size;
  }

  function markProved(e) {
    target.classList.add("d-proved");
    proofMark.hidden = false;
    proofMark.textContent = `✓ הוכח: כרטיס ${e.n}`;
    e.node.classList.add("d-is-target");
    stamp.hidden = !level.stamp;
    guard.say(level.guardWin);
  }

  function useRule(rule) {
    if (selected.length < 2) {
      ui.say(selected.length
        ? `${D.RULES[rule].name} צריך שני כרטיסים, ובחרתם אחד. בחרו עוד כרטיס, ואז לחצו שוב על הכלל.`
        : `${D.RULES[rule].name} צריך שני כרטיסים. בחרו קודם שני כרטיסים מהשולחן, ואז לחצו על הכלל.`, "info");
      return;
    }
    const [x, y] = selected.map(byN);
    const r = D.apply(rule, x.card, y.card, atoms);
    if (!r.ok) {
      guard.say(GUARD_BAD[bad++ % GUARD_BAD.length]);
      ui.say(r.reason, "bad");
      return;
    }
    const dup = table.find(e => D.same(e.card, r.card));
    if (dup) {
      guard.say("את זה כבר יש לנו. אני מתייק פעמיים רק קבלות.");
      dup.node.classList.remove("d-flash"); void dup.node.offsetWidth; dup.node.classList.add("d-flash");
      ui.say(`נכון, אבל ${q(D.cardText(atoms, r.card))} כבר על השולחן: זה כרטיס ${dup.n}. נסו זוג אחר.`, "info");
      return;
    }
    const e = add(r.card, { rule, a: x.n, b: y.n });
    selected = [];
    drawSelection();
    if (D.same(r.card, level.target)) {
      markProved(e);
      const k = used(e);
      ui.win(`<b>הוכחתם!</b> ${q(D.cardText(atoms, r.card))}, ${stepsWord(k)}.` +
        (k > level.steps ? ` אפשר גם ${stepsWord(level.steps)}: רוצים לנסות לקצר? (איפוס)` : "") +
        (level.winNote ? " " + level.winNote : ""));
    } else {
      guard.say(GUARD_GOOD[good++ % GUARD_GOOD.length]);
      ui.say(`כרטיס ${e.n} נוסף לשולחן: ${q(D.cardText(atoms, r.card))} (${originText(e.origin)}).`, "good");
    }
  }

  function reset() {
    for (const e of table.splice(level.premises.length)) e.node.remove();
    for (const e of table) e.node.classList.remove("d-is-target", "d-flash", "d-new");
    selected = []; good = 0; bad = 0;
    target.classList.remove("d-proved");
    proofMark.hidden = true;
    stamp.hidden = true;
    guard.say(level.guard);
    drawSelection();
  }

  /** The proof that "פתרון" shows: the level's own, else a shortest one. */
  function proofSteps() {
    if (level.solution) return level.solution;
    const steps = D.shortestProof(level.premises, level.target) || [];
    const keys = level.premises.map(D.key);
    return steps.map(s => {
      const out = [s.rule, keys.indexOf(D.key(s.a)) + 1, keys.indexOf(D.key(s.b)) + 1];
      keys.push(D.key(s.card));
      return out;
    });
  }

  function solve() {
    reset();
    const lines = [];
    let last = null;
    proofSteps().forEach(([rule, a, b], i) => {
      const r = D.apply(rule, byN(a).card, byN(b).card, atoms);
      last = add(r.card, { rule, a, b }, i);
      lines.push(`<li>${originText(last.origin)}: ${q(D.cardText(atoms, r.card))} (כרטיס ${last.n}).</li>`);
    });
    if (last) markProved(last);
    return `הנה הוכחה קצרה ביותר, ${stepsWord(lines.length)}:<ol class="d-steps">${lines.join("")}</ol>עברו עליה שורה אחר שורה, ואז נסו בעצמכם (איפוס).`;
  }

  for (const c of level.premises) add(c, null);
  reset();
  return { reset, solve };
}

/* ---- judge: the robot's arguments ---------------------------------------- */

function mountJudge(level, ui) {
  const atoms = level.atoms, args = level.args;
  const robot = speech("robot", "הרובוט");
  const tabs = el("nav", { class: "d-tabs", "aria-label": "הטיעונים של הרובוט" });
  const sheet = el("section", { class: "d-sheet", "aria-label": "הטיעון" });
  const verdict = el("div", { class: "d-verdict", hidden: true });
  const nextBtn = el("button", { type: "button", class: "g-btn d-nextarg", hidden: true, onclick() { goNext(); } });

  const choice = {};
  const group = (label, html, ids) => el("div", { class: "d-ans-group", role: "group", "aria-label": label }, [
    el("p", { class: "d-ans-label", html }),
    el("div", { class: "g-choice" }, ids.map(k => (choice[k] = el("button", {
      type: "button", "aria-pressed": "false", onclick() { choose(k); },
    }, [el("span", { class: "d-x", "aria-hidden": "true", text: "✗" }), D.nameOf(k), el("span", { class: "d-sr d-tried-sr", text: " (כבר נוסה: לא נכון)" })])))),
  ]);
  const answers = el("div", { class: "d-answers" }, [
    el("h3", { class: "d-h", text: "מה דעתכם על הטיעון?" }),
    group("תקף, לפי איזה כלל?", "<b>תקף</b>, לפי:", ["mp", "mt", "hs"]),
    group("לא תקף, איזה כשל?", "<b>לא תקף</b>, כי זה:", ["affirm", "deny"]),
  ]);
  const caseBox = el("div", { class: "d-case" }, [sheet, answers, verdict, nextBtn]);
  const summary = el("section", { class: "d-summary", "aria-label": "סיכום", hidden: true });

  ui.stage.append(el("div", { class: "d-board d-judge" }, [robot.box, tabs, caseBox, summary]));

  let cur = 0, view = "arg";
  let state = args.map(() => ({ done: false, tried: new Set() }));
  const allDone = () => state.every(s => s.done);

  const staticCard = (c, cls, label) => el("div", { class: `d-card d-${c.kind}` + (cls ? " " + cls : "") }, cardParts(atoms, c, { flags: false, label }));

  function stampEl(a) {
    const ok = D.isRule(a.answer);
    return el("p", { class: "d-vstamp " + (ok ? "d-vstamp-ok" : "d-vstamp-bad") }, [
      el("span", { "aria-hidden": "true", text: ok ? "✓ " : "✗ " }),
      el("b", { text: ok ? "תקף" : "לא תקף" }), ` · ${D.nameOf(a.answer)}`,
    ]);
  }

  function drawTabs() {
    tabs.replaceChildren(...args.map((a, i) => el("button", {
      type: "button", class: "d-tab" + (state[i].done ? " d-tab-done" : ""),
      "aria-current": view === "arg" && i === cur ? "step" : false,
      "aria-label": `טיעון ${i + 1}` + (state[i].done ? " (נבדק)" : ""),
      onclick() { view = "arg"; cur = i; draw(); },
    }, [`טיעון ${i + 1}`, state[i].done ? el("span", { class: "d-tick", "aria-hidden": "true", text: " ✓" }) : null])),
    el("button", {
      type: "button", class: "d-tab d-tab-sum", disabled: !allDone(),
      "aria-current": view === "summary" ? "step" : false,
      onclick() { view = "summary"; draw(); },
    }, ["סיכום"]));
  }

  function drawArg() {
    const a = args[cur], st = state[cur];
    sheet.replaceChildren(
      el("h3", { class: "d-h", text: `טיעון ${cur + 1} מתוך ${args.length}` }),
      el("p", { class: "d-sheet-label", text: "הנתונים:" }),
      el("div", { class: "d-grid d-premises" }, a.premises.map(c => staticCard(c))),
      el("p", { class: "d-therefore", text: "לכן" }),
      el("div", { class: "d-grid d-concl" }, [staticCard(a.conclusion, "d-conclusion", "המסקנה של הרובוט")]),
    );
    for (const [k, b] of Object.entries(choice)) {
      b.setAttribute("aria-pressed", String(st.done && k === a.answer));
      b.disabled = st.done && k !== a.answer;
      b.classList.toggle("d-tried", st.tried.has(k));
      b.querySelector(".d-tried-sr").hidden = !st.tried.has(k);
    }
    answers.classList.toggle("d-answered", st.done);
    verdict.hidden = !st.done;
    if (st.done) verdict.replaceChildren(stampEl(a), el("p", { class: "d-why", html: D.explainChoice(a, a.answer, atoms).why }));
    const open = state.findIndex(s => !s.done);
    nextBtn.hidden = !st.done;
    nextBtn.textContent = open >= 0 ? `לטיעון ${open + 1} ←` : "לסיכום ←";
  }

  function drawSummary() {
    summary.replaceChildren(
      el("h3", { class: "d-h", text: "ארבעת הטיעונים של הרובוט" }),
      ...args.map((a, i) => el("article", { class: "d-sum-item" }, [
        el("h4", { text: `טיעון ${i + 1}` }),
        el("p", { class: "d-sum-arg", html:
          `${a.premises.map(c => q(D.cardText(atoms, c))).join("; ")}. <b>לכן</b> ${q(D.cardText(atoms, a.conclusion))}.` }),
        el("p", { class: "d-sum-f", html:
          `בנוסחאות: ${a.premises.map(c => `<span class="m">${D.cardFormula(c)}</span>`).join(" ו־")}, לכן <span class="m">${D.cardFormula(a.conclusion)}</span>` }),
        stampEl(a),
        el("p", { class: "d-why", html: D.explainChoice(a, a.answer, atoms).why }),
      ])),
    );
  }

  function draw() {
    drawTabs();
    caseBox.hidden = view !== "arg";
    summary.hidden = view !== "summary";
    if (view === "arg") {
      drawArg();
      if (!state[cur].done) robot.say(args[cur].robot);
    } else {
      drawSummary();
      robot.say(level.robotWin);
    }
  }

  function goNext() {
    const open = state.findIndex(s => !s.done);
    if (open >= 0) { view = "arg"; cur = open; } else view = "summary";
    ui.say("");
    draw();
  }

  function choose(k) {
    const a = args[cur], st = state[cur];
    if (st.done) return;
    const r = D.explainChoice(a, k, atoms);
    if (r.correct) {
      st.done = true;
      draw();
      robot.say(D.isRule(k) ? "סוף סוף, הכרה בגאונות שלי." : "אני… אני צריך לבדוק את הקוד שלי.");
      if (allDone()) {
        view = "summary";
        draw();
        ui.win(`${r.html}<p class="d-winline"><b>סיווגתם נכון את כל ארבעת הטיעונים.</b> השומר שולח את הרובוט לשיעור חוזר בלוגיקה. כל התשובות והנימוקים מופיעים בסיכום.</p>`);
      } else {
        const open = state.findIndex(s => !s.done);
        ui.say(`נכון! הטיעון ${D.isRule(k) ? "<b>תקף</b>, לפי" : "<b>לא תקף</b>:"} <b>${D.nameOf(k)}</b>. הנימוק מופיע מתחת לטיעון. כדי להמשיך, לחצו <b>לטיעון ${open + 1}</b>.`, "good");
        nextBtn.focus();
      }
      return;
    }
    st.tried.add(k);
    draw();
    robot.say(D.isRule(k) && !D.isRule(a.answer) ? "רואים? אפילו אתם מסכימים איתי! …רגע, למה השומר מנענע בראש?"
      : !D.isRule(k) && D.isRule(a.answer) ? "מה?! דווקא את זה הוכחתי כמו שצריך!"
        : "קרוב. אבל לא. (אני אוהב להגיד את זה.)");
    ui.say(r.html, "bad");
  }

  function reset() {
    state = args.map(() => ({ done: false, tried: new Set() }));
    cur = 0; view = "arg";
    draw();
  }

  function solve() {
    for (const s of state) s.done = true;
    view = "summary";
    draw();
    const list = (pred) => args.map((a, i) => ({ a, i })).filter(({ a }) => pred(a))
      .map(({ a, i }) => `טיעון ${i + 1} (${D.nameOf(a.answer)})`).join(", ");
    return `התשובות: <b>תקפים</b>: ${list(a => D.isRule(a.answer))}. <b>לא תקפים</b>: ${list(a => !D.isRule(a.answer))}. הנימוקים, והדוגמאות הנגדיות של הכשלים, מופיעים בסיכום.`;
  }

  reset();
  return { reset, solve };
}

startGame({
  id: "detective",
  title: "הבלש של הקפטריה",
  levels: LEVELS,
  mount(level, ui) { return level.mode === "judge" ? mountJudge(level, ui) : mountDerive(level, ui); },
});
