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
  const summary = el("div", { class: "bk-msg", "aria-live": "polite" });
  const rows = exercise.map((question, index) => {
    const feedbackId = `practice-choice-feedback-${++serial}`;
    const select = el("select", { class: "choice-select", "aria-label": question.prompt, "aria-describedby": feedbackId }, [
      el("option", { value: "", text: "בחרו תשובה…" }),
      ...question.options.map((option, i) => el("option", { value: String(i), text: option.text })),
    ]);
    const feedback = el("div", { id: feedbackId, class: "bk-msg", "aria-live": "polite" });
    select.addEventListener("change", () => {
      feedback.textContent = ""; feedback.className = "bk-msg";
      select.removeAttribute("aria-invalid"); summary.textContent = ""; summary.className = "bk-msg";
    });
    const fieldset = el("fieldset", { class: "choice-item" }, [
      el("legend", { text: `${index + 1}. ${question.prompt}` }), select, feedback,
    ]);
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
        [feedback, substitutionFeedback, summary].forEach(n => { n.textContent = ""; n.className = "bk-msg"; });
      });
      fieldset.insertBefore(el("div", { class: "substitution-entry" }, [label, checkInput, substitutionFeedback]), select);
      select.setAttribute("aria-label", `ערך האמת של P(${question.substitution.value})`);
    }
    return { question, select, feedback, fieldset, input, substitutionFeedback, checkWritten };
  });
  const check = el("button", { type: "submit", class: "bk-btn bk-main", text: "בדיקת התשובות" });
  const reset = el("button", { type: "button", class: "bk-btn bk-quiet", text: "ניסיון חדש" });
  const form = el("form", {}, [
    el("p", { text: "בחרו תשובה לכל סעיף ולחצו ״בדיקת התשובות״. אפשר לתקן ולבדוק שוב. הרמזים והפתרון המודרך נמצאים בהמשך." }),
    ...rows.map(r => r.fieldset), el("div", { class: "bk-bar" }, [check, reset]), summary,
  ]);
  form.addEventListener("submit", event => {
    event.preventDefault();
    let empty = 0, wrong = 0;
    rows.forEach(({ question, select, feedback, checkWritten }) => {
      if (checkWritten) {
        const result = checkWritten();
        if (result !== "correct") { if (result === "empty") empty++; else wrong++; return; }
      }
      const choice = select.value === "" ? null : question.options[Number(select.value)];
      if (!choice) empty++;
      else if (!choice.correct) wrong++;
      const correct = !!choice?.correct;
      feedback.className = `bk-msg ${!choice ? "bk-info" : correct ? "bk-good" : "bk-bad"}`;
      feedback.textContent = choice ? `${correct ? "נכון. " : "כדאי לבדוק שוב. "}${choice.feedback}` : "בחרו תשובה לסעיף הזה.";
      select.setAttribute("aria-invalid", correct ? "false" : "true");
    });
    summary.className = `bk-msg ${wrong ? "bk-bad" : empty ? "bk-info" : "bk-good"}`;
    summary.textContent = wrong || empty
      ? `תשובות נכונות: ${rows.length - wrong - empty} מתוך ${rows.length}. ${empty ? `נשארו ${empty} סעיפים ללא תשובה. ` : ""}${wrong ? "קראו את ההסברים ליד התשובות המסומנות ונסו שוב." : ""}`
      : "כל התשובות נכונות! קראו את ההסברים, ונסו לנסח גם במילים שלכם מדוע.";
  });
  reset.addEventListener("click", () => {
    rows.forEach(({ select, feedback, input, substitutionFeedback }) => {
      select.value = ""; select.removeAttribute("aria-invalid"); feedback.textContent = ""; feedback.className = "bk-msg";
      if (input) { input.value = ""; input.removeAttribute("aria-invalid"); select.disabled = true; substitutionFeedback.textContent = ""; substitutionFeedback.className = "bk-msg"; }
    });
    summary.textContent = ""; summary.className = "bk-msg"; (rows[0].input || rows[0].select).focus();
  });
  box.append(form); box.classList.add("choice-ready");
}
