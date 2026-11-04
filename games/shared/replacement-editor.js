import { keyboard } from './formula-keyboard.js';
import {RULES,RULE_CHOICES,ruleOptionLabel,replacementSuggestions,expressionParts,overlappingPaths,assembleReplacements,ruleExamples} from './proof-rules.js';
const el=(tag,attrs={},kids=[])=>{const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==='text')n.textContent=v;else if(k==='class')n.className=v;else n.setAttribute(k,v);}kids.forEach(c=>n.append(c));return n;};
const button=(text,fn)=>{const b=el('button',{type:'button',class:'bk-btn bk-quiet',text});b.addEventListener('click',fn);return b;};
const formula=text=>el('div',{class:'proof-formula',dir:'ltr',text});
export function replacementEditor(onChange){
 let source='',sourceText='',parts=[],entries=[],output=null,outputChanged=()=>{},acceptOutput=null;
 const snapshot=el('div',{class:'replacement-source',dir:'ltr','aria-label':'נוסחת המקור והחלקים שנבחרו'}),list=el('div',{class:'replacement-list'}),notice=el('p');
 const choiceBank=el('fieldset',{class:'replacement-choice-bank'});let choices=[];
 const choiceSummary=el('summary',{text:'בחירת חלקים לשינוי'}),choiceDetails=el('details',{class:'replacement-parts',open:''},[choiceSummary,choiceBank]);
 const recovery=el('div',{class:'replacement-recovery','aria-live':'polite'}),assemblyMsg=el('div',{class:'bk-msg','aria-live':'polite'});
 const assemble=button('הרכבת הנוסחה מן ההחלפות',()=>{
  const result=assembleReplacements(sourceText,get());showResult(result);
  if(result.kind!=='valid'){assemblyMsg.textContent=result.message;assemblyMsg.className='bk-msg bk-bad';return;}
  if(!output)return;
  try {
   output.value=result.formula;outputChanged();
   if(acceptOutput){
    const accepted=acceptOutput();
    if(!accepted.ok){assemblyMsg.textContent='הנוסחה הורכבה, אך הצעד עדיין לא צורף להוכחה. '+accepted.message;assemblyMsg.className='bk-msg bk-bad';}
   }
  }catch(error){
   assemblyMsg.textContent='תקלה בעת צירוף הצעד. ההחלפות והנוסחה נשמרו. פרטי התקלה: '+error.message;
   assemblyMsg.className='bk-msg bk-bad';
   const host=box.closest('.proof-ledger');
   if(host){const report=el('p',{class:'bk-msg bk-bad',role:'alert',text:assemblyMsg.textContent});host.after(report);}
  }
 });
 const resultTools=el('div',{class:'replacement-result-tools'},[assemble,assemblyMsg,recovery]);resultTools.hidden=true;
 const box=el('section',{class:'replacement-editor'},[el('strong',{text:'הנוסחה הנוכחית'}),snapshot,notice,choiceDetails,list]);box.hidden=true;
 function signature(e){return e.after.value+'|'+e.rule.value;}
 function paintValidation(e){
  const valid=e.validation?.signature===signature(e)?e.validation:null;
  e.feedback.textContent=valid?.message||'';e.feedback.className='bk-msg'+(valid?(valid.ok?' bk-good':' bk-bad'):'');
  e.check.hidden=!!valid?.ok;
  if(valid&&!valid.ok)e.row.setAttribute('aria-invalid','true');else e.row.removeAttribute('aria-invalid');
 }
 function mark(e,ok,message){e.validation={signature:signature(e),ok,message};paintValidation(e);}
 function validateEntry(e){
  const result=assembleReplacements(sourceText,[{path:e.path,before:e.before,after:e.after.value,rule:e.rule.value}]);
  mark(e,result.kind==='valid',result.kind==='valid'?'ההחלפה מוצדקת.':result.message);
 }
 function clear(){recovery.replaceChildren();assemblyMsg.textContent='';entries.forEach(paintValidation);}
 function changed(){clear();paint();onChange();}
 function removeEntry(entry){entries=entries.filter(e=>e!==entry);entry.row.remove();}
 function buildChoices(){
  choiceBank.replaceChildren(el('legend',{text:'בחרו את החלקים שמשנים'}));
  choices=parts.map((p,i)=>{
   const input=el('input',{type:'checkbox',value:p.path,'aria-label':`חלק ${i+1}: ${p.formula}`});
   input.addEventListener('change',()=>{
    if(input.checked)addEntry(p,i);else {const entry=entries.find(e=>e.path===p.path);if(entry)removeEntry(entry);}
    changed();
   });
   choiceBank.append(el('label',{class:'replacement-choice'},[input,el('span',{dir:'ltr',text:`${i+1}. ${p.formula}`})]));return {input,path:p.path};
  });
 }
 function paint(){
  choiceSummary.textContent='בחירת חלקים לשינוי'+(entries.length?` (${entries.length} נבחרו)`:'');
  snapshot.replaceChildren();if(!parts.length){notice.textContent='בחרו או כתבו שורת מקור תקינה כדי לבחור מתוכה חלקים.';return;}
  notice.textContent='';
  const selected=entries.map(e=>e.path);
  function draw(n,path){
   const span=el('span',{class:selected.includes(path)?'replacement-highlight':''});
   if(n.type==='var')span.textContent=n.name;
   else if(n.type==='const')span.textContent=n.value?'T':'F';
   else if(n.arg)span.append('¬',draw(n.arg,path+'.0'));
   else {const kids=n.args||[n.left,n.right],symbol={and:'∧',or:'∨',xor:'⊕',imp:'→',iff:'↔'}[n.type];if(path!=='r')span.append('(');span.append(draw(kids[0],path+'.0'),' '+symbol+' ',draw(kids[1],path+'.1'));if(path!=='r')span.append(')');}
   return span;
  }snapshot.append(draw(parts[0].node,'r'));
  choices.forEach(({input,path})=>{input.checked=selected.includes(path);input.disabled=!input.checked&&selected.some(p=>overlappingPaths(p,path));});
 }
 function addEntry(part,index){
  const after=el('input',{class:'bk-input replacement-after',type:'text',dir:'ltr',maxlength:'240',placeholder:'הביטוי החלופי','aria-label':`הביטוי החלופי לחלק ${index+1}`});
  const rule=el('select',{class:'replacement-rule','aria-label':`החוק לחלק ${index+1}`},[el('option',{value:'',text:'בחרו חוק…'})]);
  for(const family of RULES){
   const choices=RULE_CHOICES.filter(r=>r.family===family.id),options=choices.map(r=>el('option',{value:r.id,text:ruleOptionLabel(r)}));
   rule.append(...(choices.length>1?[el('optgroup',{label:family.name},options)]:options));
  }
  const suggestions=el('details',{class:'replacement-suggestions'},[el('summary',{text:'עזרה: הצגת החלפות אפשריות'})]),suggestionList=el('div');suggestions.append(suggestionList);suggestions.hidden=true;
  suggestions.addEventListener('toggle',()=>{if(!suggestions.open)return;
   const options=replacementSuggestions(part.formula,rule.value);
   suggestionList.replaceChildren(...options.map(value=>button(value,()=>{after.value=value;changed();validateEntry(entry);after.focus();})));
   if(!options.length)suggestionList.append(el('p',{text:['T','F'].includes(part.formula)?'הפעלה בכיוון ההפוך דורשת לבחור פסוק שייכנס לביטוי. כתבו את ההחלפה בעצמכם.':'החוק שבחרתם אינו נותן החלפה ישירה לחלק הזה. בדקו אם צריך לבחור חלק אחר או חוק אחר.'}));
  });
  const reference=el('details',{class:'replacement-rule-reference'},[el('summary',{text:'תזכורת לחוק'})]);reference.hidden=true;
  const feedback=el('p',{class:'bk-msg','aria-live':'polite'}),entry={path:part.path,before:part.formula,after,rule,feedback};
  entry.check=button('בדיקת ההחלפה',()=>validateEntry(entry));entry.check.classList.add('replacement-check');
  const row=el('fieldset',{class:'replacement-item','data-path':part.path},[el('legend',{},[el('bdi',{dir:'ltr',text:part.formula})]),
   el('label',{},[el('span',{text:'מפעילים את החוק'}),rule]),reference,
   el('label',{},[el('span',{text:'החלק לאחר ההחלפה'}),after]),keyboard(after,changed),suggestions,
   entry.check,feedback,button('ביטול הבחירה בחלק הזה',()=>{removeEntry(entry);changed();}),
  ]);
  rule.addEventListener('change',()=>{reference.hidden=!rule.value;reference.replaceChildren(el('summary',{text:'תזכורת לחוק'}),...ruleExamples(rule.value).map(formula));suggestions.open=false;suggestions.hidden=!rule.value;suggestionList.replaceChildren();changed();});
  after.addEventListener('input',()=>{const a=after.selectionStart,b=after.selectionEnd;after.value=after.value.toUpperCase();after.setSelectionRange(a,b);changed();});
  entry.row=row;entries.push(entry);list.append(row);return entry;
 }
 function get(){return entries.map(e=>({path:e.path,before:e.before,after:e.after.value,rule:e.rule.value}));}
 function showResult(result){
  clear();
  if(result?.replacementIndex!==undefined){const e=entries[result.replacementIndex];if(e)mark(e,false,result.message);}
  if(result?.kind==='valid'||result?.expected)entries.forEach(e=>mark(e,true,'ההחלפה מוצדקת.'));
  if(result?.expected){
   const details=el('details',{class:'replacement-difference'},[el('summary',{text:'הצגת התוצאה וההבדל'})]);
   if(result.difference)details.append(el('p',{text:'בחלק שבו יש אי־התאמה:'}),el('strong',{text:'כתבתם:'}),formula(result.difference.actual),el('strong',{text:'לפי ההחלפות שבחרתם צריך להיות:'}),formula(result.difference.expected));
   details.append(el('strong',{text:'הנוסחה השלמה לאחר ההחלפות:'}),formula(result.expected));recovery.append(details);
  }
 }
 return {box,resultTools,
  activate(value){if(value&&box.hidden)choiceDetails.open=true;box.hidden=!value;resultTools.hidden=!value;},
  bindResult(input,changed,accept){output=input;outputChanged=changed;acceptOutput=accept;},
  setSource(text){let next=[];try{if(text.length<=240)next=expressionParts(text);}catch{}
   const fingerprint=next.length?JSON.stringify(next[0].node):'';sourceText=text;
   if(source===fingerprint)return;source=fingerprint;parts=next;if(parts.length)choiceDetails.open=true;entries=[];list.replaceChildren();clear();buildChoices();paint();
  },get,showResult,
 };
}
