import {readable} from './sets.js';
function normalize(text){
  return text.replace(/[\u2066-\u2069]/g,'').replace(/\\(?:left|right)/g,'')
    .replace(/\\?(forall|exists|neg|lnot|not|in|colon)\b/gi,(_,w)=>({forall:'∀',exists:'∃',neg:'¬',lnot:'¬',not:'¬',in:'∈',colon:':'})[w.toLowerCase()])
    .replace(/[!~]/g,'¬').trim();
}

// A deliberately small grammar for these two exercises: restricted quantifiers,
// negation, parentheses, and a unary predicate. No execution of student input.
function parse(text){
  const tokens=text.match(/[∀∃¬∈():]|[A-Za-z][A-Za-z0-9_]*/g)||[];
  if(tokens.join('')!==text.replace(/\s/g,''))throw Error('בדקו את הסימנים. אפשר להשתמש בכפתורי הסימון שמתחת לשדה.');
  let i=0;
  const take=value=>{if(tokens[i++]!==value)throw Error('בדקו את הסוגריים ואת כתיבת התחום: למשל ∀x ∈ D: P(x).');};
  const name=()=>{const n=tokens[i++];if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(n||''))throw Error('חסר שם של משתנה, תחום או פסוק פתוח.');return n;};
  function read(depth=0){
    if(depth>20)throw Error('כתבו נוסחה קצרה עם כמת אחד ושלילה של P(x).');
    if(tokens[i]==='¬'){i++;return {type:'not',body:read(depth+1)};}
    if(tokens[i]==='('){i++;const n=read(depth+1);take(')');return n;}
    if(['∀','∃'].includes(tokens[i])){
      const type=tokens[i++],variable=name();take('∈');const domain=name();if(tokens[i]===':')i++;
      return {type,variable,domain,body:read(depth+1)};
    }
    const predicate=name();take('(');const variable=name();take(')');return {type:'predicate',predicate,variable};
  }
  const result=read();if(i!==tokens.length)throw Error('נשארו סימנים אחרי הנוסחה. בדקו את הסוגריים.');return result;
}

export function checkQuantifierNegation(input,original){
  const text=normalize(input),fail=message=>({ok:false,message});
  if(!text)return fail('כתבו את שלילת הפסוק, כשהשלילה נמצאת לפני P(x).');
  if(text.length>300)return fail('כתבו נוסחה קצרה עם כמת אחד ושלילה של P(x).');
  let n;try{n=parse(text);}catch(e){return fail(e.message);}
  if(n.type==='not'&&n.body.type===original&&n.body.domain==='D'&&n.body.body.type==='predicate'&&n.body.body.predicate==='P'&&n.body.variable===n.body.body.variable)
    return {ok:false,partial:true,message:'זו שלילה נכונה של הפסוק כולו. כדי להשלים את התרגיל, הכניסו את השלילה פנימה בעזרת הכלל: החליפו את הכמת ושללו את P(x).'};
  if(!['∀','∃'].includes(n.type))return fail('כתבו את התשובה עם הכמת בתחילת הנוסחה, ואת השלילה בתוך התחום שלו.');
  if(n.domain!=='D')return fail('התחום נשאר D. שלילת הטענה אינה משנה את תחום הדיון.');
  if(n.type===original)return fail('בשלילה מחליפים את הכמת: ״לכל״ הופך ל״קיים״, ו״קיים״ הופך ל״לכל״.');
  if(n.body.type!=='not')return fail('הכמת הוחלף, אבל צריך גם לשלול את P(x).');
  const atom=n.body.body;
  if(atom.type!=='predicate'||atom.predicate!=='P')return fail('כאן צריך לכתוב שלילה אחת של הפסוק הפתוח P(x).');
  if(atom.variable!==n.variable)return fail('המשתנה בתוך P צריך להיות אותו משתנה שעליו חל הכמת.');
  return {ok:true,message:original==='∀'?'נכון. כדי שלא כל איברי D יקיימו את P, צריך שיהיה קיים לפחות איבר אחד שאינו מקיים אותו.':'נכון. אם לא קיים איבר ב־D שמקיים את P, אז לכל איבר בתחום מתקיים ¬P.'};
}

export function initQuantifierNegation(box){
  if(box.dataset.ready)return;box.dataset.ready='true';
  const original=box.dataset.quantifierNegation;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
  const form=el('form','quantifier-negation-form'),label=el('label','','כתבו את השלילה: '),input=el('input','bk-input');
  input.type='text';input.dir='ltr';input.maxLength=300;input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-label',original==='∀'?'שלילת פסוק לכל':'שלילת פסוק קיים');label.append(input);
  const keys=el('div','quantifier-negation-keys');keys.hidden=true;
  input.addEventListener('focus',()=>{keys.hidden=false;});
  for(const symbol of ['∀','∃','∈','¬',':','P(x)','(',')']){
    const key=el('button','bk-btn',symbol);key.type='button';key.dir='ltr';key.setAttribute('aria-label','הוספת '+symbol);
    key.addEventListener('mousedown',e=>e.preventDefault());key.addEventListener('click',()=>{input.setRangeText(symbol,input.selectionStart,input.selectionEnd,'end');input.focus();input.dispatchEvent(new Event('input'));});keys.append(key);
  }
  const feedback=el('p','bk-msg');feedback.setAttribute('aria-live','polite');
  input.addEventListener('input',()=>{feedback.textContent='';feedback.className='bk-msg';input.removeAttribute('aria-invalid');});
  const check=el('button','bk-btn bk-main','בדיקה');check.type='submit';
  const hint=el('details','set-proof-hint');hint.append(el('summary','','רמז'),el('p','','החליפו ״לכל״ ב״קיים״ או להפך, השאירו את התחום D, ושללו את P(x).'));
  form.addEventListener('submit',e=>{e.preventDefault();input.value=normalize(input.value);const result=checkQuantifierNegation(input.value,original);feedback.textContent=readable(result.message);feedback.className='bk-msg '+(result.ok?'bk-good':result.partial?'bk-info':'bk-bad');input.setAttribute('aria-invalid',String(!result.ok&&!result.partial));});
  form.append(label,keys,check,hint,feedback);box.append(form);
}
