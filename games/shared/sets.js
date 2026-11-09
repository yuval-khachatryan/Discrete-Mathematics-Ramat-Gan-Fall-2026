import {answerPanel,answerReveal} from './answer-panel.js';
import {robotSpeech} from './robot-speech.js';
import { SET_TASKS } from './sets-data.js';

// Finite sets and ordered pairs are different objects. No JavaScript evaluation.
export function parseObject(source) {
  const s=source.replace(/[\u2066-\u2069]/g,'').replaceAll('−','-').trim();
  if(s.length>1500)throw Error('התשובה ארוכה מדי לתרגיל הזה.');
  let i=0,count=0;
  const ws=()=>{while(/\s/.test(s[i]||'')&&i<s.length)i++;};
  function read(depth=0){
    ws();if(depth>8||++count>150)throw Error('כתבו קבוצה קטנה כפי שנדרש בתרגיל.');
    if(s[i]==='∅'){i++;return {type:'set',items:[]};}
    const open=s[i];
    if(open==='{'||open==='('){
      i++;const close=open==='{'?'}':')',items=[];ws();
      if(s[i]!==close){for(;;){items.push(read(depth+1));ws();if(s[i]===close)break;if(s[i++]!==',')throw Error('הפרידו בין איברים בפסיק וסגרו את הסוגריים.');}}
      i++;if(open==='('&&items.length!==2)throw Error('בזוג סדור כותבים בדיוק שני רכיבים, בסוגריים עגולים.');
      return {type:open==='{'?'set':'pair',items};
    }
    const match=s.slice(i).match(/^(?:-?\d+(?:\.\d+)?|[A-Za-zא-ת]+)/);
    if(!match)throw Error('כתבו איברים בתוך { }, זוגות בתוך ( ), או ∅ לקבוצה הריקה.');
    i+=match[0].length;const raw=match[0];return {type:'atom',value:/^-?\d/.test(raw)?String(Number(raw)):raw};
  }
  const result=read();ws();if(i!==s.length)throw Error('נשאר סימן שלא הצלחתי לקרוא. בדקו פסיקים וסוגריים.');return result;
}
export function key(n){
  if(n.type==='atom')return 'a:'+n.value;
  const xs=n.items.map(key);return n.type==='pair'?'p:'+JSON.stringify(xs):'s:'+JSON.stringify([...new Set(xs)].sort());
}
export function display(n){
  if(n.type==='atom')return n.value;
  const items=n.type==='set'?[...new Map(n.items.map(x=>[key(x),x])).values()]:n.items;
  if(n.type==='set'&&!items.length)return '∅';
  return (n.type==='set'?'{':'(')+items.map(display).join(', ')+(n.type==='set'?'}':')');
}
export function checkSetAnswer(input,expected){
  if(!input.trim())return {ok:false,message:'כתבו את הקבוצה לפני הבדיקה. לקבוצה ריקה אפשר לכתוב ∅ או {}.'};
  let a;try{a=parseObject(input);}catch(e){return {ok:false,message:e.message};}
  if(a.type!=='set')return {ok:false,message:'התשובה היא קבוצה. הקיפו את איבריה בסוגריים מסולסלים { }. מספר או זוג לבדם אינם אותה קבוצה.'};
  const b=parseObject(expected),ak=new Set(a.items.map(key)),bk=new Set(b.items.map(key));
  const extra=a.items.find(x=>!bk.has(key(x))),missing=b.items.find(x=>!ak.has(key(x)));
  if(extra)return {ok:false,message:`האיבר ⁦${display(extra)}⁩ אינו שייך לקבוצת התשובה. בדקו את התנאי עבורו.`};
  if(missing)return {ok:false,message:'האיברים שכתבתם מתאימים, אבל חסר לפחות איבר אחד. בדקו שוב את כל האפשרויות.'};
  return {ok:true,message:'נכון! אלה בדיוק איברי הקבוצה. הסדר שבו כתבתם אותם אינו משנה.'};
}
export function checkCardinalityAnswer(number,roster,expected){
  const size=new Set(parseObject(expected).items.map(key)).size;
  const text=number.trim(),valid=/^\d+$/.test(text),ok=valid&&Number(text)===size;
  const count={ok,message:!text?'כתבו את מספר האיברים.':!valid?'כתבו מספר שלם שאינו שלילי.':ok?'נכון! זהו מספר האיברים השונים בקבוצה.':'המספר אינו מתאים. ספרו כל איבר שונה פעם אחת; קבוצה פנימית היא איבר אחד.'};
  const elements=checkSetAnswer(roster,expected);
  return {ok:count.ok&&elements.ok,count,elements};
}
export function subsets(atoms){
  return Array.from({length:2**atoms.length},(_,mask)=>({type:'set',items:atoms.filter((_,j)=>mask&(1<<j)).map(parseObject)}));
}
export function readable(text){
  if(!/[א-ת]/.test(text)||text.includes('\u2066'))return text;
  return text.replace(/[A-Za-z0-9∅{}()[\]∈∉⊆⊇∩∪ᶜ△×¬⇒⇔∖≥≤][A-Za-z0-9_∅{}()[\],. :\-−=<>∈∉⊆⊇∩∪ᶜ△×¬⇒⇔∖≥≤]*/g,chunk=>{
    const core=chunk.trimEnd();return '\u2066'+core+'\u2069'+chunk.slice(core.length);
  });
}
const el=(tag,attrs={},kids=[])=>{const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==='text')n.textContent=readable(v);else if(k==='class')n.className=v;else n.setAttribute(k,v);}for(const k of kids)n.append(k);return n;};
const button=(text,fn)=>{const n=el('button',{type:'button',class:'bk-btn',text});n.addEventListener('click',fn);return n;};
const math=t=>el('span',{class:'sets-math',dir:/[א-ת]/.test(t)?'rtl':'ltr',text:t});
const msg=()=>el('p',{class:'bk-msg','aria-live':'polite'});
function say(n,text,ok){n.textContent=readable(text);n.className='bk-msg '+(ok===true?'bk-good':ok===false?'bk-bad':'');}
function mixedText(text){
  const match=text.match(/^([A-Z][^.]*?)\. (.+)$/);
  if(match){return el('div',{class:'sets-prompt'},[el('div',{class:'sets-given',dir:'ltr',text:match[1]}),el('p',{text:match[2]})]);}
  return el('p',{class:'sets-prompt',text});
}
const rotate=(xs,n)=>xs.slice(n%xs.length).concat(xs.slice(0,n%xs.length));
function selectOptions(options,seed=0){const s=el('select',{'aria-label':'בחרו תשובה',dir:options.every(t=>!/[א-ת]/.test(t))?'ltr':'rtl'},[el('option',{value:'',text:'בחרו…'})]);for(const {text,i}of rotate(options.map((text,i)=>({text,i})),seed))s.append(el('option',{value:String(i),text}));return s;}

export function initSets(box){
  if(box.dataset.ready)return;const data=SET_TASKS[box.dataset.sets];if(!data)return;
  box.dataset.ready='true';box.classList.add('sets-ready');box.replaceChildren();
  if(data.robot)box.append(robotSpeech(data.robot.text,data.robot.formula));
  if(data.type==='choice')return choices(box,data);
  if(data.type==='cardinality')return cardinality(box,data);
  if(data.type==='write')return writes(box,data);
  if(data.type==='select')return selection(box,data);
  if(data.type==='venn')return venn(box,data);
  if(data.type==='power')return power(box,data);
}
function choices(box,data,offset=0){
  data.items.forEach((q,i)=>{
    const numeric=q.input==='number',binary=q.input==='buttons'||(q.options.length===2&&q.options.includes('כן')&&q.options.includes('לא'));
    const s=numeric?el('input',{type:'text',inputmode:'numeric',dir:'ltr',class:'bk-input sets-count-input',maxlength:'10',autocomplete:'off',placeholder:'מספר'}):binary?el('div',{class:'sets-binary',role:'group'}):selectOptions(q.options,i+offset+box.dataset.sets.length),feedback=msg();
    s.setAttribute('aria-label',q.prompt);
    if(binary){
      s.value='';q.options.forEach((text,j)=>{const b=button(text,()=>{s.value=String(j);[...s.children].forEach((n,k)=>n.setAttribute('aria-pressed',String(j===k)));s.dispatchEvent(new Event('change'));});b.setAttribute('aria-pressed','false');if(!/[א-ת]/.test(text))b.dir='ltr';s.append(b);});
    }
    const row=el('fieldset',{class:'sets-item'},[el('legend',{class:'sets-item-number',text:`סעיף ${i+1+offset}`}),mixedText(q.prompt)]),form=el('form',{},[s]);
    const solution=answerReveal(readable(q.options[q.answer]+'. '+q.why));
    const check=()=>{
      const ok=numeric?(/^\d+$/.test(s.value.trim())&&Number(s.value)===Number(q.options[q.answer])):s.value!==''&&Number(s.value)===q.answer;
      s.setAttribute('aria-invalid',String(!ok));say(feedback,s.value.trim()===''?(numeric?'כתבו את מספר האיברים.':'בחרו תשובה.'):numeric&&!/^\d+$/.test(s.value.trim())?'כתבו מספר שלם שאינו שלילי.':(ok?'נכון. ':'כדאי לבדוק שוב. ')+q.why,ok);
    };
    s.addEventListener(numeric?'input':'change',()=>{say(feedback,'');s.removeAttribute('aria-invalid');});
    form.append(button('בדיקה',check),button('איפוס',()=>{form.reset();if(binary){s.value='';[...s.children].forEach(n=>n.setAttribute('aria-pressed','false'));}s.removeAttribute('aria-invalid');say(feedback,'');solution.open=false;}),feedback,solution);
    form.addEventListener('submit',e=>{e.preventDefault();check();});row.append(answerPanel(form));box.append(row);
  });
}
function cardinality(box,data){
  data.items.forEach((q,i)=>{
    const count=el('input',{type:'text',inputmode:'numeric',dir:'ltr',class:'bk-input sets-count-input',maxlength:'10',autocomplete:'off','aria-label':`סעיף ${i+1}: מספר האיברים`,placeholder:'מספר'});
    const roster=el('input',{type:'text',dir:'ltr',class:'bk-input sets-roster-input',maxlength:'1500',autocomplete:'off',spellcheck:'false','aria-label':`סעיף ${i+1}: איברי הקבוצה`,placeholder:'{ ... }'});
    const countMsg=msg(),rosterMsg=msg(),summary=msg();
    const form=el('form',{class:'sets-item sets-count-item'},[
      el('strong',{class:'sets-item-number',text:`סעיף ${i+1}`}),el('div',{class:'sets-given',dir:'ltr',text:q.given}),
      el('label',{},[el('span',{text:'כמה איברים שונים יש בקבוצה?'}),count]),countMsg,
      el('label',{},[el('span',{text:'כתבו את איברי הקבוצה בתוך סוגריים מסולסלים.'}),roster]),rosterMsg,
    ]);
    const clear=()=>{[count,roster].forEach(n=>n.removeAttribute('aria-invalid'));[countMsg,rosterMsg,summary].forEach(n=>say(n,''));};
    const check=()=>{
      const result=checkCardinalityAnswer(count.value,roster.value,q.answer);
      for(const [input,feedback,r]of [[count,countMsg,result.count],[roster,rosterMsg,result.elements]]){input.setAttribute('aria-invalid',String(!r.ok));say(feedback,r.message,r.ok);}
      say(summary,result.ok?'נכון — גם מספר האיברים וגם רשימת האיברים מתאימים.':'תקנו את השדות המסומנים ונסו שוב.',result.ok);
    };
    [count,roster].forEach(n=>n.addEventListener('input',clear));form.addEventListener('submit',e=>{e.preventDefault();check();});
    form.append(el('button',{type:'submit',class:'bk-btn',text:'בדיקה'}),button('רמז',()=>say(summary,q.hint)),button('איפוס',()=>{count.value='';roster.value='';clear();}),summary,answerReveal(readable('מספר האיברים: '+new Set(parseObject(q.answer).items.map(key)).size+'. האיברים: '+q.answer)));
    const controls=[...form.children].slice(2);form.append(answerPanel(...controls));box.append(form);
  });
  if(data.comparison?.length)choices(box,{items:data.comparison,success:'התשובה להשוואת הקבוצות נכונה.'},data.items.length);
}
function writes(box,data){
  data.items.forEach((q,i)=>{
    const input=el('input',{type:'text',dir:'ltr',class:'bk-input',maxlength:'1500',autocomplete:'off',spellcheck:'false','aria-label':q.prompt,placeholder:'{ ... }'}),feedback=msg();
    const form=el('form',{class:'sets-item'},[el('label',{},[el('span',{class:'sets-item-number',text:`סעיף ${i+1}`}),mixedText(q.prompt),input])]);
    const check=()=>{const r=checkSetAnswer(input.value,q.answer);input.setAttribute('aria-invalid',String(!r.ok));say(feedback,r.message,r.ok);};
    form.addEventListener('submit',e=>{e.preventDefault();check();});input.addEventListener('input',()=>{say(feedback,'');input.removeAttribute('aria-invalid');});
    input.remove();
    form.append(answerPanel(input,button('בדיקה',check),button('רמז',()=>say(feedback,q.hint)),button('איפוס',()=>{input.value='';input.removeAttribute('aria-invalid');say(feedback,'');}),feedback,answerReveal(readable(q.answer))));box.append(form);
  });
}
function selection(box,data){
  box.append(math(data.given),mixedText(data.prompt));const selected=new Set(),cards=el('div',{class:'sets-cards'}),feedback=msg();
  const buttons=data.candidates.map(c=>{const b=button(c,()=>{selected.has(c)?selected.delete(c):selected.add(c);b.setAttribute('aria-pressed',String(selected.has(c)));say(feedback,'');});b.dir='ltr';b.setAttribute('aria-pressed','false');cards.append(b);return b;});
  box.append(answerPanel(cards,button('בדיקה',()=>{const extra=[...selected].find(x=>!data.answer.includes(x));const missing=data.answer.some(x=>!selected.has(x));say(feedback,extra?`⁦${extra}⁩ אינו מתאים לתנאי. ${data.hint}`:missing?'עדיין חסרה בחירה. '+data.hint:'נכון! נבחרו בדיוק כל האפשרויות המתאימות.',!extra&&!missing);}),button('רמז',()=>say(feedback,data.hint)),button('איפוס',()=>{selected.clear();buttons.forEach(b=>b.setAttribute('aria-pressed','false'));say(feedback,'');}),feedback,answerReveal(readable(data.answer.join(', ')))));
}
const REGIONS=['רק ב־A','גם ב־A וגם ב־B','רק ב־B','מחוץ לשתיהן, בתוך U'];
function venn(box,data){
  let stage=0,selected=new Set(),solved=false;
  const heading=el('p',{class:'sets-stage'}),formula=math(''),svgHost=el('div',{class:'sets-venn'}),cards=el('div',{class:'sets-cards'}),feedback=msg();
  // Four disjoint regions. The outer rectangle is behind the three inner paths.
  const lens='M190 62.76 A76 76 0 0 1 190 177.24 A76 76 0 0 1 190 62.76 Z';
  const circleA='M64 120 a76 76 0 1 0 152 0 a76 76 0 1 0 -152 0 Z';
  const circleB='M164 120 a76 76 0 1 0 152 0 a76 76 0 1 0 -152 0 Z';
  svgHost.innerHTML=`<svg viewBox="0 0 380 240" role="img" aria-label="עולם U ובו שתי קבוצות חופפות A ו־B"><rect data-region="3" x="4" y="4" width="372" height="232" rx="9"/><path data-region="0" fill-rule="evenodd" d="${circleA} ${lens}"/><path data-region="2" fill-rule="evenodd" d="${circleB} ${lens}"/><path data-region="1" d="${lens}"/><g class="sets-venn-label"><text x="25" y="30">U</text><text x="120" y="115">A</text><text x="260" y="115">B</text></g></svg>`;
  const paths=[0,1,2,3].map(i=>svgHost.querySelector(`[data-region="${i}"]`));
  const buttons=REGIONS.map((name,i)=>{const b=button(name,()=>toggle(i));b.setAttribute('aria-pressed','false');cards.append(b);paths[i].addEventListener('click',()=>toggle(i));return b;});
  function toggle(i){selected.has(i)?selected.delete(i):selected.add(i);solved=false;next.disabled=true;say(feedback,'');draw();}
  function draw(){heading.textContent=`שלב ${stage+1} מתוך ${data.tasks.length}`;formula.textContent=data.tasks[stage].formula;paths.forEach((p,i)=>p.classList.toggle('selected',selected.has(i)));buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(selected.has(i))));next.hidden=stage===data.tasks.length-1;}
  const next=button('לשלב הבא',()=>{if(!solved)return;stage++;selected.clear();solved=false;next.disabled=true;say(feedback,'');draw();});next.disabled=true;
  box.append(heading,mixedText('בחרו בתרשים או בכפתורים את כל האזורים ששייכים לקבוצה הבאה, ואז לחצו ״בדיקה״. מלבן U הוא העולם כולו.'),formula,svgHost,cards,button('בדיקה',()=>{const q=data.tasks[stage];solved=selected.size===q.regions.length&&q.regions.every(i=>selected.has(i));next.disabled=!solved;say(feedback,(solved?(stage===data.tasks.length-1?'סיימתם את כל האתגרים. ':'נכון! '):'האזורים שבחרתם עדיין אינם מתאימים. ')+q.why,solved);}),next,button('איפוס',()=>{stage=0;selected.clear();solved=false;next.disabled=true;say(feedback,'');draw();}),feedback);draw();
}
function power(box,data){
  const expected=subsets(data.atoms),saved=new Map(),chosen=new Set(),feedback=msg(),progress=el('p'),list=el('div',{class:'sets-saved'}),cards=el('div',{class:'sets-cards'});
  const buttons=data.atoms.map(a=>{const b=button(a,()=>{chosen.has(a)?chosen.delete(a):chosen.add(a);b.setAttribute('aria-pressed',String(chosen.has(a)));say(feedback,'');});b.setAttribute('aria-pressed','false');cards.append(b);return b;});
  function update(){progress.textContent=`נמצאו ${saved.size} מתוך ${expected.length} תת־קבוצות.`;list.replaceChildren();for(const [k,n]of saved){const b=button(display(n)+' ×',()=>{saved.delete(k);say(feedback,'');update();});b.dir='ltr';b.setAttribute('aria-label','מחיקת '+display(n));list.append(b);}}
  box.append(math('A = {'+data.atoms.join(', ')+'}'),mixedText('בנו את כל תת־הקבוצות של A. בחרו איברים והוסיפו את הקבוצה שבניתם. כדי להוסיף את הקבוצה הריקה, השאירו את כל האיברים לא מסומנים. לחיצה על קבוצה שכבר הוספתם מוחקת אותה.'),cards,button('הוספת הקבוצה',()=>{const n={type:'set',items:[...chosen].map(parseObject)},k=key(n);if(saved.has(k))return say(feedback,'הקבוצה הזאת כבר ברשימה. שינוי הסדר אינו יוצר קבוצה חדשה.',false);saved.set(k,n);chosen.clear();buttons.forEach(b=>b.setAttribute('aria-pressed','false'));say(feedback,saved.size===expected.length?'מצאתם את כל תת־הקבוצות! הרשימה שיצרתם היא קבוצת החזקה.':'הקבוצה נוספה. איזו אפשרות עוד חסרה?',true);update();}),button('רמז',()=>{const missing=expected.filter(n=>!saved.has(key(n)));say(feedback,missing.length?`עדיין חסרה תת־קבוצה עם ${missing[0].items.length} איברים.`:'כבר מצאתם את כולן.');}),button('איפוס',()=>{saved.clear();chosen.clear();buttons.forEach(b=>b.setAttribute('aria-pressed','false'));say(feedback,'');update();}),progress,list,feedback);update();
}
