import {stageSelectNavigation} from "./stage-navigation.js";
// Region bits encode membership in A, B, and C, respectively.
export const placementStages = [
 {sets:[[1,2,3],[2,3,5]], numbers:[1,2,3,4,5,6,7,8,9]},
 {sets:[[1,2,4,6],[2,3,6,8]], numbers:[1,2,3,4,5,6,7,8,9]},
 {sets:[[1,3,5,7],[2,3,6,7],[4,5,6,7]], numbers:[1,2,3,4,5,6,7,8,9]},
];
export const areaStages = [
 {size:2,formula:'A ∖ B',masks:[1]},
 {size:2,formula:'A △ B',masks:[1,2]},
 {size:2,formula:'(A ∪ B)ᶜ',masks:[0]},
 {size:3,formula:'A ∩ B',masks:[3,7]},
 {size:3,formula:'(A ∪ B) ∖ C',masks:[1,2,3]},
 {size:3,formula:'(A △ B) ∩ C',masks:[5,6]},
 {size:3,formula:'Aᶜ',masks:[0,2,4,6]},
];
export const membership=(sets,n)=>sets.reduce((m,s,i)=>m|(s.includes(n)?1<<i:0),0);
export const circles=size=>size===2?[[210,220,140],[350,220,140]]:[[195,145,130],[365,145,130],[280,285,130]];
export const regionAt=(size,x,y)=>circles(size).reduce((m,[cx,cy,r],i)=>m|((x-cx)**2+(y-cy)**2<r*r?1<<i:0),0);
// Coordinates are stored in the SVG's coordinate system, so resizing preserves placement.
export function dropPosition(size,x,y,tolerance=6){
 if(x<0||x>560||y<0||y>450)return null;
 const ambiguous=Math.min(x,560-x,y,450-y)<=tolerance||circles(size).some(([cx,cy,r])=>Math.abs(Math.hypot(x-cx,y-cy)-r)<=tolerance);
 return {x,y,region:ambiguous?null:regionAt(size,x,y)};
}
export const anchors=size=>size===2?[[65,385],[150,220],[410,220],[280,220]]:[[65,385],[155,120],[405,120],[280,80],[280,360],[185,265],[375,265],[280,205]];
const regionName=(size,m)=>m===0?'מחוץ לכל הקבוצות':['A','B','C'].slice(0,size).map((n,i)=>`${m&(1<<i)?'בתוך':'מחוץ ל־'} ${n}`).join(', ');
const el=(tag,attrs={},children=[])=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='text')n.textContent=v;else n.setAttribute(k,v);}n.append(...children);return n;};
const btn=(text,fn)=>{const b=el('button',{type:'button',class:'bk-btn',text});b.onclick=fn;return b;};
let serial=0;
export function initVennWorkshop(box){
 const mode=box.dataset.vennWorkshop,stages=mode==='numbers'?placementStages:areaStages,id=`venn-${++serial}`;
 let index=0,selected=null,placements=new Map(),marked=new Set();
 const completed=new Set();
 const states=stages.map(()=>({placements:new Map(),marked:new Set()}));
 const selector=el('select',{'aria-label':mode==='numbers'?'שלב מיקום המספרים':'שלב סימון האזורים'},stages.map((s,i)=>el('option',{value:i,text:`שלב ${i+1} — ${(s.size||s.sets.length)===2?'שתי קבוצות':'שלוש קבוצות'}`})));
 const host=el('div'),status=el('p',{'aria-live':'polite',class:'vw-progress'});
 box.replaceChildren(el('label',{},[el('span',{text:'בחרו שלב: '}),selector]),status,host);
 selector.onchange=()=>{index=+selector.value;render();};
 const nav=stageSelectNavigation(box,selector);
 function render(){
  ({placements,marked}=states[index]);selected=null;host.replaceChildren();nav.update(index,stages.map((_,i)=>completed.has(i)));
  const s=stages[index],size=s.size||s.sets.length,total=1<<size;
  status.textContent=`הושלמו ${completed.size} מתוך ${stages.length} שלבים.`;
  const prompt=el('div',{class:'vw-prompt',dir:'ltr'});
  if(mode==='numbers'){
   prompt.append(...s.sets.map((set,i)=>el('span',{text:`${'ABC'[i]} = {${set.join(', ')}}`})));
  }else prompt.append(el('strong',{text:s.formula}));
  const help=el('p',{text:mode==='numbers'?'גררו את המספרים 1–9 למקומות המתאימים בדיאגרמה. אפשר גם לבחור מספר בלחיצה ואז ללחוץ באזור או בכפתור האזור. מספרים שאינם באף קבוצה שייכים מחוץ לעיגולים, בתוך המלבן.':'סמנו את כל האזורים המתאימים לביטוי. לחיצה נוספת מבטלת סימון. אפשר לבחור גם בכפתורי האזורים שמתחת לציור.'});
  const arena=el('div',{class:'vw-arena',dir:'ltr'}),bank=el('div',{class:'vw-bank',dir:'ltr','aria-label':'מספרים למיקום'}),feedback=el('p',{class:'bk-msg','aria-live':'polite'});
  const cs=circles(size),circle=([x,y,r],fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
  // Intersect masks one circle at a time, so every one of the 2^n regions is exact.
  let defs='',regions='';
  for(let i=0;i<size;i++)for(let bit=0;bit<2;bit++)defs+=`<mask id="${id}-${i}-${bit}" maskUnits="userSpaceOnUse" x="0" y="0" width="560" height="450"><rect width="560" height="450" fill="${bit?'black':'white'}"/>${circle(cs[i],bit?'white':'black')}</mask>`;
  for(let m=0;m<total;m++){let shape=`<rect data-region="${m}" width="560" height="450" fill="#f5f8fb"/>`;for(let i=0;i<size;i++)shape=`<g mask="url(#${id}-${i}-${(m>>i)&1})">${shape}</g>`;regions+=shape;}
  arena.innerHTML=`<svg viewBox="0 0 560 450" role="img" aria-label="דיאגרמת ון עם ${size} קבוצות בתוך המלבן"><defs>${defs}</defs>${regions}<g fill="none" stroke="#516b85" stroke-width="2">${cs.map(c=>circle(c,'none')).join('')}<rect x="2" y="2" width="556" height="446" rx="8"/></g><g class="vw-label"><text x="${size===2?110:95}" y="${size===2?100:45}">A</text><text x="${size===2?440:450}" y="${size===2?100:45}">B</text>${size===3?'<text x="280" y="405">C</text>':''}</g></svg>`;
  const svg=arena.querySelector('svg'),controls=el('div',{class:'vw-regions'}),tokens=new Map();
  const next=btn('לשלב הבא',()=>{index++;selector.value=String(index);render();});next.hidden=true;
  function dirty(){completed.delete(index);nav.update(index,stages.map((_,i)=>completed.has(i)));status.textContent=`הושלמו ${completed.size} מתוך ${stages.length} שלבים.`;feedback.textContent='';next.hidden=true;for(const t of tokens.values())t.classList.remove('vw-wrong');}
  function refresh(){
   for(let m=0;m<total;m++){
    svg.querySelector(`[data-region="${m}"]`).setAttribute('fill',marked.has(m)?'#81c9c0':'#f5f8fb');
    controls.children[m].setAttribute('aria-pressed',String(marked.has(m)));
   }
   for(const[n,t]of tokens){t.classList.toggle('vw-selected',selected===n);t.setAttribute('aria-pressed',String(selected===n));
    if(!placements.has(n)){bank.append(t);t.style.left='';t.style.top='';t.classList.remove('vw-placed');continue;}
    const {region,x,y}=placements.get(n);
    arena.append(t);t.classList.add('vw-placed');t.classList.toggle('vw-ambiguous',region===null);t.style.left=`${x/560*100}%`;t.style.top=`${y/450*100}%`;
    t.setAttribute('aria-label',`${n}: ${region===null?'על גבול — יש להזיז לתוך אזור':regionName(size,region)}`);
   }
  }
  const boundaryDialog=el('dialog',{class:'vw-boundary-dialog',dir:'rtl','aria-label':'המספר על גבול בין אזורים'});
  const dismiss=btn('הבנתי — אזיז את המספר',()=>boundaryDialog.close());
  boundaryDialog.append(el('p',{text:'המספר נמצא על גבול, ולכן לא ברור לאיזה אזור הוא שייך. הזיזו אותו לתוך האזור שבחרתם, ולא על הקו.'}),dismiss);
  let boundaryNumber=null;
  boundaryDialog.addEventListener('close',()=>tokens.get(boundaryNumber)?.focus());
  function choose(m,position){
   dirty();
   if(mode==='areas'){marked.has(m)?marked.delete(m):marked.add(m);}
   else if(selected!==null){
    if(!position){
     const [x,y]=anchors(size)[m];
     // Keyboard region buttons need an initial position; never reposition existing tokens.
     const candidates=[[x,y],...[[-26,-34],[26,-34],[-26,0],[26,0],[-26,34],[26,34]].map(([dx,dy])=>[x+dx,y+dy])];
     const [px,py]=candidates.find(([cx,cy])=>regionAt(size,cx,cy)===m&&[...placements].every(([n,p])=>n===selected||Math.hypot(p.x-cx,p.y-cy)>32))||[x,y];
     position={x:px,y:py,region:m};
    }
    const n=selected;placements.set(n,position);selected=null;refresh();
    if(position.region===null){boundaryNumber=n;boundaryDialog.showModal();}
    return;
   }else feedback.textContent='בחרו תחילה מספר.';
   refresh();
  }
  function at(clientX,clientY){const r=svg.getBoundingClientRect();return dropPosition(size,(clientX-r.left)/r.width*560,(clientY-r.top)/r.height*450,6*560/r.width);}
  svg.onclick=e=>{const p=at(e.clientX,e.clientY);if(p){if(mode==='areas')choose(regionAt(size,p.x,p.y));else choose(p.region,p);}};
  for(let m=0;m<total;m++)controls.append(btn(regionName(size,m),()=>choose(m)));
  if(mode==='numbers')for(const n of s.numbers){
   const t=btn(String(n),()=>{selected=selected===n?null:n;refresh();});t.className='vw-token';t.dataset.number=n;tokens.set(n,t);
   t.onpointerdown=e=>{
    if(e.button!==0)return;const x=e.clientX,y=e.clientY,rect=t.getBoundingClientRect(),offsetX=x-(rect.left+rect.width/2),offsetY=y-(rect.top+rect.height/2);let ghost=null;t.setPointerCapture(e.pointerId);
    const move=ev=>{if(!ghost&&Math.hypot(ev.clientX-x,ev.clientY-y)>6){ghost=t.cloneNode(true);ghost.className='vw-token vw-ghost';ghost.removeAttribute('data-number');document.body.append(ghost);}if(ghost){ghost.style.left=`${ev.clientX-offsetX}px`;ghost.style.top=`${ev.clientY-offsetY}px`;}};
    const end=ev=>{t.removeEventListener('pointermove',move);t.removeEventListener('pointerup',end);t.removeEventListener('pointercancel',cancel);if(ghost){ghost.remove();const stop=event=>{event.stopImmediatePropagation();event.preventDefault();};t.addEventListener('click',stop,{once:true,capture:true});setTimeout(()=>t.removeEventListener('click',stop,true),0);selected=n;const p=at(ev.clientX-offsetX,ev.clientY-offsetY);if(p)choose(p.region,p);else refresh();}};
    const cancel=()=>{ghost?.remove();t.removeEventListener('pointermove',move);t.removeEventListener('pointerup',end);t.removeEventListener('pointercancel',cancel);};
    t.addEventListener('pointermove',move);t.addEventListener('pointerup',end);t.addEventListener('pointercancel',cancel);
   };
  }
  const check=btn('בדיקה',()=>{
   let ok;
   if(mode==='numbers'){
    const missing=s.numbers.filter(n=>!placements.has(n)),ambiguous=s.numbers.filter(n=>placements.get(n)?.region===null),wrong=s.numbers.filter(n=>placements.has(n)&&placements.get(n).region!==null&&placements.get(n).region!==membership(s.sets,n));
    for(const[n,t]of tokens)t.classList.toggle('vw-wrong',wrong.includes(n));
    ok=!missing.length&&!ambiguous.length&&!wrong.length;
    feedback.textContent=ok?'כל המספרים במקומם!':ambiguous.length?'יש מספרים על הגבול. הזיזו אותם לתוך אזור לפני הבדיקה.':missing.length?`נותרו ${missing.length} מספרים למיקום. בדקו גם את המספרים המסומנים במסגרת מקווקוות.`:'בדקו את המספרים במסגרת המקווקוות: לכל מספר, בדקו בנפרד אם הוא שייך ל־A, ל־B ול־C (אם יש).';
   }else{ok=marked.size===s.masks.length&&s.masks.every(m=>marked.has(m));feedback.textContent=ok?'נכון! סימנתם בדיוק את הקבוצה המבוקשת.':'עדיין לא. בדקו בכל אזור אם תנאי השייכות לביטוי מתקיים. שימו לב גם לחיתוך של שלוש הקבוצות ולאזור שמחוץ לעיגולים.';}
   feedback.className=`bk-msg ${ok?'bk-good':'bk-bad'}`;
   if(ok){completed.add(index);nav.update(index,stages.map((_,i)=>completed.has(i)));status.textContent=`הושלמו ${completed.size} מתוך ${stages.length} שלבים.`;next.hidden=index===stages.length-1;}
  });
  host.append(prompt,help,bank,arena,boundaryDialog,controls,el('div',{class:'vw-actions'},[check,btn('איפוס השלב',()=>{states[index]={placements:new Map(),marked:new Set()};completed.delete(index);render();}),next]),feedback);refresh();
 }
 render();
}
