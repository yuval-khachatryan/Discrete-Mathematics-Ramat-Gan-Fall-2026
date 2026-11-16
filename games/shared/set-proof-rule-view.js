import {ruleById} from './set-proof-checker.js';
import {show} from './set-proof-syntax.js';
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
const math=text=>{const n=el('span',text);n.className='set-proof-formula';n.dir='ltr';return n;};
const definitions={
 complement:'x ∉ A ⇔ x ∈ Aᶜ',
 difference:'x ∈ (C ∖ D) ⇔ ((x ∈ C) ∧ (x ∉ D))',
 intersection:'x ∈ (C ∩ D) ⇔ ((x ∈ C) ∧ (x ∈ D))',
 union:'x ∈ (C ∪ D) ⇔ ((x ∈ C) ∨ (x ∈ D))',
};
export function setProofRuleView(row,rows){
 const rule=ruleById(row.rule);if(!rule)return null;
 const details=el('details');details.className='set-proof-rule-details';
 const summary=el('summary',rule.label.split(' — ')[0]);
 summary.setAttribute('aria-label','פירוט הכלל: '+rule.label.split(' — ')[0]);
 const content=el('div');content.className='set-proof-rule-content';content.append(el('p',rule.label));
 if(definitions[row.rule])content.append(math(definitions[row.rule]));
 if(row.rule==='difference')content.append(el('p','C ו־D מציינות כאן קבוצות כלשהן, גם כשהן ביטויים מורכבים. פתיחת ההגדרה נותנת את שני התנאים יחד. כדי להסיק אחד מהם בלבד משתמשים גם בהוצאת חלק מ״וגם״; אי־שייכות להפרש היא שלילת התנאי המלא.'));
 if(row.sources?.length){
  content.append(el('strong','השורות שעליהן מסתמכים:'));
  for(const id of row.sources){const source=rows.find(r=>r.id===id);if(!source)continue;const line=el('div');line.append(math(`${id}: ${source.written||show(source.formula)}`));content.append(line);}
 }
 const result=el('p','הטענה בצעד זה: ');result.append(math(row.written||show(row.formula)));content.append(result);
 details.append(summary,content);return details;
}
