// Count one arbitrary element's contribution, not the cardinality of the whole region.
export function elementContributions(membership){
  const names=['A','B','C'],terms=[];
  for(let i=0;i<membership.length;i++)terms.push({indices:[i],sign:1});
  for(let i=0;i<membership.length;i++)for(let j=i+1;j<membership.length;j++)terms.push({indices:[i,j],sign:-1});
  if(membership.length===3)terms.push({indices:[0,1,2],sign:1});
  return terms.map(t=>({...t,name:t.indices.map(i=>names[i]).join(' ∩ '),count:Number(t.indices.every(i=>membership[i]))}));
}
const el=(tag,attrs={},children=[])=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='text')n.textContent=v;else n.setAttribute(k,v);}n.append(...children);return n;};
const math=text=>el('span',{class:'set-proof-formula',dir:'ltr',text});
const button=(text,fn)=>{const b=el('button',{type:'button',class:'bk-btn',text});b.addEventListener('click',fn);return b;};
export function initCountingLab(box,size){
 const stages=size===2?[
  {name:'רק ב־A',member:[true,false]},
  {name:'ב־A וגם ב־B',member:[true,true]},
  {name:'מחוץ לשתי הקבוצות',member:[false,false]},
 ]:[
  {name:'רק ב־A',member:[true,false,false]},
  {name:'ב־A וב־B, אך לא ב־C',member:[true,true,false]},
  {name:'בשלוש הקבוצות',member:[true,true,true]},
  {name:'מחוץ לשלוש הקבוצות',member:[false,false,false]},
 ];
 let active=0;const states=stages.map(()=>({values:[],total:'',solved:false}));
 const selector=el('select',{'aria-label':'מיקום האיבר'},stages.map((s,i)=>el('option',{value:i,text:s.name})));
 const host=el('div'),progress=el('p',{'aria-live':'polite'}),proof=el('div',{class:'set-counting-conclusion'});
 selector.addEventListener('change',()=>{active=Number(selector.value);render();});
 box.append(el('p',{text:'נעקוב אחר איבר אחד. כתבו 1 במקום שבו הוא נספר, ו־0 במקום שבו אינו נספר. הסימן שליד כל חלק קובע אם מוסיפים את הספירה הזאת או מחסירים אותה.'}),el('label',{},[el('span',{text:'היכן נמצא האיבר?'}),selector]),host,progress,proof);
 function updateProgress(){
  const count=states.filter(s=>s.solved).length;
  progress.textContent=`הושלמו ${count} מתוך ${stages.length} מקרים.`;
  proof.replaceChildren();
  if(count!==stages.length)return;
  proof.append(el('p',{text:size===2?'איבר בקבוצה אחת בלבד נספר פעם אחת. איבר בחיתוך נספר פעמיים ואז מחסירים אותו פעם אחת. איבר שמחוץ לאיחוד אינו נספר.':'איבר בקבוצה אחת נספר פעם אחת. איבר בשתי קבוצות נספר פעמיים ומוחסר פעם אחת. איבר בשלוש קבוצות נספר שלוש פעמים, מוחסר בשלושת החיתוכים הזוגיים ומתווסף פעם אחת בחיתוך המשולש.'}),
   el('p',{text:'החלפת שמות הקבוצות אינה משנה את החישוב. כך כיסינו את כל האפשרויות: כל איבר באיחוד נספר בדיוק פעם אחת, ואיבר שמחוץ לאיחוד אינו נספר. לכן סכום התרומות שווה לעצמת האיחוד. זהו הנימוק לנוסחה לכל קבוצות סופיות, ולא רק לדוגמה מספרית אחת.'}));
 }
 function render(){
  host.replaceChildren();const stage=stages[active],state=states[active],terms=elementContributions(stage.member),fields=[];
  host.append(el('p',{},[el('span',{text:'על האיבר שבודקים ידוע: '}),math(stage.member.map((inside,i)=>`x ${inside?'∈':'∉'} ${['A','B','C'][i]}`).join(',  '))]));
  const table=el('table',{class:'set-counting-table'}),body=el('tbody');
  table.append(el('thead',{},[el('tr',{},[el('th',{scope:'col',text:'חלק בנוסחה'}),el('th',{scope:'col',text:'האם האיבר נספר כאן? 0 או 1'})])]),body);
  const feedback=el('p',{'aria-live':'polite',class:'bk-msg'});
  terms.forEach((term,i)=>{
   const field=el('input',{type:'text',inputmode:'numeric',maxlength:'1',class:'bk-input',dir:'ltr','aria-label':`ספירת האיבר ב־${term.name}`,value:state.values[i]||''}),error=el('span',{class:'set-counting-error',hidden:''});
   field.addEventListener('input',()=>{state.values[i]=field.value;state.solved=false;next.hidden=true;field.removeAttribute('aria-invalid');error.hidden=true;feedback.textContent='';updateProgress();});
   fields.push({field,error});body.append(el('tr',{},[el('th',{scope:'row'},[math(`${term.sign===1?'+':'−'} |${term.name}|`)]),el('td',{},[field,error])]));
  });
  const total=el('input',{type:'text',inputmode:'numeric',maxlength:'2',class:'bk-input',dir:'ltr','aria-label':'מספר הספירות לאחר החיבור והחיסור',value:state.total});
  total.addEventListener('input',()=>{state.total=total.value;state.solved=false;next.hidden=true;total.removeAttribute('aria-invalid');feedback.textContent='';updateProgress();});
  const next=button('למקרה הבא',()=>{active=(active+1)%stages.length;selector.value=String(active);render();});next.hidden=!state.solved;
  const check=button('בדיקת הספירה',()=>{
   let valid=true;
   terms.forEach((term,i)=>{
    const {field,error}=fields[i],correct=/^[01]$/.test(field.value)&&Number(field.value)===term.count;
    field.setAttribute('aria-invalid',String(!correct));error.hidden=correct;
    if(!correct){valid=false;error.textContent=!/^[01]$/.test(field.value)?'כתבו 0 או 1.':term.count?'האיבר שייך לכל הקבוצות הרשומות כאן, ולכן נספר פעם אחת.':'האיבר אינו שייך לכל הקבוצות הרשומות כאן, ולכן אינו נספר בחלק הזה.';}
   });
   const expected=terms.reduce((sum,t)=>sum+t.sign*t.count,0),totalOK=/^[01]$/.test(total.value)&&Number(total.value)===expected;
   total.setAttribute('aria-invalid',String(!totalOK));
   state.solved=valid&&totalOK;next.hidden=!state.solved;
   feedback.replaceChildren();feedback.className='bk-msg '+(state.solved?'bk-good':'bk-bad');
   if(!valid)feedback.textContent='בדקו את המקומות המסומנים. בחיתוך, האיבר צריך להשתייך לכל הקבוצות הרשומות.';
   else if(!totalOK)feedback.textContent='הספירות בכל חלק נכונות. כעת חברו והחסירו אותן לפי הסימנים כדי לקבל את הספירה הכוללת.';
   else{
    const calculation=terms.map((t,i)=>(i===0?'':t.sign===1?' + ':' − ')+t.count).join('');
    feedback.append(math(calculation+' = '+expected),el('span',{text:expected===1?'האיבר נמצא באיחוד ונספר בדיוק פעם אחת.':'האיבר נמצא מחוץ לאיחוד ואינו נספר.'}));
   }
   updateProgress();
  });
  host.append(table,el('label',{},[el('span',{text:'כמה פעמים האיבר נספר בסך הכול, לאחר החיבור והחיסור?'}),total]),check,next,feedback);
  updateProgress();
 }
 render();
}
