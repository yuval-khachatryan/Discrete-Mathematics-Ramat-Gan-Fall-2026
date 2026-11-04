import {parse,variables,assignments,evaluate} from './logic.js';
import {proofFormula} from './proof-notation.js';
import {initTableEvidence} from './table-evidence.js';
const el=(tag,attrs={},children=[])=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='text')n.textContent=v;else if(k==='class')n.className=v;else n.setAttribute(k,v);}children.forEach(c=>n.append(c));return n;};
// A separate, fillable proof by truth table. It does not invent a sequence of
// inference steps or mark an unfinished symbolic proof as complete.
export function proofTable(getSpec){
 const details=el('details',{class:'proof-table-practice'}),summary=el('summary',{text:'בדיקה בטבלת אמת'}),body=el('div');details.append(summary,body);
 let signature='';
 function build(){
  if(!details.open)return;
  const spec=getSpec(),key=JSON.stringify(spec);if(key===signature)return;signature=key;body.replaceChildren();
  let columns,names,rows;
  try{
   columns=spec.premises
    ?[...spec.premises.map((formula,i)=>({label:`נתון ${i+1}`,formula})),{label:'המסקנה',formula:spec.conclusion}]
    :[{label:'אגף ראשון',formula:spec.left},{label:'אגף שני',formula:spec.right}];
   columns.forEach(c=>parse(c.formula));
   names=[...new Set(columns.flatMap(c=>variables(c.formula)))].sort();
   if(names.length>4)throw new Error();
   rows=assignments(names);
  }catch{body.append(el('p',{text:'כדי לפתוח טבלה, השלימו תחילה נוסחאות תקינות. הטבלה מיועדת לעד ארבע אותיות שונות.'}));return;}
  const evidenceSpec=spec.premises
   ?{mode:'argument',premises:spec.premises,conclusion:spec.conclusion}
   :{mode:'equivalence',left:spec.left,right:spec.right};
  const proxy=el('div');proxy.dataset.evidence=evidenceSpec.mode;
  if(spec.premises){proxy.dataset.premises=spec.premises.join(';');proxy.dataset.conclusion=spec.conclusion;}
  else{proxy.dataset.left=spec.left;proxy.dataset.right=spec.right;}
  const feedback=el('p',{class:'bk-msg','aria-live':'polite'});
  const clear=()=>{feedback.textContent='';feedback.className='bk-msg';};
  const evidence=initTableEvidence(proxy,rows,clear);
  body.append(el('p',{text:spec.premises
   ?'מלאו את ערכי האמת של הנתונים ושל המסקנה. כדי לבדוק תקפות, חפשו שורה שבה כל הנתונים אמת והמסקנה שקר. בשורה שבה אחד הנתונים שקר אין דרישה על המסקנה.'
   :'מלאו את ערכי האמת של שני האגפים. כדי לבדוק שקילות, חפשו שורה שבה ערכי האמת שלהם שונים.'}));
  const table=el('table',{class:'bk-tt',dir:'rtl'}),head=el('tr');
  names.forEach(name=>head.append(el('th',{scope:'col',text:name})));
  columns.forEach(c=>head.append(el('th',{scope:'col'},[el('span',{text:c.label}),el('div',{dir:'ltr',text:proofFormula(c.formula)})])));
  table.append(el('thead',{},[head]));const tbody=el('tbody');table.append(tbody);
  const cells=[];
  rows.forEach((env,i)=>{
   const tr=el('tr');names.forEach(name=>tr.append(el('td',{text:env[name]?'T':'F'})));
   columns.forEach(c=>{
    const select=el('select',{'aria-label':`שורה ${i+1}, ${c.label}: ${proofFormula(c.formula)}`},[el('option',{value:'',text:'?' }),el('option',{value:'true',text:'T'}),el('option',{value:'false',text:'F'})]);
    select.addEventListener('change',()=>{select.removeAttribute('aria-invalid');clear();});
    cells.push({select,value:evaluate(c.formula,env)});tr.append(el('td',{},[select]));
   });tbody.append(tr);
  });
  body.append(el('div',{class:'bk-tt-wrap'},[table]),evidence.node);
  const check=el('button',{type:'button',class:'bk-btn',text:'בדיקת הטבלה והמסקנה'});
  check.addEventListener('click',()=>{
   let blanks=0,wrong=0;
   cells.forEach(({select,value})=>{const ok=select.value===String(value);select.setAttribute('aria-invalid',String(!ok));if(!select.value)blanks++;else if(!ok)wrong++;});
   const verdict=evidence.check();
   feedback.className='bk-msg '+(!blanks&&!wrong&&verdict?'bk-good':'bk-bad');
   if(blanks||wrong)feedback.textContent=`${blanks?`נותרו ${blanks} תאים למילוי. `:''}${wrong?`יש ${wrong} ערכים שדורשים תיקון. `:''}בדקו את התאים המסומנים.`;
   else if(!verdict)feedback.textContent='הטבלה נכונה. תקנו את הבחירה שמתחתיה.';
   else feedback.textContent=spec.premises
    ?(evidenceSpec.premises&&rows.every(env=>!spec.premises.every(f=>evaluate(f,env))||evaluate(spec.conclusion,env))?'הטבלה מלאה ונכונה: בכל שורה שבה כל הנתונים אמת, גם המסקנה אמת. זו הוכחה לתקפות הטיעון בעזרת טבלת אמת.':'הטבלה והדוגמה הנגדית נכונות: הטיעון אינו תקף.')
    :(rows.every(env=>evaluate(spec.left,env)===evaluate(spec.right,env))?'הטבלה מלאה ונכונה: האגפים שווים בערכי האמת בכל שורה. זו הוכחת השקילות בעזרת טבלת אמת.':'הטבלה והדוגמה הנגדית נכונות: האגפים אינם שקולים.');
  });
  body.append(check,feedback);
 }
 details.addEventListener('toggle',build);
 return {box:details,refresh:build};
}
