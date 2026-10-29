/* Exact integer substitution: classify first, then produce both truth values. */
export function integerValue(value) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new RangeError('Enter an exact integer');
  const text = String(value).trim().replace(/^−/, '-');
  if (!/^[+-]?\d+$/.test(text)) throw new RangeError('Enter an integer');
  return BigInt(text);
}
const five = BigInt(5), ten = BigInt(10);
export const SUBSTITUTION_ROUNDS = [
  {
    title: 'אות אחת, מקום אחד', vars: ['x'], samples: [2, 5, 7], tokens: ['x', '>', 5],
    prompt: 'בחרו מספר שלם במקום x ובדקו את המשפט שהתקבל.',
    evaluate: ({ x }) => x > five,
    explain: ({ x }) => x > five ? `${x} גדול מ־5.` : x === five ? '5 שווה ל־5, ולכן אינו גדול ממנו.' : `${x} קטן מ־5, ולכן אינו גדול ממנו.`,
  },
  {
    title: 'שתי אותיות, שתי בחירות', vars: ['x', 'y'], samples: [3, 4, 7], tokens: ['x', '+', 'y', '=', 10],
    prompt: 'צריך לבחור ערך לכל אחת משתי האותיות. מותר לבחור להן אותו מספר או מספרים שונים.',
    evaluate: ({ x, y }) => x + y === ten,
    explain: ({ x, y }) => `הסכום של ${x} ושל ${y} הוא ${x + y}. ${x + y === ten ? 'קיבלנו בדיוק 10.' : 'לא קיבלנו 10.'}`,
  },
  {
    title: 'אות אחת שמופיעה פעמיים', vars: ['x'], samples: [2, 5, 7], tokens: ['x', '+', 'x', '=', 10],
    prompt: 'בוחרים ערך אחד ל־x ומציבים אותו בשני המקומות.',
    evaluate: ({ x }) => x + x === ten,
    explain: ({ x }) => `הצבנו ${x} בשני המקומות. הסכום הוא ${x + x}, ${x + x === ten ? 'ולכן קיבלנו 10.' : 'ולא 10.'}`,
  },
];
export function substitutionState(round, values) {
  const missing = round.vars.filter(v => values[v] == null || String(values[v]).trim() === '');
  const parsed = Object.fromEntries(round.vars.filter(v => !missing.includes(v)).map(v => [v, integerValue(values[v])]));
  const substituted = round.tokens.map(t => round.vars.includes(t) ? missing.includes(t) ? '□' : String(parsed[t]) : String(t)).join(' ');
  return { missing, substituted, truth: missing.length ? null : round.evaluate(parsed) };
}
export function initOpenStatement(box) {
  let index = 0, phase, firstTruth, values;
  const make = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const title = make('h4', 'os-title');
  const prompt = make('p', 'os-prompt');
  const stage = make('p', 'os-stage'); stage.setAttribute('aria-live', 'polite');
  const choices = make('div', 'os-choices');
  const formula = make('div', 'os-formula');
  const original = make('span', 'os-expression'); original.dir = 'ltr';
  const result = make('span', 'os-expression'); result.dir = 'ltr';
  const originalPart = make('div', 'os-card'); originalPart.append(make('span', '', 'הביטוי המקורי'), original);
  const resultPart = make('div', 'os-card'); resultPart.append(make('span', '', 'אחרי הבחירות שלכם'), result);
  formula.append(originalPart, resultPart);
  const first = make('p', 'os-first');
  const status = make('p', 'os-status'); status.setAttribute('aria-live', 'polite');
  const answers = make('div', 'os-answers'); answers.setAttribute('role', 'group'); answers.setAttribute('aria-label', 'מה אפשר לומר?');
  const feedback = make('div', 'bk-msg'); feedback.setAttribute('aria-live', 'polite');
  const controls = make('div', 'bk-bar');
  const next = make('button', 'bk-btn bk-main');
  const skip = make('button', 'bk-btn bk-quiet', 'המשיכו בלי ההצבה הנוספת');
  const reset = make('button', 'bk-btn bk-quiet', 'התחילו את הסיבוב מחדש');
  for (const b of [next, skip, reset]) b.type = 'button';
  controls.append(next, skip, reset);
  box.replaceChildren(title, prompt, formula, first, stage, choices, status, answers, feedback, controls);
  for (const [text, answer] of [['פסוק פתוח — עדיין חסרה הצבה', null], ['פסוק אמת', true], ['פסוק שקר', false]]) {
    const button = make('button', 'bk-btn', text); button.type = 'button'; button.dataset.answer = String(answer);
    button.addEventListener('click', () => check(answer)); answers.append(button);
  }
  function say(text, kind) { feedback.textContent = text; feedback.className = 'bk-msg bk-' + kind; }
  function read() {
    let valid = true;
    for (const input of choices.querySelectorAll('input')) {
      values[input.dataset.variable] = input.value;
      let invalid = false;
      if (input.value.trim()) { try { integerValue(input.value); } catch { invalid = true; } }
      input.setAttribute('aria-invalid', String(invalid)); valid &&= !invalid;
    }
    return valid ? substitutionState(SUBSTITUTION_ROUNDS[index], values) : null;
  }
  function draw() {
    const state = read();
    box.dataset.phase = phase;
    original.textContent = SUBSTITUTION_ROUNDS[index].tokens.join(' ');
    result.textContent = state ? state.substituted : '—';
    resultPart.hidden = phase === 'classify';
    resultPart.classList.toggle('os-complete', !!state && !state.missing.length);
    first.hidden = firstTruth == null;
    prompt.hidden = phase === 'classify' || phase === 'done';
    stage.textContent = phase === 'classify' ? 'מה אפשר לומר על הביטוי לפני שבוחרים מספרים?'
      : phase === 'choose' ? 'כעת בחרו מספרים. מה אפשר לומר על התוצאה?'
      : phase === 'opposite' ? `כעת מצאו הצבה שנותנת פסוק ${firstTruth ? 'שקר' : 'אמת'}, ובחרו את התשובה המתאימה.`
      : index === SUBSTITUTION_ROUNDS.length - 1 ? 'סיימתם את שלושת הסיבובים.' : 'הסיבוב הושלם.';
    status.textContent = phase === 'done' ? 'אפשר להמשיך או להתחיל את הסיבוב מחדש.'
      : phase === 'classify' ? 'תחילה בחרו תשובה. אחר כך ייפתחו שדות ההצבה.'
      : !state ? 'יש להזין מספר שלם בכל שדה שממלאים, למשל 0 או ‎−3. שברים אינם בתחום של הפעילות.'
      : state.missing.length ? `אפשר לבחור כל מספר שלם. עדיין חסר ערך ל־${state.missing.join(' ול־')}.`
      : 'כל האותיות הוחלפו במספרים. בדקו אם המשפט שהתקבל אמת או שקר.';
    for (const input of choices.querySelectorAll('input')) input.disabled = phase === 'classify' || phase === 'done';
    for (const b of answers.children) b.disabled = phase === 'done';
    skip.hidden = phase !== 'opposite'; next.hidden = phase !== 'done';
    next.textContent = index === SUBSTITUTION_ROUNDS.length - 1 ? 'שחקו שוב' : 'לסיבוב הבא';
  }
  function check(answer) {
    if (phase === 'done') return;
    if (phase === 'classify') {
      if (answer !== null) return say('עדיין לא בחרנו ערכים לאותיות. הביטוי הוא פסוק פתוח; אי אפשר לקבוע לו כאן אמת או שקר לפני ההצבה. נסו שוב.', 'bad');
      phase = 'choose'; draw(); say('נכון. זהו פסוק פתוח. כעת בחרו ערך לכל אות ובדקו את התוצאה.', 'good');
      choices.querySelector('input').focus(); return;
    }
    const round = SUBSTITUTION_ROUNDS[index], state = read();
    if (!state) return say('בדקו את השדות המסומנים. בפעילות הזאת בוחרים מספרים שלמים בלבד.', 'bad');
    if (state.missing.length) return say(answer === null
      ? `נכון, עדיין חסר ערך ל־${state.missing.join(' ול־')}. השלימו את ההצבה כדי להמשיך.`
      : `עדיין חסר ערך ל־${state.missing.join(' ול־')}. השלימו את ההצבה לפני שקובעים אמת או שקר.`, answer === null ? 'info' : 'bad');
    if (answer === null) return say('כל האותיות כבר הוחלפו במספרים. התקבל פסוק; כעת בדקו אם הוא אמת או שקר.', 'bad');
    const parsed = Object.fromEntries(round.vars.map(v => [v, integerValue(values[v])]));
    if (answer !== state.truth) return say(`בדקו שוב: ${round.explain(parsed)} לכן הפסוק ${state.truth ? 'אמת' : 'שקר'}.`, 'bad');
    if (phase === 'choose') {
      firstTruth = state.truth;
      first.replaceChildren(document.createTextNode('ההצבה הראשונה: '));
      const expression = make('bdi', '', state.substituted); expression.dir = 'ltr';
      first.append(expression, document.createTextNode(` — פסוק ${firstTruth ? 'אמת' : 'שקר'}.`));
      phase = 'opposite';
      for (const input of choices.querySelectorAll('input')) input.value = '';
      draw(); say('נכון! עכשיו נסו לקבל את ערך האמת ההפוך באמצעות הצבה אחרת.', 'good');
      choices.querySelector('input').focus(); return;
    }
    if (state.truth === firstTruth) return say(`סיווגתם נכון, אבל שוב התקבל פסוק ${firstTruth ? 'אמת' : 'שקר'}. האתגר הוא לקבל הפעם פסוק ${firstTruth ? 'שקר' : 'אמת'}. שנו את ההצבה.`, 'info');
    phase = 'done'; draw(); say(`נכון! ${round.explain(parsed)} מצאתם שתי הצבות שנותנות ערכי אמת שונים.`, 'good');
  }
  function start() {
    phase = 'classify'; firstTruth = null; values = {}; choices.replaceChildren(); feedback.textContent = ''; first.replaceChildren();
    const round = SUBSTITUTION_ROUNDS[index];
    title.textContent = `סיבוב ${index + 1} מתוך ${SUBSTITUTION_ROUNDS.length}: ${round.title}`;
    prompt.textContent = round.prompt;
    for (const v of round.vars) {
      const label = make('label', 'os-choice'); label.append(make('span', '', `הערך של ${v}`));
      const input = make('input'); input.type = 'text'; input.dir = 'ltr'; input.autocomplete = 'off'; input.spellcheck = false; input.dataset.variable = v;
      input.addEventListener('input', () => { feedback.textContent = ''; draw(); });
      label.append(input); choices.append(label);
    }
    draw();
  }
  next.addEventListener('click', () => { if (phase === 'done') { index = (index + 1) % SUBSTITUTION_ROUNDS.length; start(); answers.firstChild.focus(); } });
  skip.addEventListener('click', () => { if (phase === 'opposite') { phase = 'done'; draw(); say('ההצבה הראשונה נבדקה. דילגתם על מציאת ההצבה הנוספת.', 'info'); } });
  reset.addEventListener('click', () => { start(); answers.firstChild.focus(); });
  start();
}
