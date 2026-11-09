// Typed set expressions and propositions. Input is parsed, never evaluated as JS.
export const node=(type,...args)=>({type,args});
export const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const neg=a=>a.type==='not'?a.args[0]:node('not',a);
export function normalizeInput(s){
  return s.replace(/[\u2066-\u2069]/g,'').replace(/\\forall\b|\bforall\b/g,'∀').replace(/\\colon\b/g,':').replace(/\\(?:subseteq|subset)\b|\bsubset(?:eq)?\b/g,'⊆')
    .replace(/\\(?:supseteq|supset)\b|\bsupset(?:eq)?\b/g,'⊇')
    .replace(/\\notin\b|\bnotin\b/g,'∉').replace(/\\in\b|\bin\b/g,'∈')
    .replace(/\\cap\b|\bintersect\b/g,'∩').replace(/\\cup\b|\bunion\b/g,'∪')
    .replace(/\\(?:setminus|smallsetminus)\b/g,'∖').replace(/\\(?:varnothing|emptyset)\b|\bempty\b|\{\s*\}/g,'∅')
    .replace(/\\neg\b|\bnot\b|!/g,'¬').replace(/\\land\b|\band\b|&/g,'∧')
    .replace(/\\lor\b|\bor\b|\|/g,'∨').replace(/<->|\\leftrightarrow\b/g,'↔').replace(/->|\\to\b/g,'→')
    .replace(/\\triangle\b|Δ/g,'△').replace(/\\/g,'∖').replace(/\^c\b|\^\{c\}/g,'ᶜ');
}
export function parseStatement(src,{preserveDirection=false}={}){
  if(typeof src!=='string')return src;
  if(src.length>500)throw Error('הטענה ארוכה מדי. פצלו אותה לצעדים קצרים.');
  const s=normalizeInput(src),tokens=[];let pos=0;
  const re=/\s*([A-Za-z][A-Za-z0-9_]*|[∀:∈∉⊆⊈⊇⊉=≠∩∪∖△ᶜ∅¬∧∨→↔(){}])/y;
  while(pos<s.length){if(!s.slice(pos).trim())break;re.lastIndex=pos;const m=re.exec(s);if(!m)throw Error('סימן לא מוכר. אפשר לכתוב למשל x ∈ A, A ⊆ B, או (x ∈ A) ∧ (x ∉ B).');tokens.push(m[1]);pos=re.lastIndex;}
  let i=0,depth=0;const take=()=>tokens[i++],peek=()=>tokens[i];
  function term(){
    if(++depth>24)throw Error('יותר מדי סוגריים מקוננים.');
    let v;const t=take();
    if(t==='('){v=setExpr();if(take()!==')')throw Error('חסר סוגר ימני בביטוי הקבוצה.');}
    else if(t==='∅')v=node('empty');
    else if(t==='{'){v=node('singleton',term());if(take()!=='}')throw Error('כאן אפשר לכתוב יחידון {x}, או ∅.');}
    else if(t==='P'&&peek()==='('){take();v=node('power',setExpr());if(take()!==')')throw Error('חסר סוגר בקבוצת החזקה.');}
    else if(/^[A-Za-z][A-Za-z0-9_]*$/.test(t||''))v={type:'name',name:t};
    else throw Error('חסר שם קבוצה או איבר.');
    while(peek()==='ᶜ'){take();v=node('complement',v);}depth--;return v;
  }
  function meet(){let a=term();while(['∩','∖'].includes(peek())){const t=take();a=node(t==='∩'?'intersection':'difference',a,term());}return a;}
  function setExpr(){let a=meet();while(['∪','△'].includes(peek())){const t=take();a=node(t==='∪'?'union':'symmetric',a,meet());}return a;}
  function atom(){
    if(peek()==='∀'){
      take();const variable=take();if(!/^[a-z][a-z0-9_]{0,7}$/.test(variable||''))throw Error('אחרי ∀ כתבו שם משתנה, למשל x.');
      if(take()!=='∈')throw Error('ציינו את התחום: למשל ∀x ∈ A: (x ∈ B).');
      const domain=setExpr();if(take()!==':')throw Error('הפרידו בנקודתיים בין התחום לבין התנאי.');
      return node('forall',{type:'name',name:variable},domain,iff());
    }
    if(peek()==='¬'){take();return node('not',atom());}
    if(['T','F'].includes(peek())&&!['∈','∉','⊆','⊈','⊇','⊉','=','≠'].includes(tokens[i+1]))return node(take()==='T'?'true':'false');
    const start=i;let lhs;
    try{lhs=setExpr();}catch{ i=start; }
    if(lhs&&['∈','∉','⊆','⊈','⊇','⊉','=','≠'].includes(peek())){
      const op=take(),rhs=setExpr();
      if(['⊇','⊉'].includes(op)){
        const v=preserveDirection?node('superset',lhs,rhs):node('subset',rhs,lhs);
        return op==='⊉'?node('not',v):v;
      }
      const v=node({'∈':'member','∉':'member','⊆':'subset','⊈':'subset','=':'equal','≠':'equal'}[op],lhs,rhs);
      return ['∉','⊈','≠'].includes(op)?node('not',v):v;
    }
    i=start;
    if(take()==='('){const v=iff();if(take()!==')')throw Error('חסר סוגר ימני בטענה.');return v;}
    throw Error('כתבו טענה שלמה: למשל x ∈ A, ולא רק A.');
  }
  function chain(next,token,type){let a=next();while(peek()===token){take();a=node(type,a,next());}return a;}
  const and=()=>chain(atom,'∧','and'),or=()=>chain(and,'∨','or');
  function imp(){const a=or();return peek()==='→'?(take(),node('imp',a,imp())):a;}
  const iff=()=>chain(imp,'↔','iff');
  const result=iff();if(i!==tokens.length)throw Error('נשאר חלק שלא נקרא. השתמשו בסוגריים סביב טענות השייכות.');return result;
}
const symbols={intersection:'∩',union:'∪',difference:'∖',symmetric:'△',member:'∈',subset:'⊆',superset:'⊇',equal:'=',and:'∧',or:'∨',imp:'→',iff:'↔'};
export function show(n){
  if(typeof n==='string')n=parseStatement(n);
  if(n.type==='name')return n.name;
  if(n.type==='forall')return `∀${show(n.args[0])} ∈ ${show(n.args[1])}: (${show(n.args[2])})`;
  if(n.type==='empty')return '∅';if(n.type==='true')return 'T';if(n.type==='false')return 'F';
  if(n.type==='power')return `P(${show(n.args[0])})`;
  if(n.type==='singleton')return `{${show(n.args[0])}}`;
  if(n.type==='complement')return `${wrapSet(n.args[0])}ᶜ`;
  if(n.type==='not'){
    const a=n.args[0],op={member:'∉',subset:'⊈',superset:'⊉',equal:'≠'}[a.type];
    return op?`${show(a.args[0])} ${op} ${show(a.args[1])}`:`¬(${show(a)})`;
  }
  if(['intersection','union','difference','symmetric'].includes(n.type))return n.args.map(wrapSet).join(` ${symbols[n.type]} `);
  if(['member','subset','superset','equal'].includes(n.type))return n.args.map(show).join(` ${symbols[n.type]} `);
  return n.args.map(a=>['and','or','imp','iff','forall'].includes(a.type)?`(${show(a)})`:show(a)).join(` ${symbols[n.type]} `);
}
// Keep the student's choice of containment direction in displayed proof rows.
export const showWritten=s=>show(parseStatement(s,{preserveDirection:true}));
const wrapSet=n=>['intersection','union','difference','symmetric'].includes(n.type)?`(${show(n)})`:show(n);
export function names(n){return n.type==='name'?[n.name]:(n.args||[]).flatMap(names);}
export function validateTypes(n,config){
  const sets=new Set(config.sets||['A','B','C','U']),objects=new Set(config.objects||['x']);
  const set=t=>{
    if(t.type==='name'){if(!sets.has(t.name))throw Error(`⁦${t.name}⁩ אינו שם קבוצה בתרגיל. השתמשו בשמות הנתונים.`);return;}
    if(t.type==='empty')return;
    if(t.type==='singleton'){object(t.args[0]);return;}
    if(!['union','intersection','difference','symmetric','power','complement'].includes(t.type))throw Error('במקום הזה נדרש ביטוי של קבוצה.');
    if(t.type==='complement'&&!config.universe)throw Error('משלים דורש קבוצה אוניברסלית שהוגדרה בתרגיל.');
    t.args.forEach(set);
  };
  const object=t=>{if(t.type==='name'&&objects.has(t.name))return;set(t);};
  const formula=t=>{if(t.type==='forall'){set(t.args[1]);const name=t.args[0].name,had=objects.has(name);objects.add(name);formula(t.args[2]);if(!had)objects.delete(name);}else if(t.type==='member'){object(t.args[0]);set(t.args[1]);}else if(['subset','equal'].includes(t.type))t.args.forEach(set);else if(['and','or','imp','iff','not'].includes(t.type))t.args.forEach(formula);else if(!['true','false'].includes(t.type))throw Error('נדרשת טענה ולא קבוצה.');};
  formula(n);return n;
}
export function mapTree(n,f){const rebuilt=n.args?{...n,args:n.args.map(a=>mapTree(a,f))}:n;return f(rebuilt);}
export function unfold(n,kind,universe='U'){
  return mapTree(n,t=>{
    if(t.type!=='member')return t;const [x,a]=t.args,m=s=>node('member',x,s);
    if(a.type!==kind)return t;
    if(kind==='intersection')return node('and',m(a.args[0]),m(a.args[1]));
    if(kind==='union')return node('or',m(a.args[0]),m(a.args[1]));
    if(kind==='difference')return node('and',m(a.args[0]),node('not',m(a.args[1])));
    if(kind==='symmetric')return node('or',node('and',m(a.args[0]),node('not',m(a.args[1]))),node('and',node('not',m(a.args[0])),m(a.args[1])));
    if(kind==='complement')return node('and',m({type:'name',name:universe}),node('not',m(a.args[0])));
    if(kind==='empty')return node('false');
    if(kind==='power')return node('subset',x,a.args[0]);
    return t;
  });
}
// Association/commutation and double negation do not create mathematical facts.
export function canonical(n){
  if(n.type==='not'){const a=canonical(n.args[0]);return a.type==='not'?a.args[0]:node('not',a);}
  if(['and','or'].includes(n.type)){
    const args=n.args.map(canonical).flatMap(a=>a.type===n.type?a.args:[a]);
    return node(n.type,...args.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
  }
  return n.args?{...n,args:n.args.map(canonical)}:n;
}
function alpha(n,bindings=new Map(),depth=0){
  if(n.type==='name')return bindings.has(n.name)?{...n,name:bindings.get(n.name)}:n;
  if(n.type==='forall'){
    const [v,d,b]=n.args,next=new Map(bindings),name='@bound'+depth;next.set(v.name,name);
    return node('forall',{type:'name',name},alpha(d,bindings,depth),alpha(b,next,depth+1));
  }
  return n.args?{...n,args:n.args.map(a=>alpha(a,bindings,depth))}:n;
}
export const equivalentShape=(a,b)=>same(canonical(alpha(a)),canonical(alpha(b)));
export function freeNames(n,bound=new Set()){
  if(n.type==='name')return bound.has(n.name)?[]:[n.name];
  if(n.type==='forall')return [...freeNames(n.args[1],bound),...freeNames(n.args[2],new Set([...bound,n.args[0].name]))];
  return (n.args||[]).flatMap(a=>freeNames(a,bound));
}
export function substituteName(n,from,to){
  if(n.type==='name')return n.name===from?to:n;
  if(n.type==='forall'){
    const [v,d,b]=n.args;
    if(v.name===from)return node('forall',v,substituteName(d,from,to),b);
    // Avoid capturing an existing free occurrence when replacing inside a binder.
    if(to.type==='name'&&v.name===to.name&&freeNames(b).includes(from))throw Error('ההצבה תגרום לערבוב משתנים. בחרו שם אחר.');
  }
  return n.args?{...n,args:n.args.map(a=>substituteName(a,from,to))}:n;
}
export function expandSubset(n,variable='x'){
  if(n.type!=='subset')throw Error('הפתיחה הזאת מיועדת לטענת הכלה.');
  const x={type:'name',name:variable};return node('forall',x,n.args[0],node('member',x,n.args[1]));
}
export function propStrings(formulas){
  const atoms=[];const walk=n=>{
    if(n.type==='true')return 'T';if(n.type==='false')return 'F';
    if(n.type==='not')return `!(${walk(n.args[0])})`;
    if(['and','or','imp','iff'].includes(n.type))return '('+n.args.map(walk).join({and:' & ',or:' | ',imp:' -> ',iff:' <-> '}[n.type])+')';
    let i=atoms.findIndex(a=>same(a,n));if(i<0){i=atoms.length;atoms.push(n);}return 'V'+i;
  };
  const strings=formulas.map(walk);return {strings,atoms};
}
