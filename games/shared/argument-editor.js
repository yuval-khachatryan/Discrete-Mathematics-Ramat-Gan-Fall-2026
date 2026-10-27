import { ARGUMENTS } from "./argument-exercises.js";
import { LETTERS, INFERENCE_RULES, ruleName, rename, formulaBank, checkMapping, checkTranslations, checkArgument } from "./argument-rules.js";
import { RULES, ruleExamples } from "./proof-rules.js";

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (k === "text") node.textContent = v;
    else if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2),v);
    else node.setAttribute(k,v);
  }
  children.forEach(c => node.append(c));
  return node;
}
const btn = (text,fn,primary=false) => el("button", { type:"button", class:`bk-btn${primary?" bk-main":""}`, text, onclick:fn });
const formulaText = text => el("div", { class:"proof-formula",dir:"ltr",text });
let serial = 0;

export function initArgumentEditor(box) {
  const exercise = ARGUMENTS[box.dataset.argument];
  if (!exercise) return;
  let mapping = null, rows = [], nextRow = 0, hintIndex = 0;
  const translationFields = [];
  const list = el("div",{class:"argument-steps"});
  const summary = el("div",{class:"bk-msg","aria-live":"polite"});
  const mappingMsg = el("div",{class:"bk-msg","aria-live":"polite"});
  const translationMsg = el("div",{class:"bk-msg","aria-live":"polite"});
  const reference = el("ol",{class:"argument-premises"});
  const goalView = el("div",{class:"proof-start"});
  const solution = el("div",{class:"argument-solution"});
  solution.hidden = true;
  const letterSelects = exercise.atoms.map((atom,i) => {
    const select = el("select",{class:"argument-letter","aria-label":`האות עבור: ${atom.text}`}, LETTERS.map(letter=>el("option",{value:letter,text:letter})));
    select.value = ["A","B","C"][i];
    select.addEventListener("change",() => {
      stage2.hidden = true; stage3.hidden = true;
      mappingMsg.className = "bk-msg bk-info";
      mappingMsg.textContent = mapping ? "הסימונים השתנו. אישור סימונים שונים יתחיל את התרגום ואת ההוכחה מחדש. אפשר להחזיר את האותיות הקודמות כדי לשמור על העבודה." : "אשרו את הסימונים כדי להתחיל לתרגם.";
      applyMapping.textContent = mapping ? "אישור הסימונים והמשך" : "אישור הסימונים";
    });
    return select;
  });
  const applyMapping = btn("אישור הסימונים",() => {
    const proposed = Object.fromEntries(exercise.atoms.map((atom,i)=>[atom.id,letterSelects[i].value]));
    const result = checkMapping(exercise,proposed);
    mappingMsg.className = `bk-msg ${result.ok?"bk-good":"bk-bad"}`;
    mappingMsg.textContent = result.message;
    if (!result.ok) return;
    const changed = JSON.stringify(proposed) !== JSON.stringify(mapping);
    mapping = proposed;
    if (changed) {
      translationFields.forEach(row=>{ row.input.value=""; row.feedback.textContent=""; row.input.removeAttribute("aria-invalid"); });
      translationMsg.textContent="";
      rows=[]; list.replaceChildren(); nextRow=0; addRow();
      solution.hidden=true; solution.replaceChildren();
    }
    stage2.hidden=false; stage3.hidden=true;
    applyMapping.textContent="אישור הסימונים";
  },true);
  const stage1 = el("section",{class:"argument-stage"},[
    el("h4",{text:"1. בוחרים שמות למשפטים"}),
    el("p",{text:"בחרו אות שונה לכל משפט. אפשר להשאיר את האותיות המוצעות או לבחור אחרות. האות היא שם למשפט, לא קביעה שהוא נכון. T ו־F שמורות לאמת ולשקר."}),
    ...exercise.atoms.map((atom,i)=>el("label",{class:"argument-mapping"},[letterSelects[i],el("span",{text:atom.text})])),
    applyMapping,mappingMsg,
  ]);

  function invalidateProof() {
    stage3.hidden=true;
    translationMsg.className="bk-msg bk-info";
    translationMsg.textContent="בדקו את התרגום לפני שממשיכים בהוכחה. הצעדים שכבר כתבתם נשמרו.";
    translationFields.forEach(r=>{r.feedback.textContent="";r.input.removeAttribute("aria-invalid");});
    clearResults();
  }
  function inputField(label,oninput) {
    const feedbackId=`argument-feedback-${++serial}`;
    const feedback=el("div",{id:feedbackId,class:"bk-msg"});
    const input=el("input",{type:"text",class:"bk-input proof-input",dir:"ltr",maxlength:"240",autocomplete:"off",spellcheck:"false","aria-label":label,"aria-describedby":feedbackId,placeholder:"כתבו נוסחה",oninput() {
      const a=input.selectionStart,b=input.selectionEnd;
      input.value=input.value.toUpperCase();input.setSelectionRange(a,b);oninput();
    }});
    const keys=el("div",{class:"bk-keys",role:"group","aria-label":"סמלים לנוסחה הזאת"},[["¬","שלילה"],["∧","וגם"],["∨","או"],["→","גרירה"],["(","סוגר פותח"],[")","סוגר סוגר"]].map(([symbol,name])=>btn(symbol,()=>{
      const a=input.selectionStart??input.value.length,b=input.selectionEnd??a;
      if(input.value.length-(b-a)+symbol.length>240)return;
      input.value=input.value.slice(0,a)+symbol+input.value.slice(b);input.focus();input.setSelectionRange(a+symbol.length,a+symbol.length);oninput();
    })));
    [...keys.children].forEach((key,i)=>{key.className="bk-key";key.setAttribute("aria-label",["שלילה","וגם","או","גרירה","סוגר פותח","סוגר סוגר"][i]);});
    return {input,keys,feedback};
  }
  const stage2=el("section",{class:"argument-stage"},[
    el("h4",{text:"2. מתרגמים את הנתונים ואת המטרה"}),
    el("p",{text:"כל הנתונים כאן הם הנחות של התרגיל: מותר להשתמש בהם בהוכחה. כתבו כל משפט בעזרת האותיות שבחרתם. המטרה היא מה שצריך להוכיח; אסור להשתמש בה כאילו הייתה נתון."}),
  ]);
  [...exercise.premises,exercise.goal].forEach((entry,i)=>{
    const label=i<exercise.premises.length?`נתון ${i+1}`:"המטרה להוכחה";
    const row=inputField(`תרגום: ${label}`,invalidateProof);
    translationFields.push(row);
    stage2.append(el("div",{class:"argument-translation"},[el("label",{class:"proof-field"},[el("strong",{text:`${label}: ${entry.text}`}),row.input]),row.keys,row.feedback]));
  });
  stage2.append(btn("בדיקת התרגום ופתיחת ההוכחה",()=>{
    const result=checkTranslations(exercise,mapping,premiseValues(),goalValue());
    result.items.forEach((item,i)=>show(translationFields[i],item));
    translationMsg.className=`bk-msg ${result.ok?"bk-good":"bk-bad"}`;
    translationMsg.textContent=result.ok?"כל התרגומים מתאימים. עכשיו משתמשים בנתונים כדי להוכיח את המטרה.":"תקנו את התרגומים המסומנים ובדקו שוב.";
    stage3.hidden=!result.ok;
    clearResults();
    if(result.ok) {
      reference.replaceChildren(...result.items.slice(0,-1).map((entry,i)=>el("li",{},[el("strong",{text:`נתון ${i+1}: ${exercise.premises[i].text}`}),formulaText(entry.formula)])));
      goalView.replaceChildren(el("strong",{text:`המטרה: ${exercise.goal.text}`}),formulaText(result.items.at(-1).formula));
      refreshReferences();
    }
  },true),translationMsg);
  stage2.hidden=true;

  const hint=btn("רמז",()=>{
    if(hintIndex<exercise.hints.length) hints.append(el("p",{text:exercise.hints[hintIndex++]}));
    hint.disabled=hintIndex===exercise.hints.length;
  });
  const hints=el("div",{class:"argument-hints","aria-live":"polite"});
  const add=btn("הוספת צעד",()=>addRow(true));
  const proofForm=el("form",{onsubmit(e){e.preventDefault();check();}},[list,el("div",{class:"bk-bar"},[add,el("button",{type:"submit",class:"bk-btn bk-main",text:"בדיקת ההוכחה"})]),summary]);
  const stage3=el("section",{class:"argument-stage"},[
    el("h4",{text:"3. בונים הוכחה"}),goalView,reference,
    el("p",{text:"בכל צעד בחרו נוסחה מהמאגר או כתבו נוסחה בעצמכם, בחרו כלל וציינו מאילו שורות היא נובעת. במאגר יש גם אפשרויות שאינן נובעות מהנתונים: עצם הופעת הנוסחה במאגר אינה מצדיקה אותה. לכל אחד משלושת כללי ההיסק שבתרגול בוחרים שתי שורות קודמות; לשינוי לפי חוק שקילות בוחרים שורה אחת. גם צעד שכבר הוכחתם יכול לשמש מקור, ואפשר להגיע למטרה בדרכים שונות."}),
    proofForm,
    btn("הצגת דרך פתרון לפי האותיות שלי",()=>{
      solution.replaceChildren(el("strong",{text:"דרך אפשרית אחת — אפשר להוכיח גם בדרך אחרת:"}));
      exercise.solution.forEach((step,i)=>{
        const sources=step.refs.map(id=>id.startsWith("p")?`נתון ${id.slice(1)}`:`צעד ${id.slice(1)}`).join(" ו־");
        solution.append(el("p",{text:`צעד ${i+1}: ${ruleName(step.rule)}, מתוך ${sources}.`}),formulaText(rename(step.formula,mapping)));
      });
      solution.hidden=false;
    }),solution,
  ]);
  stage3.hidden=true;
  box.append(stage1,stage2,stage3,el("div",{class:"bk-bar"},[hint]),hints);
  box.classList.add("argument-ready");

  function premiseValues(){return translationFields.slice(0,-1).map(r=>r.input.value);}
  function goalValue(){return translationFields.at(-1).input.value;}
  function clearResults(){
    summary.textContent="";summary.className="bk-msg";
    rows.forEach(row=>{row.feedback.textContent="";row.feedback.className="bk-msg";row.input.removeAttribute("aria-invalid");});
  }
  function refreshReferences(){
    const prior=exercise.premises.map((entry,i)=>({id:`p${i+1}`,label:`נתון ${i+1}: ${translationFields[i].input.value}`}));
    rows.forEach((row,i)=>{
      row.legend.textContent=`צעד ${i+1}`;
      row.input.setAttribute("aria-label",`נוסחה בצעד ${i+1}`);
      row.bank.setAttribute("aria-label",`מאגר נוסחאות לצעד ${i+1}`);
      row.rule.setAttribute("aria-label",`כלל בצעד ${i+1}`);
      row.remove.setAttribute("aria-label",`מחיקת צעד ${i+1}`);
      row.sources.forEach((select,j)=>{
        const value=select.value;
        select.setAttribute("aria-label",`מקור ${j+1} בצעד ${i+1}`);
        select.replaceChildren(el("option",{value:"",text:"בחרו שורת מקור…"}),...prior.map(p=>el("option",{value:p.id,text:p.label})));
        if(value&&!prior.some(p=>p.id===value))select.append(el("option",{value,text:"השורה שנבחרה נמחקה — בחרו מקור אחר"}));
        select.value=value;
      });
      prior.push({id:row.id,label:`צעד ${i+1}: ${row.input.value||"טרם נכתבה נוסחה"}`});
    });
    add.disabled=rows.length>=20;
    add.textContent=add.disabled?"אפשר לכתוב עד 20 צעדים":"הוספת צעד";
  }
  function addRow(focus=false){
    if(rows.length>=20)return;
    clearResults();
    const row=inputField("נוסחה בצעד חדש",()=>{row.bank.value="";clearResults();refreshReferences();});
    row.bank=el("select",{class:"argument-formula-bank"},[
      el("option",{value:"",text:"בחרו נוסחה מהמאגר…"}),
      ...formulaBank(exercise,mapping).map(f=>el("option",{value:f,text:f})),
    ]);
    row.bank.addEventListener("change",()=>{
      if(!row.bank.value)return;
      row.input.value=row.bank.value;clearResults();refreshReferences();
    });
    row.id=`d${++nextRow}`;
    row.legend=el("legend");
    row.rule=el("select",{class:"proof-rule"},[
      el("option",{value:"",text:"בחרו כלל…"}),
      el("optgroup",{label:"כללי היסק — שתי שורות מקור"},INFERENCE_RULES.map(r=>el("option",{value:r.id,text:r.name}))),
      el("optgroup",{label:"שינוי לנוסחה שקולה — שורת מקור אחת"},RULES.map(r=>el("option",{value:`eq:${r.id}`,text:r.name}))),
    ]);
    row.sources=[el("select",{class:"argument-source"}),el("select",{class:"argument-source"})];
    const labels=row.sources.map((select,i)=>el("label",{class:"proof-field"},[el("span",{text:`שורת מקור ${i+1}`}),select]));
    const reminder=el("div",{class:"argument-rule-help"});
    row.rule.addEventListener("change",()=>{
      clearResults();
      const rewrite=row.rule.value.startsWith("eq:");
      labels[1].hidden=rewrite;
      reminder.replaceChildren();
      if(rewrite){reminder.append(el("p",{text:"מחליפים חלק אחד בנוסחה לפי החוק. שאר הנוסחה נשארת ללא שינוי."}),...ruleExamples(row.rule.value.slice(3)).map(formulaText));}
      else {const rule=INFERENCE_RULES.find(r=>r.id===row.rule.value);if(rule)reminder.append(el("p",{text:rule.help}),formulaText(rule.example),el("p",{text:"הסימן ⟹ בתזכורת אומר: מן הנתונים שמשמאל מסיקים את הנוסחה שמימין. האותיות P, Q, R הן שמות כלליים בתבנית; בתשובה השתמשו באותיות שבחרתם."}));}
    });
    row.sources.forEach(select=>select.addEventListener("change",clearResults));
    row.remove=btn("מחיקת הצעד",()=>{
      const i=rows.indexOf(row);rows.splice(i,1);row.fieldset.remove();clearResults();
      if(!rows.length)addRow();refreshReferences();rows[Math.min(i,rows.length-1)].input.focus();
    });
    row.fieldset=el("fieldset",{class:"proof-step"},[
      row.legend,el("label",{class:"proof-field"},[el("span",{text:"אפשר לבחור נוסחה מהמאגר"}),row.bank]),
      el("label",{class:"proof-field"},[el("span",{text:"הנוסחה שבחרתם — אפשר גם לכתוב או לערוך כאן"}),row.input]),row.keys,
      el("label",{class:"proof-field"},[el("span",{text:"לפי איזה כלל?"}),row.rule]),reminder,...labels,row.feedback,row.remove,
    ]);
    rows.push(row);list.append(row.fieldset);refreshReferences();if(focus)row.input.focus();
  }
  function show(row,item){
    row.feedback.className=`bk-msg ${item.ok?"bk-good":"bk-bad"}`;
    row.feedback.textContent=item.message;
    if(item.row)row.feedback.append(formulaText(Object.entries(item.row).map(([n,v])=>`${n} = ${v?"T":"F"}`).join(", ")));
    if(!item.ok)row.input.setAttribute("aria-invalid","true");else row.input.removeAttribute("aria-invalid");
  }
  function check(){
    clearResults();
    const result=checkArgument(exercise,mapping,premiseValues(),goalValue(),rows.map(row=>({id:row.id,formula:row.input.value,rule:row.rule.value,refs:row.sources.slice(0,row.rule.value.startsWith("eq:")?1:2).map(s=>s.value)})));
    if(result.phase==="translation"){invalidateProof();return;}
    result.results.forEach((item,i)=>show(rows[i],item));
    summary.className=`bk-msg ${result.ok?(result.complete?"bk-good":"bk-info"):"bk-bad"}`;
    summary.textContent=result.ok?(result.complete?`ההוכחה הושלמה! כל צעד מוצדק מתוך שורות קודמות. הוכחתם: ${exercise.goal.text}`:"כל הצעדים שכתבתם מוצדקים. הוסיפו צעד כדי להגיע למטרה."):`צריך לתקן את צעד ${result.results.length}. הצעדים שאחריו עדיין לא נבדקו.`;
    rows.slice(result.results.length).forEach(row=>{row.feedback.textContent="ממתין לתיקון הצעד הקודם.";});
  }
}
