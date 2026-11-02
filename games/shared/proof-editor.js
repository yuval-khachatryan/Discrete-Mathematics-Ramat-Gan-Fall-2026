import { keyboard } from "./formula-keyboard.js";
import { replacementEditor } from "./replacement-editor.js";
import { RULES, checkStart, checkProof, ruleExamples, stepReason, trimBlankSteps } from "./proof-rules.js";
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
const display = formula => format(parse(formula, { flatten: false }));


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
  const chain = el("div", { class: "proof-chain", "aria-live": "polite", "aria-label": "ההוכחה שנבנתה עד כה" });
  const goal = el("div", { class: "proof-goal" });
  const preview = el("section", { class: "proof-preview" }, [
    el("strong", { text: "ההוכחה שלכם עד כאן" }),
    el("p", {}, [el("strong", { text: "כך כותבים הוכחה פורמלית — גם ביד בבחינה:" }),
      " נוסחת התחלה, מעברים שקולים, ולצד כל מעבר החוק שמצדיק אותו. כאן מוצגים רק צעדים שעברו בדיקה."]), goal, chain,
    el("p", { class: "proof-paper", text: "קחו דף ועט ונסו לכתוב את ההוכחה בעצמכם. אפשר להתחיל על הנייר ולבדוק כאן, לכתוב במקביל לעבודה באתר, או לשחזר את ההוכחה אחרי שסיימתם." }),
  ]);
  const add = el("button", { type: "button", class: "bk-btn", text: "הוספת צעד", onclick: () => addRow(true) });
  const submit = el("button", { type: "submit", class: "bk-btn bk-main", text: "בדיקת הפתרון" });
  const form = el("form", { class: "proof-form", onsubmit(e) { e.preventDefault(); check(); } }, [
    el("div", { class: "proof-start" }, [
      el("label", { class: "proof-field" }, [el("span", { text: "מאיזו נוסחה מתחילים?" }), startInput]),
      el("p", { text: reversible ? "אפשר להתחיל בכל אחד משני אגפי השקילות ולהגיע לאגף האחר." : "כתבו את נוסחת ההתחלה הנתונה בשאלה, לפני הפעלת חוק כלשהו." }),
      keyboard(startInput, () => clearFeedback(0, true)),
      el("button", { type: "button", class: "bk-btn", text: "בדיקת נקודת המוצא", onclick: () => check(-1) }), startFeedback,
    ]),
    list, el("div", { class: "bk-bar" }, [add, submit]), summary, preview,
  ]);
  box.append(form);
  box.classList.add("proof-ready");

  function uppercase(input) {
    const p = input.selectionStart;
    input.value = input.value.toUpperCase();
    input.setSelectionRange(p,p);
  }
  function renderChain() {
    chain.replaceChildren();
    const goalStatement = (steps = []) => {
      // A simplification exercise must not disclose its answer before completion.
      const known = showTarget || (acceptedStart && checkProof(acceptedStart, acceptedTarget, steps).complete);
      const from = acceptedStart || start;
      const to = acceptedStart ? acceptedTarget : target;
      return el("p", {}, [el("strong", { text: known ? "נראה ש־" : "נפשט את הנוסחה:" }),
        el("span", { class: "proof-formula", dir: "ltr", text: known ? `${display(from)} ≡ ${display(to)}` : display(from) }),
      ]);
    };
    goal.replaceChildren(goalStatement(accepted));
    if (!acceptedStart) {
      chain.append(el("p", { text: "לאחר בדיקת נקודת המוצא, ההוכחה תתחיל להופיע כאן." }));
      return;
    }
    const line = (formula, reason, first = false) => el("div", { class: "proof-chain-line" }, [
      el("span", { class: "proof-chain-sign", text: first ? "" : "≡" }),
      el("span", { class: "proof-formula", dir: "ltr", text: display(formula) }),
      el("span", { class: "proof-chain-reason", dir: "rtl", text: reason }),
    ]);
    chain.append(line(acceptedStart, "נקודת המוצא", true));
    accepted.forEach(step=>chain.append(line(step.formula,stepReason(step))));
  }
  function clearFeedback(from = 0, resetStart = false) {
    accepted = accepted.slice(0, from);
    if (resetStart) {
      acceptedStart = null;
      startFeedback.textContent = "";
      startInput.removeAttribute("aria-invalid");
    }
    refreshReplacements();
    renderChain();
    summary.textContent = "";
    summary.className = "bk-msg";
    for (const row of rows.slice(from)) {
      row.feedback.textContent = "";
      row.feedback.className = "bk-msg";
      row.input.removeAttribute("aria-invalid");
      row.select.removeAttribute("aria-invalid");
    }
  }
  function refreshReplacements(){
    rows.forEach((row,i)=>row.replacements.setSource(i?rows[i-1].input.value:startInput.value));
  }
  function refreshNumbers() {
    rows.forEach((row, i) => {
      row.legend.textContent = `צעד ${i+1}`;
      row.input.setAttribute("aria-label", `הנוסחה אחרי צעד ${i+1}`);
      row.select.setAttribute("aria-label", `החוק בצעד ${i+1}`);
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
    const select = el("select", { class: "proof-rule", "aria-describedby": id }, [
      el("option", { value: "", text: "בחרו חוק…" }),
      el("option", { value:"replacements", text:"החלפות מפורטות — חלקים נפרדים באותו צעד" }),
      ...RULES.map(rule => el("option", { value: rule.id, text: rule.name })),
    ]);
    select.value="replacements";
    const reference = el("details", { class: "proof-reference" }, [el("summary", { text: "תזכורת לחוק שבחרתם" })]);
    reference.hidden = true;
    select.addEventListener("change", () => {
      clearFeedback(rows.indexOf(row));
      reference.hidden = !select.value || select.value === "replacements";
      row.replacements.activate(select.value === "replacements");
      reference.replaceChildren(el("summary", { text: "תזכורת לחוק שבחרתם" }),
        ...ruleExamples(select.value).map(text => el("div", { class: "proof-formula", dir: "ltr", text })));
    });
    const keys = keyboard(input, () => clearFeedback(rows.indexOf(row)));
    const legend = el("legend");
    const replacements=replacementEditor(()=>clearFeedback(rows.indexOf(row)));
    replacements.activate(true);
    const remove = el("button", { type: "button", class: "bk-btn bk-quiet", text: "מחיקת הצעד", onclick() {
      const index = rows.indexOf(row);
      rows.splice(index,1); fieldset.remove();
      clearFeedback(index); refreshNumbers();
      if (!rows.length) addRow(true);
      else rows[Math.min(index,rows.length-1)].input.focus();
    } });
    const fieldset = el("fieldset", { class: "proof-step" }, [legend,
      el("label", { class: "proof-field" }, [el("span", { text: "הנוסחה שמתקבלת" }), input]), keys,
      el("label", { class: "proof-field" }, [el("span", { text: "אופן הנימוק — בחירת חלקים, או חוק לשינוי יחיד" }), select]),
      reference, replacements.box, feedback, el("div", { class: "bk-bar" }, [
        el("button", { type: "button", class: "bk-btn", text: "בדיקת הצעד והוספה להוכחה", onclick: () => check(rows.indexOf(row)) }), remove,
      ]),
    ]);
    const row = { input, select, legend, remove, feedback, fieldset, replacements };
    rows.push(row); list.append(fieldset); refreshNumbers(); refreshReplacements();
    if (focus) input.focus();
  }
  function check(last = rows.length - 1) {
    clearFeedback();
    const origin = checkStart(startInput.value, start, target, reversible);
    startFeedback.className = `bk-msg ${origin.valid ? "bk-good" : "bk-bad"}`;
    startFeedback.textContent = origin.valid ? (showTarget ? "נקודת המוצא מתאימה. המטרה:" : "נקודת המוצא מתאימה. המשיכו לפשט בעזרת החוקים.") : origin.message;
    if (origin.valid && showTarget) startFeedback.append(el("div", { class: "proof-formula", dir: "ltr", text: display(origin.target) }));
    if (!origin.valid) {
      acceptedStart = null; renderChain();
      startInput.setAttribute("aria-invalid", "true");
      summary.className = "bk-msg bk-bad";
      summary.textContent = "תקנו תחילה את נקודת המוצא; המעברים עדיין לא נבדקו.";
      return;
    }
    startInput.removeAttribute("aria-invalid");
    acceptedStart = origin.start; acceptedTarget = origin.target;
    if (last < 0) { renderChain(); return; }
    const steps = trimBlankSteps(rows.slice(0,last+1).map(r => ({ formula: r.input.value, rule: r.select.value, replacements:r.select.value === "replacements" ? r.replacements.get():undefined })));
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
      if (!good && step.kind !== "missing-step") (step.kind === "rule" || step.kind === "wrong-rule" ? row.select : row.input).setAttribute("aria-invalid", "true");
    });
    if (!result.results.length) {summary.className="bk-msg bk-info";summary.textContent="הוסיפו צעד מנומק כדי להתחיל.";return;}
    if (!result.valid) {
      const index = result.results.length-1;
      const missing = result.results[index].kind === "missing-step";
      summary.className = `bk-msg ${missing ? "bk-info" : "bk-bad"}`;
      summary.textContent = missing
        ? `התוצאה בצעד ${index+1} שקולה לקודמת, אך צריך לפרט את ההחלפות או להוסיף שורת ביניים. ההוכחה המוצגת כוללת רק צעדים שהוצדקו.`
        : `צריך לתקן את צעד ${index+1}. ${index ? "הצעדים שלפניו נכונים. " : ""}הצעדים שאחריו עדיין לא נבדקו. לאחר התיקון לחצו שוב על ״בדיקת הפתרון״.`;
      if(result.complete)summary.textContent=`המטרה כבר הוכחה בצעד ${result.goalStep}. יש לתקן או למחוק את הצעד הנוסף המסומן.`;
      else if(result.targetReached)summary.textContent="הגעתם לנוסחת היעד, אבל ההוכחה עדיין אינה מלאה: תקנו את ההחלפות או את הנימוק בצעד המסומן.";
      rows.slice(index+1).forEach(row => { row.feedback.textContent = "ממתין לתיקון הצעד הקודם."; });
    } else {
      summary.className = `bk-msg ${result.complete ? "bk-good" : "bk-info"}`;
      summary.textContent = result.complete
        ? "הפתרון הושלם! כל המעברים נכונים וכל חוק שבחרתם מתאים. עכשיו נסו לכתוב את ההוכחה ברצף על דף, עם נימוק לצד כל מעבר."
        : showTarget ? "כל הצעדים שכתבתם נכונים והחוקים מתאימים. זו עדיין תוצאת ביניים; הוסיפו צעד והמשיכו אל התוצאה המבוקשת."
        : "הצעדים שכתבתם נכונים והחוקים מתאימים. אפשר להמשיך לפשט; חפשו חלק שאפשר להחליף בביטוי קצר יותר בעזרת אחד החוקים.";
    }
  }
  addRow();
}
