// Keep the question visible; disclose only the controls for answering it.
export function answerPanel(...content) {
  const panel=document.createElement('details');panel.className='answer-panel';
  const title=document.createElement('summary');title.textContent='מענה';
  panel.append(title,...content);return panel;
}

export function answerReveal(text) {
  const panel=document.createElement('details');panel.className='answer-reveal';
  const title=document.createElement('summary');title.textContent='הצגת תשובה';
  const body=document.createElement('div');body.textContent=text;
  panel.append(title,body);
  panel.addEventListener('toggle',()=>{title.textContent=panel.open?'הסתרת תשובה':'הצגת תשובה';});
  return panel;
}
