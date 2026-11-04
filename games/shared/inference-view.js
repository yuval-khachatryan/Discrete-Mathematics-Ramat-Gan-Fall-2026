import {format} from './logic.js';
import {proofFormula} from './proof-notation.js';
const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
// The source labels are presentation only. Proof checking retains its stable IDs.
export function inferenceView(name,sources,conclusion){
 const view=el('div','formal-inference'),title=el('span','formal-rule-name',name),stack=el('div','formal-rule-stack');
 view.append(title,stack);
 for(const source of sources){
  const row=el('div','formal-rule-premise'),expression=el('bdi','proof-formula',proofFormula(source.formula));expression.dir='ltr';row.append(expression);
  if(source.label){const label=el('span','formal-rule-source',`(${source.label})`);label.dir='rtl';row.append(label);}
  stack.append(row);
 }
 const result=el('div','formal-rule-conclusion'),expression=el('bdi','proof-formula',proofFormula(conclusion));expression.dir='ltr';result.append(expression);stack.append(result);
 return view;
}
const forms={
 mp:[['P -> Q','P'],'Q'],mt:[['P -> Q','!Q'],'!P'],hs:[['P -> Q','Q -> R'],'P -> R'],
 'and-in':[['P','Q'],'P & Q'],'and-out':[['P & Q'],'P'],
 'iff-use':[['P <-> Q','P'],'Q'],false:[['P','!P'],'F'],cases:[['P -> R','!P -> R'],'R'],
 raa:[[{formula:'P',label:'הנחה זמנית'},{formula:'F',label:'תחת ההנחה'}],'!P'],
 conditional:[[{formula:'P',label:'הנחה זמנית'},{formula:'Q',label:'תחת ההנחה'}],'P -> Q'],
};
export function formalRuleReminder(rule){
 const form=forms[rule.id];
 return form?inferenceView(rule.name,form[0].map(s=>typeof s==='string'?{formula:s}:s),form[1]):el('p','',rule.help);
}

export function ruleFormulaLabel(rule){
 const form=forms[rule.id];
 if(!form)return rule.name+(rule.id==='assume'?' — P':'');
 if(rule.id==='raa')return rule.name+' — ⁦(P → F) → ¬P⁩';
 if(rule.id==='conditional')return rule.name+' — ⁦P … Q; P → Q⁩';
 const premises=form[0].map(s=>typeof s==='string'?s:s.formula);
 const conjunction=premises.map(p=>{const text=proofFormula(p);return /[→↔]/.test(text)?`(${text})`:text;}).join(' ∧ ');
 const conclusion=proofFormula(form[1]);
 return `${rule.name} — ⁦(${conjunction}) → ${/[→↔]/.test(conclusion)?`(${conclusion})`:conclusion}⁩`;
}
