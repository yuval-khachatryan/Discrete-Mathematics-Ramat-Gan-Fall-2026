/* game.js — "תנו ירוק!": levers, circuits, and a green lamp or a two-colour signal.
   Modes are described in levels.js. The drawing and the "why" text come from
   circuit.js; everything here is wiring between the levers, the signal, the
   truth table and the shell. */

import { startGame, el } from "../shared/shell.js";
import { parse, evaluate, assignments, format, compare, nnf } from "../shared/logic.js";
import { render, explain, isLiteral, defaultView, VAR_COLOURS } from "./circuit.js";
import { LEVELS } from "./levels.js";
import { sprite } from "../shared/sprites.js";

const ico = (name, cls = "c-ico") => el("span", { class: cls, "aria-hidden": "true", html: sprite(name) });

const SVGNS = "http://www.w3.org/2000/svg";
const tv = b => el("span", { class: "tv-" + (b ? "T" : "F"), text: b ? "T" : "F" });
const tvHTML = b => `<span class="tv-${b ? "T" : "F"}">${b ? "T" : "F"}</span>`;
const m = s => `<span class="m">${s}</span>`;
const rowText = (names, env) => names.map(n => m(`${n} = ${tvHTML(env[n])}`)).join(", ");
const sameRow = (names, a, b) => names.every(n => !!a[n] === !!b[n]);

/* The words follow the picture: a single green lamp is "lit / dark" (until De
   Morgan, F is just "no light"); the two-colour signal is "green / red". */
const WORDS = {
  lamp: {
    noun: "המנורה", T: "דולקת", F: "כבויה", icoT: "lampOn", icoF: "lampOff", icoQ: "lampQ",
    ask: "האם המנורה תידלק?", cantT: "אי אפשר להדליק", cantF: "אי אפשר לכבות",
    doubtT: "חושבים שאין שום דרך להדליק אותה?", doubtF: "חושבים שאין שום דרך לכבות אותה?",
    many: "דולקות", why: "למה המנורה במצב הזה", col: "עמודת המנורה",
    two: "שתי המנורות", same: "באותו מצב", differ: "מנורה אחת דולקת והשנייה כבויה", of: "המנורה של",
  },
  signal: {
    noun: "הרמזור", T: "ירוק", F: "אדום", icoT: "signalT", icoF: "signalF", icoQ: "signalQ",
    ask: "איזה אור יידלק ברמזור?", cantT: "אי אפשר לקבל ירוק", cantF: "אי אפשר לקבל אדום",
    doubtT: "חושבים שאין שום דרך לקבל ירוק?", doubtF: "חושבים שאין שום דרך לקבל אדום?",
    many: "ירוקות", why: "למה הרמזור בצבע הזה", col: "עמודת הרמזור",
    two: "שני הרמזורים", same: "באותו צבע", differ: "רמזור אחד ירוק והשני אדום", of: "הרמזור של",
  },
};
const viewOf = (level, formula) => level.view || defaultView(formula);
const wordsOf = view => (view === "lamp" ? WORDS.lamp : WORDS.signal);

// Keep the Hebrew statement separate from the result and its illustration.
// Each status label travels with its symbol when a narrow screen wraps the row.
function resultLine(W, on, covered = false) {
  return el("div", { class: "c-result", dir: "rtl" }, [
    covered ? null : el("span", { class: "c-truth" }, [
      el("span", { text: on ? "הפסוק נכון (אמת)." : "הפסוק שגוי (שקר)." }), tv(on),
    ]),
    el("span", { class: "c-state" }, [
      el("span", { text: covered ? `מצב ${W.noun} מוסתר.` : `${W.noun} ${on ? W.T : W.F}.` }),
      ico(covered ? W.icoQ : on ? W.icoT : W.icoF, "c-ico c-sig"),
    ]),
  ]);
}

function pathLabels(formula) {
  return el("div", { class: "c-paths" }, [
    el("p", { html: `המסלול אל האור הירוק: ${m(format(nnf(formula)))}` }),
    el("p", { html: `המסלול אל האור האדום (שלילת הפסוק): ${m(format(nnf({ type: "not", arg: formula })))}` }),
  ]);
}

function mount(level, ui) {
  if (level.mode === "compare") return mountCompare(level, ui);
  const names = Object.keys(level.vars);
  const colours = Object.fromEntries(names.map((n, i) => [n, VAR_COLOURS[i % VAR_COLOURS.length]]));
  const formula = parse(level.formula);
  const view = viewOf(level, formula), W = wordsOf(view);
  const why = e => `הפסוק ${m(format(formula))} הוא <b>${evaluate(formula, e) ? "אמת" : "שקר"}</b>. בציור: ${explain(formula, e, view)}`;
  const target = level.target !== false;
  let env, covered, rounds, roundIx, table, cells;

  /* ---- pieces ---------------------------------------------------------- */
  const lampLine = el("div", { class: "c-lamp-line" });
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("class", "c-svg");
  svg.setAttribute("role", "img");
  // the green circuit is the formula, the red one its negation (pushed inward, so De Morgan shows)
  const formulaLine = el("p", { class: "c-formula", html: view === "lamp"
    ? `בשפת הלוגיקה: המנורה דולקת בדיוק כשהפסוק ${m(format(formula))} אמת.`
    : isLiteral(formula)
    ? `בשפת הלוגיקה: ירוק כש-${m(format(formula))} אמת, ואדום כש-${m(format(nnf({ type: "not", arg: formula })))} אמת.`
    : `בשפת הלוגיקה: המעגל <b>הירוק</b> בנוי לפי ${m(format(formula))}, והמעגל <b>האדום</b> לפי השלילה שלו, ${m(format(nnf({ type: "not", arg: formula })))}.` });
  const levers = el("div", { class: "c-levers", role: "group", "aria-label": "המתגים" });
  const side = el("div", { class: "c-side" });
  const board = el("div", { class: "c-board" }, [el("div", { class: "c-main" }, [lampLine, view === "dual" ? pathLabels(formula) : null, el("div", { class: "c-svg-wrap" }, [svg]), formulaLine, levers]), side]);
  ui.stage.append(board);

  function lampState() {
    return evaluate(formula, env);
  }
  // one lever moves several contacts (in both circuits): show which
  function highlight(n, on) {
    svg.querySelectorAll(`.contact[data-var="${n}"]`).forEach(c => c.classList.toggle("hl", on));
  }

  function draw() {
    const on = lampState();
    render(svg, formula, env, { colours, lamp: covered ? "covered" : on ? "on" : "off", view });
    if (ui.present) svg.style.maxWidth = Math.round(parseFloat(svg.getAttribute("width")) * 1.8) + "px";   // projector: bigger drawing
    svg.setAttribute("aria-label", `מעגל של הפסוק ${format(formula)}. ` +
      `${W.noun} ` + (covered ? "מכוסה." : on ? W.T + "." : W.F + "."));
    lampLine.replaceChildren(
      el("p", { class: "c-statement", dir: "rtl", text: `הפסוק: ״${level.lamp}״` }),
      resultLine(W, on, covered),
    );
    drawLevers();
    if (table) drawTable();
  }

  function drawLevers() {
    levers.replaceChildren();
    names.forEach(n => {
      const lockedWhy = level.locked && level.locked[n];
      const fixed = !!lockedWhy || level.mode === "predict";
      const btn = el("button", {
        type: "button",
        class: "c-lever" + (env[n] ? " up" : " down"),
        role: "switch",
        "aria-checked": env[n] ? "true" : "false",
        "aria-label": `${n}: ${level.vars[n]}. ${env[n] ? "אמת" : "שקר"}` + (lockedWhy ? ". נעול" : ""),
        disabled: fixed,
        onclick() { env[n] = !env[n]; changed(); },
        onmouseenter() { highlight(n, true); }, onmouseleave() { highlight(n, false); },
        onfocus() { highlight(n, true); }, onblur() { highlight(n, false); },
      }, [
        el("span", { class: "c-tag", style: `background:${colours[n]}`, text: n }),
        el("span", { class: "c-sentence", text: level.vars[n] }),
        el("span", { class: "c-pos" }, [el("span", { class: "c-knob", "aria-hidden": "true" }), tv(env[n]), el("span", { text: env[n] ? " אמת" : " שקר" })]),
      ]);
      const row = el("div", { class: "c-lever-row" }, [btn]);
      if (lockedWhy) row.append(el("span", { class: "c-lock" }, [ico("lock"), " " + lockedWhy]));
      levers.append(row);
    });
  }

  /* ---- truth table (explore / fill) ------------------------------------ */
  function buildTable() {
    table = el("table", { class: "c-table" });
    const head = el("tr", {}, [...names.map(n => el("th", { scope: "col" }, [el("span", { class: "c-tag", style: `background:${colours[n]}`, text: n })])), el("th", { scope: "col", "aria-label": W.noun }, [ico(W.icoT)])]);
    table.append(el("thead", {}, [head]), el("tbody"));
    cells = assignments(names).map(row => ({ env: row, mark: null }));   // mark: true/false/null
    side.replaceChildren(el("h3", { class: "c-side-title", text: "טבלת האמת" }), table);
  }
  function drawTable() {
    const body = table.tBodies[0];
    body.replaceChildren();
    cells.forEach((c, i) => {
      const current = sameRow(names, c.env, env);
      const tr = el("tr", { class: current ? "c-current" : "" });
      names.forEach(n => tr.append(el("td", {}, [tv(c.env[n])])));
      const load = () => { names.forEach(n => (env[n] = c.env[n])); changed(); };
      if (level.mode === "fill") {
        const val = c.mark;
        tr.append(el("td", {}, [el("button", {
          type: "button", class: "c-cell" + (c.wrong ? " wrong" : ""),
          "aria-label": `שורה ${i + 1}: ${val === null ? "לא מולא" : val ? W.T : W.F}. לחצו כדי לשנות`,
          onclick() { c.mark = c.mark === null ? true : c.mark ? false : null; c.wrong = false; drawTable(); },
        }, [val === null ? el("span", { class: "c-q", text: "?" }) : tv(val)])]));
        tr.addEventListener("click", e => { if (!e.target.closest("button")) load(); });
      } else {
        tr.append(el("td", {}, [c.mark === null ? el("span", { class: "c-q", text: "?" }) : tv(c.mark)]));
        tr.tabIndex = 0;
        tr.setAttribute("role", "button");
        tr.setAttribute("aria-label", `שורה ${i + 1}: להעביר את המתגים ל-${names.map(n => n + "=" + (c.env[n] ? "T" : "F")).join(", ")}`);
        tr.addEventListener("click", load);
        tr.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); load(); } });
      }
      body.append(tr);
    });
  }

  /* ---- predict --------------------------------------------------------- */
  const predict = el("div", { class: "c-predict" });
  function drawRound() {
    const r = rounds[roundIx];
    names.forEach(n => (env[n] = r[n]));
    covered = true;
    draw();
    const done = rounds.filter(x => x.passed).length;
    predict.replaceChildren(
      el("p", { class: "c-round", text: `סיבוב ${done + 1} מתוך ${level.rounds.length}. המתגים מכוונים. ${W.ask}` }),
      el("div", { class: "c-answers" }, [
        el("button", { type: "button", class: "g-btn c-ans", onclick: () => answer(true) }, [ico(W.icoT), ` ${W.T} `, tv(true)]),
        el("button", { type: "button", class: "g-btn c-ans", onclick: () => answer(false) }, [ico(W.icoF), ` ${W.F} `, tv(false)]),
      ]),
    );
  }
  function answer(guess) {
    const r = rounds[roundIx];
    const on = lampState();
    covered = false;
    draw();
    const because = why(env);
    if (guess === on) {
      r.passed = true;
      ui.say(`נכון: ${W.noun} ${on ? W.T : W.F}. ${because}.`, "good");
    } else {
      rounds.push({ ...r, passed: false });   // the same setting comes back at the end
      ui.say(`לא הפעם: ${W.noun} ${on ? W.T : W.F}. ${because}. הסיבוב הזה יחזור בסוף.`, "bad");
    }
    roundIx++;
    const remaining = rounds.slice(roundIx);
    predict.replaceChildren(el("button", {
      type: "button", class: "g-btn g-primary",
      text: remaining.length ? "לסיבוב הבא" : "סיום",
      onclick() {
        if (remaining.length) drawRound();
        else { predict.replaceChildren(); ui.win("עניתם נכון על כל הסיבובים. בכל מצב מצאתם את ערך האמת של הפסוק לפי מצבי המתגים."); }
      },
    }));
  }

  /* ---- play: "impossible" ---------------------------------------------- */
  const freeNames = names.filter(n => !(level.locked && level.locked[n]));
  function reachable() {
    return assignments(freeNames).some(row => evaluate(formula, { ...env, ...row }) === target);
  }

  /* ---- lifecycle ------------------------------------------------------- */
  function changed() {
    draw();
    if (level.mode === "play" && lampState() === target) {
      ui.win(`נכון: הפסוק ${target ? "אמת" : "שקר"}, ולכן ${W.noun} ${target ? W.T : W.F}.`);
    }
    if (level.mode === "explore") {
      const c = cells.find(x => sameRow(names, x.env, env));
      if (c.mark === null) {
        c.mark = lampState();
        drawTable();
        if (cells.every(x => x.mark !== null)) ui.win(`הטבלה מלאה: ${cells.length} שורות, ב־${cells.filter(x => x.mark).length} מהן הפסוק אמת (${W.noun} ${W.T}).`);
      }
    }
  }

  function start() {
    env = {};
    names.forEach(n => (env[n] = level.start ? !!level.start[n] : true));
    covered = level.mode === "fill";
    table = null;
    side.replaceChildren();
    board.classList.toggle("c-has-side", level.mode === "explore" || level.mode === "fill");
    if (level.mode === "explore" || level.mode === "fill") buildTable();
    if (level.mode === "predict") {
      rounds = level.rounds.map(r => ({ ...r, passed: false }));
      roundIx = 0;
      side.replaceChildren(predict);
      board.classList.add("c-has-side");
      drawRound();
      return;
    }
    if (level.mode === "play" && level.impossible) {
      side.replaceChildren(el("div", { class: "c-impossible" }, [
        el("p", { text: target ? W.doubtT : W.doubtF }),
        el("button", {
          type: "button", class: "g-btn",
          text: target ? W.cantT : W.cantF,
          onclick() {
            if (!reachable()) ui.win(`נכון: בכל אחד מ-${2 ** freeNames.length} מצבי המתגים ${W.noun} ${target ? W.F : W.T}.`);
            else ui.say("דווקא אפשר! יש מצב של המתגים שעושה את זה. נסו עוד.", "bad");
          },
        }),
      ]));
      board.classList.add("c-has-side");
    }
    if (level.mode === "explore") {
      const c = cells.find(x => sameRow(names, x.env, env));
      c.mark = lampState();
    }
    draw();
  }

  start();

  const ctl = {
    reset: start,
    solve() {
      if (level.mode === "play") {
        const row = assignments(freeNames).find(r => evaluate(formula, { ...env, ...r }) === target);
        if (row) { Object.assign(env, row); draw(); return `למשל: ${rowText(freeNames, row)}. ${why(env)}.`; }
        return `אין מצב כזה: ${why(env)}. בדקו זאת בכל מצבי המתגים האפשריים.`;
      }
      if (level.mode === "predict") {
        const lines = level.rounds.map(r => `${rowText(names, r)} → ${evaluate(formula, r) ? W.T : W.F}`).join("<br>");
        covered = false; draw();
        return `התשובות:<br>${lines}`;
      }
      cells.forEach(c => { c.mark = evaluate(formula, c.env); c.wrong = false; });
      covered = false; draw();
      return `זו הטבלה המלאה. בחרו שורה, ובדקו במעגל ${W.why}.`;
    },
  };
  if (level.mode === "fill") {
    ctl.check = () => {
      const empty = cells.filter(c => c.mark === null).length;
      if (empty) return { ok: false, message: `חסרות עוד ${empty} שורות. מלאו את כל ${W.col} ואז בדקו.` };
      const wrong = cells.filter(c => c.mark !== evaluate(formula, c.env));
      cells.forEach(c => (c.wrong = wrong.includes(c)));
      drawTable();
      if (!wrong.length) { covered = false; draw(); return { ok: true, message: "כל שמונה השורות נכונות. אפשר להסיר את הכיסוי." }; }
      const c = wrong[0];
      return {
        ok: false,
        message: `${wrong.length === 1 ? "שורה אחת שגויה" : `${wrong.length} שורות שגויות`} (מסומנות). למשל בשורה ${rowText(names, c.env)}: ${why(c.env)}.`,
      };
    };
  }
  return ctl;
}

/* ---- compare: do two circuits show the same colour in every row? ------
   The robot claims two formulas always agree. To refute it, one row where
   the colours differ is enough; to confirm it, every row must be checked.
   (The same rule as for quantifiers: ∃ needs a witness, ∀ needs all.) */
function mountCompare(level, ui) {
  const names = Object.keys(level.vars);
  const colours = Object.fromEntries(names.map((n, i) => [n, VAR_COLOURS[i % VAR_COLOURS.length]]));
  const f1 = parse(level.formula), f2 = parse(level.formula2);
  const view = level.view || "lamp", W = wordsOf(view);
  const same = compare(f1, f2).equal;
  let env, cells;

  const claim = el("div", { class: "c-claim" }, [
    el("div", { class: "c-claim-face", "aria-hidden": "true", html: sprite("robot") }),
    el("p", { class: "c-claim-text", html: `<b>הרובוט של המזכירות:</b> ${level.claim}` }),
  ]);
  const panel = (label, f) => {
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("class", "c-svg");
    svg.setAttribute("role", "img");
    const status = el("div", { class: "c-lamp-line" });
    const box = el("section", { class: "c-pair-box" }, [
      el("h3", { class: "c-pair-title", html: `${label}: ${m(format(f))}` }),
      view === "dual" ? pathLabels(f) : null,
      el("div", { class: "c-svg-wrap" }, [svg]), status,
    ]);
    return { box, svg, status, f, label };
  };
  const p1 = panel("פסוק א׳", f1), p2 = panel("פסוק ב׳", f2);
  const levers = el("div", { class: "c-levers", role: "group", "aria-label": "המתגים" });
  const table = el("table", { class: "c-table" });
  const verdict = el("div", { class: "c-verdict" }, [
    el("p", { text: "מה דעתכם על הטענה של הרובוט?" }),
    el("button", { type: "button", class: "g-btn", text: "הרובוט צודק: אותו ערך אמת בכל שורה", onclick: () => judge(true) }),
    el("button", { type: "button", class: "g-btn", text: "הרובוט טועה: בשורה הזו ערכי האמת שונים", onclick: () => judge(false) }),
  ]);
  ui.stage.append(el("div", { class: "c-compare" }, [
    claim,
    el("div", { class: "c-pair" }, [p1.box, p2.box]),
    el("div", { class: "c-board c-has-side" }, [
      el("div", { class: "c-main" }, [levers]),
      el("div", { class: "c-side" }, [el("h3", { class: "c-side-title", text: "השורות שבדקתם" }), table, verdict]),
    ]),
  ]));

  function drawPanel(p) {
    const on = evaluate(p.f, env);
    render(p.svg, p.f, env, { colours, lamp: on ? "on" : "off", view });
    if (ui.present) p.svg.style.maxWidth = Math.round(parseFloat(p.svg.getAttribute("width")) * 1.6) + "px";
    p.svg.setAttribute("aria-label", `${p.label}, הפסוק ${format(p.f)}. ${W.noun} ${on ? W.T : W.F}.`);
    p.status.replaceChildren(resultLine(W, on));
  }
  function drawLevers() {
    levers.replaceChildren();
    names.forEach(n => {
      levers.append(el("div", { class: "c-lever-row" }, [el("button", {
        type: "button", class: "c-lever" + (env[n] ? " up" : " down"), role: "switch",
        "aria-checked": env[n] ? "true" : "false",
        "aria-label": `${n}: ${level.vars[n]}. ${env[n] ? "אמת" : "שקר"}`,
        onclick() { env[n] = !env[n]; changed(); },
        onmouseenter() { hl(n, true); }, onmouseleave() { hl(n, false); },
        onfocus() { hl(n, true); }, onblur() { hl(n, false); },
      }, [
        el("span", { class: "c-tag", style: `background:${colours[n]}`, text: n }),
        el("span", { class: "c-sentence", text: level.vars[n] }),
        el("span", { class: "c-pos" }, [el("span", { class: "c-knob", "aria-hidden": "true" }), tv(env[n]), el("span", { text: env[n] ? " אמת" : " שקר" })]),
      ])]));
    });
  }
  function drawTable() {
    const head = el("tr", {}, [
      ...names.map(n => el("th", { scope: "col" }, [el("span", { class: "c-tag", style: `background:${colours[n]}`, text: n })])),
      el("th", { scope: "col", text: "א׳" }), el("th", { scope: "col", text: "ב׳" }), el("th", { scope: "col", text: "שווה?" }),
    ]);
    const body = el("tbody");
    cells.forEach((c, i) => {
      const tr = el("tr", { class: sameRow(names, c.env, env) ? "c-current" : "" });
      names.forEach(n => tr.append(el("td", {}, [tv(c.env[n])])));
      if (c.seen) {
        const a = evaluate(f1, c.env), b = evaluate(f2, c.env);
        tr.append(el("td", {}, [tv(a)]), el("td", {}, [tv(b)]), el("td", { class: a === b ? "c-eq" : "c-neq", text: a === b ? "✓" : "✗ שונים" }));
      } else {
        tr.append(...[0, 1, 2].map(() => el("td", {}, [el("span", { class: "c-q", text: "?" })])));
      }
      tr.tabIndex = 0;
      tr.setAttribute("role", "button");
      tr.setAttribute("aria-label", `שורה ${i + 1}: להעביר את המתגים ל-${names.map(n => n + "=" + (c.env[n] ? "T" : "F")).join(", ")}`);
      const load = () => { names.forEach(n => (env[n] = c.env[n])); changed(); };
      tr.addEventListener("click", load);
      tr.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); load(); } });
      body.append(tr);
    });
    table.replaceChildren(el("thead", {}, [head]), body);
  }
  function draw() { drawPanel(p1); drawPanel(p2); drawLevers(); drawTable(); }
  function hl(n, on) {
    for (const p of [p1, p2]) p.svg.querySelectorAll(`.contact[data-var="${n}"]`).forEach(c => c.classList.toggle("hl", on));
  }
  function changed() {
    cells.find(c => sameRow(names, c.env, env)).seen = true;
    draw();
  }

  function judge(robotRight) {
    const here = rowText(names, env);
    const a = evaluate(f1, env), b = evaluate(f2, env);
    if (robotRight) {
      if (!same) return ui.say(`הפסוקים אינם שקולים: יש שורה שבה ${W.differ}. עברו על השורות וחפשו אותה.`, "bad");
      const left = cells.filter(c => !c.seen).length;
      if (left) return ui.say(`עד עכשיו ${W.two} תמיד היו ${W.same}. אבל ״תמיד״ פירושו <b>בכל</b> השורות, ונשארו עוד ${left} שלא בדקתם.`, "info");
      return ui.win(`נכון: בכל ${cells.length} השורות ${W.two} ${W.same}. הפסוקים <b>שקולים</b>.`);
    }
    if (a !== b) return ui.win(`נכון, הרובוט טועה: בשורה ${here} ${W.of} פסוק א׳ ${a ? W.T : W.F}, ו${W.of} פסוק ב׳ ${b ? W.T : W.F}. מספיקה שורה אחת כזו.`);
    return ui.say(`במצב הנוכחי של המתגים (${here}) ${W.two} ${W.same}. אם הרובוט טועה, העבירו את המתגים לשורה שבה הם שונים, ואז לחצו שוב.`, "info");
  }

  function start() {
    env = {};
    names.forEach(n => (env[n] = level.start ? !!level.start[n] : true));
    cells = assignments(names).map(row => ({ env: row, seen: false }));
    changed();
  }
  start();
  return {
    reset: start,
    solve() {
      if (same) {
        cells.forEach(c => (c.seen = true)); draw();
        return `הרובוט צודק: בכל השורות ${W.two} ${W.same} (ראו בטבלה). ${level.solution || ""}`;
      }
      const row = assignments(names).find(r => evaluate(f1, r) !== evaluate(f2, r));
      Object.assign(env, row); changed();
      return `הרובוט טועה. למשל בשורה ${rowText(names, row)}: ${W.of} פסוק א׳ ${evaluate(f1, row) ? W.T : W.F}, ו${W.of} פסוק ב׳ ${evaluate(f2, row) ? W.T : W.F}.`;
    },
  };
}

startGame({ id: "circuit", title: "מתי המשפט נכון?", levels: LEVELS, mount });
