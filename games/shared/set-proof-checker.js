import {node,parseStatement,show,same,neg,unfold,canonical,equivalentShape as eq,propStrings,validateTypes,mapTree,freeNames,substituteName,expandSubset,showWritten} from './set-proof-syntax.js';
import {checkStep as checkRewrite,RULES,replacementSuggestions} from './proof-rules.js';
import {deductionCandidates} from './deduction-hints.js';

export const SET_RULE_CATEGORIES=[
  {id:'definitions',label:'הגדרות בקבוצות'},
  {id:'sets',label:'כללים בקבוצות'},
  {id:'inference',label:'כללי היסק בלוגיקה'},
  {id:'equivalence',label:'שקילויות בלוגיקה'},
  {id:'quantifiers',label:'כמתים'},
  {id:'methods',label:'הנחות, מקרים וסתירה'},
];
export function setRuleCategory(id){
  if(['subset-definition','intersection','union','difference','complement','empty','power','symmetric'].includes(id))return 'definitions';
  if(id.startsWith('set-')||['subset-use','subset-negative','equal-use','subset-chain','double-inclusion','universe-member'].includes(id))return 'sets';
  if(id==='goal-chain'||id.startsWith('eq:'))return 'equivalence';
  if(id==='forall-use')return 'quantifiers';
  if(['open-forall','close-forall','assume','conditional','raa','cases'].includes(id))return 'methods';
  if(['and-out','and-in','or-in','or-out','mp','mt','hs','iff-use','false'].includes(id))return 'inference';
  throw Error('Uncategorized set proof rule: '+id);
}

export const SET_PROOF_RULES=[
  ['goal-chain','הניסוחים השקולים שכבר נבדקו למטרה',1,1],
  ['open-forall','פתיחת הנחה — יהי איבר כלשהו',0,0],
  ['close-forall','סגירת הנחה לאיבר כלשהו — הכללה לכל איברי התחום',2,2],
  ['subset-definition','הגדרת ההכלה — X⊆Y ⇔ ∀x∈X (x∈Y)',1,1],
  ['forall-use','שימוש בטענה לכל איבר — הצבה של איבר מן התחום',2,2],
  ['universe-member','התחום U — איבר בקבוצה הנדונה שייך גם ל־U',1,1],
  ['intersection','הגדרת החיתוך — שייכות לשתי הקבוצות',1,2],
  ['union','הגדרת האיחוד — שייכות לפחות לאחת הקבוצות',1,1],
  ['difference','הגדרת ההפרש — שייך לראשונה ולא לשנייה',1,2],
  ['complement','הגדרת המשלים — בתוך U ומחוץ לקבוצה',1,2],
  ['empty','הקבוצה הריקה — אין בה איברים',1,1],
  ['power','קבוצת החזקה — X ∈ P(Y) אם ורק אם X ⊆ Y',1,1],
  ['symmetric','הפרש סימטרי — שייך בדיוק לאחת',1,1],
  ['subset-use','שימוש בהכלה — x ∈ X ו־X ⊆ Y נותנים x ∈ Y',2,2],
  ['subset-negative','שימוש בהכלה ובגרירה נגדית — x ∉ Y נותן x ∉ X',2,2],
  ['equal-use','שימוש בשוויון — החלפת קבוצה בקבוצה שווה',2,2],
  ['subset-chain','שרשרת הכלות — X ⊆ Y ו־Y ⊆ Z נותנות X ⊆ Z',2,2],
  ['double-inclusion','שתי הכלות — X ⊆ Y ו־X ⊇ Y נותנות X = Y',2,2],
  ['and-out','הוצאת חלק מ״וגם״ — P₁ ∧ P₂ נותן P₁',1,1],
  ['and-in','חיבור ״וגם״ — P₁ ו־P₂ נותנים P₁ ∧ P₂',2,2],
  ['or-in','הכנסת ״או״ — P₁ נותן P₁ ∨ P₂',1,1],
  ['or-out','״או״ ושלילה — P₁ ∨ P₂ ו־¬P₁ נותנים P₂',2,2],
  ['mp','כלל הניתוק — P₁ → P₂ ו־P₁ נותנים P₂',2,2],
  ['mt','כלל השלילה — P₁ → P₂ ו־¬P₂ נותנים ¬P₁',2,2],
  ['hs','כלל השרשרת — P₁ → P₂ ו־P₂ → P₃ נותנים P₁ → P₃',2,2],
  ['iff-use','שימוש בשקילות — שני הכיוונים זמינים',2,2],
  ['assume','הנחה זמנית — למקרה או להוכחה בדרך השלילה',0,0],
  ['false','קבלת סתירה — P₁ ו־¬P₁ (או P₁ ∧ ¬P₁) נותנים F',1,2],
  ['conditional','סגירת הנחה כגרירה — בהנחה P₁ הוכחנו P₂, לכן P₁ → P₂',2,2],
  ['raa','סגירת הנחה בדרך השלילה — בהנחה P₁ הגענו ל־F, לכן ¬P₁',2,2],
  ['cases','סיום מקרים — שני ענפים המוכיחים אותה מסקנה',2,3],
  ['set-commute','חילוף בקבוצות — החלפת סדר באיחוד או בחיתוך',1,1],
  ['set-associate','קיבוץ בקבוצות — שינוי סוגריים באותה פעולה',1,1],
  ['set-distribute','פילוג בקבוצות — חיתוך על איחוד, או איחוד על חיתוך',1,1],
  ['set-demorgan','דה מורגן בקבוצות — משלים של איחוד או חיתוך',1,1],
  ['set-empty','קבוצה ריקה — חוקי האיחוד, החיתוך וההפרש עם עצמה',1,1],
  ['set-double-complement','משלים פעמיים — בתוך אותו עולם U',1,1],
  ...RULES.map(r=>['eq:'+r.id,r.name+' — '+r.pairs.map(pair=>pair.map(s=>formatLogic(parseLogic(s)).replace(/\bA\b/g,'P₁').replace(/\bB\b/g,'P₂').replace(/\bC\b/g,'P₃')).join(' ≡ ')).join('; '),1,1]),
].map(([id,label,min,max])=>({id,label,min,max}));
export const ruleById=id=>SET_PROOF_RULES.find(r=>r.id===id);
export const BASIC_RULES=['open-forall','close-forall','subset-definition','forall-use','subset-use','subset-negative','equal-use','subset-chain','double-inclusion','and-out','and-in','or-in','or-out','mp','mt','hs','iff-use','assume','false','conditional','raa','cases',...RULES.map(r=>'eq:'+r.id)];
const definitions=['intersection','union','difference','complement','empty','power','symmetric'];
const lawStrings={
 'set-commute':[['J ∪ K','K ∪ J'],['J ∩ K','K ∩ J']],
 'set-associate':[['(J ∪ K) ∪ L','J ∪ (K ∪ L)'],['(J ∩ K) ∩ L','J ∩ (K ∩ L)']],
 'set-distribute':[['J ∩ (K ∪ L)','(J ∩ K) ∪ (J ∩ L)'],['J ∪ (K ∩ L)','(J ∪ K) ∩ (J ∪ L)']],
 'set-demorgan':[['(J ∪ K)ᶜ','Jᶜ ∩ Kᶜ'],['(J ∩ K)ᶜ','Jᶜ ∪ Kᶜ']],
 'set-empty':[['J ∪ ∅','J'],['J ∩ ∅','∅'],['J ∖ J','∅']],
 'set-double-complement':[['(Jᶜ)ᶜ','J']],
};
const laws=Object.fromEntries(Object.entries(lawStrings).map(([id,pairs])=>[id,pairs.map(pair=>pair.map(s=>parseStatement('x ∈ ('+s+')').args[1]))]));
function setLawApplies(id,before,after){
 const match=(p,v,bindings)=>{
  if(p.type==='name'&&['J','K','L'].includes(p.name)){if(bindings.has(p.name))return same(bindings.get(p.name),v);bindings.set(p.name,v);return true;}
  return p.type===v.type&&(p.name||'')===(v.name||'')&&(p.args||[]).length===(v.args||[]).length&&(p.args||[]).every((a,i)=>match(a,v.args[i],bindings));
 };
 const walk=(a,b)=>{
  if(same(a,b))return true;
  for(const pair of laws[id]||[])for(const [p,q]of [pair,[...pair].reverse()]){const bindings=new Map();if(match(p,a,bindings)&&match(q,b,bindings))return true;}
  return a.type===b.type&&(a.name||'')===(b.name||'')&&(a.args||[]).length===(b.args||[]).length&&!!a.args?.length&&a.args.every((n,i)=>walk(n,b.args[i]));
 };
 return !same(before,after)&&walk(before,after);
}
const parts=n=>n.type==='and'?n.args.flatMap(parts):[n];
const opposite=(a,b)=>eq(neg(a),b);
const permutations=xs=>xs.length===2?[xs,[xs[1],xs[0]]]:[xs];
function directBoolean(rule,sources,target){
  if(rule==='and-out')return parts(sources[0]).some(a=>eq(a,target));
  if(rule==='and-in')return eq(node('and',...sources),target);
  if(rule==='or-in')return target.type==='or'&&target.args.some(a=>eq(a,sources[0]));
  if(rule==='or-out')return permutations(sources).some(([a,b])=>a.type==='or'&&a.args.length===2&&a.args.some((p,i)=>opposite(p,b)&&eq(a.args[1-i],target)));
  const {strings,atoms}=propStrings([...sources,target]);
  return deductionCandidates(rule,strings.slice(0,-1)).some(s=>{
    // Compare on a shared atom dictionary. No membership meanings are inferred here.
    return checkPropositionalIdentity(s,strings.at(-1));
  });
}
import {parse as parseLogic,format as formatLogic} from './logic.js';
function checkPropositionalIdentity(a,b){return formatLogic(parseLogic(a))===formatLogic(parseLogic(b));}
function definitionCheck(kind,sources,target,config){
  const expand=s=>{for(let i=0;i<24;i++){const next=unfold(s,kind,config.universe);if(same(s,next))return s;if(JSON.stringify(next).length>40000)throw Error('פצלו את הפעלת ההגדרה לצעדים קצרים יותר.');s=next;}return s;};
  const src=sources.map(expand),t=expand(target);
  if(src.every((s,i)=>same(s,sources[i]))&&same(t,target))return false;
  // Definitional equivalence, extracting conjuncts, joining the required facts,
  // and adding a disjunct are precisely the elementary uses of these definitions.
  const facts=src.flatMap(parts);
  const establishes=q=>facts.some(p=>eq(p,q))||
    (q.type==='and'&&parts(q).every(establishes))||
    (q.type==='or'&&q.args.some(establishes));
  return establishes(t);
}
function rewriteEqual(sources,target){
  return permutations(sources).some(([e,s])=>{
    if(e.type!=='equal')return false;
    for(const [a,b]of [e.args,[...e.args].reverse()]){
      // All occurrences may be replaced together; replacing any single occurrence
      // is also allowed. Never rewrite a newly produced result again in this step.
      if(eq(mapTree(s,n=>same(n,a)?b:n),target))return true;
      const variants=n=>{
        const out=same(n,a)?[b]:[];
        (n.args||[]).forEach((child,i)=>{for(const v of variants(child)){const args=[...n.args];args[i]=v;out.push({...n,args});}});return out;
      };
      if(variants(s).some(n=>eq(n,target)))return true;
    }return false;
  });
}
export function checkLocal(rule,sources,target,config={}){
  if(rule==='false'){
    if(target.type!=='false')return false;
    // Membership in a complement entails nonmembership in the original set.
    // Only unfold this definition when a universe and the definition are available.
    const facts=sources.flatMap(s=>parts(config.universe&&config.rules?.includes('complement')?unfold(s,'complement',config.universe):s));
    return facts.some((a,i)=>facts.slice(i+1).some(b=>opposite(a,b)));
  }
  if(rule==='subset-definition')return permutations([sources[0],target]).some(([a,b])=>a.type==='subset'&&b.type==='forall'&&!freeNames(a).includes(b.args[0].name)&&eq(expandSubset(a,b.args[0].name),b));
  if(rule==='forall-use')return permutations(sources).some(([a,b])=>a.type==='forall'&&b.type==='member'&&same(a.args[1],b.args[1])&&eq(substituteName(a.args[2],a.args[0].name,b.args[0]),target));
  if(rule==='universe-member')return !!config.universe&&sources[0].type==='member'&&eq(target,node('member',sources[0].args[0],{type:'name',name:config.universe}));

  if(laws[rule])return (rule!=='set-double-complement'||!!config.universe)&&setLawApplies(rule,sources[0],target);
  if(definitions.includes(rule)){
    if(!definitionCheck(rule,sources,target,config))return false;
    if(config.mode!=='equivalence')return true;
    const givens=(config.givens||[]).map(parseStatement),main=sources.filter(s=>!givens.some(g=>eq(g,s))),facts=sources.filter(s=>givens.some(g=>eq(g,s)));
    return main.length===1&&definitionCheck(rule,[target,...facts],main[0],config);
  }
  if(['subset-use','subset-negative'].includes(rule))return permutations(sources).some(([p,q])=>{
    if(p.type!=='subset')return false;
    if(rule==='subset-use')return q.type==='member'&&same(q.args[1],p.args[0])&&eq(target,node('member',q.args[0],p.args[1]));
    return q.type==='not'&&q.args[0].type==='member'&&same(q.args[0].args[1],p.args[1])&&eq(target,node('not',node('member',q.args[0].args[0],p.args[0])));
  });
  if(rule==='equal-use')return rewriteEqual(sources,target);
  if(rule==='subset-chain')return permutations(sources).some(([a,b])=>a.type==='subset'&&b.type==='subset'&&same(a.args[1],b.args[0])&&eq(target,node('subset',a.args[0],b.args[1])));
  if(rule==='double-inclusion')return sources.every(s=>s.type==='subset')&&same(sources[0].args[0],sources[1].args[1])&&same(sources[0].args[1],sources[1].args[0])&&target.type==='equal'&&permutations(sources).some(([s])=>same(s.args[0],target.args[0])&&same(s.args[1],target.args[1]));
  if(rule.startsWith('eq:')){
    const applies=(before,after)=>{
      if(same(before,after))return true;
      const {strings,atoms}=propStrings([before,after]);
      if(atoms.length>10)throw Error('יש כאן יותר מדי טענות לצעד אחד. כתבו מעבר קצר יותר.');
      if(checkRewrite(strings[0],strings[1],rule.slice(3),atoms.map((_,i)=>'V'+i)).kind==='valid')return true;
      // Independent applications of this one rule to original subexpressions.
      return ['not','and','or','imp','iff'].includes(before.type)&&before.type===after.type&&before.args.length===after.args.length&&before.args.every((a,i)=>applies(a,after.args[i]));
    };
    return !same(sources[0],target)&&applies(sources[0],target);
  }
  return directBoolean(rule,sources,target);
}
export const isEquivalenceRule=id=>id==='subset-definition'||definitions.includes(id)||!!laws[id]||id.startsWith('eq:');
export function checkSetEquivalence(rule,before,after,config){
 if(!isEquivalenceRule(rule)||!config.rules.includes(rule))return false;
 if(rule==='subset-definition'){
  const walk=(a,b)=>{
   if(same(a,b))return true;
   if(permutations([a,b]).some(([p,q])=>p.type==='subset'&&q.type==='forall'&&!freeNames(p).includes(q.args[0].name)&&eq(expandSubset(p,q.args[0].name),q)))return true;
   return a.type===b.type&&a.args?.length===b.args?.length&&!!a.args?.length&&a.args.every((n,i)=>walk(n,b.args[i]));
  };
  return !same(before,after)&&walk(before,after);
 }
 if(definitions.includes(rule)){
  const expand=s=>{for(let i=0;i<24;i++){const next=unfold(s,rule,config.universe);if(same(s,next))return s;if(JSON.stringify(next).length>40000)throw Error('פצלו את השינוי לכמה צעדים.');s=next;}return s;};
  const a=expand(before),b=expand(after);
  return (!same(a,before)||!same(b,after))&&!same(before,after)&&eq(a,b);
 }
 if(rule.startsWith('eq:')&&before.type==='forall'&&after.type==='forall'&&same(before.args[1],after.args[1])){
  const body=substituteName(after.args[2],after.args[0].name,before.args[0]);
  return checkSetEquivalence(rule,before.args[2],body,config);
 }
 return checkLocal(rule,[before],after,{...config,mode:'equivalence'});
}
export function setEquivalenceHints(before,rule,config,extras=[]){
 const candidates=[...extras];
 const root=n=>{
  const out=[];
  if(rule==='subset-definition'){
   if(n.type==='subset'){
    const variable=['x','y','z','x1'].find(v=>!freeNames(n).includes(v));if(variable)out.push(expandSubset(n,variable));
   }
   if(n.type==='forall'&&n.args[2].type==='member'&&same(n.args[0],n.args[2].args[0])&&!freeNames(n.args[2].args[1]).includes(n.args[0].name))out.push(node('subset',n.args[1],n.args[2].args[1]));
  }
  if(rule.startsWith('eq:')&&['not','and','or','imp','iff','true','false'].includes(n.type)){
   const {strings,atoms}=propStrings([n]);
   const convert=t=>t.type==='var'?atoms[Number(t.name.slice(1))]:t.type==='const'?node(t.value?'true':'false'):t.type==='not'?node('not',convert(t.arg)):t.args?node(t.type,...t.args.map(convert)):node(t.type,convert(t.left),convert(t.right));
   for(const value of replacementSuggestions(strings[0],rule.slice(3)))out.push(convert(parseLogic(value)));
  }
  if(laws[rule]){
   const match=(p,v,bindings)=>{
    if(p.type==='name'&&['J','K','L'].includes(p.name)){if(bindings.has(p.name))return same(bindings.get(p.name),v);bindings.set(p.name,v);return true;}
    return p.type===v.type&&(p.name||'')===(v.name||'')&&(p.args||[]).length===(v.args||[]).length&&(p.args||[]).every((a,i)=>match(a,v.args[i],bindings));
   };
   const instantiate=(p,bindings)=>p.type==='name'&&['J','K','L'].includes(p.name)?bindings.get(p.name):p.args?{...p,args:p.args.map(a=>instantiate(a,bindings))}:p;
   for(const pair of laws[rule])for(const [a,b]of [pair,[...pair].reverse()]){const bindings=new Map();if(match(a,n,bindings)&&['J','K','L'].filter(v=>freeNames(b).includes(v)).every(v=>bindings.has(v)))out.push(instantiate(b,bindings));}
  }
  return out;
 };
 const variants=n=>{
  const out=root(n);
  (n.args||[]).forEach((child,i)=>{if(out.length>=64)return;for(const v of variants(child).slice(0,64-out.length)){const args=[...n.args];args[i]=v;out.push({...n,args});}});
  return out.slice(0,64);
 };
 if(definitions.includes(rule))candidates.push(unfold(before,rule,config.universe));
 candidates.push(...variants(before));
 return [...new Set(candidates.map(show))].filter(text=>{try{return text.length<=500&&checkSetEquivalence(rule,before,validateTypes(parseStatement(text),config),config);}catch{return false;}}).slice(0,8);
}

const visible=(scope,stack)=>scope.every((id,i)=>stack[i]===id);
export function checkSetProof(config,steps){
  const rows=[],stack=[],frames=[];let error=null;
  const parse=s=>validateTypes(parseStatement(s),{...config,objects:[...(config.objects||['x']),...frames.filter(f=>f.kind==='forall').map(f=>f.variable)]});
  const goal=parse(config.goal),rootGoal={original:goal,current:goal,changes:[]};
  const goalOwner=()=>frames.filter(f=>f.kind==='forall').at(-1)?.goalState||rootGoal;
  (config.givens||[]).forEach((s,i)=>rows.push({id:'G'+(i+1),formula:parse(s),written:showWritten(s),scope:[],given:true}));
  if(config.start)rows.push({id:'S1',formula:parse(config.start),scope:[],fixed:true});
  const offset=config.start?1:0;let stepNumber=offset,goalNumber=0;
  for(let i=0;i<steps.length;i++){
    let step=steps[i];const restating=step.kind==='restate-goal',id=restating?'R'+(++goalNumber):'S'+(++stepNumber),rule=ruleById(step.rule);
    try{
      if(!rule||(!config.rules.includes(step.rule)&&!(step.kind==='match-goal'&&step.rule==='goal-chain')))throw Error('בחרו כלל שנלמד וזמין בתרגיל הזה.');
      if(step.kind==='let'){
        if(step.rule!=='open-forall')throw Error('לפתיחת ״יהי״ משתמשים בכלל הפתיחה לאיבר כלשהו.');
        const owner=goalOwner().current;
        const text=(step.assumption||'').trim().replace(/^יהי\s+/, '').trim();
        const bare=/^[a-z][a-z0-9_]{0,7}$/.test(text);
        const membership=bare?null:parseStatement(text);
        if(!bare&&(membership.type!=='member'||membership.args[0].type!=='name'))throw Error('כתבו שייכות אחרי ״יהי״, למשל x ∈ A.');
        const variable=bare?text:membership.args[0].name;
        const quantified=owner.type==='subset'?expandSubset(owner,variable):owner;
        if(quantified.type!=='forall')throw Error('פתיחת ״יהי״ מתאימה כאן למטרת הכלה או לטענה לכל איברי תחום.');
        const localConfig={...config,objects:[...(config.objects||['x']),...frames.filter(f=>f.kind==='forall').map(f=>f.variable),variable]};
        if(membership)validateTypes(membership,localConfig);
        if(membership&&!same(membership.args[1],quantified.args[1]))throw Error(`ההנחה צריכה להיות שייכות ל־⁦${show(quantified.args[1])}⁩, התחום שבמטרה.`);
        const x={type:'name',name:variable},body=substituteName(quantified.args[2],quantified.args[0].name,x);
        const expected=bare?node('imp',node('member',x,quantified.args[1]),body):body;
        if(!step.formula?.trim())throw Error('כתבו גם מה נוכיח עבור האיבר הזה.');
        const local=validateTypes(parseStatement(step.formula),localConfig);
        if(!eq(local,expected))throw Error(`המטרה עבור האיבר שבחרתם היא ⁦${show(expected)}⁩. אפשר לשנות את ניסוחה בצעד שקילות נפרד.`);
        step={...step,variable,style:bare?'conditional':'member',formula:show(quantified)};
      }
      let target=parse(step.formula);const refs=step.sources||[];
      let declaration=false,opens=null,closes=null,goalLinks=[];
      if(restating){
        if(refs.length)throw Error('ניסוח מחדש של מטרה אינו משתמש בה כנתון. בחרו כלל שקילות בלבד.');
        if(frames.at(-1)?.kind==='assume')throw Error('סגרו תחילה את ההנחה הפנימית, ואז שנו את ניסוח המטרה.');
        const owner=goalOwner();
        if(!checkSetEquivalence(step.rule,owner.current,target,config))throw Error('הניסוח שכתבתם אינו שקול למטרה לפי הכלל שנבחר. צריך לשמור על שני הכיוונים, על התחום ועל תנאי השייכות.');
        const previous=owner.current;owner.current=target;owner.changes.push(id);
        rows.push({id,index:i,formula:target,written:showWritten(step.formula),previous,scope:[...stack],goalOnly:true,rule:step.rule,note:step.note||''});continue;
      }
      if(refs.length<rule.min||refs.length>rule.max)throw Error(`לכלל הזה מציינים ${rule.min===rule.max?rule.min:`${rule.min}–${rule.max}`} מקורות.`);
      const sources=refs.map(ref=>{
        const r=ref==='R'?rows.find(r=>!r.goalOnly&&!r.declaration&&!r.scope.length&&eq(r.formula,goal)):rows.find(r=>r.id===ref);
        if(ref==='R'&&!r)throw Error('R היא עדיין המטרה בלבד. אפשר לצטט אותה רק אחרי שהוכחה בלי הנחות זמניות פתוחות.');
        if(!r)throw Error(`המקור ${ref} עדיין אינו קיים בהוכחה.`);
        if(r.goalOnly)throw Error('זהו ניסוח של המטרה, לא טענה שהוכחה. אי אפשר לצטט אותו כנתון.');
        if(r.declaration&&step.rule!=='close-forall')throw Error('בחירת איבר כלשהו אינה טענה שאפשר להשתמש בה כנתון.');
        if(!visible(r.scope,stack))throw Error(`המקור ${ref} שייך לענף שנסגר. השתמשו במסקנה שהתקבלה בסגירתו.`);
        return r;
      });
      let scope=[...stack];
      if(step.kind==='match-goal'){
        const owner=step.target==='R'?rootGoal:goalOwner();
        if(refs.length!==1||!eq(target,owner.original))throw Error('בחרו צעד מוכח אחד ואת המטרה שאליה רוצים לחזור.');
        if(step.rule==='goal-chain'){
          if(!owner.changes.length||!eq(sources[0].formula,owner.current))throw Error('הצעד שנבחר צריך להוכיח את הניסוח האחרון של המטרה.');
          goalLinks=[...owner.changes];
        }else if(!checkSetEquivalence(step.rule,sources[0].formula,owner.original,config))throw Error('הצעד שנבחר אינו שקול למטרה לפי הכלל הזה. בחרו כלל מתאים או הוסיפו מעבר ביניים.');
      }
      else if(step.rule==='open-forall'){
        if(target.type!=='forall')throw Error('לפתיחת הוכחה לכל איבר, כתבו טענה מהצורה ∀x ∈ A (x ∈ B).');
        const variable=step.variable||target.args[0].name;
        if(!/^[a-z][a-z0-9_]{0,7}$/.test(variable)||config.sets?.includes(variable))throw Error('בחרו שם קצר לאיבר, למשל x או y.');
        const forbidden=[goal,target,...rows.filter(r=>visible(r.scope,stack)&&!r.declaration&&!r.goalOnly).map(r=>r.formula)];
        if(forbidden.some(n=>freeNames(n).includes(variable))||frames.some(f=>f.variable===variable))throw Error(`השם ${variable} כבר משמש באחת הטענות הפתוחות. בחרו שם חדש לאיבר הכלשהו.`);
        const x={type:'name',name:variable},membership=node('member',x,target.args[1]),body=substituteName(target.args[2],target.args[0].name,x);
        const conditional=step.style==='conditional',innerGoal=conditional?node('imp',membership,body):body;
        opens={id,kind:'forall',variable,quantified:target,innerGoal,goalState:{original:innerGoal,current:innerGoal,changes:[]},style:conditional?'conditional':'member',membership};
        frames.push(opens);
        stack.push(id);scope=[...stack];declaration=conditional;target=conditional?x:membership;
      }
      else if(step.rule==='close-forall'){
        const frame=frames.at(-1);
        if(frame?.kind!=='forall')throw Error('סגרו תחילה את ההנחה הזמנית הפתוחה. לאחר מכן אפשר לסיים את ההוכחה לאיבר הכלשהו.');
        const opening=sources.find(s=>s.id===frame.id),result=sources.find(s=>s!==opening)||opening;
        if(!opening||!result||result.declaration||!(eq(result.formula,frame.innerGoal)||eq(result.formula,frame.goalState.current)))throw Error(`כדי לסיים את החלק הזה, צטטו את פתיחתו ואת הצעד שמוכיח ⁦${show(frame.innerGoal)}⁩.`);
        if(!eq(target,frame.quantified))throw Error(`ההכללה נותנת ⁦${show(frame.quantified)}⁩. כדי לחזור להכלה השתמשו אחר כך בהגדרתה.`);
        if(!eq(result.formula,frame.innerGoal))goalLinks=[...frame.goalState.changes];
        closes=stack.pop();frames.pop();scope=[...stack];
      }
      else if(step.rule==='assume'){stack.push(id);opens={id,kind:'assume'};frames.push(opens);scope=[...stack];}
      else if(['conditional','raa'].includes(step.rule)){
        const assumption=sources.find(s=>s.id===stack.at(-1)),result=sources.find(s=>s!==assumption)||assumption;
        if(!assumption||frames.at(-1)?.kind!=='assume')throw Error('כדי לסגור הנחה, ציינו את ההנחה הזמנית הפתוחה האחרונה ואת המסקנה שהגעתם אליה.');
        const expected=step.rule==='raa'?neg(assumption.formula):node('imp',assumption.formula,result.formula);
        if(step.rule==='raa'&&result.formula.type!=='false')throw Error('לפני סגירה בדרך השלילה צריך להסיק סתירה (F).');
        if(step.rule==='conditional'&&result.formula.type==='false'&&eq(neg(assumption.formula),target))throw Error('כדי להסיק את שלילת ההנחה לאחר סתירה, בחרו ״סגירת הנחה בדרך השלילה״. סגירה כגרירה נותנת רק גרירה אל F.');
        if(!eq(expected,target))throw Error(`סגירת ההנחה הזאת נותנת ⁦${show(expected)}⁩. בדקו את ההנחה ואת המסקנה שציטטתם.`);
        closes=stack.pop();frames.pop();scope=[...stack];
      }else if(step.rule==='cases'){
        const forms=sources.map(s=>s.formula),imps=forms.filter(s=>s.type==='imp');
        if(imps.length!==2||!imps.every(s=>eq(s.args[1],target)))throw Error('נדרשים שני ענפים סגורים שמגיעים לאותה מסקנה. סגרו כל ענף כגרירה.');
        const [p,q]=imps.map(s=>s.args[0]),disjunction=forms.find(s=>s.type==='or');
        if(forms.length===2?!opposite(p,q):!disjunction||!eq(disjunction,node('or',p,q)))throw Error('המקרים צריכים לכסות את האפשרויות: צטטו גם את טענת ה״או״, או השתמשו בטענה ובשלילתה.');
      }else if(step.rule==='goal-chain')throw Error('בחרו בפעולה של קישור צעד למטרה.');
      else if(!checkLocal(step.rule,sources.map(s=>s.formula),target,config)){
        const possible=config.rules.filter(r=>!['goal-chain','open-forall','close-forall','assume','conditional','raa','cases'].includes(r)).find(r=>{const info=ruleById(r);return info&&refs.length>=info.min&&refs.length<=info.max&&checkLocal(r,sources.map(s=>s.formula),target,config);});
        throw Error(possible?`הטענה נובעת מן המקורות, אבל לפי כלל אחר: ${ruleById(possible).label}. שנו את הנימוק או הוסיפו צעד ביניים.`:`הכלל ״${rule.label.split(' — ')[0]}״ אינו נותן את הטענה הזאת מן המקורות שבחרתם. בדקו את כיוון ההכלה, השלילות והאיבר שעליו מדברים. אם דרושים שני כללים, כתבו צעד ביניים.`);
      }
      rows.push({id,index:i,kind:step.kind,goalLinks,formula:target,written:step.rule==='open-forall'?show(target):showWritten(step.formula),scope,opens,closes,rule:step.rule,sources:sources.map(s=>s.id),note:step.note||'',assumption:step.rule==='assume'||(step.rule==='open-forall'&&!declaration),declaration,variable:step.variable||undefined});
    }catch(e){error={index:i,message:e.message};break;}
  }
  const reached=!error&&!stack.length&&rows.some(r=>!r.goalOnly&&!r.declaration&&!r.scope.length&&eq(r.formula,goal));
  return {ok:!error,error,rows,stack,frames,reached,rootGoal,currentGoal:goalOwner(),nextStep:stepNumber+1,available:rows.filter(r=>!r.goalOnly&&visible(r.scope,stack))};
}

// Optional hints propose only local rule applications; they do not choose a proof.
export function setStepHints(config,steps,rule,refs){
  const state=checkSetProof(config,steps);if(!state.ok)return [];
  const sources=refs.map(id=>state.available.find(r=>r.id===id)?.formula);if(sources.some(s=>!s))return [];
  const candidates=[];const add=n=>{if(n)candidates.push(n);};
  if(rule==='false')add(node('false'));
  if(rule==='close-forall'&&state.frames.at(-1)?.kind==='forall')add(state.frames.at(-1).quantified);
  for(const s of sources){
    if(rule==='subset-definition'){
      if(s.type==='subset')add(expandSubset(s));
      if(s.type==='forall'&&s.args[2].type==='member'&&same(s.args[0],s.args[2].args[0]))add(node('subset',s.args[1],s.args[2].args[1]));
    }
    if(rule==='universe-member'&&s.type==='member'&&config.universe)add(node('member',s.args[0],{type:'name',name:config.universe}));
    if(definitions.includes(rule)){const n=unfold(s,rule,config.universe);add(n);parts(n).forEach(add);}
    if(rule==='and-out')parts(s).forEach(add);
  }
  if(sources.length===2){
    add(node('and',...sources));
    for(const [p,q]of permutations(sources)){
      if(p.type==='forall'&&q.type==='member'&&same(p.args[1],q.args[1])){
        try{add(substituteName(p.args[2],p.args[0].name,q.args[0]));}catch{/* A hint must not capture an existing bound variable. */}
      }
      if(p.type==='subset'){
        if(q.type==='member')add(node('member',q.args[0],p.args[1]));
        if(q.type==='not'&&q.args[0].type==='member')add(node('not',node('member',q.args[0].args[0],p.args[0])));
      }
      if(p.type==='imp'){add(p.args[1]);add(neg(p.args[0]));}
      if(p.type==='or')p.args.forEach(add);
    }
    add(node('false'));
    if(['conditional','raa'].includes(rule))for(const [a,b]of permutations(sources))add(rule==='raa'?neg(a):node('imp',a,b));
  }
  // The target is a candidate, never a premise. Full replay must justify it.
  add(parseStatement(config.goal));
  return [...new Set(candidates.map(show))].filter(formula=>checkSetProof(config,[...steps,{rule,formula,sources:refs}]).ok).slice(0,8);
}
