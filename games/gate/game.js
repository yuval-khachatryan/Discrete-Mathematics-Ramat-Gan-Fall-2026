/* game.js — "מי עובר בשער?": knights, knaves and a theatrical guard.
   The logic (consistency, conflicts, the evaluation line, the Hebrew verdicts)
   lives in knights.js; the puzzles in levels.js. This file draws the gate,
   the cards and the table of possibilities, and wires them to the shell. */

import { startGame, el } from "../shared/shell.js";
import { LEVELS } from "./levels.js";
import * as K from "./knights.js";
import { mountKnightTable } from "../shared/knight-workshop.js";
import { sprite } from "../shared/sprites.js";

const pic = (name, cls) => el("span", { class: cls, "aria-hidden": "true", html: sprite(name) });
const picHTML = (name, cls) => `<span class="${cls}" aria-hidden="true">${sprite(name)}</span>`;

const isF = p => p.g === "f";

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

function mount(level, ui) {
  const solutions=K.solutions(level);
  const guardLine=el('span',{class:'k-guard-line',text:level.guard});
  const scene=el('div',{class:'k-scene'},[
    el('div',{class:'k-guard','aria-hidden':'true',html:sprite('guard')}),
    el('p',{class:'k-guard-bubble'},[el('b',{text:'השומר: '}),guardLine]),
    el('div',{class:'k-gate-wrap',html:GATE_SVG}),
  ]);
  const rules=el('p',{class:'k-rules',html:`${picHTML('knight','k-ico')} <b>אבירים אומרים אמת</b> · ${picHTML('knave','k-ico')} <b>נוכלים אומרים שקר</b>`});
  const peopleBox=el('div',{class:'k-people'});
  for(const p of level.people){
    const st=level.statements.find(s=>s.by===p.id);
    peopleBox.append(el('article',{class:'k-card','aria-label':p.name},[
      pic(p.avatar||'student','k-face'),el('h3',{class:'k-name',text:p.name}),
      el('p',{class:st?'k-bubble':'k-bubble k-silent'},st?[K.quote(st.text)]:[isF(p)?'שותקת':'שותק']),
    ]));
  }
  const report=level.report?el('p',{class:'k-report-text'},[el('b',{text:level.report.who+' מדווח: '}),K.quote(level.report.text)]):null;
  const panel=el('section',{class:'k-panel','aria-label':'התשובה שלכם'});
  const finish=()=>{scene.classList.toggle('k-open',solutions.length===1);guardLine.textContent=level.guardWin||'הבדיקה הושלמה. עכשיו ברור מה אפשר להסיק מהאמירות.';};
  const table=mountKnightTable(panel,level,{
    showReset:false,
    onChange(){scene.classList.remove('k-open');guardLine.textContent=level.guard;ui.say('');},
    onSolved(){finish();ui.win('מצאתם את כל האפשרויות המתאימות.');},
  });
  ui.stage.append(el('div',{class:'k-board'},[scene,rules,report,peopleBox,panel]));
  return {
    reset(){table.reset();},
    solve(){table.reveal();finish();return 'התשובה מוצגת. בדקו כיצד כל אמירה מתאימה לסוג הדובר.';},
  };
}

startGame({id:'gate',title:'מי עובר בשער?',levels:LEVELS,mount});
