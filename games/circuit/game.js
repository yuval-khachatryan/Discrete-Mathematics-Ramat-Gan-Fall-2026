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

// Answers belong to the learner. Exploring a setting never writes an answer.
function answerCell(value, label, wrong, change) {
  const button = el("button", {
    type: "button", class: "c-cell" + (wrong ? " wrong" : ""),
    "aria-invalid": wrong ? "true" : "false",
    "aria-label": `${label}: ${value === null ? "טרם נענתה" : value ? "אמת" : "שקר"}. לחצו לשינוי: סימן שאלה, אמת, שקר`,
    onclick() { change(value === null ? true : value ? false : null); },
  }, [value === null ? el("span", { class: "c-q", text: "?" }) : tv(value)]);
  return button;
}

function trialButton(names, row, load) {
  return el("button", {
    type: "button", class: "c-trial", text: "נסו",
    "aria-label": `הציגו במעגל: ${names.map(n => `${n}=${row[n] ? "T" : "F"}`).join(", ")}`,
    onclick: load,
  });
}

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
  const hasTable = level.mode === "fill" || level.mode === "select" || level.impossible;
  const columns = [...(level.helpers || []), level.formula].map(parse);
  let env, covered, rounds, roundIx, table, cells;
  const progress = el("p", { class: "c-progress", "aria-live": "polite" });

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
        onclick() { env[n] = !env[n]; changed(); levers.querySelectorAll(".c-lever")[names.indexOf(n)].focus({ preventScroll: true }); },
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

  /* ---- worksheet: fill values or select all matching rows ------------- */
  function buildTable() {
    table = el("table", { class: "c-table" });
    const selecting = level.mode === "select";
    const head = el("tr", {}, [...names.map(n => el("th", { scope: "col" }, [el("span", { class: "c-tag", style: `background:${colours[n]}`, text: n })])),
      ...(selecting ? [el("th", { scope: "col", text: "בחרו" })] : columns.map(f => el("th", { scope: "col", html: m(format(f)) }))),
      el("th", { scope: "col", text: "ניסוי" }),
    ]);
    table.append(el("thead", {}, [head]), el("tbody"));
    cells = assignments(names).map(row => ({ env: row, mark: selecting ? false : null,
      answers: columns.map(() => ({ mark: null, wrong: false })) }));
    side.replaceChildren(
      el("h3", { class: "c-side-title", text: selecting ? `בחרו את כל השורות שבהן הפסוק ${target ? "אמת" : "שקר"}` : columns.length > 1 ? "מלאו את עמודות העזר ואת התוצאה" : "מלאו את ערך האמת של הפסוק" }),
      el("p", { class: "c-table-help", text: selecting
        ? `סמנו את כל השורות שבהן ${W.noun} ${target ? W.T : W.F}, ורק אותן. אחר כך לחצו ״בדיקה״.`
        : "לחצו על ? כדי לבחור T (אמת) או F (שקר). כפתור ״נסו״ מציג את השורה במעגל, אך אינו ממלא תשובה. " + (level.impossible ? "אם הטבלה מראה שאין פתרון, לחצו על כפתור ״אי אפשר״ שמתחתיה." : "בסיום לחצו ״בדיקה״.") }),
      el("div", { class: "c-table-scroll" }, [table]), progress,
    );
  }
  function drawTable() {
    const body = table.tBodies[0];
    body.replaceChildren();
    cells.forEach((c, i) => {
      const current = sameRow(names, c.env, env);
      const tr = el("tr", { class: current ? "c-current" : "" });
      names.forEach(n => tr.append(el("td", {}, [tv(c.env[n])])));
      const load = () => {
        names.forEach(n => (env[n] = c.env[n])); changed();
        table.tBodies[0].rows[i].querySelector(".c-trial").focus({ preventScroll: true });
      };
      const edit = value => {
        c.mark = value; c.wrong = false; ui.say(""); drawTable();
        table.tBodies[0].rows[i].querySelector(".c-answer").focus({ preventScroll: true });
      };
      if (level.mode === "select") {
        tr.append(el("td", { class: c.wrong ? "c-error-cell" : "" }, [el("input", {
          type: "checkbox", class: "c-answer", checked: c.mark,
          "aria-invalid": c.wrong ? "true" : "false",
          "aria-label": `שורה ${i + 1}: הפסוק ${target ? "אמת" : "שקר"}`, onchange: e => edit(e.target.checked),
        })]));
      } else {
        c.answers.forEach((a, j) => {
          const button = answerCell(a.mark, `שורה ${i + 1}, עמודת ${format(columns[j])}`, a.wrong, value => {
            a.mark = value; a.wrong = false; ui.say(""); drawTable();
            table.tBodies[0].rows[i].querySelectorAll(".c-answer")[j].focus({ preventScroll: true });
          });
          button.classList.add("c-answer");
          tr.append(el("td", {}, [button]));
        });
      }
      tr.append(el("td", {}, [trialButton(names, c.env, load)]));
      body.append(tr);
    });
    progress.textContent = level.mode === "select"
      ? `סימנתם ${cells.filter(c => c.mark).length} מתוך ${cells.length} שורות. אפשר לשנות את הבחירה לפני הבדיקה.`
      : `מילאתם ${cells.flatMap(c => c.answers).filter(a => a.mark !== null).length} מתוך ${cells.length * columns.length} תשובות.`;
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
    ui.say("");
    draw();
  }

  function start() {
    env = {};
    names.forEach(n => (env[n] = level.start ? !!level.start[n] : true));
    covered = false;
    table = null;
    side.replaceChildren();
    board.classList.toggle("c-has-side", !!hasTable);
    board.classList.toggle("c-multi-table", hasTable && columns.length > 1);
    if (hasTable) buildTable();
    if (level.mode === "predict") {
      rounds = level.rounds.map(r => ({ ...r, passed: false }));
      roundIx = 0;
      side.replaceChildren(predict);
      board.classList.add("c-has-side");
      drawRound();
      return;
    }
    if (level.mode === "play" && level.impossible) {
      side.append(el("div", { class: "c-impossible" }, [
        el("p", { text: target ? W.doubtT : W.doubtF }),
        el("button", {
          type: "button", class: "g-btn",
          text: target ? W.cantT : W.cantF,
          onclick() {
            const checked = checkTable();
            if (!checked.ok) return ui.say(checked.message, checked.kind || "bad");
            if (!reachable()) ui.win(`נכון: הטבלה שמילאתם מראה שבכל ${cells.length} המצבים ${W.noun} ${target ? W.F : W.T}. אין מצב שנותן את התוצאה המבוקשת.`);
            else ui.say("דווקא אפשר! יש מצב של המתגים שעושה את זה. נסו עוד.", "bad");
          },
        }),
      ]));
      board.classList.add("c-has-side");
    }
    draw();
  }

  start();

  const ctl = {
    reset: start,
    solve() {
      if (level.mode === "play") {
        if (level.impossible) {
          fillAnswers();
          draw();
        }
        const row = assignments(freeNames).find(r => evaluate(formula, { ...env, ...r }) === target);
        if (row) { Object.assign(env, row); draw(); return `למשל: ${rowText(freeNames, row)}. ${why(env)}.`; }
        return `אין מצב כזה: ${why(env)}. בדקו זאת בכל מצבי המתגים האפשריים.`;
      }
      if (level.mode === "predict") {
        const lines = level.rounds.map(r => `${rowText(names, r)} → ${evaluate(formula, r) ? W.T : W.F}`).join("<br>");
        covered = false; draw();
        return `התשובות:<br>${lines}`;
      }
      if (level.mode === "select") cells.forEach(c => { c.mark = evaluate(formula, c.env) === target; c.wrong = false; });
      else fillAnswers();
      covered = false; draw();
      return `אלה התשובות. לחצו ״נסו״ בשורה כלשהי, ובדקו במעגל ${W.why}.`;
    },
  };
  function fillAnswers() {
    cells.forEach(c => c.answers.forEach((a, j) => { a.mark = evaluate(columns[j], c.env); a.wrong = false; }));
  }
  function checkTable() {
    const selecting = level.mode === "select";
    const entries = cells.flatMap(c => selecting ? [{ a: c, c, f: formula }] : c.answers.map((a, j) => ({ a, c, f: columns[j] })));
    const empty = entries.filter(({ a }) => a.mark === null).length;
    if (empty) return { ok: false, kind: "info", message: `חסרות עוד ${empty} תשובות. מלאו את כל התאים, כולל עמודות העזר. אפשר להיעזר במתגים ובכפתורי ״נסו״.` };
    const wrong = entries.filter(({ a, c, f }) => {
      const expected = evaluate(f, c.env);
      a.wrong = a.mark !== (selecting ? expected === target : expected);
      return a.wrong;
    });
    drawTable();
    if (!wrong.length) return { ok: true, message: selecting
      ? `נכון! סימנתם את כל ${cells.filter(c => c.mark).length} השורות שבהן הפסוק ${target ? "אמת" : "שקר"}, ורק אותן.`
      : `כל ${entries.length} התשובות נכונות. חישבתם את ערכי האמת בכל עמודה ובכל שורה.` };
    const { c, f } = wrong[0];
    const rule = f.type === "not" ? "שלילה הופכת את ערך האמת של החלק שבתוכה."
      : f.type === "and" ? "״וגם״ נותן אמת רק כששני החלקים אמת."
      : f.type === "or" ? "״או״ נותן אמת כשלפחות אחד החלקים אמת." : "בדקו לפי טבלת האמת של הקשר.";
    return { ok: false, message: `${wrong.length} תשובות שגויות מסומנות. למשל, בשורה ${rowText(names, c.env)}, בעמודת ${m(format(f))} צריך להיות ${tvHTML(evaluate(f, c.env))}. ${rule}` };
  }
  if (hasTable && !level.impossible) ctl.check = checkTable;
  if (level.mode === "play") {
    ctl.check = () => {
      if (lampState() === target) return { ok: true, message: `המצב שהגשתם מתאים: ${rowText(names, env)}. ${why(env)}.` };
      return { ok: false, message: `במצב שהגשתם ${W.noun} ${lampState() ? W.T : W.F}, אבל במשימה צריך להביא אותה למצב ״${target ? W.T : W.F}״. ${why(env)}.${level.impossible ? " אם לדעתכם אין פתרון, מלאו את הטבלה ולחצו על כפתור ״אי אפשר״ שמתחתיה." : " שנו את המתגים ונסו שוב."}` };
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
      el("div", { class: "c-side" }, [
        el("h3", { class: "c-side-title", text: "הראיות שלכם: ערכי האמת של שני הפסוקים" }),
        el("p", { class: "c-table-help", text: "כדי להראות שהפסוקים שקולים, מלאו T או F בשתי העמודות ובכל השורות, ואז לחצו ״הרובוט צודק״. כדי להראות שאינם שקולים, די להציג במתגים מצב שבו הערכים שונים וללחוץ ״הרובוט טועה״. כפתור ״נסו״ מציג שורה במעגלים בלי למלא תשובה." }),
        table, verdict,
      ]),
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
        onclick() { env[n] = !env[n]; changed(); levers.querySelectorAll(".c-lever")[names.indexOf(n)].focus({ preventScroll: true }); },
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
      el("th", { scope: "col", text: "פסוק א׳" }), el("th", { scope: "col", text: "פסוק ב׳" }), el("th", { scope: "col", text: "ניסוי" }),
    ]);
    const body = el("tbody");
    cells.forEach((c, i) => {
      const tr = el("tr", { class: sameRow(names, c.env, env) ? "c-current" : "" });
      names.forEach(n => tr.append(el("td", {}, [tv(c.env[n])])));
      [f1, f2].forEach((f, j) => {
        tr.append(el("td", {}, [answerCell(c.marks[j], `שורה ${i + 1}, פסוק ${j === 0 ? "א׳" : "ב׳"}`, c.wrong[j], value => {
          c.marks[j] = value; c.wrong[j] = false; ui.say(""); drawTable();
          table.tBodies[0].rows[i].querySelectorAll(".c-cell")[j].focus({ preventScroll: true });
        })]));
      });
      const load = () => {
        names.forEach(n => (env[n] = c.env[n])); changed();
        table.tBodies[0].rows[i].querySelector(".c-trial").focus({ preventScroll: true });
      };
      tr.append(el("td", {}, [trialButton(names, c.env, load)]));
      body.append(tr);
    });
    table.replaceChildren(el("thead", {}, [head]), body);
  }
  function draw() { drawPanel(p1); drawPanel(p2); drawLevers(); drawTable(); }
  function hl(n, on) {
    for (const p of [p1, p2]) p.svg.querySelectorAll(`.contact[data-var="${n}"]`).forEach(c => c.classList.toggle("hl", on));
  }
  function changed() {
    ui.say("");
    draw();
  }

  function judge(robotRight) {
    const here = rowText(names, env);
    const a = evaluate(f1, env), b = evaluate(f2, env);
    if (robotRight) {
      const empty = cells.reduce((n, c) => n + c.marks.filter(v => v === null).length, 0);
      if (empty) return ui.say(`כדי להצדיק ״בכל השורות״, מלאו בעצמכם את שתי עמודות התוצאה. חסרות עוד ${empty} תשובות. אפשר לנסות כל שורה במעגלים.`, "info");
      cells.forEach(c => { c.wrong = [f1, f2].map((f, j) => c.marks[j] !== evaluate(f, c.env)); });
      const first = cells.find(c => c.wrong.some(Boolean));
      drawTable();
      if (first) {
        const j = first.wrong.findIndex(Boolean), f = j === 0 ? f1 : f2;
        return ui.say(`לפני שמסיקים מסקנה, נתקן את התאים המסומנים. למשל, בשורה ${rowText(names, first.env)}, הפסוק ${m(format(f))} הוא ${evaluate(f, first.env) ? "אמת" : "שקר"}: ${explain(f, first.env, view)}.`, "bad");
      }
      if (!same) return ui.say(`הפסוקים אינם שקולים: יש שורה שבה ${W.differ}. עברו על השורות וחפשו אותה.`, "bad");
      return ui.win(`נכון: מילאתם את הטבלה, ושתי העמודות זהות בכל ${cells.length} השורות. הפסוקים <b>שקולים</b>.`);
    }
    if (a !== b) return ui.win(`נכון, הרובוט טועה: בשורה ${here} ${W.of} פסוק א׳ ${a ? W.T : W.F}, ו${W.of} פסוק ב׳ ${b ? W.T : W.F}. מספיקה שורה אחת כזו.`);
    return ui.say(`במצב הנוכחי של המתגים (${here}) ${W.two} ${W.same}. אם הרובוט טועה, העבירו את המתגים לשורה שבה הם שונים, ואז לחצו שוב.`, "info");
  }

  function start() {
    env = {};
    names.forEach(n => (env[n] = level.start ? !!level.start[n] : true));
    cells = assignments(names).map(row => ({ env: row, marks: [null, null], wrong: [false, false] }));
    changed();
  }
  start();
  return {
    reset: start,
    solve() {
      if (same) {
        cells.forEach(c => { c.marks = [evaluate(f1, c.env), evaluate(f2, c.env)]; c.wrong = [false, false]; }); draw();
        return `הרובוט צודק: בכל השורות ${W.two} ${W.same} (ראו בטבלה). ${level.solution || ""}`;
      }
      const row = assignments(names).find(r => evaluate(f1, r) !== evaluate(f2, r));
      Object.assign(env, row); changed();
      return `הרובוט טועה. למשל בשורה ${rowText(names, row)}: ${W.of} פסוק א׳ ${evaluate(f1, row) ? W.T : W.F}, ו${W.of} פסוק ב׳ ${evaluate(f2, row) ? W.T : W.F}.`;
    },
  };
}

startGame({ id: "circuit", title: "מתי המשפט נכון?", levels: LEVELS, mount });
