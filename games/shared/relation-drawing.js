import {stageNavigation} from './stage-navigation.js';
import {readable} from './sets.js';

export const RELATION_VERTICES=[1,2,3,4];
export const RELATION_DRAWINGS=[
  {pairs:[[1,2],[2,3]],hint:'כל זוג דורש חץ משלו. שני חצים בזה אחר זה אינם מוסיפים חץ ישיר.'},
  {pairs:[[1,2],[2,1]],hint:'שני הזוגות שונים בסדר הרכיבים. נדרשים שני חצים בכיוונים מנוגדים.'},
  {pairs:[[1,1],[1,3],[3,2]],hint:'הזוג (1,1) מיוצג בלולאה: בחרו בקודקוד 1 פעמיים.'},
];
const pairKey=pair=>pair.join(',');
export const relationRoster=pairs=>pairs.length?'{'+pairs.map(([a,b])=>`(${a},${b})`).join(', ')+'}':'∅';
export function checkRelationDrawing(pairs,target){
  if(pairs.some(p=>!Array.isArray(p)||p.length!==2||p.some(a=>!RELATION_VERTICES.includes(a))))return {ok:false,message:'כל חץ צריך להתחיל ולהסתיים באחד מארבעת הקודקודים.'};
  const actual=new Set(pairs.map(pairKey)),expected=new Set(target.map(pairKey));
  const extra=pairs.find(p=>!expected.has(pairKey(p)));
  if(extra)return {ok:false,message:`החץ מ־${extra[0]} אל ${extra[1]} מייצג את (${extra.join(',')}), שאינו ביחס הנתון. בחרו שוב בשני קצות החץ באותו סדר כדי להסיר אותו.`};
  const missing=target.find(p=>!actual.has(pairKey(p)));
  if(missing)return {ok:false,message:missing[0]===missing[1]?`חסרה הלולאה שמייצגת את (${missing.join(',')}). בחרו בקודקוד ${missing[0]} פעמיים.`:`חסר החץ שמייצג את (${missing.join(',')}). בחרו תחילה ב־${missing[0]} ואחר כך ב־${missing[1]}.`};
  return {ok:true,message:'נכון! כל זוג ביחס מיוצג בחץ, ואין חצים לזוגות שאינם ביחס. כל ארבעת איברי A מופיעים כקודקודים.'};
}

const positions={1:[100,100],2:[340,100],3:[100,310],4:[340,310]};
// Shared geometry for the printed examples and the interactive drawing board.
export function relationGraphSvg(pairs,{id='relation-arrow',interactive=false,selected=null}={}){
  if(!/^[a-z][a-z0-9-]*$/i.test(id))throw Error('Invalid SVG marker id');
  const edges=pairs.map(([a,b])=>{
    if(!positions[a]||!positions[b])throw Error('Unknown graph vertex');
    const [x,y]=positions[a],[u,v]=positions[b];
    let d;
    if(a===b)d=`M ${x-15} ${y-22} C ${x-72} ${y-94}, ${x+72} ${y-94}, ${x+15} ${y-22}`;
    else{
      const dx=u-x,dy=v-y,length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;
      const bend=pairs.some(([c,e])=>c===b&&e===a)?30:0;
      d=`M ${x+dx/length*29} ${y+dy/length*29} Q ${(x+u)/2+nx*bend} ${(y+v)/2+ny*bend} ${u-dx/length*31} ${v-dy/length*31}`;
    }
    return `<path data-pair="${a},${b}" d="${d}" fill="none" stroke="#245a7a" stroke-width="3" marker-end="url(#${id})"/>`;
  }).join('');
  const vertices=RELATION_VERTICES.map(a=>{
    const [x,y]=positions[a],chosen=a===selected;
    return `<g data-vertex="${a}"${interactive?` role="button" tabindex="0" aria-label="איבר ${a}" aria-pressed="${chosen}"`:''}><circle cx="${x}" cy="${y}" r="26" fill="${chosen?'#fff0c2':'#f3f8fc'}" stroke="${chosen?'#825600':'#245a7a'}" stroke-width="${chosen?4:2}"/><text x="${x}" y="${y+8}" text-anchor="middle" direction="ltr" font-family="Georgia, serif" font-size="25" fill="#17364b">${a}</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 365" role="${interactive?'group':'img'}" aria-label="${interactive?'בחירת קודקודים ליצירת חצים':'תרשים של יחס על ארבעה איברים'}"><defs><marker id="${id}" viewBox="0 0 9 8" refX="8" refY="4" markerWidth="10" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#245a7a"/></marker></defs>${edges}${vertices}</svg>`;
}

const el=(tag,attrs={},children=[])=>{
  const n=document.createElement(tag);
  for(const [k,v]of Object.entries(attrs))if(k==='text')n.textContent=readable(v);else n.setAttribute(k,v);
  n.append(...children);return n;
};
const button=(text,fn)=>{const b=el('button',{type:'button',class:'bk-btn',text});b.addEventListener('click',fn);return b;};
let serial=0;
export function initRelationDrawing(box){
  if(box.dataset.ready)return;
  box.dataset.ready='true';box.replaceChildren();
  const id=`relation-board-${++serial}`,states=RELATION_DRAWINGS.map(()=>({edges:new Set(),done:false}));
  let active=0,selected=null;
  const target=el('p',{class:'relation-target',dir:'ltr'}),board=el('div',{class:'relation-board'}),roster=el('p',{dir:'ltr',class:'relation-current'});
  const instruction=el('p',{'aria-live':'polite'}),feedback=el('p',{class:'bk-msg','aria-live':'polite'});
  const model=el('details',{class:'answer-reveal'},[el('summary',{text:'הצגת תרשים הפתרון'}),el('div',{class:'relation-board'})]);
  const pairs=()=>[...states[active].edges].map(k=>k.split(',').map(Number));
  const clear=()=>{feedback.textContent='';feedback.className='bk-msg';};
  const nav=stageNavigation(RELATION_DRAWINGS.map(q=>relationRoster(q.pairs)),index=>{active=index;selected=null;clear();model.open=false;draw();});
  function draw(){
    target.textContent='R = '+relationRoster(RELATION_DRAWINGS[active].pairs);
    board.innerHTML=relationGraphSvg(pairs(),{id,interactive:true,selected});
    roster.textContent='S = '+relationRoster(pairs());
    instruction.textContent=selected===null?'בחרו את הקודקוד שממנו החץ יוצא.':readable(`החץ יתחיל ב־${selected}. בחרו את הקודקוד שאליו ייכנס.`);
    model.lastElementChild.innerHTML=relationGraphSvg(RELATION_DRAWINGS[active].pairs,{id:id+'-model'});
    nav.update(active,states.map(s=>s.done));
  }
  function choose(a){
    clear();
    if(selected===null)selected=a;
    else{
      const key=pairKey([selected,a]),state=states[active];
      if(state.edges.has(key))state.edges.delete(key);else state.edges.add(key);
      state.done=false;selected=null;
    }
    draw();board.querySelector(`[data-vertex="${a}"]`).focus();
  }
  board.addEventListener('click',e=>{const node=e.target.closest('[data-vertex]');if(node)choose(Number(node.dataset.vertex));});
  board.addEventListener('keydown',e=>{if(!['Enter',' '].includes(e.key))return;const node=e.target.closest('[data-vertex]');if(node){e.preventDefault();choose(Number(node.dataset.vertex));}});
  const check=button('בדיקה',()=>{
    const result=checkRelationDrawing(pairs(),RELATION_DRAWINGS[active].pairs);
    states[active].done=result.ok;feedback.textContent=readable(result.message);feedback.className='bk-msg '+(result.ok?'bk-good':'bk-bad');nav.update(active,states.map(s=>s.done));
  });
  box.append(nav.root,el('p',{text:'היחס שצריך לצייר:'}),target,instruction,board,el('p',{text:'החצים שציירתם מייצגים את היחס:'}),roster,
    el('div',{class:'bk-bar'},[check,button('רמז',()=>{feedback.textContent=readable(RELATION_DRAWINGS[active].hint);feedback.className='bk-msg';}),button('איפוס',()=>{states[active]={edges:new Set(),done:false};selected=null;model.open=false;clear();draw();})]),feedback,model);
  draw();
}
