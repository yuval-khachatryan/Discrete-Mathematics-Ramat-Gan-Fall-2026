/* A small chapter activity: substitution can produce either a true or a false
   proposition. Missing values stay visibly blank, never silently become zero. */
export const SUBSTITUTION_ROUNDS = [
  {
    title: "אות אחת, מקום אחד", vars: ["x"], domain: [2, 5, 7], tokens: ["x", ">", 5],
    prompt: "בחרו מספר במקום x, ואז קבעו אם המשפט שהתקבל אמת או שקר. גם בחירה שנותנת שקר מותרת.",
    evaluate: ({ x }) => x > 5,
    explain: ({ x }) => x > 5 ? `${x} גדול מ־5.` : x === 5 ? "5 שווה ל־5, ולכן אינו גדול ממנו." : `${x} קטן מ־5, ולכן אינו גדול ממנו.`,
  },
  {
    title: "שתי אותיות, שתי בחירות", vars: ["x", "y"], domain: [3, 4, 7], tokens: ["x", "+", "y", "=", 10],
    prompt: "בחרו תחילה רק ערך ל־x. שימו לב ש־y עדיין חסר. אחר כך בחרו גם ערך ל־y וקבעו אם הסכום הוא 10. אפשר לבחור לשתי האותיות אותו מספר או מספרים שונים.",
    evaluate: ({ x, y }) => x + y === 10,
    explain: ({ x, y }) => `הסכום של ${x} ושל ${y} הוא ${x + y}. ${x + y === 10 ? "קיבלנו בדיוק 10." : "לא קיבלנו 10."}`,
  },
  {
    title: "אות אחת שמופיעה פעמיים", vars: ["x"], domain: [2, 5, 7], tokens: ["x", "+", "x", "=", 10],
    prompt: "בחרו ערך אחד ל־x. הוא יופיע בשני המקומות, כי זו אותה אות. חשבו את הסכום וקבעו אם המשפט אמת או שקר.",
    evaluate: ({ x }) => x + x === 10,
    explain: ({ x }) => `הצבנו ${x} בשני המקומות. הסכום הוא ${x + x}, ${x + x === 10 ? "ולכן קיבלנו 10." : "ולא 10."}`,
  },
];

export function substitutionState(round, values) {
  const missing = round.vars.filter(v => !Object.hasOwn(values, v) || values[v] == null);
  for (const v of round.vars) {
    if (!missing.includes(v) && !round.domain.includes(values[v])) throw new RangeError("Value outside the stated domain");
  }
  const substituted = round.tokens.map(t => round.vars.includes(t) ? missing.includes(t) ? "□" : String(values[t]) : String(t)).join(" ");
  return { missing, substituted, truth: missing.length ? null : round.evaluate(values) };
}

export function initOpenStatement(box) {
  let index = 0, values = {}, solved = false;
  const make = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const title = make("h4", "os-title");
  const prompt = make("p", "os-prompt");
  const choices = make("div", "os-choices");
  const formula = make("div", "os-formula");
  const original = make("span", "os-expression"); original.dir = "ltr";
  const result = make("span", "os-expression"); result.dir = "ltr";
  const originalPart = make("div", "os-card"); originalPart.append(make("span", "", "לפני ההצבה"), original);
  const resultPart = make("div", "os-card"); resultPart.append(make("span", "", "אחרי הבחירות שלכם"), result);
  formula.append(originalPart, resultPart);
  const status = make("p", "os-status"); status.setAttribute("aria-live", "polite");
  const answers = make("div", "os-answers"); answers.setAttribute("role", "group"); answers.setAttribute("aria-label", "איזה משפט קיבלנו?");
  const feedback = make("div", "bk-msg"); feedback.setAttribute("aria-live", "polite");
  const controls = make("div", "bk-bar");
  const next = make("button", "bk-btn bk-main", "לסיבוב הבא"); next.type = "button";
  const reset = make("button", "bk-btn bk-quiet", "ניקוי הבחירות"); reset.type = "button";
  controls.append(next, reset);
  box.replaceChildren(title, prompt, choices, formula, status, make("p", "", "מה אפשר לומר עכשיו?"), answers, feedback, controls);
  for (const [text, answer] of [["עדיין חסר ערך", null], ["התקבל פסוק אמיתי", true], ["התקבל פסוק שקרי", false]]) {
    const button = make("button", "bk-btn", text); button.type = "button";
    button.addEventListener("click", () => check(answer)); answers.append(button);
  }
  function say(text, kind) { feedback.textContent = text; feedback.className = "bk-msg bk-" + kind; }
  function draw() {
    const round = SUBSTITUTION_ROUNDS[index];
    const state = substitutionState(round, values);
    original.textContent = round.tokens.join(" "); result.textContent = state.substituted;
    resultPart.classList.toggle("os-complete", !state.missing.length);
    status.textContent = state.missing.length
      ? `עדיין נשאר לבחור ערך ל־${state.missing.join(" ול־")}. הריבוע מסמן מקום שלא מילאנו. המשפט עדיין פתוח.`
      : "כל המקומות מולאו. התקבל פסוק שאפשר לבדוק: האם הוא אמת או שקר?";
    next.hidden = !solved || index === SUBSTITUTION_ROUNDS.length - 1;
  }
  function check(answer) {
    const round = SUBSTITUTION_ROUNDS[index], state = substitutionState(round, values);
    if (state.missing.length) {
      say(answer === null
        ? `נכון, עדיין חסר ערך ל־${state.missing.join(" ול־")}. בחרו ערך לכל אות כדי להשלים את הסיבוב.`
        : `עוד אי אפשר לקבוע. הצבנו רק חלק מהמידע, ועדיין חסר ערך ל־${state.missing.join(" ול־")}. בחרו ערך במקום הריק ואז בדקו שוב.`, answer === null ? "info" : "bad");
      return;
    }
    if (answer === null) return say("כל האותיות כבר הוחלפו במספרים. התקבל פסוק שלם; כעת בדקו אם הוא נכון. גם פסוק שקרי הוא פסוק שלם.", "info");
    if (answer !== state.truth) return say(`נבדוק שוב: ${round.explain(values)} לכן הפסוק ${state.truth ? "אמת" : "שקר"}. נסו לבחור שוב.`, "bad");
    solved = true;
    say(`נכון! ${round.explain(values)} הפסוק ${state.truth ? "אמת" : "שקר"}. ` + (index === SUBSTITUTION_ROUNDS.length - 1
      ? "סיימתם את שלושת הסיבובים. ראינו שגם פסוק שקרי הוא תוצאה מלאה של הצבה. אפשר לשנות ערכים ולנסות שוב."
      : "אפשר להמשיך לסיבוב הבא, או לשנות את הערכים ולבדוק תוצאה נוספת."), "good");
    draw();
  }
  function start() {
    values = {}; solved = false; choices.replaceChildren(); feedback.textContent = "";
    const round = SUBSTITUTION_ROUNDS[index];
    title.textContent = `סיבוב ${index + 1} מתוך ${SUBSTITUTION_ROUNDS.length}: ${round.title}`;
    prompt.textContent = round.prompt;
    for (const v of round.vars) {
      const label = make("label", "os-choice"); label.append(make("span", "", `הערך של ${v}`));
      const select = make("select"); select.dataset.variable = v;
      const blank = make("option", "", "עדיין לא בחרנו"); blank.value = ""; select.append(blank);
      for (const value of round.domain) { const option = make("option", "", String(value)); option.value = String(value); select.append(option); }
      select.addEventListener("change", () => {
        if (select.value === "") delete values[v]; else values[v] = Number(select.value);
        solved = false; feedback.textContent = ""; draw();
      });
      label.append(select); choices.append(label);
    }
    draw();
  }
  next.addEventListener("click", () => { if (solved && index < SUBSTITUTION_ROUNDS.length - 1) { index++; start(); title.tabIndex = -1; title.focus(); } });
  reset.addEventListener("click", () => { start(); choices.querySelector("select").focus(); });
  start();
}
