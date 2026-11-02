import { keyboard } from "./formula-keyboard.js";
import {RULES,expressionParts,overlappingPaths} from './proof-rules.js';
const el=(tag,attrs={},kids=[])=>{const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==='text')n.textContent=v;else if(k==='class')n.className=v;else n.setAttribute(k,v);}kids.forEach(c=>n.append(c));return n;};
const button=(text,fn)=>{const b=el('button',{type:'button',class:'bk-btn bk-quiet',text});b.addEventListener('click',fn);return b;};
export function replacementEditor(onChange){
 let source='',parts=[],entries=[],active=false;
 const snapshot=el('div',{class:'replacement-source',dir:'ltr','aria-label':'נוסחת המקור והחלקים שנבחרו'}),list=el('div',{class:'replacement-list'}),notice=el('p');
 const choiceBank=el('fieldset',{class:'replacement-choice-bank'});let choices=[];
 function removeEntry(entry){entries=entries.filter(e=>e!==entry);entry.row.remove();[...list.children].forEach((n,i)=>n.querySelector('legend').textContent=`החלפה ${i+1}`);}
 function buildChoices(){
  choiceBank.replaceChildren(el('legend',{text:'סמנו את החלקים שרוצים להחליף — אפשר לבחור כמה'}));
  choices=parts.map((p,i)=>{
   const input=el('input',{type:'checkbox',value:p.path,'aria-label':`חלק ${i+1}: ${p.formula}`});
   input.addEventListener('change',()=>{
    if(input.checked){const entry=entries.find(e=>!e.part.value)||addEntry();entry.part.value=p.path;}
    else {const entry=entries.find(e=>e.part.value===p.path);if(entry)removeEntry(entry);}
    paint();onChange();
   });
   choiceBank.append(el('label',{class:'replacement-choice'},[input,el('span',{dir:'ltr',text:`${i+1}. ${p.formula}`})]));return {input,path:p.path};
  });
 }
 const add=button('הוספת החלפה',()=>{addEntry();onChange();});
 const box=el('section',{class:'replacement-editor'},[
  el('p',{text:'סמנו ברשימה אחד או כמה חלקים מן הנוסחה שלפני הצעד. לכל חלק כתבו במה מחליפים אותו ובאיזה חוק משתמשים. אין לבחור חלקים שחופפים זה לזה; תוצאות ההחלפות זמינות רק בצעד הבא.'}),snapshot,notice,choiceBank,list,add,
 ]);box.hidden=true;add.disabled=true;
 function paint(){
  snapshot.replaceChildren();if(!parts.length){notice.textContent='בחרו או כתבו שורת מקור תקינה כדי לבחור מתוכה חלקים.';return;}
  notice.textContent='החלקים שנבחרו מודגשים בצבע. לבחירת כמה חלקים, אל תסמנו גם את הנוסחה כולה או ביטוי שמכיל אותם.';
  const selected=entries.map(e=>e.part.value).filter(Boolean);
  function draw(n,path){
   const span=el('span',{class:selected.includes(path)?'replacement-highlight':''});
   if(n.type==='var')span.textContent=n.name;
   else if(n.type==='const')span.textContent=n.value?'T':'F';
   else if(n.arg)span.append('¬',draw(n.arg,path+'.0'));
   else {const kids=n.args||[n.left,n.right],symbol={and:'∧',or:'∨',xor:'⊕',imp:'→',iff:'↔'}[n.type];span.append('(',draw(kids[0],path+'.0'),' '+symbol+' ',draw(kids[1],path+'.1'),')');}
   return span;
  }snapshot.append(draw(parts[0].node,'r'));
  choices.forEach(({input,path})=>{input.checked=selected.includes(path);input.disabled=!input.checked&&selected.some(p=>overlappingPaths(p,path));});
  entries.forEach(e=>{for(const option of e.part.options)option.disabled=!!option.value&&entries.some(other=>other!==e&&other.part.value&&overlappingPaths(other.part.value,option.value));});
 }
 function addEntry(){
  const part=el('select',{class:'replacement-part','aria-label':'החלק שמחליפים'},[el('option',{value:'',text:'בחרו חלק מהנוסחה…'}),...parts.map((p,i)=>el('option',{value:p.path,text:`${i+1}. ${p.formula}${p.path==='r'?' — כל הנוסחה':''}`}))]);
  const after=el('input',{class:'bk-input replacement-after',type:'text',dir:'ltr',maxlength:'240',placeholder:'הביטוי החלופי','aria-label':'הביטוי החלופי'});
  const rule=el('select',{class:'replacement-rule','aria-label':'החוק להחלפה'},[el('option',{value:'',text:'בחרו חוק…'}),...RULES.map(r=>el('option',{value:r.id,text:r.name}))]);
  const feedback=el('p',{class:'bk-msg','aria-live':'polite'}),entry={part,after,rule,feedback};
  const row=el('fieldset',{class:'replacement-item'},[el('legend',{text:`החלפה ${entries.length+1}`}),
   el('label',{},[el('span',{text:'החלק בנוסחת המקור'}),part]),el('label',{},[el('span',{text:'מחליפים ב־'}),after]),keyboard(after,()=>changed()),el('label',{},[el('span',{text:'לפי החוק'}),rule]),
   feedback,button('מחיקת ההחלפה',()=>{removeEntry(entry);paint();onChange();}),
  ]);
  const changed=()=>{feedback.textContent='';row.removeAttribute('aria-invalid');paint();onChange();};
  part.addEventListener('change',changed);rule.addEventListener('change',changed);after.addEventListener('input',()=>{const pos=after.selectionStart;after.value=after.value.toUpperCase();after.setSelectionRange(pos,pos);changed();});
  entry.row=row;entries.push(entry);list.append(row);paint();return entry;
 }
 return {box,
  activate(value){active=value;box.hidden=!value;if(value&&!entries.length&&parts.length)addEntry();},
  setSource(text){let next=[];try{if(text.length<=240)next=expressionParts(text);}catch{}
   const fingerprint=next.length?JSON.stringify(next[0].node):'';
   if(source===fingerprint)return;source=fingerprint;parts=next;entries=[];list.replaceChildren();add.disabled=!parts.length;buildChoices();
   if(active&&parts.length)addEntry();paint();
  },
  get(){return entries.map(e=>({path:e.part.value,before:parts.find(p=>p.path===e.part.value)?.formula||'',after:e.after.value,rule:e.rule.value}));},
  showResult(result){entries.forEach(e=>{e.row.removeAttribute('aria-invalid');e.feedback.textContent='';});
   if(result?.replacementIndex!==undefined){const e=entries[result.replacementIndex];if(e){e.row.setAttribute('aria-invalid','true');e.feedback.textContent=result.message;}}
  },
 };
}
