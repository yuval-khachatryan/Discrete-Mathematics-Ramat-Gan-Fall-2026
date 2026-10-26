/* game.js — "מי עובר בשער?": knights, knaves and a theatrical guard.
   The logic (consistency, conflicts, the evaluation line, the Hebrew verdicts)
   lives in knights.js; the puzzles in levels.js. This file draws the gate,
   the cards and the table of possibilities, and wires them to the shell. */

import { startGame, el } from "../shared/shell.js";
import { LEVELS } from "./levels.js";
import * as K from "./knights.js";
import { sprite } from "../shared/sprites.js";

const pic = (name, cls) => el("span", { class: cls, "aria-hidden": "true", html: sprite(name) });
const picHTML = (name, cls) => `<span class="${cls}" aria-hidden="true">${sprite(name)}</span>`;

const chip = v => el("span", { class: "tv-" + (v ? "T" : "F"), text: v ? "T" : "F" });
const m = s => `<span class="m">${s}</span>`;
const isF = p => p.g === "f";

/** "אלון", "אלון ובתיה", "אלון, בתיה וכרמל" */
function names(list) {
  const n = list.map(p => p.name);
  return n.length < 2 ? n.join("") : n.slice(0, -1).join(", ") + " ו" + n[n.length - 1];
}
/** verb by number and gender: one man / one woman / several (all women) / several */
const verb = (list, ms, fs, mp, fp) =>
  list.length === 1 ? (isF(list[0]) ? fs : ms) : list.every(isF) ? fp : mp;

const GATE_SVG = `
<svg class="k-gate" viewBox="0 0 120 92" aria-hidden="true" focusable="false">
  <rect x="22" y="40" width="76" height="48" fill="#bbf7d0"/>
  <path d="M30 88 q12 -14 22 -4 q10 -12 22 -2 q8 -8 18 6 Z" fill="#86efac"/>
  <circle cx="84" cy="52" r="5" fill="#fde047"/>
  <g class="k-door k-door-a">
    <rect x="22" y="40" width="38" height="48" fill="#92400e" opacity="0.18"/>
    <path d="M28 40v48M35 40v48M42 40v48M49 40v48M56 40v48M22 56h38M22 74h38" stroke="#78350f" stroke-width="2.4"/>
    <rect x="22" y="40" width="38" height="48" fill="none" stroke="#78350f" stroke-width="3"/>
  </g>
  <g class="k-door k-door-b">
    <rect x="60" y="40" width="38" height="48" fill="#92400e" opacity="0.18"/>
    <path d="M64 40v48M71 40v48M78 40v48M85 40v48M92 40v48M60 56h38M60 74h38" stroke="#78350f" stroke-width="2.4"/>
    <rect x="60" y="40" width="38" height="48" fill="none" stroke="#78350f" stroke-width="3"/>
  </g>
  <path d="M16 42 Q60 -2 104 42 L98 42 Q60 8 22 42 Z" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
  <rect x="4" y="24" width="18" height="66" rx="2" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
  <rect x="98" y="24" width="18" height="66" rx="2" fill="#e2e8f0" stroke="#64748b" stroke-width="2"/>
  <path d="M4 36h18M4 52h18M4 68h18M98 36h18M98 52h18M98 68h18" stroke="#94a3b8" stroke-width="1.5"/>
  <path d="M60 18V4" stroke="#64748b" stroke-width="2"/>
  <path d="M60 4l14 4l-14 4Z" fill="#ef4444"/>
  <rect x="0" y="88" width="120" height="4" fill="#a8a29e"/>
</svg>`;

const GUARD_BAD = [
  "סתירה! השער נשאר סגור.",
  "אחת האמירות אינה מתאימה לסוג שבחרתם לדובר. בדקו את ההסבר.",
  "לא, לא, לא. ככה אני לא פותח שער.",
  "סתירה נוספת! עוד אחת ואני מתחיל לאסוף אותן.",
];

function mount(level, ui) {
  const people = level.people;
  const rows = K.rows(level);
  const sols = K.solutions(level);
  const askAll = level.answers === "all";
  const labels = {};                       // id → true (knight) / false (knave)
  let status = rows.map(() => null);       // per row: null | {ok} | {ok:false, who}
  let done = false, wasWin = false, checks = 0, grumble = 0;

  /* ---- the gate and the guard ------------------------------------------ */
  const guardLine = el("span", { class: "k-guard-line" });
  const gate = el("div", { class: "k-gate-wrap", html: GATE_SVG });
  const scene = el("div", { class: "k-scene" }, [
    el("div", { class: "k-guard", "aria-hidden": "true", html: sprite("guard") }),
    el("p", { class: "k-guard-bubble" }, [el("b", { text: "השומר: " }), guardLine]),
    gate,
  ]);
  const guard = s => { guardLine.textContent = s; };

  const rules = el("p", { class: "k-rules", html:
    `${picHTML("knight", "k-ico")} <b>אבירים ואבירות</b> תמיד אומרים אמת · ${picHTML("knave", "k-ico")} <b>נוכלים ונוכלות</b> תמיד משקרים` });

  const report = level.report ? el("div", { class: "k-report" }, [
    el("div", { class: "k-report-avatar", "aria-hidden": "true", html: sprite(level.report.avatar) }),
    el("p", { class: "k-report-text" }, [el("b", { text: level.report.who + " מדווח: " }), K.quote(level.report.text)]),
  ]) : null;

  /* ---- one card per person --------------------------------------------- */
  const cards = {};
  const peopleBox = el("div", { class: "k-people" });
  for (const p of people) {
    const st = level.statements.find(s => s.by === p.id);
    const btnK = el("button", { type: "button", "aria-pressed": "false", onclick() { setLabel(p.id, true); } },
      [pic("knight", "k-ico"), K.roleWord(p, true)]);
    const btnN = el("button", { type: "button", "aria-pressed": "false", onclick() { setLabel(p.id, false); } },
      [pic("knave", "k-ico"), K.roleWord(p, false)]);
    const mark = el("span", { class: "k-mark", "aria-hidden": "true" });
    let formula = null, toggle = null;
    if (st) {
      const fid = `k-f-${level.id}-${p.id}`;
      formula = el("p", { class: "k-formula", id: fid, hidden: true, html: `בנוסחה: ${K.formulaHTML(st.formula)}` });
      toggle = el("button", {
        type: "button", class: "g-link k-ftoggle", "aria-expanded": "false", "aria-controls": fid,
        text: "הצגת הנוסחה",
        onclick() {
          formula.hidden = !formula.hidden;
          toggle.setAttribute("aria-expanded", String(!formula.hidden));
          toggle.textContent = formula.hidden ? "הצגת הנוסחה" : "הסתרת הנוסחה";
        },
      });
    }
    const bubble = st
      ? el("p", { class: "k-bubble" }, [el("span", { class: "k-sr", text: isF(p) ? "אומרת: " : "אומר: " }), K.quote(st.text)])
      : el("p", { class: "k-bubble k-silent" }, [el("span", { "aria-hidden": "true", text: "… " }), isF(p) ? "שותקת" : "שותק"]);
    const note = el("p", { class: "k-note", hidden: true });
    const card = el("article", { class: "k-card", "aria-label": p.name }, [
      el("div", { class: "k-avatar", "aria-hidden": "true" }, [pic(p.avatar || "student", "k-face"), mark]),
      el("h3", { class: "k-name", text: p.name }),
      bubble, toggle, formula,
      el("div", { class: "g-choice k-role", role: "group", "aria-label": `${p.name}: ${K.roleWord(p, true)} או ${K.roleWord(p, false)}?` }, [btnK, btnN]),
      note,
    ]);
    cards[p.id] = { card, btnK, btnN, mark, formula, toggle, note };
    peopleBox.append(card);
  }

  /* ---- the table of possibilities -------------------------------------- */
  const meaning = people.map(p => `<span class="k-nw">${m(p.id)} = ״${p.name} ${K.roleWord(p, true)}״</span>`).join(" ");
  const tbody = el("tbody");
  // Book convention: RTL, first person in the rightmost column, result at the
  // far left. The result cell is the row's button (it loads the row).
  const trs = rows.map((env, i) => {
    const btn = el("button", { type: "button", class: "k-rowbtn", onclick(e) { e.stopPropagation(); loadRow(i); } });
    const tr = el("tr", { onclick() { loadRow(i); } }, [
      ...people.map(p => el("td", { title: K.roleWord(p, env[p.id]) }, [el("span", { class: "m" }, [chip(env[p.id])])])),
      el("td", { class: "k-res" }, [btn]),
    ]);
    tbody.append(tr);
    return { tr, btn };
  });
  const table = el("table", { class: "k-table" }, [
    el("thead", {}, [el("tr", {}, [
      ...people.map(p => el("th", { scope: "col", html: `${p.name}<br>${m(p.id)}` })),
      el("th", { scope: "col", text: "תוצאה" }),
    ])]),
    tbody,
  ]);
  const tally = el("p", { class: "k-tally" });
  const panel = el("section", { class: "k-panel", "aria-label": "טבלת האפשרויות" }, [
    el("h3", { text: "טבלת האפשרויות" }),
    el("p", { class: "k-legend", html:
      `כל שורה מציגה אפשרות אחת לסוגי התושבים. בטבלה ${rows.length} שורות. לחיצה על שורה מסמנת בכרטיסים את הסוגים המופיעים בה.` }),
    el("p", { class: "k-legend k-vars", html:
      `${meaning} <span class="k-nw">(<span class="tv-T">T</span> = אביר או אבירה, <span class="tv-F">F</span> = נוכל או נוכלת)</span>` }),
    el("div", { class: "k-table-wrap" }, [table]),
    tally,
  ]);

  /* ---- the two extra answers ------------------------------------------- */
  const ansBtn = {};
  if (askAll) {
    ansBtn.none = el("button", { type: "button", class: "g-btn k-ans", "aria-pressed": "false", text: "אין אפשרות מתאימה", onclick() { answer("none"); } });
    ansBtn.many = el("button", { type: "button", class: "g-btn k-ans", "aria-pressed": "false", text: "יש יותר מאפשרות אחת", onclick() { answer("many"); } });
    panel.append(el("div", { class: "k-answers", role: "group", "aria-label": "תשובה על הטבלה כולה" }, [
      el("p", { html: "אם אף אפשרות אינה מתאימה, או אם מתאימה יותר מאפשרות אחת, בחרו:" }), ansBtn.none, ansBtn.many,
    ]));
  }

  ui.stage.append(el("div", { class: "k-board" }, [
    scene, rules, report,
    el("div", { class: "k-main" }, [peopleBox, panel]),
  ]));

  /* ---- state → screen --------------------------------------------------- */
  const complete = () => people.every(p => labels[p.id] !== undefined);
  const env = () => Object.fromEntries(people.map(p => [p.id, !!labels[p.id]]));

  function draw() {
    for (const p of people) {
      const c = cards[p.id], v = labels[p.id];
      c.btnK.setAttribute("aria-pressed", String(v === true));
      c.btnN.setAttribute("aria-pressed", String(v === false));
      c.card.classList.toggle("k-knight", v === true);
      c.card.classList.toggle("k-knave", v === false);
      if (v === undefined) c.mark.textContent = "?"; else c.mark.innerHTML = sprite(v ? "knight" : "knave");
      c.mark.classList.toggle("k-mark-pic", v !== undefined);
    }
    const cur = complete() ? K.rowIndex(level, env()) : -1;
    trs.forEach((r, i) => {
      const s = status[i];
      r.tr.className = (s ? (s.ok ? "k-ok" : "k-bad") : "") + (i === cur ? " k-current" : "");
      if (i === cur) r.tr.setAttribute("aria-current", "true"); else r.tr.removeAttribute("aria-current");
      r.btn.textContent = !s ? "?" : s.ok ? "✓ מתאימה" : "✗ " + s.who.name;
      r.btn.setAttribute("aria-label", `שורה ${i + 1}, ${K.rowWords(level, rows[i])}: ` +
        (!s ? "עוד לא נבדקה" : s.ok ? "מתאימה לכל האמירות" : `נפסלה: האמירה של ${s.who.name} אינה מתאימה לסימון`) +
        ". לחיצה מסמנת בכרטיסים את הסוגים שבשורה.");
    });
    // The open gate and the pass / stay stamps follow the cards: they show only
    // while the solved level's cards hold its (unique) solution.
    const atWin = done && sols.length === 1 && complete() && K.sameRow(level, env(), sols[0]);
    scene.classList.toggle("k-open", atWin);
    if (done && sols.length === 1 && atWin !== wasWin)
      guard(atWin ? level.guardWin || passLine(sols[0]) : "רגע! שיניתם סימון — השער נסגר עד שיתברר מי זה מי.");
    wasWin = atWin;
    for (const p of people) {
      const c = cards[p.id];
      if (atWin) note(p.id, labels[p.id] ? "k-pass" : "k-stay", labels[p.id]
        ? (isF(p) ? "עוברת בשער ←" : "עובר בשער ←")
        : (isF(p) ? "נשארת בחוץ" : "נשאר בחוץ"));
      else if (/k-pass|k-stay/.test(c.note.className)) { c.note.hidden = true; c.note.className = "k-note"; }
    }
    const n = status.filter(Boolean).length;
    tally.textContent = `נבדקו ${n} מתוך ${rows.length} שורות.` + (n ? " ✓ = האפשרות מתאימה לכל האמירות; ✗ = האפשרות נפסלה, ולצדה שם הדמות שאמירתה אינה מתאימה לסימון." : "");
  }

  function clearNotes() {
    for (const p of people) {
      const c = cards[p.id];
      c.card.classList.remove("k-conflict");
      c.note.hidden = true; c.note.className = "k-note"; c.note.textContent = "";
    }
  }
  function note(id, cls, text) {
    const c = cards[id];
    c.note.hidden = false; c.note.className = "k-note " + cls; c.note.textContent = text;
  }

  function setLabel(id, v) {
    labels[id] = labels[id] === v ? undefined : v;
    clearNotes();
    draw();
  }

  function loadRow(i) {
    for (const p of people) labels[p.id] = rows[i][p.id];
    clearNotes();
    draw();
    ui.say(`הסוגים שבשורה סומנו בכרטיסים: ${K.rowWords(level, rows[i])}. עכשיו לחצו <b>בדיקה</b>.`, "info");
  }

  function fillAll() {
    status = rows.map(r => {
      const c = K.firstConflict(level, r);
      return c ? { ok: false, who: c.person } : { ok: true };
    });
  }
  function showFormulas(on) {
    for (const p of people) {
      const c = cards[p.id];
      if (!c.formula) continue;
      c.formula.hidden = !on;
      c.toggle.hidden = on;
      c.toggle.setAttribute("aria-expanded", "false");
      c.toggle.textContent = "הצגת הנוסחה";
    }
  }
  function passLine(r) {
    const pass = people.filter(p => r[p.id]), stay = people.filter(p => !r[p.id]);
    const a = pass.length ? `${names(pass)} ${verb(pass, "עובר", "עוברת", "עוברים", "עוברות")}` : "אף אחד לא עובר היום";
    const b = stay.length ? `${names(stay)} ${verb(stay, "נשאר", "נשארת", "נשארים", "נשארות")} בחוץ` : "";
    return `השער נפתח! ${a}${b ? ", ו" + b : ""}.`;
  }
  /** The finished picture: whole table, formulas, gate (if someone is known). */
  function finish(r) {
    done = true;
    fillAll();
    showFormulas(true);
    clearNotes();
    guard(level.guardWin || (r ? passLine(r) : "השער נשאר סגור — והפעם בצדק."));
    draw();
  }

  /** Not wrong, just not finished: the shell shows it in blue, not red. */
  function soft(msg) {
    return { ok: false, message: msg, kind: "info" };
  }

  /* ---- the extra answers (levels with answers: "all") ------------------ */
  function answer(choice) {
    const j = K.judgeAnswer(level, choice);
    if (j.correct) {
      for (const k in ansBtn) ansBtn[k].setAttribute("aria-pressed", String(k === choice));
      finish(null);
      const msg = choice === "none"
        ? `נכון — <b>אין אפשרות מתאימה</b>. בכל אחת מ־${rows.length} השורות בטבלה יש אמירה שאינה מתאימה לסוג שסומן לדובר, ולכן אף אחד לא יכול לומר את המשפט הזה.`
        : `נכון — <b>יש יותר מאפשרות אחת</b>: ${j.count} שורות מתאימות בטבלה, ולכן אי אפשר לדעת מי הוא מי.`;
      ui.say(msg, "good");
      ui.win(msg);
      return;
    }
    if (done) { ui.say("השלב כבר פתור. כדי לנסות שוב מההתחלה לחצו <b>איפוס</b>.", "info"); return; }
    guard("הממ. השומר מרים גבה אחת. ואז את השנייה.");
    ui.say(j.actual === "none"
      ? "יותר מאפשרות אחת? השומר היה מסתפק גם באחת! בדקו את השורות בטבלה: האם יש אפילו שורה אחת שמתאימה?"
      : j.actual === "one"
        ? "לא בדיוק: יש כאן שורה אחת בלבד שמתאימה. מצאו אותה, סמנו אותה ולחצו <b>בדיקה</b>."
        : "דווקא יש שורה בטבלה שמתאימה לכל האמירות. נסו את השורות שעדיין מסומנות ״?״.", "bad");
  }

  /* ---- what the shell calls --------------------------------------------- */
  function check() {
    const missing = people.filter(p => labels[p.id] === undefined);
    if (missing.length) {
      guard("עוד לא נבחר סוג לכל התושבים. השלימו את הבחירה.");
      return soft(`השומר צריך תשובה על כולם: עוד לא סימנתם את ${names(missing)}. סמנו, ואז לחצו <b>בדיקה</b>.`);
    }
    const r = env(), i = K.rowIndex(level, r), c = K.firstConflict(level, r);
    checks++;
    clearNotes();
    if (c) {
      status[i] = { ok: false, who: c.person };
      cards[c.person.id].card.classList.add("k-conflict");
      note(c.person.id, "k-bad", "✗ כאן הסתירה");
      guard(GUARD_BAD[grumble++ % GUARD_BAD.length]);
      draw();
      const open = status.filter(s => !s).length;
      let next;
      if (open) next = `מה עכשיו? שנו סימון ובדקו שוב, או לחצו בטבלה על שורה שעדיין מסומנת ״?״ (${open === 1 ? "נשארה אחת" : `נשארו ${open}`}).`;
      else if (askAll && !status.some(s => s.ok)) next = "כל השורות בטבלה נפסלו. אז מה התשובה? יש כפתור בדיוק בשביל זה.";
      else next = "כל השורות נבדקו. ספרו כמה מהן מתאימות לכל האמירות, ובחרו תשובה.";
      const intro = level.guided && checks === 1
        ? "הניחוש נרשם בטבלת האפשרויות: השורה שלו מסומנת עכשיו ✗, עם שם הדמות שאמירתה אינה מתאימה לסימון. " : "";
      return {
        ok: false,
        message: `${K.conflictSentence(level, r)}<div class="k-eval">${K.evaluationHTML(c.statement, r)}</div><p class="k-next">${intro}${next}</p>`,
      };
    }
    status[i] = { ok: true };
    if (sols.length === 1) {
      finish(r);
      const msg = `${passLine(r)} כל אביר כאן אומר אמת וכל נוכל משקר. הטבלה מלאה עכשיו: זו השורה היחידה שמתאימה לכל האמירות.`;
      return { ok: true, message: msg };
    }
    guard("האפשרות מתאימה. האם יש אפשרות נוספת שמתאימה?");
    draw();
    return soft(`האפשרות שבחרתם מתאימה לכל האמירות, והשורה סומנה ✓ בטבלה. אבל האם היא <b>היחידה</b>? בדקו את שאר השורות, ואז בחרו תשובה בכפתורים שמתחת לטבלה.`);
  }

  function reset() {
    for (const p of people) delete labels[p.id];
    status = rows.map(() => null);
    done = false; checks = 0; grumble = 0;
    for (const k in ansBtn) ansBtn[k].setAttribute("aria-pressed", "false");
    showFormulas(false);
    clearNotes();
    guard(level.guard);
    draw();
  }

  function solve() {
    reset();
    if (sols.length === 1) {
      Object.assign(labels, sols[0]);
      finish(sols[0]);
      return `הפתרון: ${K.rowWords(level, sols[0])}. רק שורה אחת מתאימה לכל האמירות (✓). בכל שורה אחרת מצוין מי אמר דבר שאינו מתאים לסוג שסומן לו.`;
    }
    const k = sols.length ? "many" : "none";
    if (ansBtn[k]) ansBtn[k].setAttribute("aria-pressed", "true");
    finish(null);
    return sols.length === 0
      ? `התשובה: <b>אין אפשרות מתאימה</b>. כל ${rows.length} השורות בטבלה נפסלו — בכל אחת מהן יש אמירה שאינה מתאימה לסוג שסומן לדובר.`
      : `התשובה: <b>יש יותר מאפשרות אחת</b>. ${sols.length} שורות מתאימות (✓), ולכן אי אפשר לקבוע מי הוא מי.`;
  }

  reset();
  return { check, reset, solve };
}

startGame({ id: "gate", title: "מי עובר בשער?", levels: LEVELS, mount });
