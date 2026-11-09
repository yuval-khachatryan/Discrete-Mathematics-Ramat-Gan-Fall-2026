import {contextualKeyboard} from './formula-keyboard.js';
import {initCountingLab} from './set-counting-lab.js';
import {parseObject,key,display} from './sets.js';
import {parseStatement} from './set-proof-syntax.js';
const el=(t,a={},children=[])=>{const n=document.createElement(t);for(const[k,v]of Object.entries(a)){if(k==='text')n.textContent=v;else n.setAttribute(k,v);}n.append(...children);return n;};
const btn=(text,fn)=>{const b=el('button',{type:'button',class:'bk-btn',text});b.addEventListener('click',fn);return b;};
const message=()=>el('p',{'aria-live':'polite',class:'bk-msg'});
const say=(n,text,ok=false)=>{n.textContent=text;n.className='bk-msg '+(ok?'bk-good':'bk-bad');};
const input=(name,placeholder='{ ... }')=>el('input',{type:'text',class:'bk-input',dir:'ltr','aria-label':name,placeholder,maxlength:'1500'});
const lab=(text,n)=>el('label',{},[el('span',{text}),n]);
const subset=(a,b)=>[...a].every(x=>b.has(x));
const union=(a,b)=>new Set([...a,...b]);
const intersect=(a,b)=>new Set([...a].filter(x=>b.has(x)));
const difference=(a,b)=>new Set([...a].filter(x=>!b.has(x)));
function readSet(s){const n=parseObject(s);if(n.type!=='set')throw Error('כתבו קבוצה בתוך סוגריים מסולסלים, או ∅.');return new Set(n.items.map(key));}
export function checkCounterexample(kind,values,witness){
  try{
    const A=readSet(values.A),B=readSet(values.B),C=readSet(values.C||'{}'),w=key(parseObject(witness));let left,right;
    if(kind==='union-equal'){left=union(A,B);right=intersect(A,B);}
    else if(kind==='inclusion-error'){
      if(!subset(A,C)||!subset(B,C))return {ok:false,message:'הדוגמה אינה מקיימת את הנתונים: גם A וגם B צריכות להיות מוכלות ב־C.'};
      left=A;right=B;if(!A.has(w)||B.has(w))return {ok:false,message:'כדי להפריך A ⊆ B צריך איבר של A שאינו ב־B.'};
    }else if(kind==='two-witnesses'){
      if(!A.size||!B.size)return {ok:false,message:'שתי הקבוצות צריכות להיות לא ריקות כדי לקיים את הנתונים.'};
      if(intersect(A,B).size)return {ok:false,message:'החיתוך עדיין אינו ריק. בנו שתי קבוצות לא ריקות שאין להן איבר משותף.'};
      return {ok:true,message:'נכון. לכל קבוצה קיים איבר, אבל אין איבר משותף. שני עדים אינם חייבים להיות אותו עצם.'};
    }else if(kind==='strict-union-diff'){left=difference(union(A,B),C);right=union(A,difference(B,C));}
    else if(kind==='difference-brackets'){left=difference(A,difference(B,C));right=difference(difference(A,B),C);}
    else throw Error('תרגיל לא מוכר.');
    if(left.has(w)===right.has(w))return {ok:false,message:'האיבר שנבחר אינו מבדיל בין שני הצדדים. בחרו איבר שנמצא בצד אחד בלבד.'};
    return {ok:true,message:`נכון. האיבר שכתבתם נמצא ${left.has(w)?'בצד שמאל בלבד':'בצד ימין בלבד'}, ולכן הוא מפריך את השוויון או ההכלה המבוקשים.`};
  }catch(e){return {ok:false,message:e.message};}
}
export function evaluateSet(n,env){
  if(n.type==='name'){if(!Object.hasOwn(env,n.name))throw Error('בתרגיל הזה משתמשים בקבוצות A ו־B.');return env[n.name];}
  if(n.type==='empty')return new Set();
  if(n.type==='complement')return difference(env.U,evaluateSet(n.args[0],env));
  const [a,b]=(n.args||[]).map(x=>evaluateSet(x,env));
  if(n.type==='union')return union(a,b);if(n.type==='intersection')return intersect(a,b);if(n.type==='difference')return difference(a,b);if(n.type==='symmetric')return union(difference(a,b),difference(b,a));
  throw Error('כתבו ביטוי של איחוד, חיתוך או הפרש בין A ל־B.');
}
export function initSetLab(box){
 if(box.dataset.ready)return;box.dataset.ready='true';box.classList.add('set-lab');box.replaceChildren();
 const kind=box.dataset.setLab;
 if(kind.startsWith('count-contributions-'))return initCountingLab(box,kind.endsWith('three')?3:2);
 if(kind==='quantifier-grid')return grid(box);
 if(kind==='mailing')return mailing(box);
 return counter(box,kind);
}
function grid(box){
 const people=['נועה','דן','מאיה'],songs=['שיר א','שיר ב','שיר ג'];let matrix=people.map(()=>songs.map(()=>false)),stage=0;
 const task=el('p'),table=el('table',{class:'set-lab-grid'}),feedback=message(),next=btn('אתגר נוסף',()=>{stage=1;next.hidden=true;update();feedback.textContent='';});next.hidden=true;
 const buttons=[];
 table.append(el('thead',{},[el('tr',{},[el('th',{text:'מי אוהב איזה שיר?'}),...songs.map(text=>el('th',{text}))])]));
 const body=el('tbody');people.forEach((name,i)=>{const row=el('tr',{},[el('th',{text:name,scope:'row'})]);songs.forEach((song,j)=>{const b=btn('לא',()=>{matrix[i][j]=!matrix[i][j];b.textContent=matrix[i][j]?'♥':'לא';b.setAttribute('aria-pressed',String(matrix[i][j]));feedback.textContent='';});b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',`${name} אוהב/ת את ${song}`);buttons.push(b);row.append(el('td',{},[b]));});body.append(row);});table.append(body);
 function update(){task.textContent=stage===0?'בנו מצב שבו לכל אדם קיים שיר אהוב, אבל אין שיר שכולם אוהבים. לחצו על התאים כדי לקבוע מי אוהב מה.':'כעת שנו את הלוח כך שלכל אדם יהיה שיר אהוב, וגם יהיה שיר אחד שכולם אוהבים.';}
 box.append(el('p',{text:'הרובוט של המסיבה בטוח: ״אם לכל אחד קיים שיר אהוב, בטח קיים שיר שכולם אוהבים!״ בדקו את הביטחון שלו.'}),task,el('p',{text:'S היא קבוצת שלושת האנשים; M היא קבוצת שלושת השירים; L(x,y) אומר ש־x אוהב את y.'}),el('p',{dir:'ltr',class:'set-proof-formula',text:'∀x ∈ S (∃y ∈ M (L(x,y)))     /     ∃y ∈ M (∀x ∈ S (L(x,y)))'}),table,
 btn('בדיקת הלוח',()=>{const bad=matrix.findIndex(row=>!row.some(Boolean)),common=songs.findIndex((_,j)=>matrix.every(row=>row[j]));
   if(bad>=0){say(feedback,`ל־${people[bad]} עדיין אין שיר אהוב. הטענה ״לכל אדם קיים שיר״ אינה מתקיימת.`);return;}
   if(stage===0&&common>=0){say(feedback,`${songs[common]} אהוב על כולם. צריך לבנות מצב שבו אין שיר משותף לכולם.`);return;}
   if(stage===1&&common<0){say(feedback,'לכל אדם קיים שיר, אבל עדיין אין שיר שאהוב על כולם. חפשו עמודה שמתאימה לכולם.');return;}
   say(feedback,stage===0?'הצלחתם להפריך את טענת הרובוט. הבחירה בשיר יכולה להיות תלויה באדם.':'נכון. שתי הטענות יכולות להיות נכונות יחד, אף שאינן אומרות אותו דבר.',true);next.hidden=stage!==0;
 }),next,btn('איפוס',()=>{stage=0;matrix=people.map(()=>songs.map(()=>false));buttons.forEach(b=>{b.textContent='לא';b.setAttribute('aria-pressed','false');});next.hidden=true;feedback.textContent='';update();}),feedback);update();
}
function mailing(box){
 const names=['נועה','דן','מאיה','אורי','רוני','גל'],A=new Set([0,1,2]),B=new Set([1,2,3]),env={A,B,U:new Set(names.map((_,i)=>i))};
 const tasks=[{text:'שלחו הודעה רק למי שנרשם גם לציור וגם למוזיקה.',answer:intersect(A,B)},{text:'שלחו הודעה לכל מי שנרשם לפחות לאחת משתי הסדנאות.',answer:union(A,B)},{text:'שלחו הודעה למי שנרשם לציור ולא למוזיקה.',answer:difference(A,B)}];let stage=0;
 const title=el('p'),field=input('ביטוי של קבוצת הנמענים','A ∩ B'),feedback=message(),next=btn('למשימה הבאה',()=>{stage++;field.value='';feedback.textContent='';update();});next.hidden=true;
 const roster=el('div',{class:'set-lab-roster'});names.forEach((name,i)=>roster.append(el('span',{class:'set-lab-person',text:`${name}: ${[A.has(i)?'ציור':'',B.has(i)?'מוזיקה':''].filter(Boolean).join(' וגם ')||'לא נרשם/ה'}`})));
 const keys=el('div');for(const symbol of ['A','B','∩','∪','∖','(',')'])keys.append(btn(symbol,()=>{field.setRangeText(symbol,field.selectionStart,field.selectionEnd,'end');field.focus();}));
 contextualKeyboard(field,keys,{shortcuts:false});
 function update(){title.textContent=tasks[stage].text;next.hidden=true;}
 box.append(el('p',{text:'A — נרשמו לציור; B — נרשמו למוזיקה. לרובוט יש רשימות, אבל הוא צריך מכם את הביטוי שקובע למי לשלוח הודעה.'}),roster,title,lab('כתבו את קבוצת הנמענים',field),keys,btn('בדיקת הרשימה',()=>{try{
  const n=parseStatement('x ∈ ('+field.value+')');const chosen=evaluateSet(n.args[1],env),correct=tasks[stage].answer,extra=[...chosen].find(x=>!correct.has(x)),missing=[...correct].find(x=>!chosen.has(x));
  if(extra!==undefined){say(feedback,`${names[extra]} נכלל/ת ברשימה, אבל אינו/ה עומד/ת בתנאי המבוקש. בדקו את שתי ההרשמות שלו/ה.`);return;}
  if(missing!==undefined){say(feedback,`${names[missing]} עומד/ת בתנאי, אבל נשמט/ה מהרשימה.`);return;}
  say(feedback,'נכון — אלה בדיוק הנמענים המתאימים. הרשימה משמשת בדיקה לדוגמה הזאת, ולא הוכחה לכל הקבוצות.',true);next.hidden=stage===tasks.length-1;
 }catch(e){say(feedback,e.message);}}),next,feedback);update();
}
function counter(box,kind){
 const descriptions={
 'union-equal':'בנו קבוצות A ו־B שמפריכות את הטענה A ∪ B = A ∩ B. כתבו גם איבר שמבדיל בין שני הצדדים.',
 'inclusion-error':'נתון A ⊆ C וגם B ⊆ C. הטענה היא ש־A ⊆ B. בנו דוגמה שמקיימת את שני הנתונים, וכתבו איבר של A שאינו ב־B.',
 'two-witnesses':'מישהו טוען: ״אם A ו־B אינן ריקות, אז קיים איבר משותף לשתיהן״. כתבו שתי קבוצות לא ריקות שמפריכות את הטענה.',
 'strict-union-diff':'ההכלה (A ∪ B) ∖ C ⊆ A ∪ (B ∖ C) נכונה. בנו דוגמה שבה אין שוויון, וכתבו איבר שמבדיל בין הצדדים.',
 'difference-brackets':'בנו דוגמה שמראה כי A ∖ (B ∖ C) אינה בהכרח שווה ל־(A ∖ B) ∖ C. כתבו גם איבר שמבדיל בין הצדדים.',
 };
 const feedback=message(),fields={},form=el('form');form.append(el('p',{text:descriptions[kind]}));
 for(const name of ['A','B',...(['inclusion-error','strict-union-diff','difference-brackets'].includes(kind)?['C']:[])]){fields[name]=input('קבוצה '+name);form.append(lab(name,fields[name]));}
 const witness=input('איבר שמפריך את הטענה','למשל 4');if(kind!=='two-witnesses')form.append(lab('איבר שמראה את הכישלון',witness));
 const check=()=>{const result=checkCounterexample(kind,Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value])),kind==='two-witnesses'?'0':witness.value);say(feedback,result.message,result.ok);};
 form.addEventListener('submit',e=>{e.preventDefault();check();});form.append(btn('בדיקת הדוגמה',check),feedback);box.append(form);
}
