import {answerPanel,answerReveal} from './answer-panel.js';
import {readable} from './sets.js';
export const EVIDENCE_TASKS={
  witness:{domain:[2,6,11,14],accept:n=>n>10,hint:'בחרו מספר מתוך D שגדול מ־10.',failure:'המספר שייך לתחום, אבל אינו גדול מ־10.',success:n=>`${n} הוא עד: הוא שייך לתחום וגדול מ־10, ולכן מצדיק את טענת הקיום.`},
  counter:{domain:[2,6,11,14],accept:n=>!(n>5),hint:'בחרו מספר מתוך D שאינו גדול מ־5.',failure:'המספר שייך לתחום, אבל הוא דווקא גדול מ־5. הוא מקיים את התנאי ולכן אינו דוגמה נגדית.',success:n=>`${n} הוא דוגמה נגדית: הוא שייך לתחום ואינו גדול מ־5, ולכן מפריך את הטענה שכל איברי D גדולים מ־5.`},
};
export function checkQuantifierEvidence(text,kind){
 const q=EVIDENCE_TASKS[kind],s=text.trim().replaceAll('−','-');
 if(!s)return {ok:false,message:'כתבו מספר לפני הבדיקה.'};
 if(!/^-?\d+(?:\.\d+)?$/.test(s))return {ok:false,message:'כתבו מספר אחד, ללא סוגריים או רשימה.'};
 const n=Number(s);
 if(!q.domain.includes(n))return {ok:false,message:`המספר ${n} אינו שייך לתחום D. גם עד וגם דוגמה נגדית חייבים להשתייך לתחום שבשאלה.`};
 return q.accept(n)?{ok:true,message:q.success(n)}:{ok:false,message:q.failure};
}
export function initQuantifierEvidence(box){
 if(box.dataset.ready)return;box.dataset.ready='true';
 const kind=box.dataset.quantifierEvidence,q=EVIDENCE_TASKS[kind];
 const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const form=el('form'),label=el('label',kind==='witness'?'כתבו עד: ':'כתבו דוגמה נגדית: '),input=el('input');
 input.type='text';input.inputMode='decimal';input.dir='ltr';input.maxLength=30;input.className='bk-input sets-count-input';input.setAttribute('aria-label',kind==='witness'?'מספר שמשמש עד':'מספר שמשמש דוגמה נגדית');label.append(input);
 const feedback=el('p');feedback.className='bk-msg';feedback.setAttribute('aria-live','polite');
 const clear=()=>{feedback.textContent='';feedback.className='bk-msg';input.removeAttribute('aria-invalid');};
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.className='bk-btn';b.addEventListener('click',fn);return b;};
 const check=()=>{const r=checkQuantifierEvidence(input.value,kind);input.setAttribute('aria-invalid',String(!r.ok));feedback.textContent=readable(r.message);feedback.className='bk-msg '+(r.ok?'bk-good':'bk-bad');};
 form.addEventListener('submit',e=>{e.preventDefault();check();});input.addEventListener('input',clear);
 form.append(label,button('בדיקה',check),button('רמז',()=>{feedback.textContent=q.hint;feedback.className='bk-msg';}),button('איפוס',()=>{input.value='';clear();}),feedback,answerReveal(readable(q.success(q.domain.find(q.accept)))));box.append(answerPanel(form));
}
