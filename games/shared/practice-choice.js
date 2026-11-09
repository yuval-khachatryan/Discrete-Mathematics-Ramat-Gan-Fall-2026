import {answerPanel,answerReveal} from './answer-panel.js';
import { PRACTICE_CHOICES } from "./practice-choices.js";

export function checkSubstitution(input, spec) {
  const text = input.replace(/[\s\u2066-\u2069]/g, "");
  if (!text) return "empty";
  if (text === spec.expected) return "correct";
  if (text === spec.simplified) return "simplified";
  return "wrong";
}

let serial = 0;
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "text") node.textContent = value;
    else if (key === "class") node.className = value;
    else node.setAttribute(key, value);
  }
  children.forEach(child => node.append(child));
  return node;
}

export function initPracticeChoice(box) {
  const exercise = PRACTICE_CHOICES[box.dataset.choice];
  if (!exercise) return;
  if(box.classList.contains("choice-ready"))return;
  const rows = exercise.map((question, index) => {
    const feedbackId = `practice-choice-feedback-${++serial}`;
    const select = el("select", { class: "choice-select", "aria-label": question.prompt, "aria-describedby": feedbackId }, [
      el("option", { value: "", text: "בחרו תשובה…" }),
      ...question.options.map((option, i) => el("option", { value: String(i), text: option.text })),
    ]);
    const feedback = el("div", { id: feedbackId, class: "bk-msg", "aria-live": "polite" });
    select.addEventListener("change", () => {
      feedback.textContent = ""; feedback.className = "bk-msg";
      select.removeAttribute("aria-invalid");
    });
    const fieldset = el("fieldset", { class: "choice-item" }, [el("legend", { text: `${index + 1}. ${question.prompt}` })]);
    const form=el("form",{},[select,feedback]);
    let input = null, substitutionFeedback = null, checkWritten = null;
    if (question.substitution) {
      input = el("input", { type: "text", class: "bk-input substitution-input", dir: "ltr", maxlength: "80", autocomplete: "off", spellcheck: "false", placeholder: "כתבו את הפסוק לאחר ההצבה", "aria-describedby": `${feedbackId}-substitution` });
      substitutionFeedback = el("div", { id: `${feedbackId}-substitution`, class: "bk-msg", "aria-live": "polite" });
      const label = el("label", {}, [el("span", { text: `P(${question.substitution.value}):`, dir: "ltr" }), input]);
      const checkInput = el("button", { type: "button", class: "bk-btn", text: "בדיקת ההצבה" });
      select.disabled = true;
      checkWritten = () => {
        const result = checkSubstitution(input.value, question.substitution);
        const correct = result === "correct";
        select.disabled = !correct;
        input.setAttribute("aria-invalid", String(!correct));
        substitutionFeedback.className = `bk-msg ${correct ? "bk-good" : result === "empty" ? "bk-info" : "bk-bad"}`;
        substitutionFeedback.textContent = correct
          ? "ההצבה נכונה. עכשיו בדקו אם הפסוק שקיבלתם אמת או שקר ובחרו תשובה."
          : result === "empty" ? "כתבו תחילה את הפסוק שמתקבל כשמחליפים את x במספר הנתון."
          : result === "simplified" ? "כבר חישבתם את הסכום. כאן כתבו תחילה את הפסוק לאחר ההצבה, לפני חישוב הסכום."
          : `בהצבה מחליפים את x ב־${question.substitution.value}. שאר הביטוי נשאר כפי שהוא; כתבו שוויון שלם, כולל שני אגפיו.`;
        return result;
      };
      checkInput.addEventListener("click", checkWritten);
      input.addEventListener("input", () => {
        select.disabled = true; select.value = ""; select.removeAttribute("aria-invalid"); input.removeAttribute("aria-invalid");
        [feedback, substitutionFeedback].forEach(n => { n.textContent = ""; n.className = "bk-msg"; });
      });
      form.insertBefore(el("div", { class: "substitution-entry" }, [label, checkInput, substitutionFeedback]), select);
      select.setAttribute("aria-label", `ערך האמת של P(${question.substitution.value})`);
    }
    const check=()=>{
      if(checkWritten&&checkWritten()!=="correct")return;
      const choice=select.value===""?null:question.options[Number(select.value)];
      const correct=!!choice?.correct;
      feedback.className=`bk-msg ${!choice?"bk-info":correct?"bk-good":"bk-bad"}`;
      feedback.textContent=choice?`${correct?"נכון. ":"כדאי לבדוק שוב. "}${choice.feedback}`:"בחרו תשובה לסעיף הזה.";
      select.setAttribute("aria-invalid",String(!correct));
    };
    const checkButton=el("button",{type:"submit",class:"bk-btn bk-main",text:"בדיקה"});
    const correct=question.options.find(o=>o.correct);
    const solution=answerReveal((question.substitution?`P(${question.substitution.value}): ${question.substitution.expected}. `:"")+correct.text+". "+correct.feedback);
    const reset=el("button",{type:"button",class:"bk-btn bk-quiet",text:"ניסיון חדש"});
    reset.addEventListener("click",()=>{
      form.reset();select.removeAttribute("aria-invalid");feedback.textContent="";feedback.className="bk-msg";solution.open=false;
      if(input){input.removeAttribute("aria-invalid");select.disabled=true;substitutionFeedback.textContent="";substitutionFeedback.className="bk-msg";}
    });
    form.addEventListener("submit",event=>{event.preventDefault();check();});
    form.insertBefore(el("div",{class:"bk-bar"},[checkButton,reset]),feedback);form.append(solution);
    fieldset.append(answerPanel(form));return fieldset;
  });
  box.append(...rows);box.classList.add("choice-ready");
}
