import {initSets} from './sets.js';
import {answerPanel} from './answer-panel.js';

const el=(tag,attrs={},children=[])=>{
  const n=document.createElement(tag);
  for(const [key,value]of Object.entries(attrs))if(key==='text')n.textContent=value;else n.setAttribute(key,value);
  n.append(...children);return n;
};
const button=(text,fn)=>{const b=el('button',{type:'button',class:'bk-btn',text});b.addEventListener('click',fn);return b;};
const report=(node,result)=>{node.textContent=result.message;node.className='bk-msg '+(result.ok?'bk-good':'bk-bad');};
const clear=node=>{node.textContent='';node.className='bk-msg';};
const notify=(box,name,detail)=>box.dispatchEvent(new CustomEvent(name,{bubbles:true,detail}));

export function initStagedExercise(box){
  if(box.dataset.stagedReady)return;
  const first=box.querySelector('.exercise-first'),second=box.querySelector('.exercise-second');
  if(!first||!second)return;
  box.dataset.stagedReady='true';box.classList.add('staged-exercise');second.hidden=true;
  const status=el('p',{'aria-live':'polite',class:'exercise-stage-status'});second.before(status);
  function invalidate(){
    second.hidden=true;status.textContent='';
    second.querySelectorAll('.sets-exercise').forEach(n=>{delete n.dataset.ready;initSets(n);});
    second.querySelectorAll('.registration-fact').forEach(n=>{delete n.dataset.ready;initRegistrationFact(n);});
  }
  box.addEventListener('sets-answer-edited',e=>{if(first.contains(e.target))invalidate();});
  box.addEventListener('sets-answer-checked',e=>{
    if(!first.contains(e.target))return;
    if(!(e.detail.complete??e.detail.ok))return invalidate();
    second.hidden=false;status.textContent='שלב 1 הושלם. כעת ענו על שאלות השייכות בשלב 2.';
  });
}

// Indices: Dana/chess, Dana/photo, Noam/chess, Noam/photo, Roni/chess, Roni/photo.
export function checkRegistrationRelations(relations){
  if(relations.length!==2)return {ok:false,message:'בנו שני יחסים.'};
  const sets=relations.map(xs=>new Set(xs));
  for(const [i,s]of sets.entries()){
    const name=i===0?'ביחס הראשון':'ביחס השני';
    if([...s].some(x=>!Number.isInteger(x)||x<0||x>5))return {ok:false,message:'בחרו הרשמות מתוך הטבלה.'};
    if(!s.has(0)||!s.has(1))return {ok:false,message:`${name} חסרה הרשמה של דנה. לפי הנתון, דנה נרשמה לשני החוגים; סמנו את שניהם.`};
    if(s.has(4)||s.has(5))return {ok:false,message:`${name} סומנה הרשמה של רוני, אף שרוני לא נרשם לאף חוג. הסירו אותה.`};
    if(s.size!==3)return {ok:false,message:`${name} יש ${s.size} זוגות במקום שלושה. שתי ההרשמות של דנה כבר קבועות; בחרו בדיוק חוג אחד עבור נועם.`};
  }
  if([...sets[0]].every(x=>sets[1].has(x)))return {ok:false,message:'שתי הטבלאות מתארות אותו יחס. החליפו באחת מהן את החוג של נועם כדי לקבל את האפשרות השנייה.'};
  return {ok:true,message:'נכון. שני היחסים שונים ומקיימים את שלושת הנתונים. האפשרות היחידה שנותרה לבחירה היא החוג של נועם.'};
}

export function initRegistrationInput(box){
  if(box.dataset.ready)return;box.dataset.ready='true';box.replaceChildren();
  const feedback=el('p',{class:'bk-msg','aria-live':'polite'}),form=el('form'),tables=el('div',{class:'registration-tables'}),fields=[];
  for(let i=0;i<2;i++){
    const name=i===0?'יחס ראשון':'יחס שני',inputs=[];
    const table=el('table'),body=el('tbody');
    table.append(el('thead',{},[el('tr',{},[el('th',{scope:'col',text:'סטודנט'}),...['שחמט','צילום'].map(text=>el('th',{scope:'col',text}))])]),body);
    for(const student of ['דנה','נועם','רוני']){
      const row=el('tr',{},[el('th',{scope:'row',text:student})]);
      for(const course of ['שחמט','צילום']){
        const input=el('input',{type:'checkbox','aria-label':`${name}: ${student} — חוג ${course}`});
        input.addEventListener('change',()=>{clear(feedback);notify(box,'sets-answer-edited');});
        inputs.push(input);row.append(el('td',{},[el('label',{class:'registration-cell'},[input])]));
      }
      body.append(row);
    }
    fields.push(inputs);tables.append(el('fieldset',{},[el('legend',{text:name}),table]));
  }
  const check=()=>{const result=checkRegistrationRelations(fields.map(inputs=>inputs.flatMap((n,i)=>n.checked?[i]:[])));report(feedback,result);notify(box,'sets-answer-checked',result);};
  form.append(tables,el('button',{type:'submit',class:'bk-btn',text:'בדיקת שני היחסים'}),button('איפוס',()=>{form.reset();clear(feedback);notify(box,'sets-answer-edited');}),feedback);
  form.addEventListener('submit',e=>{e.preventDefault();check();});
  box.append(el('p',{text:'שלב 1: בנו שני יחסים שונים. בכל טבלה, סמנו כל הרשמה שנכללת ביחס.'}),answerPanel(form));
}

function choices(options,label,onChange){
  let value=null;
  const node=el('div',{class:'sets-binary',role:'group','aria-label':label});
  const buttons=options.map((text,i)=>{
    const b=button(text,()=>{value=i;buttons.forEach((n,j)=>n.setAttribute('aria-pressed',String(j===i)));onChange();});
    b.setAttribute('aria-pressed','false');return b;
  });
  node.append(...buttons);
  return {node,get value(){return value;},reset(){value=null;buttons.forEach(b=>b.setAttribute('aria-pressed','false'));}};
}

export function initRegistrationFact(box){
  if(box.dataset.ready)return;box.dataset.ready='true';box.replaceChildren();
  const courses=['שחמט','צילום'],form=el('form'),feedback=el('p',{class:'bk-msg','aria-live':'polite'}),members=[],rows=[];
  const fact=choices(['נועם נרשם לשחמט','נועם נרשם לצילום'],'הפרט הנוסף על נועם',()=>{
    members.forEach(p=>p.reset());rows.forEach(n=>{n.disabled=false;n.removeAttribute('aria-invalid');});clear(feedback);
  });
  form.append(el('p',{text:'בחרו פרט נוסף. כל אחד משני הפרטים הבאים קובע יחס יחיד:'}),fact.node);
  courses.forEach((course,i)=>{
    const row=el('fieldset',{disabled:'',class:'sets-item'},[el('legend',{text:`לאחר הוספת הפרט שבחרתם, האם נועם נרשם לחוג ${course}?`})]);
    const pick=choices(['כן','לא'],`שייכות של נועם לחוג ${course}`,()=>{row.removeAttribute('aria-invalid');clear(feedback);});
    members.push(pick);rows.push(row);row.append(pick.node);form.append(row);
  });
  const check=()=>{
    if(fact.value===null)return report(feedback,{ok:false,message:'בחרו תחילה את הפרט הנוסף על נועם.'});
    const correct=members.map((p,i)=>p.value===(fact.value===i?0:1));
    rows.forEach((row,i)=>row.setAttribute('aria-invalid',String(!correct[i])));
    const ok=correct.every(Boolean);
    report(feedback,{ok,message:(ok?'נכון. ':'בדקו שוב את השייכויות. ')+`הפרט שבחרתם קובע שנועם נרשם לחוג ${courses[fact.value]}. יחד עם שתי ההרשמות של דנה כבר התקבלו שלושה זוגות, ולכן נועם אינו רשום לחוג האחר. היחס נקבע ביחידות.`});
  };
  form.addEventListener('submit',e=>{e.preventDefault();check();});
  form.append(el('button',{type:'submit',class:'bk-btn',text:'בדיקת השייכויות'}),button('איפוס',()=>{fact.reset();members.forEach(p=>p.reset());rows.forEach(n=>{n.disabled=true;n.removeAttribute('aria-invalid');});clear(feedback);}),feedback);
  box.append(form);
}
