import {formulaWords} from './argument-display.js';
import {proofTable} from './proof-table.js';
import {proofFormula} from './proof-notation.js';
import {deductionCandidates,deductionHint} from './deduction-hints.js';
import {inferenceView,formalRuleReminder,ruleFormulaLabel} from "./inference-view.js";
import {parse,format,compare,variables,sameFormulaStructure} from './logic.js';
import {compactProofStep} from './compact-proof-step.js';
import {keyboard} from './formula-keyboard.js';
import {replacementEditor} from './replacement-editor.js';
import {stepReason,stepRuleNames,sourceCitation,proofSourceLabel} from './proof-rules.js';
import {DEDUCTION_RULES,checkDeduction,deductionSourceChoices} from './knight-deduction.js';
import * as K from '../gate/knights.js';
const el=(tag,attrs={},kids=[])=>{const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==='text')n.textContent=v;else if(k==='class')n.className=v;else n.setAttribute(k,v);}kids.forEach(c=>n.append(c));return n;};
const button=(text,fn)=>{const b=el('button',{type:'button',class:'bk-btn',text});b.addEventListener('click',fn);return b;};
const message=()=>el('div',{class:'bk-msg','aria-live':'polite'});
const say=(n,text,ok)=>{n.textContent=text;n.className='bk-msg '+(ok===true?'bk-good':ok===false?'bk-bad':'');};
const formula=text=>el('bdi',{class:'proof-formula',dir:'ltr',text:proofFormula(text)});
export function knightTarget(level){const rows=K.solutions(level);return rows.length?rows.map(env=>'('+level.people.map(p=>(env[p.id]?'':'!')+p.id).join(' & ')+')').join(' | '):'F';}
export function checkKnightStatements(level,inputs){
 const allowed=level.people.map(p=>p.id);
 return level.statements.map((s,i)=>{
  if(!inputs[i]?.trim())return {ok:false,message:'כתבו את האמירה בסימנים.'};
  if(inputs[i].length>240)return {ok:false,message:'הנוסחה ארוכה מדי.'};
  try{
   const tree=parse(inputs[i].toUpperCase());if(variables(tree).some(v=>!allowed.includes(v)))return {ok:false,message:'השתמשו באותיות שמוגדרות מעל השאלה.'};
   if(!compare(tree,s.formula).equal)return {ok:false,message:'הנוסחה אינה מבטאת את דברי התושב. בדקו את משמעות האותיות ואת הקשרים.'};
   if(!sameFormulaStructure(inputs[i],s.formula))return {ok:false,message:'הנוסחה שקולה לאמירה, אבל כאן נדרשת הצרנה ישירה, באותם קשרים ובאותו סדר. שכתובים אפשר להצדיק בהמשך ההוכחה.'};
   return {ok:true,formula:inputs[i].trim().toUpperCase(),premise:`${s.by} <-> (${inputs[i].trim().toUpperCase()})`};
  }catch{return {ok:false,message:'בדקו את הסימנים והסוגריים בנוסחה.'};}
 });
}
function words(src,level){
 if(level.exercise&&format(src)==='F')return 'סתירה';
 if(level.exercise)return formulaWords(src,level.exercise,Object.fromEntries(level.exercise.atoms.map(a=>[a.id,a.id])));
 const names=Object.fromEntries(level.people.map(p=>[p.id,p]));
 function walk(n){
  if(n.type==='var')return names[n.name].name+' '+K.roleWord(names[n.name],true);
  if(n.type==='not'&&n.arg.type==='var')return names[n.arg.name].name+' '+K.roleWord(names[n.arg.name],false);
  if(n.type==='const')return n.value?'אמת':'סתירה';
  if(n.type==='not')return 'לא נכון ש־('+walk(n.arg)+')';
  if(n.type==='and'||n.type==='or')return n.args.map(a=>['var','const'].includes(a.type)||(a.type==='not'&&a.arg.type==='var')?walk(a):'('+walk(a)+')').join(n.type==='and'?' וגם ':' או ');
  if(n.type==='imp')return 'אם ('+walk(n.left)+'), אז ('+walk(n.right)+')';
  if(n.type==='iff')return '('+walk(n.left)+') אם ורק אם ('+walk(n.right)+')';
  return 'בדיוק אחד: ('+walk(n.left)+') או ('+walk(n.right)+')';
 }return walk(parse(src));
}
const ruleSections={mp:'box-thm-mp',mt:'box-thm-mt',hs:'box-thm-hs','and-out':'rule-and-parts','and-in':'rule-and-join','iff-use':'rule-iff-use',assume:'sec-proof-contradiction',false:'rule-contradiction-steps',raa:'rule-contradiction-steps',conditional:'rule-cases-steps',cases:'rule-cases-steps',table:'box-def-valid'};
export function knightEditorRules(config){
 if(config.rules)return DEDUCTION_RULES.filter(r=>config.rules.includes(r.id));
 return DEDUCTION_RULES.filter(r=>r.id!=='copy'&&(!r.id.startsWith('eq:')||r.id==='eq:replacements')&&(config.allowCases||!['conditional','cases'].includes(r.id)));
}
export function mountKnightProof(box,level,config){
 box.replaceChildren();box.classList.add('knight-workshop','knight-proof-editor');
 const exercise=config.exercise,allowed=level.people.map(p=>p.id),target=exercise?exercise.goal.formula:knightTarget(level);let premises=[],rows=[],approved=false;
 const legend=el('div',{class:'kw-meanings'});level.people.forEach(p=>legend.append(el('div',{},[el('bdi',{text:p.id}),el('span',{text:exercise?exercise.atoms.find(a=>a.id===p.id).text:p.name+' '+K.roleWord(p,true)})])));box.append(legend);
 const help=el('details',{class:'activity-help'},[el('summary',{text:'איך כותבים ובודקים את ההוכחה?'}),el('p',{text:'תרגמו את האמירות. העורך מצרף לכל אמירה את כלל האי: הדובר אביר אם ורק אם אמירתו אמת. אלה הנתונים להוכחה.'}),el('p',{text:'בחרו נימוק ושורות מקור מתוך הרשימות. בכל אפשרות מופיעים מספר השורה והנוסחה שלה. לאחר מכן כתבו מה מתקבל. אפשר לבחור דרך משלכם; אין רשימת צעדים שחייבים לשחזר. אפשר גם להחליף כמה חלקים נפרדים לפי חוקי שקילות.'}),el('p',{text:'להוכחה בדרך השלילה פותחים ״הנחה זמנית״. בסגירתה מציינים תחילה את מספר ההנחה ואחריו את שורת הסתירה. אי אפשר להשתמש בשורות מתוך הנחה שנסגרה; משתמשים במסקנה שהוכחה בסגירה.'}),...(config.allowCases?[el('p',{text:'בהוכחה לפי מקרים מוכיחים את אותה מסקנה תחת שתי הנחות מנוגדות. סוגרים כל הנחה כגרירה, ואז משתמשים ב״איחוד מקרים״.'})]:[]),el('p',{text:'הנימוק ״הסקה בעזרת טבלת אמת״ בודק את כל ההצבות של שורות המקור ומציג את הטבלה. הוא דרך הוכחה בפני עצמו, ולא קיצור דרך שמצדיק שימוש בכלל אחר.'}),el('p',{text:'בסיום כתבו נוסחה שמסכמת את כל האפשרויות שנותרו. כשאין פתרון, הגיעו ל־F. הנתונים והצעדים שאושרו מופיעים ברצף, ולצד כל צעד אפשרות לעריכה. נסו לכתוב את ההוכחה גם על דף.'})]);
 if(exercise)help.replaceChildren(el('summary',{text:'איך כותבים ובודקים את ההוכחה?'}),
  el('p',{text:(config.fixedSteps?.length?'תחילת ההוכחה כבר כתובה וקבועה. המשיכו מן הצעד הבא. ':'')+'הנתונים והמטרה מוצגים בסימנים. בכל צעד בחרו כלל, ציינו את המקורות וכתבו את המסקנה. אפשר לבחור סדר צעדים משלכם; פתרון לדוגמה זמין בסוף.'}),
  el('p',{text:'להנחה זמנית אין מקור. כדי לסגור אותה, בחרו קודם את שורת ההנחה ואז את שורת הסיום שלה. מסקנות שתלויות בהנחה אינן זמינות אחרי סגירתה; אפשר להשתמש בתוצאה שהוכחה בסגירה.'}),
  el('p',{text:exercise.method==='raa'?'בדרך השלילה: הוכיחו פסוק ואת שלילתו, כתבו F לפי ״קבלת סתירה״, ואז סגרו את ההנחה הזמנית.':'לפי מקרים: סגרו כל מקרה כגרירה. אחר כך בחרו ״איחוד מקרים״ והפנו לשתי הגרירות שהוכחתם.'}),
  el('p',{text:'בסיום לחצו ״סיימתי את ההוכחה — בדקו״. כתבו את ההוכחה גם על דף, עם הנתונים, המטרה ונימוק לכל מעבר.'}));
 box.append(help);
 const translation=el('form',{class:'kp-translation'}),translationMsg=message();
 const fields=level.statements.map(s=>{
  const input=el('input',{class:'bk-input kp-statement',type:'text',dir:'ltr',maxlength:'240',autocomplete:'off',spellcheck:'false','aria-label':'האמירה של '+K.person(level,s.by).name}),msg=message();
  translation.append(el('label',{class:'proof-field'},[el('strong',{text:K.person(level,s.by).name+': ״'+s.text+'״'}),input]),keyboard(input,changed),msg);
  input.addEventListener('input',()=>{input.value=input.value.toUpperCase();changed();});return {input,msg};
 });
 function changed(){approved=false;proofArea.hidden=true;say(translationMsg,'');fields.forEach(f=>say(f.msg,''));}
 const approve=button('בדיקת ההצרנה ופתיחת ההוכחה',()=>{
  const results=checkKnightStatements(level,fields.map(f=>f.input.value));results.forEach((r,i)=>{say(fields[i].msg,r.ok?'':r.message,r.ok);fields[i].input.setAttribute('aria-invalid',String(!r.ok));});
  if(!results.every(r=>r.ok)){say(translationMsg,'תקנו את האמירות המסומנות.',false);return;}
  const next=results.map(r=>r.premise);if(JSON.stringify(next)!==JSON.stringify(premises)){premises=next;rows=[];list.replaceChildren();addRow();}
  approved=true;translationDetails.open=false;proofArea.hidden=false;say(translationMsg,'ההצרנה מתאימה. לכל אמירה מצורף כלל האי.',true);renderGiven();clearResults();
 });translation.addEventListener('submit',e=>{e.preventDefault();approve.click();});translation.append(approve,translationMsg);const translationDetails=el('details',{class:'kp-translation-options'},[el('summary',{text:'הצרנת האמירות'}),translation]);translationDetails.open=true;if(!exercise)box.append(translationDetails);
 const proofArea=el('section',{class:'kp-work'});proofArea.hidden=!exercise;
 const givens=el('ol',{class:'kp-givens'}),list=el('div',{class:'kp-steps'}),status=message(),hints=el('div');let hintIndex=0;
 const add=button('הוספת שורה',()=>addRow()),check=button('סיימתי את ההוכחה — בדקו',()=>validate(rows.length-1,true)),reset=button('איפוס ההוכחה',()=>{rows=[];list.replaceChildren();hintIndex=0;hints.replaceChildren();model.open=false;initializeRows();});
 function renderGiven(){givens.replaceChildren();premises.forEach((p,i)=>givens.append(el('li',{},[formula(p),el('span',{class:'given-label',text:`נתון ${i+1}`}),el('span',{class:'given-words',text:exercise?exercise.premises[i].text:'כלל האי עבור '+K.person(level,level.statements[i].by).name}),...(!exercise?[button('עריכה',()=>{translationDetails.open=true;fields[i].input.focus();})]:[])])));}

 const undo=button('חזרה לצעד האחרון',()=>{
  const index=rows.findLastIndex(r=>!r.fixed&&r.node.classList.contains('step-accepted'));if(index<0)return;
  while(rows.length>index+1&&!rows.at(-1).input.value.trim()&&!rows.at(-1).rule.value)rows.pop().node.remove();
  clearResults(index);rows[index].compact.focus();
 });
 const ledger=el('section',{class:'proof-ledger','aria-label':'ההוכחה'},[el('strong',{text:exercise?'נתונים':'נתונים לפי כלל האי'}),givens,...(exercise?[el('div',{class:'proof-goal'},[el('strong',{text:'נוכיח: '+exercise.goal.text}),' ',formula(target)])]:[]),list]);
 if(exercise)proofArea.append(proofTable(()=>({premises:config.premises,conclusion:target})).box);
 proofArea.append(ledger,el('div',{class:'bk-bar'},[add,check,undo,reset]),status,button('רמז',()=>{if(hintIndex<config.hints.length)hints.append(el('p',{text:config.hints[hintIndex++]}));}),hints);
 const model=el('details',{class:'kp-model'},[el('summary',{text:'דוגמה להוכחה — דרך אפשרית אחת'})]);
 model.addEventListener('toggle',()=>{if(!model.open)return;const result=checkDeduction(config.premises,config.model,allowed,target);model.replaceChildren(el('summary',{text:'דוגמה להוכחה — דרך אפשרית אחת'}),proofDocument(result.lines,result.complete));});proofArea.append(model);box.append(proofArea);
 const sourceValue=input=>input.dataset.pendingValue??input.value;
 function refs(row){return row.sources.map(input=>sourceValue(input).trim()?Number(sourceValue(input)):NaN);}
 function source(n){return Number.isInteger(n)&&n>0?(n<=premises.length?premises[n-1]:rows[n-premises.length-1]?.input.value):undefined;}
 function sourceLabel(n){return proofSourceLabel(n,premises.length,rows[n-premises.length-1]?.rule.value==='assume');}
 function refresh(){
  const state=checkDeduction(premises,rows.map(r=>({formula:r.input.value,rule:r.rule.value,refs:refs(r),replacements:r.replace.get()})),allowed,target);
  rows.forEach((r,i)=>{
   r.hint?.refresh(!!r.rule.value&&!r.rule.value.startsWith('eq:'));
   const number=premises.length+i+1;r.title.textContent=`צעד ${i+1}`;
   r.sources.forEach((select,j)=>{
    const value=sourceValue(select),choices=deductionSourceChoices(state.lines,number,r.rule.value,j),preview=r.sourcePreviews[j];
    delete select.dataset.pendingValue;
    const others=refs(r).filter((_,k)=>k!==j);
    select.replaceChildren(el('option',{value:'',text:choices.length?'בחרו שורת מקור…':'אין שורה זמינה — השלימו קודם את הצעדים הקודמים'}),...choices.map(line=>{
     const option=el('option',{value:String(line.number),text:`${sourceLabel(line.number)} — ⁦${proofFormula(line.formula)}⁩`});option.disabled=others.includes(line.number);return option;
    }));
    const valid=choices.some(line=>String(line.number)===value)&&!others.includes(Number(value));
    if(value&&!valid){
     const stale=el('option',{value,text:`${sourceLabel(Number(value))} — אינה זמינה כמקור כעת`});stale.disabled=true;
     // A disabled selected entry preserves work while an earlier line is edited.
     const existing=[...select.options].find(o=>o.value===value);if(existing)existing.remove();select.append(stale);
    }
    select.value=value;
    preview.classList.toggle('kp-source-error',!!value&&!valid);
    if(!value)preview.textContent='בחרו שורה כדי לראות את הנוסחה';
    else if(!valid)preview.textContent='השורה אינה זמינה. בדקו את הצעדים הקודמים או בחרו מקור אחר.';
    else preview.textContent=proofFormula(choices.find(line=>String(line.number)===value).formula);
   });
   const first=refs(r)[0],available=deductionSourceChoices(state.lines,number,r.rule.value,0);
   r.replace.setSource(available.some(line=>line.number===first)?source(first)||'':'');
   r.addSource.disabled=r.sources.length>=available.length;
  });add.disabled=rows.length>=30;
 }
 function sourceFields(row,values){
  const rule=DEDUCTION_RULES.find(r=>r.id===row.rule.value),count=rule?.count;
  const previous=values||row.sources.map(input=>input.value);
  const size=!rule?0:count===null?Math.max(1,Math.min(previous.length,premises.length+Math.max(0,rows.indexOf(row)))):count;
  row.sourceList.replaceChildren();row.sources=[];row.sourcePreviews=[];
  row.noSources.hidden=size!==0;
  row.noSources.textContent=rule?'זו הנחה זמנית, ולכן אין לה שורת מקור. כתבו את ההנחה בשדה שלמטה.':'בחרו נימוק כדי לראות כמה שורות מקור דרושות.';
  row.addSource.hidden=count!==null;
  for(let i=0;i<size;i++){
   const label=['raa','conditional'].includes(row.rule.value)?(i===0?'שורת ההנחה הזמנית':row.rule.value==='raa'?'שורת הסתירה':'שורת המסקנה'):'מקור '+(i+1);
   const input=el('select',{class:'kp-sources','aria-label':label}),preview=el('bdi',{class:'kp-source-preview',dir:'ltr','aria-live':'polite'});
   input.dataset.pendingValue=previous[i]||'';input.addEventListener('change',()=>clearResults(rows.indexOf(row)));
   const line=el('div',{class:'kp-source-line'},[el('label',{},[el('span',{text:label}),input]),preview]);
   if(count===null&&size>1)line.append(button('הסרת מקור',()=>{sourceFields(row,row.sources.filter((_,j)=>j!==i).map(n=>n.value));clearResults(rows.indexOf(row));}));
   row.sources.push(input);row.sourcePreviews.push(preview);row.sourceList.append(line);
  }
 }
 function clearResults(from=0){
  say(status,'');
  rows.slice(from).forEach(r=>{r.compact?.invalidate();say(r.msg,'');r.node.removeAttribute('aria-invalid');r.replace.showResult(null);});
  undo.disabled=!rows.some(r=>!r.fixed&&r.node.classList.contains('step-accepted'));refresh();
 }
 function addRow(){
  if(rows.length>=30)return;
  const title=el('legend'),input=el('input',{type:'text',class:'bk-input kp-formula',dir:'ltr',maxlength:'240',autocomplete:'off',spellcheck:'false','aria-label':'נוסחת הצעד'}),rule=el('select',{class:'kp-rule','aria-label':'נימוק'},[el('option',{value:'',text:'בחרו נימוק…'}),...knightEditorRules(config).map(r=>el('option',{value:r.id,text:ruleFormulaLabel(r)}))]);
  const reminder=el('details',{class:'kp-rule-help'},[el('summary',{text:'הכלל בכתיבה פורמלית'})]),explanation=el('p');reminder.append(explanation);reminder.hidden=true;
  const sourceList=el('div',{class:'kp-source-list'}),noSources=el('p',{class:'kp-no-sources'});
  const addSource=button('הוספת שורת מקור',()=>{sourceFields(row,[...row.sources.map(n=>n.value),'']);clearResults(rows.indexOf(row));row.sources.at(-1).focus();});
  const changedRow=()=>clearResults(rows.indexOf(row));
  const replace=replacementEditor(changedRow),msg=message(),node=el('fieldset',{class:'kp-step proof-step'},[title,el('label',{class:'proof-field'},[el('span',{text:'נימוק'}),rule]),sourceList,addSource,noSources,reminder,replace.box,el('label',{class:'proof-field'},[el('span',{text:'מה מתקבל?'}),input]),keyboard(input,changedRow),msg,replace.resultTools]);
  replace.bindResult(input,changedRow,()=>{validate(rows.indexOf(row));return {ok:node.classList.contains("step-accepted"),message:status.textContent};});
  const row={title,input,sources:[],sourcePreviews:[],sourceList,noSources,addSource,rule,replace,msg,node};
  row.hint=deductionHint(()=>{
   if(rule.value==='assume')return {message:'הנחה זמנית בוחרים לפי דרך ההוכחה. היא אינה מסקנה שנקבעת ממקורות קודמים.'};
   if(rule.value==='table')return {message:'טבלת אמת מאפשרת לבדוק מסקנה שתציעו. אין כאן רשימה סופית של כל הנוסחאות שאפשר להסיק; כתבו מסקנה ובדקו אותה.'};
   const references=refs(row);
   if(!references.length||references.some(n=>!source(n))||new Set(references).size!==references.length)return {message:'בחרו תחילה את המקורות הדרושים לכלל.'};
   const prefix=rows.slice(0,rows.indexOf(row)).map(r=>({formula:r.input.value,rule:r.rule.value,refs:refs(r),replacements:r.replace.get()}));
   const options=deductionCandidates(rule.value,references.map(source)).filter(formula=>checkDeduction(premises,[...prefix,{formula,rule:rule.value,refs:references}],allowed,target).ok);
   return {options,message:'אין מסקנה ישירה לפי הכלל והמקורות שבחרתם. בדקו גם שהמקורות זמינים ושהצעדים הקודמים מוצדקים.'};
  },value=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();});
  input.closest('label').before(row.hint.box);
  sourceFields(row);
  rule.addEventListener('change',()=>{const r=DEDUCTION_RULES.find(r=>r.id===rule.value);reminder.hidden=!r;reminder.querySelector('summary').textContent=r?.id==='eq:replacements'?'איך מבצעים את ההחלפות?':'הכלל בכתיבה פורמלית';explanation.replaceChildren(...(r?[formalRuleReminder(r)]:[]));const section=exercise&&r?.id==='assume'?(exercise.method==='cases'?'sec-proof-cases':'sec-proof-contradiction'):r&&ruleSections[r.id];if(section)explanation.append(' ',el('a',{href:'#'+section,text:'להסבר הכלל במערך ההרצאה'}));sourceFields(row);replace.activate(rule.value==='eq:replacements');changedRow();});
  input.addEventListener('input',()=>{input.value=input.value.toUpperCase();changedRow();});
  node.append(el('div',{class:'bk-bar'},[button('בדיקת השורה',()=>validate(rows.indexOf(row))),button('מחיקת השורה',()=>{const removed=premises.length+rows.indexOf(row)+1;rows.splice(rows.indexOf(row),1);node.remove();rows.forEach(r=>r.sources.forEach(input=>{const n=Number(sourceValue(input));if(n===removed)input.dataset.pendingValue='';else if(n>removed)input.dataset.pendingValue=String(n-1);}));if(!rows.length)addRow();clearResults();})]));row.compact=compactProofStep(node,()=>clearResults(rows.indexOf(row)));rows.push(row);list.append(node);clearResults(rows.length-1);return row;
 }
 function validate(last=rows.length-1,declareComplete=false){
  if(!approved)return;
  let use=rows.slice(0,last+1);while(use.length&&!use.at(-1).input.value.trim()&&!use.at(-1).rule.value&&!use.at(-1).sources.some(n=>n.value.trim()))use.pop();
  const result=checkDeduction(premises,use.map(r=>({formula:r.input.value,rule:r.rule.value,refs:refs(r),replacements:r.replace.get()})),allowed,target);
  rows.forEach(r=>{r.compact.invalidate();say(r.msg,'');r.node.removeAttribute('aria-invalid');});result.results.forEach((r,i)=>{say(rows[i].msg,r.message,r.ok);rows[i].replace.showResult(r);rows[i].node.setAttribute('aria-invalid',String(!r.ok));if(r.evidence&&!r.ok)rows[i].msg.append(evidenceTable(r.evidence,refs(rows[i]),rows[i].input.value));});
  result.results.forEach((r,i)=>{if(r.ok){
   const row=rows[i],ruleName=DEDUCTION_RULES.find(rule=>rule.id===row.rule.value)?.name;
   const reason=['mp','mt','hs','and-in','and-out','iff-use'].includes(row.rule.value)
    ?inferenceView(ruleName,refs(row).map(n=>({label:sourceLabel(n),formula:source(n)})),row.input.value)
    :(row.rule.value==='eq:replacements'?stepRuleNames({replacements:row.replace.get()}):ruleName+(row.fixed?' — תחילת ההוכחה':''))+(refs(row).length?' — '+refs(row).map(n=>sourceCitation(sourceLabel(n),source(n))).join('; '):'');
   row.compact.accept(proofFormula(row.input.value),reason,words(row.input.value,level)+(result.lines[premises.length+i]?.scope.length?' (תחת '+result.lines[premises.length+i].scope.map(sourceLabel).join(', ')+')':''),row.rule.value==='eq:replacements'?stepReason({rule:row.rule.value,replacements:row.replace.get()}):'');
   if(r.evidence)row.node.querySelector('.step-compact').append(evidenceTable(r.evidence,refs(row),row.input.value));
  }});
  const practiced=!exercise||result.lines.some(l=>l.rule===exercise.method&&l.scope.length===0);
  if(declareComplete&&result.ok&&result.complete&&practiced)rows[use.length-1]?.compact.finish();
  if(result.ok&&!result.complete&&use.length){if(rows.length===use.length)addRow();rows[use.length]?.compact.focus();}
  undo.disabled=!rows.some(r=>!r.fixed&&r.node.classList.contains('step-accepted'));
  say(status,declareComplete&&result.complete?(exercise?(!practiced?'הגעתם למסקנה בהוכחה תקינה, אך בתרגיל הזה נדרשת הוכחה '+(exercise.method==='raa'?'בדרך השלילה.':'לפי מקרים.'):'ההוכחה הושלמה. המסקנה המבוקשת נובעת מן הנתונים. יש לכתוב כך גם את ההוכחה על דף.'):'ההוכחה הושלמה. המסקנה מתארת בדיוק את כל האפשרויות בחידה.'):!result.ok?'תקנו את השורה המסומנת.':result.open.length?'הצעדים תקינים. עדיין יש הנחה זמנית פתוחה.':declareComplete?(exercise?'הצעדים מוצדקים, אך עדיין לא הגעתם למסקנה המבוקשת.':'הצעדים מוצדקים, אך עדיין לא קבעתם את כל האפשרויות בחידה. המשיכו בהוכחה.'):use.length?'הצעדים מוצדקים. המשיכו, או לחצו על ״סיימתי את ההוכחה — בדקו״.':'כתבו שורה כדי להתחיל.',declareComplete&&result.complete&&practiced?true:result.ok?undefined:false);
 }
 function evidenceTable(evidence,rs,conclusion){
  const details=el('details',{class:'kp-table-evidence'},[el('summary',{text:'הצגת טבלת הבדיקה'})]),table=el('table',{dir:'rtl'}),head=el('tr');
  [...allowed,...rs.map(sourceLabel),'המסקנה'].forEach(text=>head.append(el('th',{text})));table.append(el('thead',{},[head]));const body=el('tbody');
  evidence.rows.forEach(r=>{const tr=el('tr',{class:r.values.every(Boolean)?'kp-relevant':''});[...allowed.map(v=>r.env[v]),...r.values,r.conclusion].forEach(v=>tr.append(el('td',{text:v?'T':'F'})));body.append(tr);});table.append(body);
  details.append(el('p',{text:'בודקים את השורות המודגשות: בהן כל שורות המקור אמת. גם המסקנה צריכה להיות אמת בכל אחת מהן.'}),el('div',{class:'kw-table-scroll'},[table]));return details;
 }
 function proofDocument(lines,complete){
  const section=el('section',{class:'kp-document'},[el('strong',{text:complete?'ההוכחה המלאה':'ההוכחה עד כאן'})]);
  const conclusion=lines.filter(l=>l.scope.length===0&&l.rule!=='given').find(l=>compare(l.formula,target).equal);
  section.append(el('p',{text:exercise?'נוכיח: '+exercise.goal.text:conclusion?(target==='F'?'נראה שהנתונים מובילים לסתירה.':'נוכיח: '+words(conclusion.formula,level)):'המטרה: לקבוע אילו אפשרויות מתאימות לכל האמירות.'}));
  const table=el('table',{class:'kp-proof-table',dir:'rtl'}),body=el('tbody');table.append(el('thead',{},[el('tr',{},['מקור','טענה','נימוק'].map(text=>el('th',{text})))]),body);
  const modelLabel=n=>proofSourceLabel(n,premises.length,lines.find(l=>l.number===n)?.rule==='assume');
  lines.forEach(l=>{
   const reason=l.rule==='given'?(exercise?'נתון':'כלל האי'):l.rule==='eq:replacements'?stepReason(l):DEDUCTION_RULES.find(r=>r.id===l.rule)?.name;
   const text=reason+(l.refs.length?' — '+l.refs.map(n=>sourceCitation(modelLabel(n),lines.find(line=>line.number===n).formula)).join('; '):'');
   const claim=el('td',{},[formula(l.formula)]),verbal=el('details',{},[el('summary',{text:'במילים'}),el('p',{text:words(l.formula,level)})]);claim.append(verbal);
   if(l.scope.length)claim.append(el('small',{class:'kp-scope',text:'תחת '+l.scope.map(modelLabel).join(', ')}));
   const why=el('td');if(['mp','mt','hs','and-in','and-out','iff-use'].includes(l.rule))why.append(inferenceView(reason,l.refs.map(n=>({label:modelLabel(n),formula:lines.find(line=>line.number===n).formula})),l.formula));else why.textContent=text;
   body.append(el('tr',{class:l.rule==='assume'?'kp-assumption':l.scope.length?'kp-under-assumption':['raa','conditional','cases'].includes(l.rule)?'kp-discharge':''},[el('th',{scope:'row',text:l.number<=premises.length?modelLabel(l.number):`צעד ${l.number-premises.length}`}),claim,why]));
   if(l.evidence)body.append(el('tr',{class:'kp-evidence-row'},[el('td',{colspan:'3'},[evidenceTable(l.evidence,l.refs,l.formula)])]));
  });section.append(el('div',{class:'kw-table-scroll'},[table]));
  if(complete&&exercise)section.append(el('p',{class:'kp-conclusion',text:exercise.goal.text+' מש״ל.'}));
  if(complete&&!exercise){const solutions=K.solutions(level);section.append(el('p',{class:'kp-conclusion',text:solutions.length?'האפשרויות שמתאימות לכל האמירות: '+solutions.map(env=>K.rowWords(level,env)).join('; ')+'.':'קיבלנו סתירה מן הנתונים, ללא הנחה זמנית פתוחה. לכן אין פתרון לחידה.'}));if(solutions.length)section.append(el('p',{text:'בדיקה בחזרה בסיפור: בכל אחת מהאפשרויות האלה כל אביר אומר אמת וכל נוכל אומר שקר.'}));}
  return section;
 }
 function initializeRows(){
  const fixed=config.fixedSteps||[];
  if(!fixed.length){addRow();return;}
  for(const step of fixed){
   const row=addRow();row.fixed=true;row.input.value=step.formula;row.rule.value=step.rule;
   sourceFields(row,step.refs.map(String));
  }
  validate(fixed.length-1);
  rows.slice(0,fixed.length).forEach(row=>row.compact.lock());
 }
 if(exercise){premises=[...config.premises];approved=true;renderGiven();initializeRows();}

}
