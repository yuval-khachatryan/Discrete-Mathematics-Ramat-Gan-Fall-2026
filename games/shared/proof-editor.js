import { RULES, checkProof, ruleExamples } from "./proof-rules.js";
import { format } from "./logic.js";

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
const symbols = [["¬","שלילה"],["∧","וגם"],["∨","או"],["→","גרירה"],["↔","אם ורק אם"],["(","סוגר פותח"],[")","סוגר סוגר"],["T","אמת"],["F","שקר"]];

export function initProofEditor(box) {
  const start = box.dataset.start, target = box.dataset.target;
  const rows = [];
  const list = el("div", { class: "proof-steps" });
  const summary = el("div", { class: "bk-msg", "aria-live": "polite" });
  const add = el("button", { type: "button", class: "bk-btn", text: "הוספת צעד", onclick: () => addRow(true) });
  const submit = el("button", { type: "submit", class: "bk-btn bk-main", text: "בדיקת הפתרון" });
  const form = el("form", { class: "proof-form", onsubmit(e) { e.preventDefault(); check(); } }, [
    el("div", { class: "proof-start" }, [el("strong", { text: "נקודת המוצא — מתחילים מכאן:" }), el("div", { class: "proof-formula", dir: "ltr", text: format(start) })]),
    list, el("div", { class: "bk-bar" }, [add, submit]), summary,
  ]);
  box.append(form);
  box.classList.add("proof-ready");

  function clearFeedback() {
    summary.textContent = "";
    summary.className = "bk-msg";
    for (const row of rows) {
      row.feedback.textContent = "";
      row.feedback.className = "bk-msg";
      row.input.removeAttribute("aria-invalid");
      row.select.removeAttribute("aria-invalid");
    }
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
    clearFeedback();
    const id = `proof-feedback-${++nextId}`;
    const feedback = el("div", { id, class: "bk-msg" });
    const input = el("input", {
      type: "text", class: "bk-input proof-input", dir: "ltr", maxlength: "240",
      autocomplete: "off", spellcheck: "false", placeholder: "כתבו כאן את הנוסחה החדשה",
      "aria-describedby": id,
      oninput() {
        const p = input.selectionStart;
        input.value = input.value.toUpperCase();
        input.setSelectionRange(p,p);
        clearFeedback();
      },
    });
    const select = el("select", { class: "proof-rule", "aria-describedby": id }, [
      el("option", { value: "", text: "בחרו חוק…" }),
      ...RULES.map(rule => el("option", { value: rule.id, text: rule.name })),
    ]);
    const reference = el("details", { class: "proof-reference" }, [el("summary", { text: "תזכורת לחוק שבחרתם" })]);
    reference.hidden = true;
    select.addEventListener("change", () => {
      clearFeedback();
      reference.hidden = !select.value;
      reference.replaceChildren(el("summary", { text: "תזכורת לחוק שבחרתם" }),
        ...ruleExamples(select.value).map(text => el("div", { class: "proof-formula", dir: "ltr", text })));
    });
    const keys = el("div", { class: "bk-keys", role: "group", "aria-label": "סמלים לנוסחה שבצעד הזה" },
      symbols.map(([symbol, name]) => el("button", {
        type: "button", class: "bk-key", text: symbol, "aria-label": name,
        onclick() {
          const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a;
          if (input.value.length - (b-a) + symbol.length > 240) return;
          input.value = input.value.slice(0,a) + symbol + input.value.slice(b);
          input.focus(); input.setSelectionRange(a+symbol.length,a+symbol.length);
          clearFeedback();
        },
      })));
    const legend = el("legend");
    const remove = el("button", { type: "button", class: "bk-btn bk-quiet", text: "מחיקת הצעד", onclick() {
      const index = rows.indexOf(row);
      rows.splice(index,1); fieldset.remove();
      clearFeedback(); refreshNumbers();
      if (!rows.length) addRow(true);
      else rows[Math.min(index,rows.length-1)].input.focus();
    } });
    const fieldset = el("fieldset", { class: "proof-step" }, [legend,
      el("label", { class: "proof-field" }, [el("span", { text: "הנוסחה שמתקבלת" }), input]), keys,
      el("label", { class: "proof-field" }, [el("span", { text: "החוק שמסביר את השינוי" }), select]),
      reference, feedback, remove,
    ]);
    const row = { input, select, legend, remove, feedback, fieldset };
    rows.push(row); list.append(fieldset); refreshNumbers();
    if (focus) input.focus();
  }
  function check() {
    clearFeedback();
    const result = checkProof(start, target, rows.map(r => ({ formula: r.input.value, rule: r.select.value })));
    result.results.forEach((step,i) => {
      const row = rows[i], good = step.kind === "valid";
      row.feedback.className = `bk-msg ${good ? "bk-good" : "bk-bad"}`;
      row.feedback.textContent = step.message;
      if (step.row) {
        row.feedback.append(el("div", { class: "proof-formula", dir: "ltr", text: Object.entries(step.row).map(([n,v]) => `${n} = ${v ? "T" : "F"}`).join(", ") }));
      }
      if (!good) (step.kind === "rule" || step.kind === "wrong-rule" ? row.select : row.input).setAttribute("aria-invalid", "true");
    });
    if (!result.valid) {
      const index = result.results.length-1;
      summary.className = "bk-msg bk-bad";
      summary.textContent = `צריך לתקן את צעד ${index+1}. ${index ? "הצעדים שלפניו נכונים. " : ""}הצעדים שאחריו עדיין לא נבדקו. לאחר התיקון לחצו שוב על ״בדיקת הפתרון״.`;
      rows.slice(index+1).forEach(row => { row.feedback.textContent = "ממתין לתיקון הצעד הקודם."; });
    } else {
      summary.className = `bk-msg ${result.complete ? "bk-good" : "bk-info"}`;
      summary.textContent = result.complete
        ? "הפתרון הושלם! כל המעברים נכונים, כל חוק שבחרתם מתאים, והגעתם לתוצאה המבוקשת."
        : "כל הצעדים שכתבתם נכונים והחוקים מתאימים. זו עדיין תוצאת ביניים; הוסיפו צעד והמשיכו אל התוצאה המבוקשת.";
    }
  }
  addRow();
}
