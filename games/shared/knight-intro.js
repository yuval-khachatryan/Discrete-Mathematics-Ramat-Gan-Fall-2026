import {parse,format,variables,compare,evaluate} from './logic.js';
import {keyboard} from './formula-keyboard.js';
import * as K from '../gate/knights.js';
const el=(tag,attrs={},kids=[])=>{const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==='text')n.textContent=v;else if(k==='class')n.className=v;else n.setAttribute(k,v);}kids.forEach(c=>n.append(c));return n;};
const btn=(text,fn)=>{const b=el('button',{type:'button',class:'bk-btn',text});b.addEventListener('click',fn);return b;};
const say=(n,text,ok)=>{n.textContent=text;n.className='bk-msg '+(ok===true?'bk-good':ok===false?'bk-bad':'');};
const tv=v=>v?'T':'F';
export function checkKnightFormula(input,level){
 if(!input.trim())return {ok:false,message:'כתבו את האמירה של אלון בעזרת A ו־B.'};
 if(input.length>120)return {ok:false,message:'הנוסחה ארוכה מדי. נסו לכתוב את האמירה בקיצור.'};
 let tree;try{tree=parse(input.trim().toUpperCase(),{flatten:false});}catch{return {ok:false,message:'לא הצלחתי לקרוא את הנוסחה. בדקו את הסוגריים ואת סימני הקשרים.'};}
 if(variables(tree).some(v=>!level.people.some(p=>p.id===v)))return {ok:false,message:'השתמשו רק באותיות A ו־B שהוגדרו מעל התרגיל.'};
 const comparison=compare(tree,level.statements[0].formula);
 if(!comparison.equal)return {ok:false,message:'הנוסחה אינה מתאימה ל״שנינו נוכלים״. צריך לומר שאלון נוכל וגם בתיה נוכלת.'};
 return {ok:true,formula:format(tree)};
}
export function checkIntroRow(level,formula,env,value,fits){
 const truth=evaluate(formula,env),consistent=truth===env[level.statements[0].by];
 if(value==='')return {ok:false,field:'value',message:'בחרו T או F לערך האמירה.'};
 if(value!==String(truth))return {ok:false,field:'value',message:`ערך האמירה בשורה הזאת הוא ${tv(truth)}. ${K.evaluationText(level.statements[0],env)}`};
 if(fits==='')return {ok:false,field:'fits',message:'בחרו אם המצב מתאים לכללי האי.'};
 if(fits!==String(consistent))return {ok:false,field:'fits',message:K.conflictSentence(level,env)||'המצב מתאים: אלון נוכל ואמירתו שקרית. בתיה אינה אומרת דבר.'};
 return {ok:true,consistent};
}
export function checkIntroConclusion(level,roles){
 if(level.people.some(p=>!['true','false'].includes(roles[p.id])))return {ok:false,message:'בחרו סוג גם לאלון וגם לבתיה.'};
 const env=Object.fromEntries(level.people.map(p=>[p.id,roles[p.id]==='true']));
 if(!K.consistent(level,env))return {ok:false,message:'הבחירה אינה מתאימה לשורה שנותרה בטבלה. '+K.conflictSentence(level,env)};
 return {ok:true,message:'לכן אלון נוכל ובתיה אבירה. זו האפשרות היחידה שמתאימה לכללי האי ולדברי אלון.'};
}
export function mountKnightIntro(box,level){
 box.replaceChildren();box.classList.add('knight-workshop','kw-compact');
 const input=el('input',{class:'bk-input kw-formula-input',type:'text',dir:'ltr',maxlength:'120',autocomplete:'off',spellcheck:'false','aria-label':'הצרנת האמירה של אלון'});
 const formulaMessage=el('p',{class:'bk-msg','aria-live':'polite'}),work=el('section',{class:'kw-compact-work'}),feedback=el('div',{class:'kw-compact-feedback','aria-live':'polite'});
 work.hidden=true;let formula='',state=[],conclusion=null,roleFields=[],conclusionMsg=null;
 function clearConclusion(){if(!conclusion)return;conclusion.hidden=true;roleFields.forEach(({field})=>{field.value='';field.removeAttribute('aria-invalid');});say(conclusionMsg,'');}
 function invalidate(){clearConclusion();work.hidden=true;input.removeAttribute('aria-invalid');say(formulaMessage,'');feedback.replaceChildren();}
 input.addEventListener('input',()=>{const a=input.selectionStart,b=input.selectionEnd;input.value=input.value.toUpperCase();input.setSelectionRange(a,b);invalidate();});
 const form=el('form',{class:'kw-formalization'},[
  el('strong',{text:'1. כותבים את האמירה בסימנים'}),
  el('label',{},[el('span',{text:'אלון אומר ״שנינו נוכלים״. מהי הנוסחה?'}),input]),keyboard(input,invalidate),
  btn('בדיקת ההצרנה',openTable),formulaMessage,
 ]);
 form.addEventListener('submit',e=>{e.preventDefault();openTable();});
 function openTable(){
  const r=checkKnightFormula(input.value,level);say(formulaMessage,r.ok?'נכון. נבדוק את הנוסחה בטבלה.':r.message,r.ok);input.setAttribute('aria-invalid',String(!r.ok));if(!r.ok){work.hidden=true;return;}
  formula=r.formula;work.hidden=false;work.replaceChildren();feedback.replaceChildren();
  const header=el('tr',{},[...level.people.map(p=>el('th',{scope:'col'},[el('bdi',{text:p.id}),el('span',{class:'kw-column-meaning',text:`${p.name} ${p.g==='f'?'אבירה':'אביר'}`})])),el('th',{scope:'col',class:'kw-statement'},[el('bdi',{dir:'ltr',text:formula}),el('span',{class:'kw-column-meaning',text:level.statements[0].text})]),el('th',{scope:'col',class:'kw-truth-heading',dir:'rtl',text:'אלון אומר אמת?'}),el('th',{scope:'col',dir:'rtl',text:'מתאים?'})]);
  const body=el('tbody'),table=el('table',{dir:'rtl','aria-label':'ערך האמירה והתאמתה לכללי האי'},[el('thead',{},[header]),body]);
  const pick=(label,options)=>el('select',{'aria-label':label},[el('option',{value:'',text:'—'}),...options.map(([value,text])=>el('option',{value,text}))]);
  state=K.rows(level).map((env,i)=>{
   const value=pick(`שורה ${i+1}: ערך האמירה`,[['true','T'],['false','F']]);value.className='kw-value';
   const fits=pick(`שורה ${i+1}: מתאים לכללי האי?`,[['true','כן'],['false','לא']]);fits.className='kw-fits';fits.dir='rtl';
   const truth=el('td',{class:'kw-truth',text:'—'});
   const row=el('tr',{},[...level.people.map(p=>el('td',{text:tv(env[p.id])})),el('td',{},[value]),truth,el('td',{},[fits])]);
   for(const field of [value,fits])field.addEventListener('change',()=>{field.removeAttribute('aria-invalid');feedback.replaceChildren();truth.textContent=value.value===''?'—':value.value==='true'?'כן':'לא';clearConclusion();});body.append(row);return {env,value,fits};
  });
  conclusionMsg=el('p',{class:'bk-msg','aria-live':'polite'});
  roleFields=level.people.map(p=>({person:p,field:pick(`מה הסוג של ${p.name}?`,[['true',p.g==='f'?'אבירה':'אביר'],['false',p.g==='f'?'נוכלת':'נוכל']])}));
  conclusion=el('section',{class:'kw-conclusion'},[
   el('strong',{text:'3. עונים על החידה: מי אביר ומי נוכל?'}),
   el('p',{text:'הסתכלו על השורה שמתאימה לכללים. מה היא אומרת על כל אחד מהתושבים?'}),
   ...roleFields.map(({person,field})=>el('label',{},[el('span',{text:person.name+':'}),field])),
   btn('בדיקת המסקנה',()=>{const r=checkIntroConclusion(level,Object.fromEntries(roleFields.map(({person,field})=>[person.id,field.value])));say(conclusionMsg,r.message,r.ok);}),conclusionMsg,
  ]);conclusion.hidden=true;
  roleFields.forEach(({field})=>field.addEventListener('change',()=>say(conclusionMsg,'')));
  work.append(el('strong',{text:'2. בודקים את ארבע האפשרויות'}),
   el('p',{text:'בעמודות A ו־B: האות T פירושה אביר או אבירה, והאות F פירושה נוכל או נוכלת.'}),
   el('p',{text:'חשבו את ערך האמירה, ובדקו אם הוא מתאים לסוגו של אלון. העמודה ״אלון אומר אמת?״ מציגה את אותו ערך במילים.'}),
   el('div',{class:'kw-table-scroll'},[table]),btn('בדיקת הטבלה',check),feedback,conclusion);
 }
 function check(){
  feedback.replaceChildren();let all=true;
  state.forEach(({env,value,fits},i)=>{
   for(const field of [value,fits])field.removeAttribute('aria-invalid');
   const r=checkIntroRow(level,formula,env,value.value,fits.value);if(!r.ok){all=false;(r.field==='value'?value:fits).setAttribute('aria-invalid','true');const m=el('p');say(m,`שורה ${i+1} (A=${tv(env.A)}, B=${tv(env.B)}): ${r.message}`,false);feedback.append(m);}
  });
  if(all){const m=el('p');say(m,'הטבלה נכונה. עכשיו השתמשו בשורה שמתאימה כדי לענות מי אביר ומי נוכל.',true);feedback.append(m);conclusion.hidden=false;}else clearConclusion();
 }
 box.append(form,work,btn('התחלה מחדש',()=>{input.value='';formula='';state=[];work.replaceChildren();invalidate();input.focus();}));
}
