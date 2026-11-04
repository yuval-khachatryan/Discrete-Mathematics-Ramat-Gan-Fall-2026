import {mountKnightProof} from "./knight-proof-editor.js";
import {mountKnightIntro} from "./knight-intro.js";
import { evaluate } from './logic.js';
import * as K from '../gate/knights.js';
import { KNIGHT_PUZZLES, KNIGHT_PROOFS } from './knight-workshop-data.js';
const el=(tag,attrs={},kids=[])=>{const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==='text')n.textContent=v;else if(k==='class')n.className=v;else n.setAttribute(k,v);}kids.forEach(c=>n.append(c));return n;};
const button=(text,fn)=>{const b=el('button',{type:'button',class:'bk-btn',text});b.addEventListener('click',fn);return b;};
const message=()=>el('p',{class:'bk-msg','aria-live':'polite'});
const say=(n,text,ok)=>{n.textContent=text;n.className='bk-msg '+(ok===true?'bk-good':ok===false?'bk-bad':'bk-info');};
function select(label,options){return el('select',{'aria-label':label},[el('option',{value:'',text:'בחרו…'}),...options.map(([value,text])=>el('option',{value,text}))]);}

// Accept any actual conflicting speaker, not only the first conflict found.
export function checkKnightRow(level,env,values,reason){
  const expected=level.statements.map(s=>evaluate(s.formula,env));
  const bad=expected.findIndex((v,i)=>values[i]!==String(v));
  if(bad!==-1)return {ok:false,field:bad,message:values[bad]===''?'בחרו אמת או שקר עבור כל אמירה.':`בדקו שוב את האמירה של ${K.person(level,level.statements[bad].by).name} לפי הסוגים שבשורה. ${K.evaluationText(level.statements[bad],env)}`};
  if(!reason)return {ok:false,field:'reason',message:'בחרו אם האפשרות מתאימה; אם לא, ציינו מי אומר דבר שאינו מתאים לסוגו.'};
  const conflicts=level.statements.filter((s,i)=>expected[i]!==env[s.by]).map(s=>`${s.by}:${env[s.by]?'knight':'knave'}`);
  const ok=reason==='fits'?conflicts.length===0:conflicts.includes(reason);
  return {ok,field:'reason',message:ok?(conflicts.length?'נכון. די באמירה אחת שסותרת את כללי האי כדי לפסול את האפשרות.':'נכון. כל האמירות מתאימות לסוגי הדוברים בשורה הזו.'):
    conflicts.length?K.conflictSentence(level,env):'כל האמירות מתאימות לסוגי הדוברים. האפשרות הזו אינה נפסלת.'};
}
export function checkKnightSelection(level,selected,none=false){
  const rows=K.rows(level),want=rows.map((env,i)=>K.consistent(level,env)?i:-1).filter(i=>i!==-1);
  if(!selected.length&&!none)return {ok:false,message:'סמנו את כל האפשרויות המתאימות, או בחרו במפורש ״אין אפשרות מתאימה״.'};
  if(none&&selected.length)return {ok:false,message:'אי אפשר לבחור גם אפשרות מתאימה וגם ״אין אפשרות מתאימה״.'};
  if(none)return {ok:!want.length,message:want.length?'יש לפחות אפשרות אחת שמתאימה. נסו למצוא אותה.':'נכון. אין סידור של סוגי התושבים שמתאים לכל האמירות יחד.'};
  const extra=selected.find(i=>!want.includes(i));
  if(extra!==undefined)return {ok:false,message:`הבחירה אינה מתאימה. ${rows[extra]?K.conflictSentence(level,rows[extra]):'בחרו אפשרות מהרשימה.'}`};
  if(want.some(i=>!selected.includes(i)))return {ok:false,message:'האפשרויות שסימנתם מתאימות, אבל חסרה לפחות אפשרות אחת. מצאו את כולן.'};
  const roles=level.people.map(p=>{const vals=want.map(i=>rows[i][p.id]);return `${p.name}: ${vals.every(v=>v===vals[0])?K.roleWord(p,vals[0]):'אי אפשר לקבוע — שני הסוגים אפשריים'}`;}).join('. ');
  return {ok:true,message:`נכון. ${want.length===1?'יש פתרון יחיד.':'מצאתם את כל האפשרויות המתאימות. '} ${roles}.`};
}

export function mountKnightTable(box,level,{onSolved=()=>{},onChange=()=>{},showReset=true}={}){
  box.classList.add('knight-workshop');box.replaceChildren();
  const rows=K.rows(level),feedback=message(),selected=new Set();let solved=false;
  const changed=()=>{solved=false;say(feedback,'');onChange();};
  const form=el('form'),group=el('fieldset',{},[el('legend',{text:'סמנו את כל האפשרויות שמתאימות לדברי התושבים.'})]);
  const choices=el('div',{class:'kw-models'});
  const boxes=rows.map((env,i)=>{
    const input=el('input',{type:'checkbox','aria-label':`אפשרות ${i+1}: ${K.rowWords(level,env)}`});
    input.addEventListener('change',()=>{if(input.checked){selected.add(i);none.checked=false;}else selected.delete(i);changed();});
    choices.append(el('label',{class:'kw-model'},[input,el('span',{text:K.rowWords(level,env)})]));return input;
  });
  const none=el('input',{type:'checkbox','aria-label':'אין אפשרות מתאימה'});
  none.addEventListener('change',()=>{if(none.checked){selected.clear();boxes.forEach(b=>b.checked=false);}changed();});
  group.append(choices,el('label',{},[none,el('span',{text:'אין אפשרות מתאימה'})]));form.append(group);
  function checkFinal(){
    const r=checkKnightSelection(level,[...selected],none.checked);say(feedback,r.message,r.ok);
    if(r.ok&&!solved){solved=true;onSolved(r.message);}return r;
  }
  form.append(button('בדיקת התשובה',checkFinal),feedback);
  form.addEventListener('submit',e=>{e.preventDefault();checkFinal();});box.append(form);

  const details=el('details',{class:'kw-work'},[el('summary',{text:'צריכים עזרה? בדקו בטבלה'}),el('p',{text:'הסוגים בכל שורה הם אפשרות לבדיקה. קבעו אם כל אמירה היא אמת או שקר, ואם האפשרות מתאימה לכללי האי. אין חובה למלא את הטבלה.'})]);
  const table=el('table',{dir:'rtl'}),head=el('tr');
  level.people.forEach(p=>head.append(el('th',{scope:'col',text:p.name})));
  level.statements.forEach(s=>head.append(el('th',{scope:'col',text:`${K.person(level,s.by).name}: ״${s.text}״`})));
  head.append(el('th',{scope:'col',text:'מתאים?'}));table.append(el('thead',{},[head]));
  const body=el('tbody');table.append(body);
  const state=rows.map((env,i)=>{
    const row=el('tr'),msg=message();
    level.people.forEach(p=>row.append(el('td',{text:K.roleWord(p,env[p.id])})));
    const values=level.statements.map(s=>{const input=select(`אפשרות ${i+1}: ערך האמת של דברי ${K.person(level,s.by).name}`,[['true','T'],['false','F']]);input.className='kw-value';row.append(el('td',{},[input]));return input;});
    const fits=select(`אפשרות ${i+1}: מתאים לכללים?`,[['true','כן'],['false','לא']]);fits.className='kw-fits';row.append(el('td',{},[fits]));
    const msgRow=el('tr',{class:'kw-row-feedback',hidden:''},[el('td',{colspan:String(level.people.length+level.statements.length+1)},[msg])]);
    for(const input of [...values,fits])input.addEventListener('change',()=>{input.removeAttribute('aria-invalid');msgRow.hidden=true;say(msg,'');});
    body.append(row,msgRow);return {env,values,fits,msg,msgRow};
  });
  function checkTable(){
    state.forEach(({env,values,fits,msg,msgRow})=>{
      [...values,fits].forEach(v=>v.removeAttribute('aria-invalid'));
      const wrong=values.findIndex((v,j)=>v.value!==String(evaluate(level.statements[j].formula,env)));
      let text='';
      if(wrong>=0){values[wrong].setAttribute('aria-invalid','true');text=values[wrong].value===''?'בחרו T או F לכל אמירה.':`בשורה זו: ${K.rowWords(level,env)}. לכן האמירה ״${level.statements[wrong].text}״ היא ${evaluate(level.statements[wrong].formula,env)?'אמת (T)':'שקר (F)'}.`;}
      else if(fits.value!==String(K.consistent(level,env))){fits.setAttribute('aria-invalid','true');text=fits.value===''?'בחרו אם האפשרות מתאימה.':K.conflictSentence(level,env)||'כל דובר פועל לפי כללי האי. האפשרות מתאימה.';}
      msgRow.hidden=false;say(msg,text||'נכון.',!text);
    });
  }
  details.append(el('div',{class:'kw-table-scroll',tabindex:'0','aria-label':'טבלת עזר'},[table]),button('בדיקת הטבלה',checkTable));box.append(details);
  const reset=()=>{selected.clear();boxes.forEach(b=>b.checked=false);none.checked=false;state.forEach(({values,fits,msg,msgRow})=>{[...values,fits].forEach(v=>{v.value='';v.removeAttribute('aria-invalid');});say(msg,'');msgRow.hidden=true;});details.open=false;changed();};
  if(showReset)box.append(button('התחלה מחדש',reset));
  return {reset,check:checkFinal,reveal(){
    reset();state.forEach(({env,values,fits})=>{values.forEach((v,j)=>v.value=String(evaluate(level.statements[j].formula,env)));fits.value=String(K.consistent(level,env));});
    rows.forEach((env,i)=>{if(K.consistent(level,env)){selected.add(i);boxes[i].checked=true;}});none.checked=!selected.size;details.open=true;
    say(feedback,'התשובה מוצגת. '+checkKnightSelection(level,[...selected],none.checked).message);
  }};
}

export function checkKnightEvidence(level,assignments,conclusions){
  if(assignments.some(env=>level.people.some(p=>!['true','false'].includes(env[p.id]))))return {ok:false,message:'בחרו סוג לכל תושב בשתי האפשרויות.'};
  const envs=assignments.map(env=>Object.fromEntries(level.people.map(p=>[p.id,env[p.id]==='true'])));
  for(let i=0;i<envs.length;i++)if(!K.consistent(level,envs[i]))return {ok:false,message:`אפשרות ${i+1}: ${K.conflictSentence(level,envs[i])}`};
  if(envs[0].C===envs[1].C)return {ok:false,message:'כדי להראות שסוגו של כרמל אינו נקבע, צריך שתי אפשרויות שבהן סוגו שונה.'};
  const solutions=K.solutions(level);
  for(const p of level.people){const expected=solutions.every(e=>e[p.id]===solutions[0][p.id])?String(solutions[0][p.id]):'unknown';if(conclusions[p.id]!==expected)return {ok:false,message:conclusions[p.id]?'בדקו שוב מה אפשר להסיק על '+p.name+'.':'בחרו מסקנה לגבי '+p.name+'.'};}
  return {ok:true,message:'נכון. אלון נוכל ובתיה אבירה; כרמל יכול להיות אביר או נוכל. שתי האפשרויות שהצגתם מתאימות לכל האמירות.'};
}
function mountEvidence(box,level){
  box.replaceChildren();box.classList.add('knight-workshop');
  box.append(el('p',{text:'הראו שסוגו של כרמל אינו נקבע: בחרו שתי אפשרויות שמתאימות לאמירות, ובהן כרמל מסוג שונה.'}));
  const fields=[0,1].map(i=>{const group=el('fieldset',{class:'kw-evidence'},[el('legend',{text:`אפשרות ${i+1}`})]),env={};level.people.forEach(p=>{env[p.id]=select(p.name+` — אפשרות ${i+1}`,[['true',K.roleWord(p,true)],['false',K.roleWord(p,false)]]);group.append(el('label',{},[el('span',{text:p.name}),env[p.id]]));});box.append(group);return env;});
  const conclusions={},group=el('fieldset',{class:'kw-evidence'},[el('legend',{text:'מה אפשר לקבוע על כל תושב?'})]);
  level.people.forEach(p=>{conclusions[p.id]=select('מסקנה לגבי '+p.name,[['true',K.roleWord(p,true)],['false',K.roleWord(p,false)],['unknown','אי אפשר לקבוע']]);group.append(el('label',{},[el('span',{text:p.name}),conclusions[p.id]]));});box.append(group);
  const msg=message(),values=obj=>Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,v.value]));
  box.append(button('בדיקת התשובה',()=>{const r=checkKnightEvidence(level,fields.map(values),values(conclusions));say(msg,r.message,r.ok);}),msg,button('התחלה מחדש',()=>{box.querySelectorAll('select').forEach(s=>s.value='');say(msg,'');}));
  box.querySelectorAll('select').forEach(s=>s.addEventListener('change',()=>say(msg,'')));
}
export function initKnightWorkshop(box){
  if(box.dataset.ready)return;const proof=KNIGHT_PROOFS[box.dataset.knightProof],level=KNIGHT_PUZZLES[box.dataset.knightTable||box.dataset.knightEvidence];if(!proof&&!level)return;box.dataset.ready='true';
  if(proof)mountKnightProof(box,KNIGHT_PUZZLES[proof.level],proof);else if(box.dataset.knightEvidence)mountEvidence(box,level);else if(box.dataset.knightIntro==='true')mountKnightIntro(box,level);else mountKnightTable(box,level);
}
