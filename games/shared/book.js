/* book.js — interactive exercises inside the chapters (not inside a game).
   ---------------------------------------------------------------------------
   Worked examples keep questions visible and reveal answers on request; independent
   exercises retain their own answer checkers. Widgets use plain Quarto markdown
   (a fenced div with a class) and turned interactive here. Without
   JavaScript everything simply stays visible.

   1. Step-by-step solution
          ::::: {.solve}
          ::: hint
          first hint (what to look at)
          :::
          ::: step
          step 1 with its explanation
          :::
          ::: step
          step 2 ...
          :::
          :::::
      → "רמז" reveals the hints one at a time, "הצעד הבא" the steps one at a
        time, "כל הפתרון" everything, "הסתרה" starts over.

   2. Truth-table exercise
          ::: {.ttq vars="A,B" cols="A | B; !(A | B)"}
          ::: after
          shown once the table is right (optional)
          :::
          :::
      → a table with the variable columns filled in and one fillable column
        per entry of `cols` (logic.js syntax, ';'-separated). Cells cycle
        ? → T → F. "בדיקה" marks wrong cells, "רמז" explains one cell,
        "העמודה הבאה" fills one column with its explanation, "פתרון מלא".

   3. Formula answer
          ::: {.fq answer="A & !B" vars="A,B,C"}
          prompt text
          ::: hint
          ...
          :::
          :::
      → an input with symbol buttons; checked by LOGICAL EQUIVALENCE with the
        answer, and a wrong answer gets the exact row where it differs.

   4. T/F quizzes (<div class="tf-quiz">, from the Ariel notes) may contain a
      <div class="tf-why">: it appears once the reader has answered.

   Bundled into book.bundle.js by tools/build-games.mjs (a classic script, so
   it also works when the book is opened from disk).
   --------------------------------------------------------------------------- */

import { parse, evaluate, assignments, variables, compare, format } from "./logic.js";
import { initOpenStatement } from "./open-statement.js";
import { initProofEditor } from "./proof-editor.js";
import { initArgumentEditor } from "./argument-editor.js";
import { initPracticeChoice } from "./practice-choice.js";
import { initLectureTable, initLectureAnswers } from "./lecture-reveal.js";
import { evaluationSteps, show } from "../gate/knights.js";

const tv = b => `<span class="tv-${b ? "T" : "F"}">${b ? "T" : "F"}</span>`;
const m = s => `<span class="m">${s}</span>`;
const chipLeaf = n => (n.type === "var" ? n.name : tv(n.value));
const rowText = (names, env) => names.map(n => m(`${n} = ${tv(env[n])}`)).join(", ");

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of [].concat(children || [])) if (c != null) node.append(c);
  return node;
}
const typeset = node => {
  const mj = window.MathJax;
  if (mj && typeof mj.typesetPromise === "function") mj.typesetPromise([node]).catch(() => {});
};
const kids = (box, cls) => [...box.children].filter(c => c.classList.contains(cls));

/* ---- 1. step-by-step solutions ------------------------------------------ */
function initSolve(box) {
  const hints = kids(box, "hint"), steps = kids(box, "step");
  if (!hints.length && !steps.length) return;
  let h = 0, s = 0;
  [...hints, ...steps].forEach(x => x.classList.add("bk-hidden"));
  hints.forEach((x, i) => x.prepend(el("span", { class: "bk-label", text: hints.length > 1 ? `רמז ${i + 1}` : "רמז" })));
  steps.forEach((x, i) => x.prepend(el("span", { class: "bk-label", text: `צעד ${i + 1} מתוך ${steps.length}` })));
  const live = el("span", { class: "bk-sr", "aria-live": "polite" });
  const bHint = el("button", { type: "button", class: "bk-btn", onclick: () => reveal("hint") });
  const bStep = el("button", { type: "button", class: "bk-btn bk-main", onclick: () => reveal("step") });
  const bAll = el("button", { type: "button", class: "bk-btn bk-quiet", text: "כל הפתרון", onclick: () => reveal("all") });
  const bHide = el("button", { type: "button", class: "bk-btn bk-quiet", text: "הסתרה", onclick: () => reveal("none") });
  const bar = el("div", { class: "bk-bar" }, [el("span", { class: "bk-title", text: "פתרון מודרך" }), bHint, bStep, bAll, bHide, live]);
  box.prepend(bar);
  box.classList.add("bk-solve");
  function draw() {
    hints.forEach((x, i) => x.classList.toggle("bk-hidden", i >= h));
    steps.forEach((x, i) => x.classList.toggle("bk-hidden", i >= s));
    bHint.hidden = !hints.length;
    bHint.textContent = `רמז (${h}/${hints.length})`;
    bHint.disabled = h >= hints.length;
    bStep.textContent = s >= steps.length ? "הפתרון כולו מוצג" : s ? `הצעד הבא (${s + 1}/${steps.length})` : `הצעד הראשון (1/${steps.length})`;
    bStep.disabled = s >= steps.length;
    bStep.hidden = !steps.length;
    bHide.hidden = !h && !s;
  }
  function reveal(what) {
    let shown = null;
    if (what === "hint" && h < hints.length) shown = hints[h++];
    if (what === "step" && s < steps.length) shown = steps[s++];
    if (what === "all") { h = hints.length; s = steps.length; }
    if (what === "none") { h = 0; s = 0; }
    draw();
    if (shown) { typeset(shown); live.textContent = shown.textContent.slice(0, 200); }
    if (what === "all") typeset(box);
  }
  draw();
}

/* ---- 2. truth-table exercises -------------------------------------------- */
function chain(f, env) {
  return evaluationSteps(f, env).map((t, i) => (i ? "= " : "") + show(t, chipLeaf)).join(" ");
}
function initTTQ(box) {
  // Pandoc writes cols= as-is (it is a real HTML attribute, of <textarea>), not as data-cols
  const cols = (box.dataset.cols || box.getAttribute("cols") || "").split(";").map(x => x.trim()).filter(Boolean).map(parse);
  if (!cols.length) return;
  const names = box.dataset.vars ? box.dataset.vars.split(",").map(x => x.trim())
    : [...new Set(cols.flatMap(c => variables(c)))];
  const rows = assignments(names);
  const after = kids(box, "after");
  after.forEach(x => x.classList.add("bk-hidden"));
  // marks[r][c] = null | true | false ; wrong[r][c] = bool
  let marks, wrong, focus;
  const table = el("table", { class: "bk-tt" });
  const msg = el("div", { class: "bk-msg", "aria-live": "polite" });
  const btn = (text, fn, cls = "bk-btn") => el("button", { type: "button", class: cls, text, onclick: fn });
  const bar = el("div", { class: "bk-bar" }, [
    btn("בדיקה", check, "bk-btn bk-main"), btn("רמז", hint), btn("העמודה הבאה", nextCol), btn("פתרון מלא", solveAll, "bk-btn bk-quiet"), btn("איפוס", reset, "bk-btn bk-quiet"),
  ]);
  box.classList.add("bk-ttq");
  box.prepend(el("div", { class: "bk-tt-wrap" }, [table]), bar, msg);

  function say(html, kind) { msg.className = "bk-msg" + (kind ? " bk-" + kind : ""); msg.innerHTML = html; }
  function draw() {
    const head = el("tr", {}, [...names.map(n => el("th", { html: m(n) })), ...cols.map(c => el("th", { html: m(format(c)) }))]);
    const body = el("tbody");
    rows.forEach((env, r) => {
      const tr = el("tr", {}, names.map(n => el("td", { html: tv(env[n]) })));
      cols.forEach((c, k) => {
        const v = marks[r][k];
        tr.append(el("td", {}, [el("button", {
          type: "button",
          class: "bk-cell" + (wrong[r][k] ? " bk-wrong" : "") + (focus && focus[0] === r && focus[1] === k ? " bk-focus" : ""),
          "aria-label": `שורה ${r + 1}, עמודה ${format(c)}: ${v === null ? "ריק" : v ? "T" : "F"}. לחצו כדי לשנות`,
          html: v === null ? '<span class="bk-q">?</span>' : tv(v),
          onclick() { marks[r][k] = v === null ? true : v ? false : null; wrong[r][k] = false; focus = null; draw(); },
        })]));
      });
      body.append(tr);
    });
    table.replaceChildren(el("thead", {}, [head]), body);
  }
  const truth = (r, k) => evaluate(cols[k], rows[r]);
  function check() {
    let empty = 0, bad = 0;
    rows.forEach((_, r) => cols.forEach((_, k) => {
      if (marks[r][k] === null) empty++;
      else { wrong[r][k] = marks[r][k] !== truth(r, k); if (wrong[r][k]) bad++; }
    }));
    focus = null; draw();
    if (bad) return say(`${bad === 1 ? "תא אחד שגוי" : `${bad} תאים שגויים`} (מסומנים באדום). לחצו ״רמז״ כדי לקבל הסבר לאחד מהם.`, "bad");
    if (empty) return say(`עד עכשיו הכול נכון. נשארו עוד ${empty} תאים ריקים.`, "info");
    say("כל התאים נכונים!", "good");
    after.forEach(x => { x.classList.remove("bk-hidden"); typeset(x); });
  }
  function firstOpen() {
    for (let k = 0; k < cols.length; k++) for (let r = 0; r < rows.length; r++) {
      if (marks[r][k] === null || marks[r][k] !== truth(r, k)) return [r, k];
    }
    return null;
  }
  function hint() {
    const f = firstOpen();
    if (!f) return say("אין מה לרמוז: הטבלה מלאה ונכונה. לחצו ״בדיקה״.", "info");
    const [r, k] = f;
    focus = f; draw();
    const verb = marks[r][k] === null ? "התא הזה עוד ריק" : "התא הזה לא נכון";
    say(`${verb} (מסומן במסגרת): בשורה ${rowText(names, rows[r])}, ${m(chain(cols[k], rows[r]))}.`, "info");
  }
  function nextCol() {
    const f = firstOpen();
    if (!f) return say("כל העמודות כבר נכונות.", "info");
    const k = f[1];
    rows.forEach((_, r) => { marks[r][k] = truth(r, k); wrong[r][k] = false; });
    focus = null; draw();
    const c = cols[k];
    const sub = c.type === "not" ? "הפוך מהעמודה של " + m(format(c.arg))
      : c.args ? `מחשבים ${c.type === "and" ? "״וגם״" : "״או״"} של ${c.args.map(a => m(format(a))).join(" ו-")}`
      : c.type === "xor" ? "או מפריד: אמת כשבדיוק אחד משני החלקים אמת"
      : c.type === "iff" ? "אם ורק אם: אמת כששני החלקים מקבלים אותו ערך אמת"
      : c.type === "imp" ? `גרירה: שקר רק כש-${m(format(c.left))} אמת ו-${m(format(c.right))} שקר` : "";
    say(`מילאנו את העמודה ${m(format(c))}${sub ? ": " + sub : ""}. למשל בשורה ${rowText(names, rows[0])}: ${m(chain(c, rows[0]))}.`, "info");
    if (!firstOpen()) after.forEach(x => { x.classList.remove("bk-hidden"); typeset(x); });
  }
  function solveAll() {
    rows.forEach((_, r) => cols.forEach((_, k) => { marks[r][k] = truth(r, k); wrong[r][k] = false; }));
    focus = null; draw();
    say("זו הטבלה המלאה.", "info");
    after.forEach(x => { x.classList.remove("bk-hidden"); typeset(x); });
  }
  function reset() {
    marks = rows.map(() => cols.map(() => null));
    wrong = rows.map(() => cols.map(() => false));
    focus = null; draw(); say("");
    after.forEach(x => x.classList.add("bk-hidden"));
  }
  reset();
}

/* ---- 3. formula answers --------------------------------------------------- */
const SYMS = [["¬", "לא"], ["∧", "וגם"], ["∨", "או"], ["⊕", "או מפריד"], ["⊻", "או מפריד — סימון נוסף"], ["→", "אם... אז"], ["↔", "אם ורק אם"], ["(", "סוגר פותח"], [")", "סוגר סוגר"]];
function initFQ(box) {
  const answer = parse(box.dataset.answer);
  const allowed = (box.dataset.vars || variables(answer).join(",")).split(",").map(x => x.trim());
  const hints = kids(box, "hint"), explain = kids(box, "explain");
  [...hints, ...explain].forEach(x => x.classList.add("bk-hidden"));
  hints.forEach((x, i) => x.prepend(el("span", { class: "bk-label", text: hints.length > 1 ? `רמז ${i + 1}` : "רמז" })));
  let h = 0;
  const input = el("input", {
    type: "text", class: "bk-input", dir: "ltr", spellcheck: "false", autocomplete: "off",
    "aria-label": "הנוסחה שלכם", placeholder: "כתבו כאן נוסחה",
    onkeydown(e) { if (e.key === "Enter") { e.preventDefault(); check(); } },
    oninput() { const p = input.selectionStart; input.value = input.value.toUpperCase(); input.setSelectionRange(p, p); },
  });
  const insert = sym => {
    const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
    input.value = input.value.slice(0, a) + sym + input.value.slice(b);
    input.focus(); input.setSelectionRange(a + sym.length, a + sym.length);
  };
  const symbols = box.dataset.symbols ? SYMS.filter(([s]) => box.dataset.symbols.includes(s)) : SYMS;
  const keys = el("div", { class: "bk-keys", role: "group", "aria-label": "סמלים" },
    symbols.map(([s, name]) => el("button", { type: "button", class: "bk-key", "aria-label": name, text: s, onclick: () => insert(s) })));
  const msg = el("div", { class: "bk-msg", "aria-live": "polite" });
  const bHint = el("button", { type: "button", class: "bk-btn", onclick: giveHint });
  const bar = el("div", { class: "bk-bar" }, [
    el("button", { type: "button", class: "bk-btn bk-main", text: "בדיקה", onclick: check }),
    bHint,
    el("button", { type: "button", class: "bk-btn bk-quiet", text: "הצגת תשובה", onclick: showAnswer }),
  ]);
  const firstHint = hints[0] || null;
  box.insertBefore(el("div", { class: "bk-fq-row" }, [input, keys]), firstHint);
  box.insertBefore(bar, firstHint);
  box.insertBefore(msg, firstHint);
  box.classList.add("bk-fq");
  function say(html, kind) { msg.className = "bk-msg" + (kind ? " bk-" + kind : ""); msg.innerHTML = html; }
  function drawHint() {
    bHint.hidden = !hints.length;
    bHint.textContent = `רמז (${h}/${hints.length})`;
    bHint.disabled = h >= hints.length;
  }
  function giveHint() { if (h < hints.length) { hints[h].classList.remove("bk-hidden"); typeset(hints[h]); h++; drawHint(); } }
  function check() {
    const text = input.value.trim();
    if (!text) return say("כתבו נוסחה בשדה (אפשר להיעזר בכפתורי הסמלים), ואז לחצו ״בדיקה״.", "info");
    let f;
    try { f = parse(text); } catch (e) {
      return say("לא הצלחתי לקרוא את הנוסחה. בדקו שהסוגריים סגורים ושבין כל שני פסוקים יש קשר (למשל ∧ או ∨).", "bad");
    }
    const extra = variables(f).filter(v => !allowed.includes(v));
    if (extra.length) return say(`הנוסחה משתמשת ב-${m(extra.join(", "))}, אבל במשפט יש רק ${m(allowed.join(", "))}.`, "bad");
    const r = compare(f, answer);
    if (r.equal) {
      const exact = format(f) === format(answer);
      say(exact ? "נכון!" : `נכון! הנוסחה שלכם והנוסחה ${m(format(answer))} נותנות אותו ערך אמת בכל שורה של הטבלה.`, "good");
      explain.forEach(x => { x.classList.remove("bk-hidden"); typeset(x); });
      return;
    }
    const names = [...new Set([...allowed])];
    const env = Object.fromEntries(names.map(n => [n, !!r.row[n]]));
    say(`עוד לא. הנה שורה שבה הנוסחה שלכם והנוסחה הנכונה נותנות ערכים שונים: ${rowText(names, env)}. אצלכם ${m(chain(f, env))}, אבל המשפט באמת ${evaluate(answer, env) ? "אמת" : "שקר"} במצב הזה.`, "bad");
  }
  function showAnswer() {
    say(`תשובה אפשרית: ${m(format(answer))}`, "info");
    explain.forEach(x => { x.classList.remove("bk-hidden"); typeset(x); });
  }
  drawHint();
}

/* ---- 4. T/F quizzes: explanation after answering ------------------------- */
function initTF(quiz) {
  if (!quiz.querySelector(".tf-why")) return;
  quiz.addEventListener("click", e => {
    if (!e.target.closest(".tf-opt")) return;
    quiz.classList.add("tf-answered");
    typeset(quiz.querySelector(".tf-why"));
  });
}

function init() {
  document.querySelectorAll(".choice-exercise").forEach(initPracticeChoice);
  document.querySelectorAll(".argument-editor").forEach(initArgumentEditor);
  document.querySelectorAll(".proof-editor").forEach(initProofEditor);
  document.querySelectorAll(".open-statement-game").forEach(initOpenStatement);
  document.querySelectorAll(".solve").forEach(initSolve);
  document.querySelectorAll(".ttq").forEach(initTTQ);
  document.querySelectorAll(".fq").forEach(initFQ);
  document.querySelectorAll(".tf-quiz").forEach(initTF);
  document.querySelectorAll(".lecture-table").forEach(initLectureTable);
  initLectureAnswers();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
