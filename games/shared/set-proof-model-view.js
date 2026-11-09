import {MODELS} from './set-proof-models.js';
import {checkSetProof,ruleById} from './set-proof-checker.js';
import {show,showWritten} from './set-proof-syntax.js';

const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
const math=text=>{const n=el('span','set-proof-formula',text);n.dir='ltr';return n;};

// Model solutions are read-only proofs, verified by the same checker as student work.
// They never supply facts or steps to the student's proof.
export function createSetModelView(id,exercise){
  const panel=el('section','set-model-panel');
  panel.setAttribute('aria-label','פתרון לדוגמה');panel.hidden=true;
  let built=false;
  return {panel,build(){
    if(built)return;built=true;
    panel.append(el('h4','set-model-heading','פתרון לדוגמה'),el('p','set-model-intro','זו דרך אפשרית אחת. גם דרך אחרת מתקבלת, כל עוד כל צעד מנומק והמטרה הוכחה.'));
    exercise.parts.forEach((config,i)=>{
      const result=checkSetProof(config,MODELS[id][i]);
      if(!result.ok||!result.reached)throw Error(`Invalid model solution: ${id}/${i}: ${result.error?.message||'target not reached'}`);
      const section=el('section','set-model-part');
      if(exercise.parts.length>1)section.append(el('h5','',config.title||`חלק ${i+1}`));
      const target=el('p','set-model-target','נראה ש־');target.append(math(showWritten(config.goal)));section.append(target);
      if(config.universe)section.append(el('p','set-model-intro','כל הקבוצות הנדונות מוכלות בעולם U. המשלים נלקח ביחס אליו.'));
      const blocks=new Map();
      for(const r of result.rows){
        const row=el('div','set-model-row'),label=el('b','set-proof-row-id',r.id);label.dir='ltr';
        const statement=el('div','set-model-statement');
        if(r.rule==='open-forall')statement.append(document.createTextNode('יהי '));
        else if(r.rule==='assume')statement.append(document.createTextNode('נניח ש־'));
        statement.append(math(r.written||show(r.formula)));
        const reason=el('div','set-model-reason',r.given?'נתון':r.fixed?'נקודת המוצא':ruleById(r.rule)?.label.split(' — ')[0]||'');
        if(r.sources?.length){
          const cited=el('span','',r.sources.join(', '));cited.dir='ltr';reason.append(document.createTextNode(' · '),cited);
          reason.title=r.sources.map(ref=>{const source=result.rows.find(s=>s.id===ref);return ref+': '+show(source.formula);}).join('\n');
        }
        row.append(label,statement,reason);
        const parent=blocks.get(r.opens?r.scope.at(-2):r.scope.at(-1))||section;
        if(r.opens){
          const block=el('div','set-model-block');block.append(row);parent.append(block);blocks.set(r.id,block);
          if(r.opens.innerGoal){const local=el('p','set-proof-local-goal','נוכיח ש־');local.append(math(show(r.opens.innerGoal)));block.append(local);}
        }else parent.append(row);
      }
      section.append(el('p','set-proof-qed','מש״ל'));panel.append(section);
    });
    if(exercise.parts.length>1){const final=el('p','set-model-target','קיבלנו את שני הכיוונים, ולכן ');final.append(math(exercise.target));panel.append(final);}
  }};
}
