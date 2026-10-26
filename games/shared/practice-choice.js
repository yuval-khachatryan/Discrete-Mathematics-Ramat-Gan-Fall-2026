import { PRACTICE_CHOICES } from "./practice-choices.js";

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
    return { question, select, feedback, fieldset };
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
    rows.forEach(({ question, select, feedback }) => {
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
    rows.forEach(({ select, feedback }) => { select.value = ""; select.removeAttribute("aria-invalid"); feedback.textContent = ""; feedback.className = "bk-msg"; });
    summary.textContent = ""; summary.className = "bk-msg"; rows[0].select.focus();
  });
  box.append(form); box.classList.add("choice-ready");
}
