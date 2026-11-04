import {parse,format} from './logic.js';
import {proofFormula} from './proof-notation.js';
const same=(a,b)=>format(a)===format(b),neg=n=>({type:'not',arg:n});
const opposite=(a,b)=>(a.type==='not'&&same(a.arg,b))||(b.type==='not'&&same(b.arg,a));
// Generate direct syntactic outcomes only. Callers must validate the entire
// proof prefix and scope before displaying these candidates to a student.
export function deductionCandidates(rule,formulas){
 let sources;try{sources=formulas.map(f=>parse(f));}catch{return [];}
 const candidates=[];
 if(rule==='copy'&&sources.length===1)candidates.push(sources[0]);
 if(rule==='and-out'&&sources.length===1&&sources[0].type==='and')candidates.push(...sources[0].args);
 if(sources.length===2){
  const [a,b]=sources;
  if(rule==='and-in')candidates.push({type:'and',args:[a,b]},{type:'and',args:[b,a]});
  if(rule==='false'&&opposite(a,b))candidates.push({type:'const',value:false});
  if(rule==='raa'&&b.type==='const'&&!b.value)candidates.push(a.type==='not'?a.arg:neg(a));
  if(rule==='conditional')candidates.push({type:'imp',left:a,right:b});
  for(const [p,q]of [[a,b],[b,a]]){
   if(p.type==='imp'){
    if(rule==='mp'&&same(p.left,q))candidates.push(p.right);
    if(rule==='mt'&&opposite(p.right,q)){if(p.left.type==='not')candidates.push(p.left.arg);candidates.push(neg(p.left));}
    if(rule==='hs'&&q.type==='imp'&&same(p.right,q.left))candidates.push({type:'imp',left:p.left,right:q.right});
    if(rule==='cases'&&q.type==='imp'&&opposite(p.left,q.left)&&same(p.right,q.right))candidates.push(p.right);
   }
   if(rule==='iff-use'&&p.type==='iff')for(const [x,y]of [[p.left,p.right],[p.right,p.left]]){
    if(same(x,q))candidates.push(y);
    if(same(neg(x),q))candidates.push(neg(y));
   }
  }
 }
 return [...new Set(candidates.map(proofFormula))].filter(f=>f.length<=240);
}
export function deductionHint(getChoices,onPick){
 const box=document.createElement('details');box.className='deduction-hint';box.hidden=true;
 const summary=document.createElement('summary');summary.textContent='רמז: הצגת מסקנות אפשריות';
 const list=document.createElement('div');box.append(summary,list);
 box.addEventListener('toggle',()=>{
  if(!box.open)return;
  const {options=[],message='אין מסקנה ישירה לפי הכלל והמקורות שבחרתם. בדקו את הבחירה.'}=getChoices();
  list.replaceChildren();
  if(!options.length){const p=document.createElement('p');p.textContent=message;list.append(p);}
  for(const option of options){const b=document.createElement('button');b.type='button';b.className='bk-btn bk-quiet';b.dir='ltr';b.textContent=proofFormula(option);b.addEventListener('click',()=>onPick(option));list.append(b);}
 });
 return {box,refresh(active){box.hidden=!active;box.open=false;list.replaceChildren();}};
}
