import {proofTable} from './proof-table.js';
import {proofFormula} from './proof-notation.js';
import { activityHelp } from "./activity-help.js";
import { compactProofStep } from "./compact-proof-step.js";
import { keyboard } from "./formula-keyboard.js";
import { replacementEditor } from "./replacement-editor.js";
import { checkStart, checkProof, stepReason, stepRuleNames, trimBlankSteps } from "./proof-rules.js";
import { format, parse } from "./logic.js";

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (k === "text") node.textContent = v;
    else if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of children) node.append(child);
  return node;
}
let nextId = 0;
// Keep grouping visible: the student may have just justified an association step.
const display = proofFormula;


export function initProofEditor(box) {
  const start = box.dataset.start, target = box.dataset.target;
  const reversible = box.dataset.reversible === "true";
  const showTarget = box.dataset.showTarget !== "false";
  const rows = [];
  let accepted = [], acceptedStart = null, acceptedTarget = target;
  const list = el("div", { class: "proof-steps" });
  const summary = el("div", { class: "bk-msg", "aria-live": "polite" });
  const startFeedback = el("div", { id: `proof-start-feedback-${++nextId}`, class: "bk-msg", "aria-live": "polite" });
  const startInput = el("input", { type: "text", class: "bk-input proof-start-input", dir: "ltr", maxlength: "240",
    autocomplete: "off", spellcheck: "false", "aria-describedby": startFeedback.id,
    placeholder: "כתבו את נוסחת ההתחלה", oninput() { uppercase(startInput); clearFeedback(0, true); } });
  const goal = el("div", { class: "proof-goal" });
  const startChoice=el('select',{class:'proof-start-choice','aria-label':'בחירת נקודת המוצא'},[
    el('option',{value:'',text:'בחרו נקודת מוצא…'}),
    el('option',{value:start,text:display(start)}),
    ...(reversible?[el('option',{value:target,text:display(target)})]:[]),
  ]);
  startChoice.addEventListener('change',()=>{if(!startChoice.value)return;startInput.value=startChoice.value;clearFeedback(0,true);check(-1);});
  const customStart=el('details',{class:'proof-custom-start'},[
    el('summary',{text:'הקלדה ידנית (לבחירה)'}),
    el('label',{class:'proof-field'},[el('span',{text:'נוסחת ההתחלה'}),startInput]),
    keyboard(startInput,()=>clearFeedback(0,true)),
    el('button',{type:'button',class:'bk-btn',text:'בדיקת נקודת המוצא',onclick:()=>check(-1)}),
  ]);
  const startRow=el('fieldset',{class:'proof-start proof-step'},[
    el('legend',{text:'נקודת המוצא'}),startChoice,customStart,startFeedback,
  ]);
  const startCompact=compactProofStep(startRow,()=>clearFeedback(0,true));
  const undo=el('button',{type:'button',class:'bk-btn bk-quiet',text:'חזרה לצעד האחרון',onclick:()=>{
    if(!accepted.length)return;
    const index=accepted.length-1;
    while(rows.length>index+1&&!rows.at(-1).input.value.trim()&&!rows.at(-1).replacements.get().length){rows.pop().fieldset.remove();}
    clearFeedback(index);refreshNumbers();rows[index].compact.focus();
  }});
  const add = el("button", { type: "button", class: "bk-btn", text: "הוספת צעד", onclick: () => addRow(true) });
  const submit = el("button", { type: "submit", class: "bk-btn bk-main", text: "סיימתי את ההוכחה — בדקו" });
  const controls=el('div',{class:'bk-bar'},[add,submit,undo]);
  const ledger=el('section',{class:'proof-ledger','aria-label':'ההוכחה'},[goal,startRow,list]);
  const form = el("form", { class: "proof-form", onsubmit(e) { e.preventDefault(); check(rows.length-1,true); } }, [ledger,controls,summary]);
  const tablePractice=proofTable(()=>({left:acceptedStart||start,right:acceptedStart?acceptedTarget:target}));
  box.append(activityHelp("equivalence"), tablePractice.box, form);
  box.classList.add("proof-ready");

  function uppercase(input) {
    const p = input.selectionStart;
    input.value = input.value.toUpperCase();
    input.setSelectionRange(p,p);
  }
  function renderChain() {
    list.hidden=!acceptedStart;controls.hidden=!acceptedStart;goal.hidden=!acceptedStart;
    undo.disabled=!accepted.length;
    if(!acceptedStart)return;
    const known=showTarget||checkProof(acceptedStart,acceptedTarget,accepted).complete;
    goal.replaceChildren(el('p',{},[
      el('strong',{text:known?'נראה ש־':'נפשט את הנוסחה:'}),
      el('bdi',{class:'proof-formula',dir:'ltr',text:known?`${display(acceptedStart)} ≡ ${display(acceptedTarget)}`:display(acceptedStart)}),
    ]));
  }
  function clearFeedback(from = 0, resetStart = false) {
    accepted = accepted.slice(0, from);
    if (resetStart) {
      acceptedStart = null;startCompact.invalidate();
      startFeedback.textContent = "";
      startInput.removeAttribute("aria-invalid");
    }
    refreshReplacements();
    renderChain();
    summary.textContent = "";
    summary.className = "bk-msg";
    for (const row of rows.slice(from)) {
      row.compact.invalidate();
      row.feedback.textContent = "";
      row.feedback.className = "bk-msg";
      row.input.removeAttribute("aria-invalid");
      row.replacements.showResult(null);
    }
  }
  function refreshReplacements(){
    rows.forEach((row,i)=>row.replacements.setSource(i?rows[i-1].input.value:startInput.value));
  }
  function refreshNumbers() {
    rows.forEach((row, i) => {
      row.legend.textContent = `צעד ${i+1}`;
      row.input.setAttribute("aria-label", `הנוסחה אחרי צעד ${i+1}`);
      row.remove.setAttribute("aria-label", `מחיקת צעד ${i+1}`);
    });
    add.disabled = rows.length >= 20;
    add.textContent = add.disabled ? "אפשר לכתוב עד 20 צעדים" : "הוספת צעד";
  }
  function addRow(focus = false) {
    if (rows.length >= 20) return;
    clearFeedback(rows.length);
    const id = `proof-feedback-${++nextId}`;
    const feedback = el("div", { id, class: "bk-msg" });
    const input = el("input", {
      type: "text", class: "bk-input proof-input", dir: "ltr", maxlength: "240",
      autocomplete: "off", spellcheck: "false", placeholder: "כתבו כאן את הנוסחה החדשה",
      "aria-describedby": id,
      oninput() {
        uppercase(input);
        clearFeedback(rows.indexOf(row));
      },
    });
    const keys = keyboard(input, () => clearFeedback(rows.indexOf(row)));
    const legend = el("legend");
    const replacements=replacementEditor(()=>clearFeedback(rows.indexOf(row)));
    replacements.activate(true);
    replacements.bindResult(input,()=>clearFeedback(rows.indexOf(row)),()=>{check(rows.indexOf(row));return {ok:fieldset.classList.contains("step-accepted"),message:summary.textContent};});
    const remove = el("button", { type: "button", class: "bk-btn bk-quiet", text: "מחיקת הצעד", onclick() {
      const index = rows.indexOf(row);
      rows.splice(index,1); fieldset.remove();
      clearFeedback(index); refreshNumbers();
      if (!rows.length) addRow(true);
      else rows[Math.min(index,rows.length-1)].input.focus();
    } });
    const fieldset = el("fieldset", { class: "proof-step" }, [legend, replacements.box,
      el("label", { class: "proof-field" }, [el("span", { text: "הנוסחה לאחר ההחלפות" }), input]), keys, feedback, replacements.resultTools, el("div", { class: "bk-bar" }, [
        el("button", { type: "button", class: "bk-btn", text: "בדיקת הצעד והוספה להוכחה", onclick: () => check(rows.indexOf(row)) }), remove,
      ]),
    ]);
    const row = { input, legend, remove, feedback, fieldset, replacements, compact:compactProofStep(fieldset,()=>clearFeedback(rows.indexOf(row))) };
    rows.push(row); list.append(fieldset); refreshNumbers(); refreshReplacements();
    if (focus) (fieldset.querySelector(".replacement-parts > summary")||input).focus();
  }
  function check(last = rows.length - 1, declareComplete = false) {
    clearFeedback();
    const origin = checkStart(startInput.value, start, target, reversible);
    startFeedback.className = `bk-msg ${origin.valid ? "bk-good" : "bk-bad"}`;
    startFeedback.textContent = origin.valid ? "נקודת המוצא מתאימה." : origin.message;
    if (!origin.valid) {
      acceptedStart = null; renderChain();
      startInput.setAttribute("aria-invalid", "true");
      summary.className = "bk-msg bk-bad";
      summary.textContent = "תקנו תחילה את נקודת המוצא; המעברים עדיין לא נבדקו.";
      return;
    }
    startInput.removeAttribute("aria-invalid");
    acceptedStart = origin.start; acceptedTarget = origin.target;tablePractice.refresh();
    startCompact.accept(display(acceptedStart),"");
    if (last < 0) { renderChain();rows[0]?.compact.focus(); return; }
    const steps = trimBlankSteps(rows.slice(0,last+1).map(r => ({ formula: r.input.value, rule: "replacements", replacements:r.replacements.get() })));
    const result = checkProof(origin.start, origin.target, steps);
    accepted = steps.slice(0, result.results.filter(r => r.kind === "valid").length);
    renderChain();
    result.results.forEach((step,i) => {
      const row = rows[i], good = step.kind === "valid";
      row.feedback.className = `bk-msg ${good ? "bk-good" : step.kind === "missing-step" ? "bk-info" : "bk-bad"}`;
      row.feedback.textContent = step.message;
      row.replacements.showResult(step);
      if (step.intermediate) row.feedback.append(el("div", { class: "proof-formula", dir: "ltr", text: step.intermediate }));
      if (step.row) {
        row.feedback.append(el("div", { class: "proof-formula", dir: "ltr", text: Object.entries(step.row).map(([n,v]) => `${n} = ${v ? "T" : "F"}`).join(", ") }));
      }
      if (!good && step.replacementIndex===undefined) row.input.setAttribute("aria-invalid", "true");
      if(good)row.compact.accept('≡ '+display(steps[i].formula),stepRuleNames(steps[i]),'',stepReason(steps[i]));
    });
    if(declareComplete&&result.valid&&result.complete)rows[accepted.length-1]?.compact.finish();
    if(result.complete){
      while(rows.length>steps.length&&!rows.at(-1).input.value.trim()&&!rows.at(-1).replacements.get().length)rows.pop().fieldset.remove();
      refreshNumbers();
    }
    if(result.valid&&!result.complete&&steps.length){
      if(rows.length===steps.length)addRow();
      rows[steps.length]?.compact.focus();
    }
    if (!result.results.length) {summary.className="bk-msg bk-info";summary.textContent="הוסיפו צעד מנומק כדי להתחיל.";return;}
    if (!result.valid) {
      const index = result.results.length-1;
      const missing = result.results[index].kind === "missing-step";
      summary.className = `bk-msg ${missing ? "bk-info" : "bk-bad"}`;
      summary.textContent = missing
        ? `התוצאה בצעד ${index+1} שקולה לקודמת, אך צריך לפרט את ההחלפות או להוסיף שורת ביניים. ההוכחה המוצגת כוללת רק צעדים שהוצדקו.`
        : `צריך לתקן את צעד ${index+1}. ${index ? "הצעדים שלפניו נכונים. " : ""}הצעדים שאחריו עדיין לא נבדקו. לאחר התיקון לחצו שוב על ״בדיקת הצעד והוספה להוכחה״.`;
      if(result.complete)summary.textContent=`המטרה כבר הוכחה בצעד ${result.goalStep}. יש לתקן או למחוק את הצעד הנוסף המסומן.`;
      else if(result.targetReached)summary.textContent="הגעתם לנוסחת היעד, אבל ההוכחה עדיין אינה מלאה: תקנו את ההחלפות או את הנימוק בצעד המסומן.";
      rows.slice(index+1).forEach(row => { row.feedback.textContent = "ממתין לתיקון הצעד הקודם."; });
    } else {
      summary.className = `bk-msg ${declareComplete&&result.complete ? "bk-good" : "bk-info"}`;
      summary.textContent = declareComplete&&result.complete
        ? "הפתרון הושלם! כל המעברים נכונים וכל חוק שבחרתם מתאים. עכשיו נסו לכתוב את ההוכחה ברצף על דף, עם נימוק לצד כל מעבר."
        : declareComplete ? "הצעדים מוצדקים, אבל עדיין לא הגעתם לתוצאה המבוקשת. המשיכו בהוכחה."
        : "הצעדים שנבדקו מוצדקים. המשיכו, או לחצו על ״סיימתי את ההוכחה — בדקו״.";
    }
  }
  addRow();
}
