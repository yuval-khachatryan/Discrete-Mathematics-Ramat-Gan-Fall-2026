import {contextualKeyboard} from './formula-keyboard.js';
import {createSetModelView} from './set-proof-model-view.js';
import {attachSetFormulaInput} from './set-formula-input.js';
import {SET_PROOFS} from './set-proof-exercises.js';
import {checkSetProof,ruleById,setStepHints,SET_RULE_CATEGORIES,setRuleCategory,isEquivalenceRule,setEquivalenceHints} from './set-proof-checker.js';
import {show,normalizeInput,parseStatement,equivalentShape,showWritten,expandSubset,substituteName,node,neg} from './set-proof-syntax.js';
const el=(tag,attrs={},children=[])=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='text')n.textContent=v;else if(k==='class')n.className=v;else n.setAttribute(k,v);}n.append(...children);return n;};
const button=(text,fn,cls='bk-btn')=>{const b=el('button',{type:'button',class:cls,text});b.addEventListener('click',fn);return b;};
const formula=s=>el('span',{class:'set-proof-formula',dir:'ltr',text:s});
// Isolate mathematical fragments inside Hebrew native select labels.
const mathLabel=s=>s.replace(/[A-Za-z∀¬∈∉⊆⊇⊈⊉][A-Za-z0-9₀-₉∀¬∈∉⊆⊇⊈⊉∩∪∖ᶜ∅∧∨→↔≡=(){}: ,]*/g,m=>'\u2066'+m.trimEnd()+'\u2069'+m.slice(m.trimEnd().length));
const rowText=r=>r.written||show(r.formula);
const label=(text,input)=>el('label',{},[el('span',{text}),input]);
function report(n,text,bad=false){n.textContent=text;n.className='bk-msg '+(bad?'bk-bad':'');}
export function initSetProof(box){
  const exercise=SET_PROOFS[box.dataset.setProof];if(!exercise||box.dataset.ready)return;
  const question=el('div',{class:'set-proof-question'},[...box.childNodes]);
  box.dataset.ready='true';box.classList.add('set-proof-editor');box.replaceChildren();
  const workspace=el('details',{class:'set-proof-workspace'},[el('summary',{text:'כתיבת הוכחה'})]);
  let parts=exercise.parts,states=parts.map(()=>({steps:[],complete:false})),active=0,editing=null,draft=null;
  const toolbar=el('div',{class:'set-proof-toolbar'}),host=el('div'),status=el('p',{'aria-live':'polite',class:'bk-msg'});
  function cancelPendingEdit(){if(editing){states[active].steps=editing.steps;states[active].complete=editing.complete;editing=null;draft=null;}}
  const help=el('details',{class:'set-proof-help'},[el('summary',{text:'הוראות וסימנים'}),el('p',{text:'כתבו טענה ונמקו אותה בעזרת כלל ומקורות. G מסמן נתון, S מסמן צעד, ו־R היא הטענה המבוקשת. היא מופיעה כמסקנה בסוף ההוכחה. לפני שהוכחה, אי אפשר להסתמך עליה כמקור.'}),el('p',{text:'אפשר לנסח מחדש את המטרה: כותבים נוסחה שקולה ובוחרים הגדרה או חוק שקילות. הניסוח נבדק ומוצג בהוכחה, אך אינו נוסף לנתונים. אפשר גם לבחור צעד שכבר הוכח ולהצדיק מדוע הוא שקול למטרה. רמזים מציעים ניסוחים שנבדקו; בזמן ההקלדה אפשר להשלים סימנים בעזרת Tab או Enter. בפעולה ״יהי״ כתבו למשל x ∈ A, ובשדה ״נוכיח״ כתבו מה רוצים להראות עבורו. זוהי הנחה זמנית; אין צורך לדעת שקיים איבר ב־A. אין לייחס ל־x תכונות נוספות שלא נובעות מההנחה ומהנתונים. לאחר שהוכחתם אותה, סוגרים את ההנחה ומסיקים טענה לכל איברי התחום. השם שנבחר אינו מציין איבר מסוים מתוך הנתונים. הצעדים שבתוך ההנחה נשארים גלויים לאחר הסגירה, אך מחוץ לה אפשר לצטט רק את המסקנה שהתקבלה בסגירה. אפשר גם להוכיח תחילה גרירה: מניחים שייכות, מסיקים את המסקנה וסוגרים את ההנחה.'}),el('p',{text:'אפשר להקליד forall, in, notin, subset, supset, intersect, union, not, and, or, ->; הם יומרו לסימנים. דוגמה: x in A. בהוכחה לפי מקרים פותחים הנחה זמנית, מסיקים מסקנה וסוגרים את ההנחה כגרירה. רק אז פותחים את הענף הבא.'}),el('p',{text:'הבודק מבין את הסימון המתמטי ואת הכללים המוצעים. כתבו את הטענה בשדה הנוסחה; ההערה המילולית מסייעת לקריאה, ואינה מחליפה נימוק מתמטי. כדאי לכתוב את ההוכחה גם על דף. לאחר הגעה ל־F, סגירה בדרך השלילה נותנת את שלילת ההנחה; סגירה כגרירה נותנת גרירה מן ההנחה אל F. אפשר לפתוח פתרון לדוגמה או להשוות אותו להוכחה שלכם בלי לשנות אותה.'})]);
  if(exercise.equivalence){
    const method=el('select',{'aria-label':'דרך ההוכחה'},[el('option',{value:'inclusions',text:'שתי הכלות'}),el('option',{value:'equivalence',text:'שקילות של תנאי השייכות'})]);
    // Keep independent work when switching strategies.
    const saved={inclusions:states};let current='inclusions';
    method.addEventListener('change',()=>{cancelPendingEdit();saved[current]=states;current=method.value;parts=current==='equivalence'?exercise.equivalence:exercise.parts;states=saved[current]||parts.map(()=>({steps:[],complete:false}));active=0;editing=null;draft=null;render();});
    toolbar.append(label('דרך ההוכחה',method));
  }
  workspace.append(el('p',{class:'set-proof-target'},[el('b',{text:'R — צריך להוכיח: '}),formula(exercise.target)]),help,toolbar,host);
  const model=createSetModelView(box.dataset.setProof,exercise);
  const views=el('div',{class:'set-proof-views'}),panels=el('div',{class:'set-proof-panels'},[workspace,model.panel]);
  const viewControls=el('div',{class:'set-proof-view-controls',role:'group','aria-label':'תצוגת הפתרון'});
  const viewButtons=new Map();
  const selectView=mode=>{
    if(mode!=='work')model.build();
    workspace.hidden=mode==='model';model.panel.hidden=mode==='work';
    views.classList.toggle('set-proof-comparing',mode==='compare');
    if(mode!=='model')workspace.open=true;
    viewButtons.forEach((b,key)=>b.setAttribute('aria-pressed',String(key===mode)));
  };
  for(const [mode,title]of [['work','ההוכחה שלי'],['model','פתרון לדוגמה'],['compare','השוואה']]){
    const b=button(title,()=>selectView(mode),'bk-btn bk-quiet');b.setAttribute('aria-pressed',String(mode==='work'));viewButtons.set(mode,b);viewControls.append(b);
  }
  views.append(viewControls,panels);box.append(question,views,status);
  function render(focus=false){
    const config=parts[active],state=states[active],checked=checkSetProof(config,state.steps);
    host.replaceChildren();
    if(parts.length>1){const tabs=el('div',{class:'set-proof-tabs'});parts.forEach((p,i)=>{const b=button((states[i].complete?'✓ ':'')+(p.title||`חלק ${i+1}`),()=>{cancelPendingEdit();active=i;draft=null;editing=null;render();});b.setAttribute('aria-pressed',String(i===active));tabs.append(b);});host.append(tabs);}
    if(config.universe)host.append(el('p',{class:'set-proof-intro',text:'המשלים נלקח ביחס ל־U. כל הקבוצות הנדונות מוכלות ב־U.'}));
    if(config.intro)host.append(el('p',{class:'set-proof-intro',text:config.intro}));
    if(config.start)host.append(el('p',{},[el('span',{text:'בחלק הזה נוכיח: '}),formula(config.goal)]));
    const currentFrame=checked.frames.filter(f=>f.kind==='forall').at(-1);
    const chooseGoalRewrite=()=>{state.action='restate-goal';draft=null;render(true);};
    if(!currentFrame){
      const goal=el('div',{class:'set-proof-current-goal'});
      goal.append(el('span',{text:'המטרה בחלק הזה: '}),formula(state.complete||!checked.rootGoal.changes.length?showWritten(config.goal):show(checked.rootGoal.current)));
      if(!state.complete)goal.append(button('ניסוח שקול של המטרה',chooseGoalRewrite,'bk-btn bk-quiet'));
      host.append(goal);
    }
    const rows=el('div',{class:'set-proof-rows','aria-label':'ההוכחה שנכתבה'}),blocks=new Map();
    checked.rows.forEach(r=>{
      const row=el('div',{class:'set-proof-row'+(r.assumption?' set-proof-assumption':'')+(r.goalOnly?' set-proof-goal-row':''),'data-row':r.id});
      row.style.setProperty('--proof-depth',0);
      let reason=r.given?'נתון':r.fixed?'איבר כלשהו — הנחת השייכות לתחילת ההוכחה':ruleById(r.rule)?.label.split(' — ')[0]||'';
      const reasonNode=el('span',{class:'set-proof-reason',text:reason});
      if(r.kind==='match-goal')reasonNode.prepend(el('span',{text:'קישור למטרה — '}));
      if(r.goalOnly)reasonNode.prepend(el('span',{text:'ניסוח שקול למטרה — '}));
      if(r.goalLinks?.length)reasonNode.append(el('span',{text:' · הניסוחים '+r.goalLinks.join(', ')}));
      if(r.sources?.length){reasonNode.append(el('span',{text:' · '+r.sources.join(', ')}));reasonNode.title=r.sources.map(id=>{const source=checked.rows.find(s=>s.id===id);return id+': '+rowText(source);}).join('\n');}
      const finalRow=state.complete&&parts.length===1&&!config.start&&!r.given&&!r.goalOnly&&!r.scope.length&&equivalentShape(r.formula,parseStatement(config.goal));
      row.append(el('b',{class:'set-proof-row-id',dir:'ltr',text:finalRow?`R (${r.id})`:r.id}),r.rule==='open-forall'?el('span',{class:'set-proof-arbitrary'},[
        el('span',{text:'יהי '}),formula(r.declaration?r.opens.variable:rowText(r)),...(r.declaration?[el('span',{text:' איבר כלשהו.'})]:[])
      ]):r.rule==='assume'?el('span',{},[el('span',{class:'set-proof-assume-word',text:'נניח ש־'}),formula(rowText(r))]):formula(rowText(r)),reasonNode);
      if(r.note)reasonNode.append(el('span',{text:' — '+r.note}));
      if(!r.given&&!r.fixed){const index=r.index;row.append(button('עריכה',()=>{
        editing={steps:[...state.steps],complete:state.complete};draft={...state.steps[index]};state.steps=state.steps.slice(0,index);state.complete=false;render(true);
      },'bk-btn bk-quiet'));}
      const parentId=r.opens?r.scope.at(-2):r.scope.at(-1),parent=blocks.get(parentId)?.body||rows;
      if(r.opens){
        const block=el('section',{class:'set-proof-block','data-assumption':r.id,'aria-label':'הנחה '+r.id,'data-state':'open'}),body=el('div',{class:'set-proof-block-body'});
        block.append(row);
        if(r.opens.innerGoal){
          const local=el('div',{class:'set-proof-local-goal'},[el('span',{class:'set-proof-prove-word',text:'נוכיח ש־'}),formula(show(r.opens.goalState.current))]);
          if(currentFrame?.id===r.id&&checked.frames.at(-1)===currentFrame&&!state.complete)local.append(button('ניסוח שקול של המטרה',chooseGoalRewrite,'bk-btn bk-quiet'));
          block.append(local);
        }
        block.append(body);parent.append(block);blocks.set(r.id,{block,body});
      }else parent.append(row);
      if(r.closes){const closed=blocks.get(r.closes);if(closed)closed.block.dataset.state='closed';}
    });host.append(rows);
    const finish=button('סיימתי את ההוכחה — בדקו',()=>{
      let result=checkSetProof(config,state.steps);
      if(!result.ok){report(status,result.error.message,true);return;}
      if(result.stack.length){report(status,'יש עדיין חלק פתוח בהוכחה. סיימו את ההוכחה לאיבר הכלשהו או סגרו את ההנחה הזמנית.',true);return;}
      if(!result.reached&&result.rootGoal.changes.length){
        const witness=result.available.find(r=>!r.scope.length&&!r.declaration&&equivalentShape(r.formula,result.rootGoal.current));
        if(witness){
          const closing={kind:'match-goal',target:'R',rule:'goal-chain',formula:config.goal,sources:[witness.id]};
          const verified=checkSetProof(config,[...state.steps,closing]);
          if(verified.ok){state.steps.push(closing);result=verified;}
        }
      }
      if(!result.reached){report(status,'הצעדים תקינים, אבל עדיין לא הוכחה המטרה של החלק הזה. בדקו איזו שייכות או טענה חסרה.',true);return;}
      state.complete=true;editing=null;draft=null;render();
      report(status,states.every(s=>s.complete)?'ההוכחה הושלמה. מש״ל.':'החלק הזה הושלם. המשיכו לחלק הבא.');
    });
    if(state.complete){
      host.append(el('p',{class:'set-proof-qed'},[...(config.flow==='goals'?[formula(showWritten(config.goal))]:[el('span',{text:config.conclusion||'המטרה הוכחה'})]),el('span',{text:' — מש״ל'})]));
      if(states.every(s=>s.complete)&&(parts.length>1||config.start))host.append(el('div',{class:'set-proof-row set-proof-final'},[el('b',{dir:'ltr',text:'R'}),formula(exercise.target),el('span',{class:'set-proof-reason',text:config.mode==='equivalence'?'שקילות תנאי השייכות לכל איבר — מש״ל':parts.length>1?'כל הכיוונים הוכחו — מש״ל':'האיבר היה כלשהו, ולכן ההכלה נכונה — מש״ל'})]));
      if(states.some(s=>!s.complete))host.append(button('לחלק שטרם הושלם',()=>{active=states.findIndex(s=>!s.complete);render();}));
    }else{
      const commit=step=>{
        const result=checkSetProof(config,[...state.steps,step]);
        if(!result.ok){report(status,result.error.message,true);return;}
        state.steps.push(step);state.action='step';if(step.rule==='open-forall')state.variable=step.variable;editing=null;draft=null;report(status,step.kind==='restate-goal'?'הניסוח שקול למטרה. כעת אפשר להוכיח אותו.':result.reached?'הגעתם למטרה. אפשר לבקש בדיקת סיום.':'הצעד תקין. אפשר להמשיך.');render();
      };
      const pending=checked.frames.at(-1);
      if(pending?.kind==='assume'){
        const contradiction=checked.available.find(r=>r.formula.type==='false');
        if(contradiction){
          const assumed=checked.rows.find(r=>r.id===pending.id),conclusion=show(neg(assumed.formula));
          const close=button('סגירת ההנחה בדרך השלילה',()=>commit({rule:'raa',formula:conclusion,sources:[pending.id,contradiction.id]}));
          blocks.get(pending.id).body.append(el('div',{class:'set-proof-close'},[close,el('span',{text:'נסיק: '}),formula(conclusion)]));
        }
      }
      if(currentFrame){
        const result=checked.available.find(r=>!r.declaration&&(equivalentShape(r.formula,currentFrame.innerGoal)||equivalentShape(r.formula,currentFrame.goalState.current)));
        const innerOpen=checked.frames.at(-1)!==currentFrame;
        const close=button('סגירת ההנחה — האיבר היה כלשהו',()=>commit({rule:'close-forall',formula:show(currentFrame.quantified),sources:[currentFrame.id,result.id]}));
        close.disabled=!result||innerOpen;
        const closing=el('div',{class:'set-proof-close'},[close]);
        if(close.disabled)closing.append(el('span',{text:innerOpen?'סגרו תחילה את ההנחה הפנימית.':'אפשר לסגור לאחר הוכחת המטרה שבהנחה.'}));
        blocks.get(currentFrame.id).body.append(closing);
      }
      const form=el('form',{class:'set-proof-input'}),stepNo=checked.nextStep;
      const action=el('select',{'aria-label':'סוג הפעולה'},[
        el('option',{value:'step',text:'הסקת צעד'}),
        el('option',{value:'let',text:'יהי — פתיחת הנחה לאיבר כלשהו'}),
        ...(checked.frames.at(-1)?.kind==='assume'?[]:[el('option',{value:'restate-goal',text:'ניסוח שקול של המטרה'})]),
        el('option',{value:'match-goal',text:'קישור צעד מוכח למטרה'})]);
      action.value=draft?.kind||state.action||'step';if(!action.value)action.value='step';
      const targetChoice=el('select',{'aria-label':'המטרה שאליה מקשרים'},[
        el('option',{value:'R',text:mathLabel('R: '+showWritten(config.goal))}),
        ...(currentFrame?[el('option',{value:'current',text:mathLabel('המטרה בהנחה: '+show(checked.currentGoal.original))})]:[])]);
      targetChoice.value=draft?.target||(currentFrame?'current':'R');
      const allowedRules=()=>action.value==='let'?['open-forall']:action.value==='step'?config.rules.filter(id=>id!=='open-forall'):[...config.rules.filter(isEquivalenceRule),...(action.value==='match-goal'&&((targetChoice.value==='R'?checked.rootGoal:checked.currentGoal).changes.length)?['goal-chain']:[])];
      const category=el('select',{'aria-label':'תחום ההצדקה'});
      function drawCategories(value=''){
        category.replaceChildren(el('option',{value:'',text:'בחרו תחום…'}),...SET_RULE_CATEGORIES.filter(c=>allowedRules().some(id=>setRuleCategory(id)===c.id)).map(c=>el('option',{value:c.id,text:c.label})));
        category.value=value;
      }
      const rule=el('select',{'aria-label':'כלל ההצדקה'});
      function drawRules(){
        const ids=allowedRules().filter(id=>setRuleCategory(id)===category.value);
        rule.replaceChildren(el('option',{value:'',text:category.value?'בחרו כלל…':'בחרו תחילה תחום'}),...ids.map(id=>el('option',{value:id,text:mathLabel(ruleById(id).label)})));
        rule.disabled=!category.value;
      }
      drawCategories(draft&&draft.rule!=='open-forall'?setRuleCategory(draft.rule):state.category||'');
      drawRules();
      const sources=el('div',{class:'set-proof-sources'}),input=el('input',{type:'text',class:'bk-input',dir:'ltr',maxlength:'500',spellcheck:'false',autocomplete:'off','aria-label':'הטענה בצעד החדש',placeholder:'x ∈ A'}),feedback=el('p',{'aria-live':'polite',class:'bk-msg'});
      const note=el('input',{type:'text',class:'bk-input','aria-label':'הערה מילולית לא חובה',placeholder:'הערה במילים — לא חובה',maxlength:'250'});
      const assumption=el('input',{type:'text',class:'bk-input',dir:'ltr',maxlength:'200',autocomplete:'off','aria-label':'יהי',placeholder:'x ∈ A'});
      const assumptionField=label('יהי',assumption);
      const fields=el('div',{class:'set-proof-writing'});
      const fieldKeys=field=>{
        const panel=el('div',{class:'set-proof-keyboard',role:'group','aria-label':'סמלים לשדה הזה'});
        for(const k of ['∀','∈','∉','⊆','⊇','∩','∪','∖','ᶜ','∅','¬','∧','∨','→','↔','(',')']){
          const b=button(k,()=>{
            const a=field.selectionStart,z=field.selectionEnd;
            if(field.value.length-(z-a)+k.length>field.maxLength)return;
            field.setRangeText(k,a,z,'end');field.focus();field.dispatchEvent(new Event('input',{bubbles:true}));
          });
          b.dir='ltr';b.setAttribute('aria-label','הוספת '+k);panel.append(b);
        }
        contextualKeyboard(field,panel,{shortcuts:false});
        attachSetFormulaInput(field,panel);return panel;
      };
      const assumptionKeys=fieldKeys(assumption),keys=fieldKeys(input);
      input.addEventListener('blur',()=>{input.value=normalizeInput(input.value);});
      const inputLabel=el('span');
      fields.append(assumptionField,assumptionKeys,el('label',{},[inputLabel,input]),keys,note);
      const stepTitle=el('strong');
      const targetField=label('המטרה',targetChoice);
      const rulePicker=el('div',{class:'set-proof-rule-picker'},[label('תחום',category),label('כלל',rule)]);
      form.append(stepTitle,label('פעולה',action),targetField,rulePicker,sources,fields);
      function drawSources(values=[]){
        sources.replaceChildren();const info=ruleById(rule.value);if(!info||action.value==='restate-goal')return;
        for(let i=0;i<(action.value==='match-goal'?1:info.max);i++){
          const select=el('select',{'aria-label':`מקור ${i+1}`},[el('option',{value:'',text:i<info.min?'בחרו מקור…':'מקור נוסף, אם נדרש…'}),...checked.available.filter(r=>!r.declaration||rule.value==='close-forall').map(r=>el('option',{value:r.id,text:`${r.id}: ${rowText(r)}`}))]);
          select.addEventListener('change',()=>{hint.open=false;hintList.replaceChildren();});
          select.dir='ltr';select.value=values[i]||'';sources.append(label(`מקור ${i+1}${i>=info.min?' (לא חובה)':''}`,select));
        }
      }
      const refs=()=>[...sources.querySelectorAll('select')].map(s=>s.value).filter(Boolean);
      category.addEventListener('change',()=>{state.category=category.value;drawRules();drawSources();report(feedback,'');hint.open=false;hintList.replaceChildren();});
      rule.addEventListener('change',()=>{drawSources();report(feedback,'');hint.open=false;hintList.replaceChildren();});
      function syncAction(){
        assumptionField.hidden=action.value!=='let';if(assumptionField.hidden)assumptionKeys.hidden=true;rulePicker.hidden=action.value==='let';
        if(action.value==='let'){category.value='methods';drawRules();rule.value='open-forall';drawSources();}
        targetField.hidden=action.value!=='match-goal';input.readOnly=action.value==='match-goal';
        stepTitle.textContent=action.value==='restate-goal'?'ניסוח חדש של המטרה':`צעד S${stepNo}`;
        inputLabel.textContent=action.value==='let'?'נוכיח ש־':action.value==='restate-goal'?'הניסוח החדש':action.value==='match-goal'?'המטרה שרוצים להסיק':'הטענה שמסיקים';
        if(input.readOnly)input.value=targetChoice.value==='R'?showWritten(config.goal):show(checked.currentGoal.original);
        keys.hidden=input.readOnly||document.activeElement!==input;
        submit.textContent=action.value==='restate-goal'?'בדיקת הניסוח':'בדיקת הצעד';
      }
      action.addEventListener('change',()=>{state.action=action.value;drawCategories();drawRules();drawSources();syncAction();hint.open=false;hintList.replaceChildren();report(feedback,'');});
      targetChoice.addEventListener('change',()=>{drawCategories();drawRules();drawSources();syncAction();hint.open=false;hintList.replaceChildren();});
      const hintList=el('div'),hint=el('details',{class:'set-proof-hint'},[el('summary',{text:'רמז לפי הכלל והמקורות שבחרתי'}),hintList]);
      hint.addEventListener('toggle',()=>{
        if(!hint.open)return;hintList.replaceChildren();
        if(action.value==='let'){
          const goal=checked.currentGoal.current;
          const q=goal.type==='subset'?expandSubset(goal):goal;
          if(q.type!=='forall'){hintList.append(el('p',{text:'הפעולה מתאימה למטרת הכלה או לטענה לכל איברי תחום.'}));return;}
          for(const v of [...new Set([q.args[0].name,'x','y','z'])]){
            const x={type:'name',name:v},a=show(node('member',x,q.args[1])),g=show(substituteName(q.args[2],q.args[0].name,x));
            if(!checkSetProof(config,[...state.steps,{kind:'let',rule:'open-forall',assumption:a,formula:g,sources:[]}]).ok)continue;
            hintList.append(button('יהי ⁦'+a+'⁩; נוכיח ש־⁦'+g+'⁩',()=>{assumption.value=a;input.value=g;assumption.focus();}));break;
          }
          return;
        }
        const info=ruleById(rule.value);
        if(!info||(action.value!=='restate-goal'&&refs().length<info.min)){hintList.append(el('p',{text:'בחרו תחילה כלל ומקורות. רמז כללי לתרגיל: '+exercise.hint}));return;}
        let choices;
        if(action.value==='restate-goal')choices=setEquivalenceHints(checked.currentGoal.current,rule.value,{...config,objects:[...(config.objects||['x']),...checked.frames.filter(f=>f.kind==='forall').map(f=>f.variable)]},[checked.currentGoal.original]);
        else if(action.value==='match-goal'){
          const step={kind:'match-goal',target:targetChoice.value,rule:rule.value,formula:input.value,sources:refs()};
          choices=checkSetProof(config,[...state.steps,step]).ok?[input.value]:[];
        }else choices=setStepHints(config,state.steps,rule.value,refs());
        if(!choices.length)hintList.append(el('p',{text:'אין כרגע הצעה אוטומטית לכלל ולמקורות האלה. אפשר לכתוב את הצעד בעצמכם. '+exercise.hint}));
        choices.forEach(s=>{const b=button(s,()=>{input.value=s;input.focus();});b.dir='ltr';hintList.append(b);});
      });
      const submit=el('button',{class:'bk-btn bk-main',type:'submit',text:'בדיקת הצעד'});
      form.addEventListener('submit',e=>{
        e.preventDefault();const step={kind:action.value==='step'?undefined:action.value,target:targetChoice.value,rule:rule.value,sources:refs(),assumption:assumption.value,formula:input.value,note:note.value};
        const result=checkSetProof(config,[...state.steps,step]);
        input.setAttribute('aria-invalid',String(!result.ok));
        if(!result.ok){report(feedback,result.error.message,true);return;}
        state.steps.push(step);state.action='step';if(step.rule==='open-forall')state.variable=step.variable;editing=null;draft=null;report(status,step.kind==='restate-goal'?'הניסוח שקול למטרה. כעת אפשר להוכיח אותו.':result.reached?'הגעתם למטרה. אפשר לבקש בדיקת סיום.':'הצעד תקין. אפשר להמשיך.');render(!result.reached);
      });
      form.append(hint,submit,feedback);(blocks.get(checked.stack.at(-1))?.body||host).append(form);host.append(finish);
      syncAction();
      if(draft){rule.value=draft.rule;drawSources(draft.sources);input.value=draft.formula;assumption.value=draft.assumption||'';note.value=draft.note||'';}
      if(editing)host.append(button('ביטול העריכה ושחזור ההמשך',()=>{state.steps=editing.steps;state.complete=editing.complete;editing=null;draft=null;render();}));
      if(focus)input.focus();
    }
    const controls=el('div',{class:'set-proof-controls'});
    if(state.steps.length)controls.append(button('חזרה לצעד הקודם',()=>{draft=state.steps.pop();state.complete=false;editing=null;render(true);}));
    controls.append(button('איפוס החלק הזה',()=>{state.steps=[];state.complete=false;state.action='step';draft=null;editing=null;report(status,'');render();}));
    host.append(controls);
  }
  render();
}
