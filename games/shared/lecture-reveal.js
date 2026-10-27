/* Keep the givens on screen; reveal only a computed answer on request.
   Worked prose uses native <details> so questions also work without JS. */
export function initLectureTable(box) {
  if (box.dataset.lectureTableReady) return;
  const table = box.querySelector('table');
  if (!table) return;
  const given = Number(box.dataset.givenCols || box.getAttribute('given-cols'));
  if (!Number.isInteger(given) || given < 1) return;
  box.dataset.lectureTableReady = 'true';
  const cells = [];
  const typeset = () => window.MathJax?.typesetPromise?.([box]).catch(() => {});
  [...table.tBodies].flatMap(body => [...body.rows]).forEach((row, r) => {
    [...row.cells].slice(given).forEach((cell, j) => {
      if (!cell.textContent.trim()) return;
      const content = document.createElement('span');
      content.className = 'lecture-cell-answer';
      while (cell.firstChild) content.append(cell.firstChild);
      const trigger = document.createElement('button');
      trigger.type = 'button'; trigger.className = 'bk-btn lecture-cell-trigger';
      trigger.textContent = '?';
      trigger.setAttribute('aria-label', `הצגת התשובה בשורה ${r + 1}, עמודה ${given + j + 1}`);
      trigger.setAttribute('aria-expanded', 'false');
      content.hidden = true;
      const reveal = () => {
        content.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        trigger.hidden = true;
        typeset();
      };
      trigger.addEventListener('click', () => {
        reveal(); content.tabIndex = -1; content.focus({preventScroll: true});
      });
      cell.append(trigger, content);
      cells.push({content, trigger, reveal});
    });
  });
  const controls = document.createElement('div');
  controls.className = 'lecture-table-controls bk-bar';
  for (const [label, action] of [
    ['הצגת כל התוצאות', () => cells.forEach(cell => cell.reveal())],
    ['הסתרת התוצאות', () => cells.forEach(({content,trigger}) => {
      content.hidden = true; trigger.hidden = false; trigger.setAttribute('aria-expanded', 'false');
    })],
  ]) {
    const button = document.createElement('button'); button.type = 'button';
    button.className = 'bk-btn bk-quiet'; button.textContent = label;
    button.addEventListener('click', action); controls.append(button);
  }
  box.append(controls);
}

export function initLectureAnswers() {
  const answers = [...document.querySelectorAll('details.lecture-answer')];
  for (const answer of answers) answer.addEventListener('toggle', () => {
    if (answer.open) window.MathJax?.typesetPromise?.([answer]).catch(() => {});
  });
  let beforePrint;
  window.addEventListener('beforeprint', () => {
    beforePrint = answers.map(answer => answer.open);
    answers.forEach(answer => { answer.open = true; });
  });
  window.addEventListener('afterprint', () => {
    if (beforePrint) answers.forEach((answer, i) => { answer.open = beforePrint[i]; });
    beforePrint = undefined;
  });
}
