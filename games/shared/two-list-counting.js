import {stageNavigation} from './stage-navigation.js';
const el=(tag,text='',attrs={})=>{const n=document.createElement(tag);n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
const button=(text,fn)=>{const n=el('button',text,{type:'button',class:'bk-btn'});n.onclick=fn;return n;};
export function initTwoListCounting(box){
 const A=['נועה','דן','מאיה'],B=['דן','מאיה','אורי'],names=[...new Set([...A,...B])],shared=A.filter(n=>B.includes(n));
 let active=0;const states=[{value:'',solved:false},{chosen:new Set(),solved:false},{value:'',solved:false}];
 const titles=['סופרים רשומות','מזהים כפילויות','סופרים אנשים'];
 const nav=stageNavigation(titles,i=>{active=i;render();});
 const content=el('div');box.append(nav.root,el('p','אותו אדם יכול להופיע בשתי רשימות. נבדוק איך סופרים כל אדם פעם אחת.'),content);
 function render(){
  const state=states[active];content.replaceChildren();nav.update(active,states.map(s=>s.solved));
  const title=el('h4',titles[active]),lists=el('div','',{class:'set-mail-lists'});
  for(const [name,description,people]of [['A','כדורסל',A],['B','שחייה',B]]){
   const section=el('section','',{class:'set-mail-list'});section.append(el('h4',`${name} — ${description}`));const list=el('ul');
   for(const person of people){const item=el('li');
    if(active===2&&name==='B'&&shared.includes(person)){
     item.append(el('del',person),el('span',' — כבר נספר/ה ברשימה A',{class:'count-copy-note'}));
    }else item.append(el('span',person));
    if(active===1&&state.chosen.has(person))item.classList.add('count-name-highlight');list.append(item);
   }
   section.append(list);lists.append(section);
  }
  content.append(title,lists);
  const feedback=el('p','',{class:'bk-msg','aria-live':'polite'}),solution=el('div','',{class:'set-counting-conclusion'});
  const next=button('לשלב הבא',()=>{active++;render();});next.hidden=!state.solved||active===2;
  function changed(){state.solved=false;feedback.textContent='';solution.replaceChildren();next.hidden=true;nav.update(active,states.map(s=>s.solved));}
  let field;
  if(active===1){
   content.append(el('p','אילו שמות מופיעים בשתי הרשימות? בחרו את כולם.'));
   const choices=el('div','',{class:'set-mail-choices',role:'group','aria-label':'שמות שמופיעים פעמיים'});
   for(const person of names){const b=button(person,()=>{state.chosen.has(person)?state.chosen.delete(person):state.chosen.add(person);changed();render();});b.setAttribute('aria-pressed',String(state.chosen.has(person)));choices.append(b);}content.append(choices);
  }else{
   if(active===2)content.append(el('p','מחקנו רק את ההופעה הנוספת של דן ושל מאיה. שניהם עדיין משתתפים — כל אחד נשאר ברשימה A.'));
   const prompt=active===0?'כמה רשומות יש בשתי הרשימות יחד, אם סופרים כל הופעה של שם?':'כמה אנשים שונים יש בסך הכול?';
   const label=el('label',prompt);field=el('input','',{type:'text',inputmode:'numeric',maxlength:'2',class:'bk-input',dir:'ltr','aria-label':prompt});field.value=state.value;field.oninput=()=>{state.value=field.value;field.removeAttribute('aria-invalid');changed();};label.append(field);content.append(label);
  }
  function explain(){
   solution.replaceChildren();
   if(active===0)solution.append(el('p','3 רשומות בכדורסל ועוד 3 בשחייה: 6 רשומות. אבל האם אלו 6 אנשים שונים?'));
   if(active===1)solution.append(el('p','דן ומאיה מופיעים פעמיים כל אחד. כדי לספור אנשים, צריך להחסיר הופעה אחת של כל אחד מהם.'));
   if(active===2){solution.append(el('p','3 + 3 − 2 = 4',{class:'set-proof-formula',dir:'ltr'}),el('p','נועה, דן, מאיה ואורי — ארבעה אנשים.'),el('p','מחברים את גדלי שתי הרשימות ומחסירים את מספר השמות המשותפים. כך כל איבר באיחוד נספר בדיוק פעם אחת: מי שברשימה אחת נספר פעם אחת; מי שבשתיהן נספר פעמיים ומוחסר פעם אחת.'));}
  }
  const check=button('בדיקת הספירה',()=>{
   state.solved=active===1?state.chosen.size===shared.length&&shared.every(n=>state.chosen.has(n)):/^\d+$/.test(state.value.trim())&&Number(state.value)===(active===0?A.length+B.length:names.length);
   if(field)field.setAttribute('aria-invalid',String(!state.solved));
   feedback.className='bk-msg '+(state.solved?'bk-good':'bk-bad');
   feedback.textContent=state.solved?'נכון!':active===0?'ספרו כל הופעה של שם, גם אם ראיתם אותו ברשימה השנייה.':active===1?'בדקו אילו שמות מופיעים גם ב־A וגם ב־B.':'ספרו את השמות שלא נמחקו. כל אדם צריך להיספר פעם אחת.';
   solution.replaceChildren();if(state.solved)explain();next.hidden=!state.solved||active===2;nav.update(active,states.map(s=>s.solved));
  });
  if(field)field.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();check.click();}};
  content.append(check,next,feedback,solution);if(state.solved)explain();
 }
 render();
}

export function initThreeListCounting(box){
 const lists=[['נועה','דן','מאיה'],['דן','מאיה','אורי'],['מאיה','אורי','גל']];
 const pairs=[[0,1],[0,2],[1,2]].map(([a,b])=>({name:`${'ABC'[a]} ∩ ${'ABC'[b]}`,names:lists[a].filter(n=>lists[b].includes(n))}));
 const triple=lists[0].filter(n=>lists[1].includes(n)&&lists[2].includes(n)),unique=[...new Set(lists.flat())];
 const sum=lists.flat().length,subtractions=pairs.reduce((n,p)=>n+p.names.length,0);
 const stages=[
  {title:'מחברים שלוש רשימות',question:'כמה רשומות יש בשלוש הרשימות יחד, כולל ההופעות החוזרות?',answer:sum,hint:'חברו את מספר השמות בכל אחת משלוש הרשימות.',explanation:'בכל רשימה 3 שמות. בסך הכול 9 רשומות, אבל יש אנשים שמופיעים ביותר מרשימה אחת.'},
  {title:'מחסירים את החיתוכים',question:'כמה הופעות מחסירים בסך הכול בשלושת החיתוכים הזוגיים?',answer:subtractions,hint:'ספרו כל שם בכל אחת מרשימות החיתוך, גם אם הוא מופיע ביותר מחיתוך אחד.',explanation:'בחיתוכים יש 2, 1 ו־2 שמות: מחסירים 5 הופעות. מאיה נמצאת בכל שלושת החיתוכים, ולכן מחסירים אותה שלוש פעמים.'},
  {title:'מחזירים את מי שנעלם',question:'כמה פעמים צריך להוסיף בחזרה את מאיה כדי שתיספר פעם אחת?',answer:1,hint:'מאיה נספרה שלוש פעמים, ואחר כך הוחסרה שלוש פעמים. כרגע היא נספרת אפס פעמים.',explanation:'מוסיפים את מאיה פעם אחת. היא שייכת לחיתוך של שלוש הקבוצות — זו הסיבה שמוסיפים בחזרה את החיתוך המשולש.'},
  {title:'סופרים אנשים שונים',question:'כמה אנשים שונים מופיעים לפחות באחת משלוש הרשימות?',answer:unique.length,hint:'חברו את גדלי הרשימות, החסירו את גדלי החיתוכים הזוגיים, והוסיפו את גודל החיתוך המשולש.',explanation:`${sum} − ${subtractions} + ${triple.length} = ${unique.length}`},
 ];
 let active=0;const states=stages.map(()=>({value:'',solved:false}));
 const nav=stageNavigation(stages.map(s=>s.title),i=>{active=i;render();}),host=el('div');
 box.append(nav.root,el('p','אותם אנשים יכולים להשתתף בכמה פעילויות. נעקוב אחרי שלוש רשימות ונראה מדוע חיסור הכפילויות לבדו אינו מספיק.'),host);
 function render(){
  const stage=stages[active],state=states[active];host.replaceChildren();nav.update(active,states.map(s=>s.solved));
  const roster=el('div','',{class:'set-mail-lists set-count-three-lists'});
  lists.forEach((people,i)=>{const section=el('section','',{class:'set-mail-list'}),ul=el('ul');section.append(el('h4',`${'ABC'[i]} — ${['כדורסל','שחייה','ריצה'][i]}`));for(const person of people)ul.append(el('li',person,active===2&&triple.includes(person)?{class:'count-name-highlight'}:{}));section.append(ul);roster.append(section);});
  host.append(el('h4',stage.title),roster);
  if(active===1){
   host.append(el('p','כעת מחסירים פעם אחת לכל שם בכל חיתוך זוגי:'));
   const overlaps=el('div','',{class:'set-mail-lists set-count-three-lists'});
   for(const pair of pairs){const section=el('section','',{class:'set-mail-list'}),ul=el('ul');section.append(el('h4',pair.name,{dir:'ltr'}));for(const person of pair.names)ul.append(el('li',person));section.append(ul);overlaps.append(section);}host.append(overlaps);
  }
  if(active===2)host.append(el('p','מאיה מופיעה בשלוש הרשימות וגם בכל שלושת החיתוכים הזוגיים. אחרי החיסור היא נעלמת מהספירה:'),el('p','3 − 3 = 0',{class:'set-proof-formula',dir:'ltr'}));
  if(active===3)host.append(el('p','החיתוך המשולש מכיל רק את מאיה. מוסיפים אותה בחזרה פעם אחת.'));
  const label=el('label',stage.question),field=el('input','',{type:'text',inputmode:'numeric',maxlength:'2',class:'bk-input',dir:'ltr','aria-label':stage.question});field.value=state.value;label.append(field);
  const feedback=el('p','',{class:'bk-msg','aria-live':'polite'}),conclusion=el('div','',{class:'set-counting-conclusion'}),next=button('לשלב הבא',()=>{active++;render();});next.hidden=!state.solved||active===stages.length-1;
  function explain(){
   conclusion.replaceChildren(el('p',stage.explanation,active===3?{class:'set-proof-formula',dir:'ltr'}:{}));
   if(active===3)conclusion.append(el('p',`האנשים הם: ${unique.join(', ')}.`),el('p','אדם שמופיע ברשימה אחת נספר פעם אחת. אדם שמופיע בשתיים נספר פעמיים ומוחסר פעם אחת. אדם שמופיע בשלוש נספר שלוש פעמים, מוחסר שלוש פעמים ומתווסף פעם אחת. כך כל איבר באיחוד נספר בדיוק פעם אחת.'));
  }
  field.oninput=()=>{state.value=field.value;state.solved=false;feedback.textContent='';conclusion.replaceChildren();field.removeAttribute('aria-invalid');next.hidden=true;nav.update(active,states.map(s=>s.solved));};
  const check=button('בדיקת הספירה',()=>{
   state.solved=/^\d+$/.test(state.value.trim())&&Number(state.value)===stage.answer;field.setAttribute('aria-invalid',String(!state.solved));feedback.className='bk-msg '+(state.solved?'bk-good':'bk-bad');feedback.textContent=state.solved?'נכון!':stage.hint;conclusion.replaceChildren();if(state.solved)explain();next.hidden=!state.solved||active===stages.length-1;nav.update(active,states.map(s=>s.solved));
  });
  field.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();check.click();}};
  host.append(label,check,next,feedback,conclusion);if(state.solved)explain();
 }
 render();
}
