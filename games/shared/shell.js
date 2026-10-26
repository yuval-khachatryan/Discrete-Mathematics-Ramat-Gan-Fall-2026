/* shell.js — the frame every game shares.
   ---------------------------------------------------------------------------
   A game supplies its levels and a mount() function; the shell supplies the
   rest: the level picker, the mission text, the buttons
   (בדיקה / רמז / איפוס / פתרון / לשלב הבא), the feedback line, hints, the
   debrief, saved progress and the embed/presentation modes.

       import { startGame } from "../shared/shell.js";
       startGame({
         id: "barman",                       // namespace for saved progress
         title: "דוכן הפלאפל",
         levels: [{ id, title, goal, hints: [h1, h2, h3], debrief }, ...],
         mount(level, ui) {                  // draw the level into ui.stage
           return {
             check() { return { ok, message, kind } },   // omit → no "בדיקה" button;
                                                         // kind (optional) colours a not-ok message: "bad" (default) | "info"
             reset() { ... },                       // back to the level's start
             solve() { ... },                       // put the solved state on screen
           };
         },
       });

   ui.stage   the element to draw into (emptied for every level)
   ui.say(html, kind)   feedback line; kind = "info" | "good" | "bad"
   ui.win(html)         the game noticed a win by itself (e.g. the lamp lit)
   ui.el(tag, attrs, children)   tiny DOM helper, see below
   ui.embed / ui.present         the current modes

   URL parameters (all optional):
       ?level=<id>        start at that level
       ?levels=a,b,c      show only these levels (in this order)
       ?embed=1           compact mode for an iframe inside a chapter
       ?present=1         large controls for the classroom projector

   Messages are authored HTML from the level files, not user input.
   --------------------------------------------------------------------------- */

import "./autosize.js";

const STORE_VERSION = "v1";

export function el(tag, attrs, children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of [].concat(children || [])) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

function storage(id) {
  const key = `dm:${id}:${STORE_VERSION}`;
  let memory = { done: {} };
  let ok = true;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) memory = JSON.parse(raw) || memory;
    if (!memory.done) memory.done = {};
  } catch (e) { ok = false; }
  return {
    isDone: lvl => !!memory.done[lvl],
    markDone(lvl) {
      memory.done[lvl] = true;
      if (ok) try { window.localStorage.setItem(key, JSON.stringify(memory)); } catch (e) { ok = false; }
    },
    clear() {
      memory = { done: {} };
      if (ok) try { window.localStorage.removeItem(key); } catch (e) { ok = false; }
    },
  };
}

export function startGame(game) {
  const params = new URLSearchParams(window.location.search);
  const embed = params.get("embed") === "1";
  const present = params.get("present") === "1";

  let levels = game.levels;
  const only = params.get("levels");
  if (only) {
    const want = only.split(",").map(s => s.trim());
    const picked = want.map(id => levels.find(l => l.id === id)).filter(Boolean);
    if (picked.length) levels = picked;
  }
  // An embed that names one level (and no list) shows just that level.
  if (embed && !only && params.get("level")) {
    const one = levels.find(l => l.id === params.get("level"));
    if (one) levels = [one];
  }
  let index = Math.max(0, levels.findIndex(l => l.id === params.get("level")));

  const store = storage(game.id);
  const root = document.getElementById("game") || document.body.appendChild(el("div", { id: "game" }));
  root.className = "g-root" + (embed ? " g-embed" : "") + (present ? " g-present" : "");
  document.documentElement.classList.toggle("g-embedded", embed);

  /* ---- static frame --------------------------------------------------- */
  const nav = el("nav", { class: "g-levels", "aria-label": "שלבים" });
  const head = el("header", { class: "g-head" }, [
    embed ? null : el("h1", { class: "g-title", text: game.title }),
    nav,
  ]);
  const missionTitle = el("h2", { class: "g-mission-title" });
  const goal = el("div", { class: "g-goal" });
  const stage = el("div", { class: "g-stage" });
  const feedback = el("div", { class: "g-feedback", role: "status", "aria-live": "polite" });
  const hintList = el("ol", { class: "g-hints", "aria-label": "רמזים" });
  const debrief = el("section", { class: "g-debrief", hidden: true });

  const btnCheck = el("button", { class: "g-btn g-primary", type: "button", text: "בדיקה" });
  const btnHint = el("button", { class: "g-btn", type: "button", text: "רמז" });
  const btnReset = el("button", { class: "g-btn", type: "button", text: "איפוס" });
  const btnSolve = el("button", { class: "g-btn g-quiet", type: "button", text: "פתרון" });
  const btnNext = el("button", { class: "g-btn g-next", type: "button", text: "לשלב הבא ←" });
  const controls = el("div", { class: "g-controls" }, [btnCheck, btnHint, btnReset, btnSolve, btnNext]);

  const foot = el("footer", { class: "g-foot" });
  if (embed) {
    const full = new URL(window.location.href);
    full.searchParams.delete("embed");
    full.searchParams.delete("levels");
    foot.append(el("a", { href: full.pathname + "?" + full.searchParams.toString(), target: "_blank", rel: "noopener", text: "פתיחת המשחק בעמוד מלא, עם כל השלבים ←" }));
  } else {
    foot.append(el("button", {
      class: "g-link", type: "button", text: "איפוס ההתקדמות השמורה",
      onclick() { store.clear(); drawNav(); },
    }));
  }

  root.replaceChildren(head, el("section", { class: "g-mission" }, [missionTitle, goal]), stage, controls, feedback, hintList, debrief, foot);

  /* ---- per level ------------------------------------------------------ */
  let ctl = null, hintsShown = 0, won = false;

  function say(html, kind) {
    feedback.className = "g-feedback" + (kind ? " g-" + kind : "");
    feedback.innerHTML = html || "";
  }

  function drawNav() {
    nav.replaceChildren();
    nav.hidden = levels.length < 2;
    levels.forEach((l, i) => {
      nav.append(el("button", {
        type: "button",
        class: "g-lvl" + (i === index ? " g-current" : "") + (store.isDone(l.id) ? " g-done" : ""),
        "aria-current": i === index ? "step" : false,
        "aria-label": `שלב ${i + 1}: ${l.title}` + (store.isDone(l.id) ? " (הושלם)" : ""),
        title: l.title,
        onclick() { go(i); },
      }, [String(i + 1), store.isDone(l.id) ? el("span", { class: "g-tick", "aria-hidden": "true", text: "✓" }) : null]));
    });
  }

  function win(html) {
    if (won) return;
    won = true;
    store.markDone(levels[index].id);
    say(html || "כל הכבוד! הצלחתם.", "good");
    showDebrief();
    btnNext.hidden = index >= levels.length - 1;
    btnNext.classList.add("g-ready");
    root.classList.remove("g-cheer"); void root.offsetWidth; root.classList.add("g-cheer");
    drawNav();
  }

  function showDebrief() {
    const lvl = levels[index];
    if (!lvl.debrief) return;
    debrief.innerHTML = `<h3>הסבר הפתרון והרעיון המתמטי</h3>${lvl.debrief}`;
    debrief.hidden = false;
  }

  function go(i) {
    index = Math.max(0, Math.min(levels.length - 1, i));
    const lvl = levels[index];
    won = false; hintsShown = 0;
    missionTitle.textContent = (levels.length > 1 ? `שלב ${index + 1} — ` : "") + lvl.title;
    goal.innerHTML = lvl.goal || "";
    stage.replaceChildren();
    hintList.replaceChildren();
    debrief.hidden = true; debrief.replaceChildren();
    say("");
    ctl = game.mount(lvl, ui) || {};
    btnCheck.hidden = typeof ctl.check !== "function";
    btnSolve.hidden = typeof ctl.solve !== "function";
    btnReset.hidden = typeof ctl.reset !== "function";
    btnHint.hidden = !(lvl.hints && lvl.hints.length);
    btnHint.disabled = false;
    btnHint.textContent = lvl.hints && lvl.hints.length ? `רמז (0/${lvl.hints.length})` : "רמז";
    btnNext.hidden = true;
    btnNext.classList.remove("g-ready");
    drawNav();
    if (!embed) {
      const u = new URL(window.location.href);
      u.searchParams.set("level", lvl.id);
      try { window.history.replaceState(null, "", u); } catch (e) { /* file:// or sandboxed */ }
    }
  }

  btnCheck.addEventListener("click", () => {
    if (!ctl || !ctl.check) return;
    const r = ctl.check() || {};
    if (r.ok && won) say(r.message || "כבר פתרתם את השלב הזה.", "good");   // checking again after a win
    else if (r.ok) win(r.message);
    else say(r.message || "עדיין לא. נסו שוב.", r.kind || "bad");
  });
  btnHint.addEventListener("click", () => {
    const hints = levels[index].hints || [];
    if (hintsShown >= hints.length) return;
    hintList.append(el("li", { html: hints[hintsShown] }));
    hintsShown++;
    btnHint.textContent = `רמז (${hintsShown}/${hints.length})`;
    btnHint.disabled = hintsShown >= hints.length;
  });
  btnReset.addEventListener("click", () => {
    if (!ctl || !ctl.reset) return;
    ctl.reset();
    won = false;
    debrief.hidden = true;
    btnNext.hidden = true;
    say("");
  });
  btnSolve.addEventListener("click", () => {
    if (!ctl || !ctl.solve) return;
    won = true;   // set first: drawing the solution must not count as the player's win
    const msg = ctl.solve();
    say(msg || "זה הפתרון. כדאי לעבור עליו שורה אחר שורה, ואז לנסות את השלב שוב בעצמכם (איפוס).", "info");
    showDebrief();
    btnNext.hidden = index >= levels.length - 1;
  });
  btnNext.addEventListener("click", () => go(index + 1));

  const ui = { stage, say, win, el, embed, present, get level() { return levels[index]; } };
  go(index);
  return ui;
}
