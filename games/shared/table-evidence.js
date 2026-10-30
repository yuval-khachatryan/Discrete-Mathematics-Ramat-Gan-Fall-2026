import { evaluate, format } from './logic.js';

export function evidenceAt(spec, env) {
  const formulas=spec.mode==='truth' ? [spec.formula] : spec.mode==='argument' ? [...spec.premises,spec.conclusion] : [spec.left,spec.right];
  const facts=formulas.map(formula=>({formula:format(formula),value:evaluate(formula,env)}));
  const counter=spec.mode==='truth' ? facts[0].value===spec.value : spec.mode==='argument' ? facts.slice(0,-1).every(f=>f.value)&&!facts.at(-1).value : facts[0].value!==facts[1].value;
  return {facts,counter};
}
export function checkEvidence(spec, rows, choice) {
  if(choice==='') return {ok:false,message:'בחרו שורה, או קבעו שאין שורה מתאימה.'};
  if(spec.mode==='truth') {
    const wanted=spec.value?'אמת':'שקר';
    if(choice==='none') {
      const exists=rows.some(env=>evidenceAt(spec,env).counter);
      return {ok:!exists,message:exists?`יש שורה שבה הפסוק ${wanted}. חפשו אותה ובחרו בה.`:`נכון. אין שורה שבה הפסוק ${wanted}.`};
    }
    const i=Number(choice);
    if(!Number.isInteger(i)||i<0||i>=rows.length)return {ok:false,message:'בחרו אחת משורות הטבלה.'};
    const {facts,counter}=evidenceAt(spec,rows[i]);
    return {ok:counter,facts,message:counter?`נכון. בשורה שבחרתם הפסוק ${wanted}, כפי שנדרש.`:`בשורה שבחרתם הפסוק ${spec.value?'שקר':'אמת'}. חפשו שורה שבה הוא ${wanted}.`};
  }
  if(choice==='none') {
    const exists=rows.some(env=>evidenceAt(spec,env).counter);
    return exists ? {ok:false,message:spec.mode==='argument'
      ? 'יש בטבלה שורה שבה כל ההנחות אמת והמסקנה שקר. חפשו אותה ובחרו בה.'
      : 'יש בטבלה שורה שבה התוצאות שונות. חפשו אותה ובחרו בה.'}
      : {ok:true,message:spec.mode==='argument'
        ? 'נכון. בדקנו את כל השורות: אין שורה שבה כל ההנחות אמת והמסקנה שקר. לכן הטיעון תקף.'
        : 'נכון. בשום שורה התוצאות אינן שונות. לכן הנוסחאות שקולות לוגית.'};
  }
  const i=Number(choice);
  if(!Number.isInteger(i)||i<0||i>=rows.length)return {ok:false,message:'בחרו אחת משורות הטבלה.'};
  const {facts,counter}=evidenceAt(spec,rows[i]);
  return {ok:counter,facts,message:counter ? (spec.mode==='argument'
    ? 'זו דוגמה נגדית: כל ההנחות אמת והמסקנה שקר. לכן הטיעון אינו תקף.'
    : 'זו דוגמה נגדית לשקילות: באותה הצבה התקבלו תוצאות שונות.')
    : spec.mode==='argument' ? (facts.slice(0,-1).some(f=>!f.value)
      ? 'זו אינה דוגמה נגדית: לפחות אחת ההנחות שקרית. כדי להפריך תקפות, כל ההנחות צריכות להיות אמת.'
      : 'זו אינה דוגמה נגדית: המסקנה אמת בשורה הזאת. חפשו שורה שבה כל ההנחות אמת והמסקנה שקר.')
      : 'בשורה שבחרתם התוצאות זהות. היא אינה מפריכה שקילות; חפשו שורה אחרת, או קבעו שאין כזאת.'};
}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;}
export function initTableEvidence(box,rows,onChange) {
  if(!box.dataset.evidence)return null;
  const spec=box.dataset.evidence==='truth'
    ? {mode:'truth',formula:box.dataset.formula,value:box.dataset.value==='true'}
    : box.dataset.evidence==='argument'
    ? {mode:'argument',premises:box.dataset.premises.split(';'),conclusion:box.dataset.conclusion}
    : {mode:'equivalence',left:box.dataset.left,right:box.dataset.right};
  const node=el('fieldset','table-evidence');
  node.append(el('legend','', 'מה הטבלה מלמדת?'));
  node.append(el('p','',spec.mode==='truth'
    ? `בחרו שורה שבה הפסוק ${spec.value?'אמת':'שקר'}. אפשר לבחור כבר עכשיו וללחוץ ״בדיקה״.`
    : spec.mode==='argument'
    ? 'כדי להפריך את הטיעון, צריך שורה שבה כל ההנחות אמת והמסקנה שקר. בחרו שורה כזאת, או קבעו שאין כזאת לאחר בדיקת כל הטבלה.'
    : 'האם יש שורה שבה שתי הנוסחאות נותנות תוצאות שונות? בחרו שורה כזאת, או קבעו שאין כזאת לאחר בדיקת כל הטבלה.'));
  const statements=spec.mode==='truth' ? [['הפסוק',spec.formula]] : spec.mode==='argument' ? [...spec.premises.map((f,i)=>[`הנחה ${i+1}`,f]),['מסקנה',spec.conclusion]] : [['נוסחה ראשונה',spec.left],['נוסחה שנייה',spec.right]];
  for(const [label,formula] of statements){const p=el('p');p.append(el('strong','',label+': '));const m=el('span','m',format(formula));m.dir='ltr';p.append(m);node.append(p);}
  const label=el('label','proof-field','השורה שבחרתם');
  const select=el('select','proof-rule evidence-choice');
  select.append(new Option('בחרו שורה…',''),...rows.map((env,i)=>new Option(`שורה ${i+1}: `+Object.entries(env).map(([n,v])=>`${n}=${v?'T':'F'}`).join(', '),String(i))),new Option('אין שורה כזאת','none'));
  label.append(select);node.append(label);
  const feedback=el('div','bk-msg');feedback.setAttribute('aria-live','polite');node.append(feedback);
  select.addEventListener('change',()=>{feedback.replaceChildren();select.removeAttribute('aria-invalid');onChange();});
  function check(){
    const result=checkEvidence(spec,rows,select.value);
    feedback.className=`bk-msg ${result.ok?'bk-good':'bk-bad'}`;feedback.textContent=result.message;
    if(result.facts) result.facts.forEach((fact,i)=>{
      const p=el('p');p.append(el('span','',statements[i][0]+': '));const f=el('span','m',`${fact.formula} = ${fact.value?'T':'F'}`);f.dir='ltr';p.append(f);feedback.append(p);
    });
    select.setAttribute('aria-invalid',String(!result.ok));return result.ok;
  }
  return {node,check,
    enable(){node.disabled=false;},
    invalidate(){node.disabled=false;feedback.replaceChildren();select.removeAttribute('aria-invalid');},
    reset(){select.value='';this.invalidate();},
    reveal(){select.value=String(rows.findIndex(env=>evidenceAt(spec,env).counter));if(select.value==='')select.value='none';node.disabled=false;check();},
  };
}
