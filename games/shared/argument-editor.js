import {proofTable} from './proof-table.js';
import {proofFormula} from './proof-notation.js';
import {deductionCandidates,deductionHint} from './deduction-hints.js';
import {inferenceView,formalRuleReminder,ruleFormulaLabel} from "./inference-view.js";
import { activityHelp } from "./activity-help.js";
import { compactProofStep } from "./compact-proof-step.js";
import { contextualKeyboard } from "./formula-keyboard.js";
import {replacementEditor} from "./replacement-editor.js";
import { ARGUMENTS } from "./argument-exercises.js";
import { INFERENCE_RULES, sourceCount, ruleName, rename, checkMapping, checkTranslations, checkArgument } from "./argument-rules.js";
import { trimBlankSteps, stepReason, stepRuleNames, sourceCitation, proofSourceLabel } from "./proof-rules.js";
import { format } from "./logic.js";
import { argumentLines } from "./argument-display.js";

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
  let accepted = [], translationApproved = false;
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
    const select = el("input",{type:"text",class:"bk-input argument-letter",dir:"ltr",maxlength:"16",autocomplete:"off",spellcheck:"false","aria-label":`השם עבור: ${atom.text}`});
    select.value = ["A","B","C"][i];
    select.addEventListener("input",() => {
      select.value=select.value.toUpperCase();
      stage2.hidden = true; stage3.hidden = true;
      mappingMsg.className = "bk-msg bk-info";
      mappingMsg.textContent = mapping ? "הסימונים השתנו. אישור שמות שונים יתחיל את התרגום ואת ההוכחה מחדש. אפשר להחזיר את השמות הקודמים כדי לשמור על העבודה." : "אשרו את הסימונים כדי להתחיל לתרגם.";
      applyMapping.textContent = "אישור הסימונים";
    });
    return select;
  });
  const applyMapping = btn("אישור הסימונים",() => {
    const proposed = Object.fromEntries(exercise.atoms.map((atom,i)=>[atom.id,letterSelects[i].value.trim().toUpperCase()]));
    const result = checkMapping(exercise,proposed);
    mappingMsg.className = `bk-msg ${result.ok?"bk-good":"bk-bad"}`;
    mappingMsg.textContent = result.message;
    if (!result.ok) return;
    const changed = JSON.stringify(proposed) !== JSON.stringify(mapping);
    mapping = proposed;
    meanings.replaceChildren(...exercise.atoms.map(atom=>el("p",{},[el("bdi",{dir:"ltr",text:mapping[atom.id]}),el("span",{text:" — "+atom.text})])));
    if (changed) {
      translationApproved=false;
      translationFields.forEach(row=>{ row.input.value=""; row.feedback.textContent=""; row.input.removeAttribute("aria-invalid"); });
      translationMsg.textContent="";
      rows=[]; list.replaceChildren(); nextRow=0; addRow();
      solution.hidden=true; solution.replaceChildren();
    }
    stage2.hidden=false; stage3.hidden=true;
    applyMapping.textContent="אישור הסימונים";
  },true);
  const meanings = el("div",{class:"argument-meanings"});
  const stage1 = el("details",{class:"argument-stage argument-symbol-options"},[
    el("summary",{text:"שינוי הסימונים (לבחירה)"}),
    el("p",{text:"אפשר להשתמש באות אחת או בשם קצר, למשל HAS_CARD. מתחילים באות אנגלית; אפשר להוסיף ספרות וקו תחתון, עד 16 תווים. אותיות קטנות הופכות לגדולות. לכל משפט בחרו שם שונה; T, F ושמות הקשרים שמורים."}),
    ...exercise.atoms.map((atom,i)=>el("label",{class:"argument-mapping"},[letterSelects[i],el("span",{text:atom.text})])),
    applyMapping,mappingMsg,
  ]);

  function invalidateProof() {
    translationApproved=false;
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
    const keys=el("div",{class:"bk-keys",role:"group","aria-label":"סמלים לנוסחה הזאת"},[["¬","שלילה"],["∧","וגם"],["∨","או"],["→","גרירה"],["↔","אם ורק אם"],["(","סוגר פותח"],[")","סוגר סוגר"]].map(([symbol,name])=>btn(symbol,()=>{
      const a=input.selectionStart??input.value.length,b=input.selectionEnd??a;
      if(input.value.length-(b-a)+symbol.length>240)return;
      input.value=input.value.slice(0,a)+symbol+input.value.slice(b);input.focus();input.setSelectionRange(a+symbol.length,a+symbol.length);oninput();
    })));
    [...keys.children].forEach((key,i)=>{key.className="bk-key";key.setAttribute("aria-label",["שלילה","וגם","או","גרירה","אם ורק אם","סוגר פותח","סוגר סוגר"][i]);});
    contextualKeyboard(input,keys);
    return {input,keys,feedback};
  }
  const stage2=el("section",{class:"argument-stage"},[
    el("h4",{text:"הצרנת הנתונים והמטרה"}),
  ]);
  [...exercise.premises,exercise.goal].forEach((entry,i)=>{
    const label=i<exercise.premises.length?`נתון ${i+1}`:"המטרה להוכחה";
    const row=inputField(`תרגום: ${label}`,invalidateProof);
    translationFields.push(row);
    stage2.append(el("div",{class:"argument-translation"},[el("label",{class:"proof-field"},[el("strong",{text:`${label}: ${entry.text}`}),row.input]),row.keys,row.feedback]));
  });
  stage2.append(btn("בדיקת התרגום ופתיחת ההוכחה",()=>{
    const result=checkTranslations(exercise,mapping,premiseValues(),goalValue());
    translationApproved=result.ok;
    result.items.forEach((item,i)=>show(translationFields[i],item));
    translationMsg.className=`bk-msg ${result.ok?"bk-good":"bk-bad"}`;
    translationMsg.textContent=result.ok?"כל התרגומים מתאימים. עכשיו משתמשים בנתונים כדי להוכיח את המטרה.":"תקנו את התרגומים המסומנים ובדקו שוב.";
    stage3.hidden=!result.ok;
    clearResults();
    if(result.ok) {
      stage2.hidden=true;
      reference.replaceChildren(...result.items.slice(0,-1).map((entry,i)=>el("li",{},[el("span",{class:"given-label",text:`נתון ${i+1}`}),el("strong",{text:exercise.premises[i].text}),formulaText(entry.formula),btn(`עריכת נתון ${i+1}`,()=>{stage2.hidden=false;translationFields[i].input.focus();})])));
      goalView.replaceChildren(el("strong",{text:`המטרה: ${exercise.goal.text}`}),formulaText(result.items.at(-1).formula),btn("עריכת המטרה",()=>{stage2.hidden=false;translationFields.at(-1).input.focus();}));
      [...reference.querySelectorAll('.bk-btn'),goalView.querySelector('.bk-btn')].forEach(button=>{button.setAttribute('aria-label',button.textContent);button.textContent='עריכה';});
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
  const undo=btn("חזרה לצעד האחרון",()=>{
    if(!accepted.length)return;
    const index=accepted.length-1;
    while(rows.length>index+1&&!rows.at(-1).input.value.trim()&&!rows.at(-1).rule.value)rows.pop().fieldset.remove();
    clearResults(index);refreshReferences();rows[index].compact.focus();
  });
  const ledger=el('section',{class:'proof-ledger','aria-label':'ההוכחה'},[goalView,reference,list]);
  const proofForm=el("form",{onsubmit(e){e.preventDefault();check(rows.length-1,true);}},[ledger,el("div",{class:"bk-bar"},[add,undo,el("button",{type:"submit",class:"bk-btn bk-main",text:"סיימתי את ההוכחה — בדקו"})]),summary]);
  const tablePractice=proofTable(()=>({premises:premiseValues(),conclusion:goalValue()}));
  const stage3=el("section",{class:"argument-stage"},[
    el("h4",{text:"בונים הוכחה"}),
    tablePractice.box,proofForm,
    btn("הצגת דרך פתרון לפי הסימונים שלי",()=>{
      solution.replaceChildren(el("strong",{text:"דרך אפשרית אחת — אפשר להוכיח גם בדרך אחרת:"}));
      // Keep the authored solution in the student's chosen notation.
      solution.append(writtenProof(exercise.solution.map(s=>({...s,formula:rename(s.formula,mapping)})),exercise.premises.map(p=>rename(p.formula,mapping))));
      solution.hidden=false;
    }),solution,
  ]);
  stage3.hidden=true;
  box.append(meanings,activityHelp("argument"),stage1,stage2,stage3,el("div",{class:"bk-bar"},[hint]),hints);
  box.classList.add("argument-ready");

  function premiseValues(){return translationFields.slice(0,-1).map(r=>r.input.value);}
  function goalValue(){return translationFields.at(-1).input.value;}
  function writtenProof(steps,premises=premiseValues()) {
    const lines=argumentLines(exercise,mapping,premises,steps);
    const givens=el("section",{class:"argument-written-givens"},[
      el("strong",{class:"argument-written-heading",text:"נתונים:"}),
      el("ol",{},lines.slice(0,premises.length).map(line=>el("li",{},[
        el("div",{class:"argument-line-words",text:line.words}),formulaText(line.formula),
      ]))),
    ]);
    const goal=el("section",{class:"argument-written-goal"},[
      el("strong",{class:"argument-written-heading",text:"נוכיח:"}),
      el("div",{text:exercise.goal.text}),formulaText(rename(exercise.goal.formula,mapping)),
    ]);
    const proof=el("section",{class:"argument-written-steps"},[
      el("strong",{class:"argument-written-heading",text:"הוכחה:"}),
    ]);
    const panel=el("div",{class:"argument-written"},[givens,goal,proof]);
    if(!steps.length){
      proof.append(el("p",{text:"כאן יופיעו הצעדים לאחר בדיקתם, עם נימוק לכל צעד."}));
    }else{
      const body=el("tbody");
      lines.slice(premises.length).forEach(line=>body.append(el("tr",{},[
        el("th",{scope:"row",text:line.label}),
        el("td",{},[el("div",{class:"argument-line-words",text:line.words}),formulaText(line.formula)]),
        el("td",{class:"argument-line-reason"},[line.ruleLabel?inferenceView(line.ruleLabel,line.sources,line.formula):el("span",{text:line.reason})]),
      ])));
      proof.append(el("div",{class:"argument-proof-scroll"},[el("table",{class:"argument-proof-table"},[
        el("thead",{},[el("tr",{},['מקור','טענה במילים ובסימנים','נימוק'].map(t=>el("th",{scope:"col",text:t})))]),body,
      ])]));
    }
    return panel;
  }
  function renderProof(){undo.disabled=!accepted.length;}
  function clearResults(from=0){
    tablePractice.refresh();
    accepted=accepted.slice(0,from);
    summary.textContent="";summary.className="bk-msg";
    rows.slice(from).forEach(row=>{row.compact.invalidate();row.feedback.textContent="";row.feedback.className="bk-msg";row.input.removeAttribute("aria-invalid");row.replacements.showResult(null);});
    refreshReplacements();
    renderProof();
  }
  function refreshReplacements(){
    rows.forEach(row=>{
      row.hint?.refresh(!!row.rule.value&&!row.rule.value.startsWith('eq:'));
      const sourceOf=ref=>{const premise=/^p(\d+)$/.exec(ref);return premise?premiseValues()[Number(premise[1])-1]:rows.find(r=>r.id===ref)?.input.value;};
      row.replacements.setSource(sourceOf(row.sources[0].value)||'');
      row.sources.forEach((select,i)=>{const source=sourceOf(select.value),preview=row.sourcePreviews[i];
        if(!select.value)preview.textContent='הנוסחה תופיע כאן';
        else if(source===undefined)preview.textContent='שורת המקור אינה זמינה';
        else {try{preview.textContent=source?proofFormula(source):'בשורה הזאת עדיין לא נכתבה נוסחה';}catch{preview.textContent=source;}}
      });
    });
  }
  function refreshReferences(){
    const prior=exercise.premises.map((entry,i)=>({id:`p${i+1}`,formula:translationFields[i].input.value,label:`נתון ${i+1} — ⁦${translationFields[i].input.value}⁩`}));
    rows.forEach((row,i)=>{
      row.legend.textContent=`צעד ${i+1}`;
      row.input.setAttribute("aria-label",`נוסחה בצעד ${i+1}`);
      row.rule.setAttribute("aria-label",`כלל בצעד ${i+1}`);
      row.remove.setAttribute("aria-label",`מחיקת צעד ${i+1}`);
      row.sources.forEach((select,j)=>{
        const value=select.value;
        select.setAttribute("aria-label",`מקור ${j+1} בצעד ${i+1}`);
        select.replaceChildren(el("option",{value:"",text:"בחרו שורת מקור…"}),...prior.map(p=>{const option=el("option",{value:p.id,text:p.label});try{format(p.formula);}catch{option.disabled=true;}if(sourceCount(row.rule.value)>1&&row.sources.some((other,k)=>k!==j&&other.value===p.id))option.disabled=true;return option;}));
        if(value&&!prior.some(p=>p.id===value)){const missing=el("option",{value,text:"השורה שנבחרה נמחקה — בחרו מקור אחר"});missing.disabled=true;select.append(missing);}
        select.value=value;
      });
      prior.push({id:row.id,formula:row.input.value,label:`מסקנת צעד ${i+1} — ⁦${row.input.value||"טרם נכתבה נוסחה"}⁩`});
    });
    add.disabled=rows.length>=20;
    add.textContent=add.disabled?"אפשר לכתוב עד 20 צעדים":"הוספת צעד";
  }
  function addRow(focus=false){
    if(rows.length>=20)return;
    clearResults(rows.length);
    const row=inputField("נוסחה בצעד חדש",()=>{clearResults(rows.indexOf(row));refreshReferences();});
    row.id=`d${++nextRow}`;
    row.legend=el("legend");
    row.rule=el("select",{class:"proof-rule"},[
      el("option",{value:"",text:"בחרו כלל…"}),
      el("optgroup",{label:"כללי היסק"},INFERENCE_RULES.filter(r=>(exercise.rules||["mp","mt","hs"]).includes(r.id)).map(r=>el("option",{value:r.id,text:ruleFormulaLabel(r)}))),
      el("optgroup",{label:"שינוי לנוסחה שקולה — שורת מקור אחת"},[el("option",{value:"eq:replacements",text:"שכתוב חלקים לפי חוקי שקילות"})]),
    ]);
    row.sources=[el("select",{class:"argument-source"}),el("select",{class:"argument-source"})];
    row.sourcePreviews=row.sources.map(()=>el("bdi",{class:"argument-source-preview",dir:"ltr","aria-live":"polite"}));
    const labels=row.sources.map((select,i)=>el("label",{class:"proof-field"},[el("span",{text:`מקור ${i+1}`}),el("span",{class:"argument-source-pair"},[select,row.sourcePreviews[i]])]));
    labels.forEach(label=>label.hidden=true);
    const reminder=el("details",{class:"argument-rule-help"});reminder.hidden=true;
    row.rule.addEventListener("change",()=>{
      clearResults(rows.indexOf(row));
      const rewrite=row.rule.value.startsWith("eq:");
      labels.forEach((label,i)=>label.hidden=!row.rule.value||i>=sourceCount(row.rule.value));
      row.replacements.activate(row.rule.value === "eq:replacements");
      reminder.replaceChildren(el("summary",{text:"הכלל בכתיבה פורמלית"}));reminder.hidden=!row.rule.value||rewrite;reminder.open=false;
      if(!rewrite) {
        const rule=INFERENCE_RULES.find(r=>r.id===row.rule.value);
        if(rule) reminder.append(formalRuleReminder(rule));
      }
      refreshReferences();
    });
    row.sources.forEach(select=>select.addEventListener("change",()=>{clearResults(rows.indexOf(row));refreshReferences();}));
    row.remove=btn("מחיקת הצעד",()=>{
      const i=rows.indexOf(row);rows.splice(i,1);row.fieldset.remove();clearResults(i);
      if(!rows.length)addRow();refreshReferences();rows[Math.min(i,rows.length-1)].input.focus();
    });
    row.replacements=replacementEditor(()=>clearResults(rows.indexOf(row)));
    row.replacements.bindResult(row.input,()=>{clearResults(rows.indexOf(row));refreshReferences();},()=>{check(rows.indexOf(row));return {ok:row.fieldset.classList.contains("step-accepted"),message:summary.textContent};});
    row.hint=deductionHint(()=>{
      const index=rows.indexOf(row),refs=row.sources.slice(0,sourceCount(row.rule.value)).map(s=>s.value);
      const getSource=ref=>{const given=/^p(\d+)$/.exec(ref);return given?premiseValues()[Number(given[1])-1]:rows.find(r=>r.id===ref)?.input.value;};
      if(refs.some(ref=>!ref)||new Set(refs).size!==refs.length)return {message:sourceCount(row.rule.value)===1?'בחרו תחילה שורת מקור.':'בחרו תחילה שני מקורות שונים.'};
      const prefix=rows.slice(0,index).map(r=>({id:r.id,formula:r.input.value,rule:r.rule.value,refs:r.sources.slice(0,sourceCount(r.rule.value)).map(s=>s.value),replacements:r.replacements.get()}));
      const options=deductionCandidates(row.rule.value,refs.map(getSource)).filter(formula=>checkArgument(exercise,mapping,premiseValues(),goalValue(),[...prefix,{id:row.id,formula,rule:row.rule.value,refs}]).ok);
      return {options,message:'הכלל אינו נותן מסקנה מן המקורות שבחרתם, או שצעד קודם עדיין דורש תיקון.'};
    },formula=>{row.input.value=formula;row.input.dispatchEvent(new Event('input',{bubbles:true}));row.input.focus();});
    row.fieldset=el("fieldset",{class:"proof-step"},[
      row.legend,el("label",{class:"proof-field"},[el("span",{text:"לפי איזה כלל?"}),row.rule]),reminder,...labels,row.replacements.box,row.hint.box,
      el("label",{class:"proof-field"},[el("span",{text:"המסקנה לפי הכלל והמקורות שבחרתם"}),row.input]),row.keys,
      row.feedback,row.replacements.resultTools,
      el("div",{class:"bk-bar"},[btn("בדיקת הצעד והוספה להוכחה",()=>check(rows.indexOf(row))),row.remove]),
    ]);
    row.compact=compactProofStep(row.fieldset,()=>clearResults(rows.indexOf(row)));
    rows.push(row);list.append(row.fieldset);refreshReferences();refreshReplacements();if(focus)row.input.focus();
  }
  function show(row,item){
    row.feedback.className=`bk-msg ${item.ok?"bk-good":item.kind==="missing-step"?"bk-info":"bk-bad"}`;
    row.feedback.textContent=item.message;
    if(item.intermediate)row.feedback.append(formulaText(item.intermediate));
    if(item.row)row.feedback.append(formulaText(Object.entries(item.row).map(([n,v])=>`${n} = ${v?"T":"F"}`).join(", ")));
    if(!item.ok && item.kind!=="missing-step")row.input.setAttribute("aria-invalid","true");else row.input.removeAttribute("aria-invalid");
  }
  function check(last=rows.length-1,declareComplete=false){
    clearResults();
    const steps=trimBlankSteps(rows.slice(0,last+1).map(row=>({id:row.id,formula:row.input.value,rule:row.rule.value,refs:row.sources.slice(0,sourceCount(row.rule.value)).map(s=>s.value),replacements:row.rule.value === "eq:replacements" ? row.replacements.get():undefined})));
    const result=checkArgument(exercise,mapping,premiseValues(),goalValue(),steps);
    if(result.phase==="translation"){invalidateProof();return;}
    result.results.forEach((item,i)=>{show(rows[i],item);rows[i].replacements.showResult(item);});
    accepted=steps.slice(0,result.results.filter(item=>item.ok).length);renderProof();
    accepted.forEach((step,i)=>{
      const refs=step.refs.map(ref=>{const premise=/^p(\d+)$/.exec(ref);return premise?Number(premise[1]):exercise.premises.length+rows.findIndex(r=>r.id===ref)+1;});
      const sources=refs.map(n=>({number:n,label:proofSourceLabel(n,exercise.premises.length),formula:n<=exercise.premises.length?premiseValues()[n-1]:rows[n-exercise.premises.length-1].input.value}));
      const justification=step.rule==='eq:replacements'?stepRuleNames(step)+' — '+sources.map(s=>sourceCitation(s.label,s.formula)).join('; '):inferenceView(ruleName(step.rule),sources,step.formula);
      rows[i].compact.accept(proofFormula(step.formula),justification,argumentLines(exercise,mapping,premiseValues(),accepted)[exercise.premises.length+i].words,step.rule==='eq:replacements'?stepReason(step):'');
    });
    if(declareComplete&&result.ok&&result.complete)rows[accepted.length-1]?.compact.finish();
    if(result.ok&&!result.complete&&steps.length){
      if(rows.length===steps.length)addRow();
      rows[steps.length]?.compact.focus();
    }
    summary.className=`bk-msg ${result.ok?(declareComplete&&result.complete?"bk-good":"bk-info"):"bk-bad"}`;
    summary.textContent=result.ok?(declareComplete&&result.complete?`ההוכחה הושלמה! כל צעד מוצדק מתוך שורות קודמות. הוכחתם: ${exercise.goal.text}`:declareComplete?"הצעדים מוצדקים, אבל עדיין לא הוכחה המסקנה המבוקשת. המשיכו בהוכחה.":"הצעדים שנבדקו מוצדקים. המשיכו, או לחצו על ״סיימתי את ההוכחה — בדקו״."):`צריך לתקן את צעד ${result.results.length}. הצעדים שאחריו עדיין לא נבדקו.`;
    if(result.results.at(-1)?.kind==="missing-step"){
      summary.className="bk-msg bk-info";
      summary.textContent=`התוצאה בצעד ${result.results.length} שקולה למקור. פרטו את ההחלפות בחלקים נפרדים, או הוסיפו שורת ביניים כאשר שינוי פועל על תוצאה חדשה.`;
    }
    if(!result.results.length){summary.className="bk-msg bk-info";summary.textContent="הוסיפו צעד מנומק כדי להתחיל.";}
    else if(!result.ok && result.complete)summary.textContent=`המטרה כבר הוכחה בצעד ${result.goalStep}. תקנו או מחקו את הצעד הנוסף המסומן.`;
    else if(!result.ok && result.targetReached)summary.textContent="הגעתם לנוסחה שמבטאת את המטרה, אבל יש לתקן את ההצדקה בצעד המסומן לפני שההוכחה תושלם.";
    rows.slice(result.results.length).forEach(row=>{row.feedback.textContent=result.ok?"הצעד הזה עדיין לא נבדק.":"ממתין לתיקון הצעד הקודם.";});
  }
  // Start with supplied symbols; choosing names is an optional customization.
  applyMapping.click();
  mappingMsg.textContent="";
}
