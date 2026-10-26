/* game.js — "דוכן הפלאפל": the falafel-stand scene on top of the shared shell.
   The logic lives in rules.js, the levels in levels.js; this file only draws. */
import { startGame } from "../shared/shell.js";
import { sprite } from "../shared/sprites.js";
import {
  PEOPLE, QUESTION, answerText, explainAnswers, explainKnowledge, reason, solutions, freePeople,
} from "./rules.js";
import { LEVELS } from "./levels.js";

/* The barman's three verdicts in "serve" levels; knowledge() gives true / false / null. */
const MARKS = [
  { value: true, icon: "falafel", label: "רוצה פלאפל" },
  { value: false, icon: "nofalafel", label: "לא רוצה פלאפל" },
  { value: null, icon: "unknown", label: "אי אפשר לדעת" },
];
const WISHES = [
  { value: true, icon: "falafel", label: "רוצה" },
  { value: false, icon: "nofalafel", label: "לא רוצה" },
];
const UNSET = undefined;

/* Icons are SVG sprites (games/shared/sprites.js). The level texts still write
   🥙 / 🚫 / ❓ (readable in the source, checked by the tests); iconize() swaps
   them for the same pictures the buttons use. */
const ICON_OF = { "🥙": "falafel", "🚫": "nofalafel", "❓": "unknown" };
const icoHTML = name => `<span class="bm-ico" aria-hidden="true">${sprite(name)}</span>`;
const iconize = html => (typeof html === "string" ? html.replace(/🥙|🚫|❓/g, e => icoHTML(ICON_OF[e])) : html);
const LEVELS_DRAWN = LEVELS.map(l => ({
  ...l,
  goal: iconize(l.goal), debrief: iconize(l.debrief), win: iconize(l.win),
  hints: (l.hints || []).map(iconize),
}));

const markLabel = v => MARKS.find(m => m.value === v).label;
const wishWord = v => (v ? "רוצה" : "לא רוצה");
const quote = (a, p) => `״${answerText(a, p)}״`;
const b = p => `<b>${p.name}</b>`;

function mount(level, ui) {
  const { el } = ui;
  const { kind, mode, n } = level;
  const people = PEOPLE.slice(0, n);
  const said = kind === "design" ? level.target : explainAnswers(level.wants, mode).map(x => x.answer);
  const known = explainKnowledge(said, mode);

  /* ---- state ---------------------------------------------------------- */
  let picks = Array(n).fill(UNSET);   // serve: a mark, predict: an answer, design: a wish
  let shown = kind === "serve" ? 0 : n;   // serve levels reveal the answers one by one
  let done = false;                   // solved (by the player or by the solve button)
  let free = [];                      // design: people marked "לא משנה" after solving
  let flagged = -1;                   // the card the last failed check points at

  /* ---- scene ---------------------------------------------------------- */
  const live = el("div", { class: "bm-sr", "aria-live": "polite" });
  const formula = el("div", { class: "bm-formula", hidden: true, html: formulaHtml() });
  const nextBtn = kind === "serve"
    ? el("button", { type: "button", class: "g-btn bm-next", onclick: revealNext })
    : null;
  const barman = el("div", { class: "bm-back" }, [
    el("div", { class: "bm-barman", "aria-hidden": "true", html: sprite("barman") }),
    el("div", { class: "bm-q-wrap" }, [
      el("p", { class: "bm-q" }, [el("span", { class: "bm-sr", text: "המוכר שואל: " }), QUESTION[mode]]),
      formula,
    ]),
    nextBtn,
  ]);

  const cards = people.map((p, i) => drawCard(p, i));
  const row = el("ol", { class: "bm-row", "aria-label": "המתמטיקאים, לפי סדר הדיבור" }, cards.map(c => c.li));
  ui.stage.append(el("div", { class: "bm-scene bm-" + kind }, [
    barman,
    el("div", { class: "bm-counter", "aria-hidden": "true" }),
    row,
    live,
  ]));

  function drawCard(p, i) {
    const think = el("div", { class: "bm-think" });
    const speech = el("div", { class: "bm-say" });
    const flag = el("span", { class: "bm-flag", hidden: true, text: "✗ כאן" });
    const options = kind === "serve" ? MARKS
      : kind === "design" ? WISHES
      : ["yes", "no", "dunno"].map(a => ({ value: a, label: answerText(a, p) }));
    const groupLabel = kind === "serve" ? `מה אפשר לדעת על הרצון של ${p.name}?`
      : kind === "design" ? `מה ${p.name} רוצה?`
      : `מה עונה ${p.name}?`;
    const buttons = options.map(o => el("button", {
      type: "button", "aria-pressed": "false",
      onclick() { pick(i, o.value); },
    }, [o.icon ? el("span", { class: "bm-ico", "aria-hidden": "true", html: sprite(o.icon) }) : null, o.label]));
    const li = el("li", { class: "bm-card" }, [
      flag,
      think,
      el("div", { class: "bm-face", "aria-hidden": "true", html: sprite(p.sprite) }),
      el("div", { class: "bm-name", text: p.name }),
      speech,
      el("div", { class: "g-choice bm-pick", role: "group", "aria-label": groupLabel }, buttons),
    ]);
    return { li, think, speech, flag, buttons, options };
  }

  /* ---- drawing -------------------------------------------------------- */
  function bubble(node, icon, text, { yours = false, empty = false, srPrefix = "" } = {}) {
    node.classList.toggle("bm-yours", yours);
    node.classList.toggle("bm-empty", empty);
    node.replaceChildren(...[
      el("span", { class: "bm-sr", text: srPrefix }),
      icon ? el("span", { class: "bm-ico", "aria-hidden": "true", html: sprite(icon) }) : null,
      text,
    ].filter(Boolean));
  }

  function draw() {
    people.forEach((p, i) => {
      const c = cards[i];
      // the thought bubble: the secret wish
      let wish;
      if (kind === "design") wish = free.includes(i) ? "free" : picks[i];
      else if (kind === "predict" || done) wish = level.wants[i];
      else wish = "secret";
      const thinkPrefix = `${p.name} ${p.f ? "חושבת" : "חושב"}: `;
      if (wish === "secret") bubble(c.think, "", "הרצון אינו ידוע לכם", { empty: true, srPrefix: thinkPrefix });
      else if (wish === "free") bubble(c.think, "", "לא משנה", { yours: true, srPrefix: thinkPrefix });
      else if (wish === UNSET) bubble(c.think, "", "…", { yours: true, empty: true, srPrefix: thinkPrefix + "עוד לא נבחר" });
      else bubble(c.think, wish ? "falafel" : "nofalafel", wishWord(wish), { yours: kind === "design", srPrefix: thinkPrefix });

      // the speech bubble: what they say out loud
      const answer = kind === "predict" ? picks[i] : (i < shown ? said[i] : UNSET);
      const sayPrefix = `${p.name} ${p.f ? "אומרת" : "אומר"}: `;
      if (answer === UNSET) bubble(c.speech, "", "…", { yours: kind === "predict", empty: true, srPrefix: sayPrefix + "טרם נבחרה תשובה" });
      else bubble(c.speech, "", answer === "yes" ? "כן!" : answerText(answer, p), { yours: kind === "predict", srPrefix: sayPrefix });

      // the player's buttons
      c.buttons.forEach((btn, k) => btn.setAttribute("aria-pressed", String(picks[i] !== UNSET && c.options[k].value === picks[i])));
      c.flag.hidden = flagged !== i;
      c.li.classList.toggle("bm-flagged", flagged === i);
    });
    if (nextBtn) {
      nextBtn.textContent = shown < n ? `התשובה הבאה (${shown + 1}/${n}) ←` : "שוב מההתחלה ↻";
    }
    formula.hidden = !done;
  }

  function formulaHtml() {
    const op = mode === "all" ? " ∧ " : " ∨ ";
    const word = mode === "all" ? "כולם?" : "מישהו?";
    return `${word} = <span class="m">${people.map((_, i) => "W" + "₁₂₃₄₅"[i]).join(op)}</span>`;
  }

  /* ---- actions -------------------------------------------------------- */
  function pick(i, value) {
    picks[i] = value;
    if (kind === "design") free = free.filter(j => j !== i);
    if (flagged === i) flagged = -1;
    draw();
  }

  function revealNext() {
    if (shown >= n) { shown = 0; draw(); live.textContent = "מתחילים מההתחלה. " + QUESTION[mode]; return; }
    shown++;
    draw();
    const i = shown - 1, node = cards[i].speech;
    node.classList.remove("bm-pop"); void node.offsetWidth; node.classList.add("bm-pop");
    live.textContent = `${people[i].name}: ${quote(said[i], people[i])}`;
    if (shown >= n) nextBtn.focus();
  }

  function fail(i, html) {
    flagged = i;
    draw();
    return { ok: false, message: html };
  }

  function check() {
    flagged = -1;
    if (kind === "serve") {
      shown = n;   // checking means: all answers are on the table
      for (let i = 0; i < n; i++) {
        const p = people[i];
        if (picks[i] === UNSET) return fail(i, `עוד לא סימנתם מה אפשר לדעת על ${b(p)}. סמנו ״רוצה פלאפל״, ״לא רוצה פלאפל״ או ״אי אפשר לדעת״, ואז בדקו שוב.`);
        if (picks[i] !== known[i].know) {
          return fail(i, `סימנתם ל${b(p)} ״${markLabel(picks[i])}״. אבל ${reason(known[i].rule, p)} ` +
            `תקנו את הסימון של ${p.name} ובדקו שוב.`);
        }
      }
      done = true; draw();
      return { ok: true, message: level.win };
    }
    if (kind === "predict") {
      const right = explainAnswers(level.wants, mode);
      for (let i = 0; i < n; i++) {
        const p = people[i];
        if (picks[i] === UNSET) return fail(i, `עוד לא בחרתם מה עונה ${b(p)}. בחרו תשובה לכל אחד, ואז בדקו שוב.`);
        if (picks[i] !== right[i].answer) {
          return fail(i, `בחרתם ש${b(p)} עונה ${quote(picks[i], p)}. אבל ${reason(right[i].rule, p)} ` +
            `תקנו את התשובה של ${p.name} ובדקו שוב.`);
        }
      }
      done = true; draw();
      return { ok: true, message: level.win };
    }
    // design: simulate the conversation with the chosen wishes
    const sim = explainAnswers(picks.map(v => v === true), mode);
    for (let i = 0; i < n; i++) {
      const p = people[i];
      if (picks[i] === UNSET) return fail(i, `עוד לא בחרתם מה ${b(p)} רוצה. בחרו ״רוצה״ או ״לא רוצה״ לכל אחד, ואז בדקו שוב.`);
      if (sim[i].answer !== level.target[i]) {
        return fail(i, `לפי הרצונות שבחרתם, ${b(p)} עונה ${quote(sim[i].answer, p)} ולא ${quote(level.target[i], p)}: ` +
          `${reason(sim[i].rule, p)} שנו את הרצון של ${p.name} ובדקו שוב.`);
      }
    }
    done = true; draw();
    return { ok: true, message: level.win };
  }

  function reset() {
    picks = Array(n).fill(UNSET);
    shown = kind === "serve" ? 0 : n;
    done = false; free = []; flagged = -1;
    draw();
  }

  function solve() {
    flagged = -1; done = true;
    if (kind === "serve") { shown = n; picks = known.map(k => k.know); }
    else if (kind === "predict") picks = explainAnswers(level.wants, mode).map(x => x.answer);
    else {
      const sol = solutions(level.target, mode)[0];
      free = freePeople(level.target, mode);
      picks = sol.map((v, i) => (free.includes(i) ? UNSET : v));
    }
    draw();
    if (kind === "design" && free.length) {
      const names = free.map(i => people[i].name).join(" ו");
      return `זה הפתרון. אצל ${names} כתוב ״לא משנה״: כל בחירה שם נותנת את אותן תשובות. כדאי לעבור על הפתרון שורה אחר שורה, ואז לנסות בעצמכם (איפוס).`;
    }
    return null;
  }

  draw();
  return { check, reset, solve };
}

startGame({ id: "barman", title: "דוכן הפלאפל", levels: LEVELS_DRAWN, mount });
