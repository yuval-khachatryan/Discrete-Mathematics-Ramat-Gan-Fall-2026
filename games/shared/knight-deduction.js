import {deductionCandidates} from './deduction-hints.js';
import {parse,format,variables,assignments,evaluate,compare} from './logic.js';
import {RULES,checkStep,checkReplacements} from './proof-rules.js';

export const DEDUCTION_RULES=[
 {id:'mp',name:'כלל הניתוק',count:2,help:'מן השורות P → Q ו־P מסיקים Q.'},
 {id:'mt',name:'כלל השלילה',count:2,help:'מן השורות P → Q ו־¬Q מסיקים ¬P.'},
 {id:'hs',name:'כלל השרשרת',count:2,help:'מן השורות P → Q ו־Q → R מסיקים P → R.'},
 {id:'iff-use',name:'שימוש באם ורק אם',count:2,help:'מ־P ↔ Q ו־P מסיקים Q; מ־P ↔ Q ו־¬P מסיקים ¬Q. אפשר גם להחליף בין P ל־Q.'},
 {id:'and-out',name:'הוצאת חלק מ״וגם״',count:1,help:'מ־P ∧ Q אפשר להסיק P, ואפשר להסיק Q.'},
 {id:'and-in',name:'חיבור באמצעות ״וגם״',count:2,help:'אחרי שהוכחנו P והוכחנו Q, אפשר להסיק P ∧ Q.'},
 {id:'copy',name:'שימוש חוזר בשורה',count:1,help:'אפשר להשתמש בשורה קודמת שעדיין זמינה, גם בתוך הנחה זמנית.'},
 {id:'assume',name:'הנחה זמנית',count:0,help:'כותבים את ההנחה שרוצים לבדוק. מסקנות שתלויות בה אינן נתונים כלליים: צריך לסגור את ההנחה לפני שמסיימים.'},
 {id:'false',name:'קבלת סתירה',count:2,help:'מן השורות P ו־¬P מסיקים F. יש לציין את שתי השורות שסותרות זו את זו.'},
 {id:'raa',name:'סגירת הנחה — דרך השלילה',count:2,help:'מציינים את שורת ההנחה הזמנית ואת שורת הסתירה F שבתוכה. מסיקים את שלילת ההנחה וסוגרים אותה. מהנחה ¬P וסתירה אפשר להסיק P.'},
 {id:'conditional',name:'סגירת הנחה — הוכחת גרירה',count:2,help:'אם תחת הנחה זמנית P הוכחנו Q, מסיקים P → Q וסוגרים את ההנחה. מציינים את שורת ההנחה ואת השורה שבה הוכחנו Q.'},
 {id:'cases',name:'איחוד מקרים',count:2,help:'מ־P → R ומ־¬P → R מסיקים R. הוכחנו אותה מסקנה בשני מקרים שמכסים את כל האפשרויות.'},
 {id:'table',name:'הסקה בעזרת טבלת אמת',count:null,help:'מציינים את שורות המקור. בודקים שבכל הצבה שבה כולן אמת גם המסקנה אמת. הטבלה המלאה מוצגת לצד הנימוק לאחר הבדיקה.'},
 {id:'eq:replacements',name:'החלפות מפורטות',count:1,help:'בחרו שורת מקור, ובתוכה את החלקים שתרצו לשנות. לכל חלק בחרו חוק שקילות וכתבו את הביטוי שיחליף אותו. שאר הנוסחה נשאר ללא שינוי. לבסוף אפשר ללחוץ על ״הרכבת הנוסחה מן ההחלפות״ כדי לקבל את השורה החדשה.'},
 ...RULES.map(r=>({id:'eq:'+r.id,name:r.name,count:1,help:'מחליפים בשורת המקור חלק אחד לפי חוק השקילות שבחרתם. מותר להשתמש בחוק בשני הכיוונים.'})),
];
const same=(a,b)=>format(a)===format(b);
const neg=n=>({type:'not',arg:n});
const opposite=(a,b)=>(a.type==='not'&&same(a.arg,b))||(b.type==='not'&&same(b.arg,a));
const negate=n=>n.type==='not'?n.arg:neg(n);
const prefix=(a,b)=>a.length<=b.length&&a.every((x,i)=>x===b[i]);
const failure=message=>({ok:false,message});
function read(text,allowed){
 if(!text?.trim())throw Error('כתבו נוסחה בשורה הזאת.');
 if(text.length>240)throw Error('הנוסחה ארוכה מדי. חלקו את החישוב לצעדים.');
 let tree;try{tree=parse(text.toUpperCase());}catch{throw Error('לא ניתן לקרוא את הנוסחה. בדקו את הסוגריים והסמלים.');}
 if(variables(tree).some(x=>!allowed.includes(x)))throw Error('השתמשו רק באותיות המוגדרות בתרגיל, וב־T ו־F לאמת ולשקר.');
 return tree;
}
export function tableEvidence(sources,conclusion,allowed){
 const rows=assignments(allowed).map(env=>({env,values:sources.map(s=>evaluate(s,env)),conclusion:evaluate(conclusion,env)}));
 return {rows,counterexample:rows.find(r=>r.values.every(Boolean)&&!r.conclusion)};
}
// Available premises/derived lines at this point, respecting assumption scopes.
export function deductionSourceChoices(lines,beforeNumber,rule,slot=0){
 const prior=lines.filter(line=>line.number<beforeNumber),open=prior.at(-1)?.scope||[];
 if(rule==='assume'||!rule)return [];
 const available=prior.filter(line=>prefix(line.scope,open));
 if(['raa','conditional'].includes(rule)){
  const assumption=open.at(-1);if(!assumption)return [];
  if(slot===0)return available.filter(line=>line.number===assumption);
  return available.filter(line=>line.number>assumption&&line.scope.includes(assumption)&&(rule!=='raa'||(line.tree.type==='const'&&!line.tree.value)));
 }
 return available;
}
export function checkDeduction(premises,steps,allowed,target){
 const known=premises.map((formula,i)=>({number:i+1,formula,tree:parse(formula),scope:[],rule:'given',refs:[]}));
 const stack=[],results=[];let goalLine=null;
 for(let i=0;i<steps.length;i++){
  const step=steps[i],number=known.length+1,rule=DEDUCTION_RULES.find(r=>r.id===step.rule);let result;
  try{
   let tree=step.rule==='eq:replacements'?null:read(step.formula,allowed);
   const refs=step.refs||[],sources=refs.map(n=>known[n-1]);
   if(!rule)throw Error('בחרו נימוק לצעד.');
   if((rule.count!==null&&refs.length!==rule.count)||(rule.count===null&&!refs.length)||new Set(refs).size!==refs.length)throw Error(rule.count===0?'להנחה זמנית לא בוחרים שורות מקור.':`בחרו ${rule.count===null?'לפחות שורת מקור אחת':rule.count===1?'שורת מקור אחת':'שתי שורות מקור שונות'}.`);
   if(refs.some(n=>!Number.isInteger(n)||n<1||n>=number))throw Error('בחרו רק שורות קודמות. אי אפשר להשתמש בשורה עצמה או בשורה עתידית.');
   let scope=[...stack],valid=false,evidence=null,doubleNegationNote='';
   if(step.rule==='assume'){scope.push(number);valid=true;}
   else if(['raa','conditional'].includes(step.rule)){
    const assumption=known[stack.at(-1)-1];
    if(!assumption||refs[0]!==assumption.number)throw Error('מציינים תחילה את ההנחה הזמנית האחרונה שעדיין פתוחה, ואחריה את שורת הסיום שלה.');
    const end=sources[1];
    if(end.number<assumption.number||!prefix(end.scope,stack)||!end.scope.includes(assumption.number))throw Error('שורת הסיום צריכה להיות בתוך ההנחה שסוגרים, ולא מתוך מקרה אחר שכבר נסגר.');
    if(step.rule==='raa')valid=end.tree.type==='const'&&!end.tree.value&&same(tree,negate(assumption.tree));
    else valid=tree.type==='imp'&&same(tree.left,assumption.tree)&&same(tree.right,end.tree);
    scope=stack.slice(0,-1);
   }else{
    if(sources.some(s=>!prefix(s.scope,stack)))throw Error('אחת השורות שייכת להנחה שכבר נסגרה. מחוץ להנחה משתמשים רק במסקנה שהתקבלה בסגירתה.');
    if(step.rule.startsWith('eq:')){
     const rewrite=step.rule==='eq:replacements'?checkReplacements(sources[0].formula,step.formula,step.replacements||[],allowed):checkStep(sources[0].formula,step.formula,step.rule.slice(3),allowed);
     if(rewrite.kind!=='valid')throw Object.assign(Error(rewrite.message),{feedback:rewrite});tree=read(step.formula,allowed);valid=true;
    }else if(step.rule==='table'){
     evidence=tableEvidence(sources.map(s=>s.tree),tree,allowed);valid=!evidence.counterexample;
    }else if(step.rule==='copy')valid=same(sources[0].tree,tree);
    else if(step.rule==='and-out')valid=sources[0].tree.type==='and'&&sources[0].tree.args.some(a=>same(a,tree));
    else if(step.rule==='and-in')valid=same(tree,{type:'and',args:sources.map(s=>s.tree)})||same(tree,{type:'and',args:sources.map(s=>s.tree).reverse()});
    else if(step.rule==='false')valid=tree.type==='const'&&!tree.value&&opposite(sources[0].tree,sources[1].tree);
    else for(const [p,q] of [[sources[0]?.tree,sources[1]?.tree],[sources[1]?.tree,sources[0]?.tree]]){
     if(step.rule==='mp'&&p.type==='imp'&&same(p.left,q)&&same(p.right,tree))valid=true;
     if(step.rule==='mt'&&p.type==='imp'&&deductionCandidates('mt',[p,q]).some(f=>same(parse(f),tree))){valid=true;if(p.right.type==='not'&&same(p.right.arg,q))doubleNegationNote=` השתמשנו גם בשלילה כפולה: ⁦${format(q)} ≡ ${format(neg(p.right))}⁩.`;if(p.left.type==='not'&&same(p.left.arg,tree))doubleNegationNote+=` שלילת תנאי הגרירה היא ⁦${format(neg(p.left))}⁩, והיא שקולה ל־⁦${format(tree)}⁩.`;}
     if(step.rule==='hs'&&p.type==='imp'&&q.type==='imp'&&same(p.right,q.left)&&tree.type==='imp'&&same(tree.left,p.left)&&same(tree.right,q.right))valid=true;
     if(step.rule==='iff-use'&&p.type==='iff')for(const [a,b] of [[p.left,p.right],[p.right,p.left]]){if(same(a,q)&&same(b,tree))valid=true;if(same(neg(a),q)&&same(neg(b),tree))valid=true;}
     if(step.rule==='cases'&&p.type==='imp'&&q.type==='imp'&&opposite(p.left,q.left)&&same(p.right,q.right)&&same(tree,p.right))valid=true;
    }
   }
   if(!valid){
    const counter=evidence?.counterexample;
    result={ok:false,message:counter?'המעבר אינו נובע משורות המקור: בהצבה המוצגת כל שורות המקור אמת והמסקנה שקר.':'הנוסחה אינה מתקבלת מן השורות האלה לפי הכלל שנבחר. בדקו את תזכורת הכלל ואת שורות המקור.',evidence};
   }else{
    const line={number,formula:step.formula.trim().toUpperCase(),tree,scope,rule:step.rule,refs:[...refs],evidence,replacements:step.replacements};known.push(line);stack.splice(0,stack.length,...scope);
    if(stack.length===0&&compare(line.formula,target).equal)goalLine=line.number;
    result={ok:true,line,message:step.rule==='assume'?'ההנחה נפתחה. היא זמנית ואינה נתון.':'הצעד מוצדק.'+doubleNegationNote};
   }
  }catch(error){result=error.feedback?{...error.feedback,ok:false}:failure(error.message);}
  results.push(result);if(!result.ok)return {ok:false,complete:false,results,lines:known,open:[...stack]};
 }
 return {ok:true,complete:goalLine!==null&&stack.length===0,results,lines:known,open:[...stack]};
}
