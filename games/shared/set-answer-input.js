import {contextualKeyboard} from './formula-keyboard.js';
import {attachSetFormulaInput} from './set-formula-input.js';
// The same input support for rosters, subsets, and counterexamples; never keyed to the answer.
export function attachSetAnswerInput(input){
 if(input.dataset.setAnswerInput)return;
 input.dataset.setAnswerInput='true';
 const panel=document.createElement('div');panel.className='set-answer-keyboard bk-keys';panel.setAttribute('role','group');panel.setAttribute('aria-label','סמלים לתשובה בקבוצות');
 for(const [symbol,name]of [['∅','קבוצה ריקה'],['{','סוגר מסולסל פותח'],['}','סוגר מסולסל סוגר'],[',','פסיק'],['(','סוגר עגול פותח'],[')','סוגר עגול סוגר']]){
  const b=document.createElement('button');b.type='button';b.className='bk-key';b.textContent=symbol;b.setAttribute('aria-label',name);b.title=name;
  b.onclick=()=>{const a=input.selectionStart??input.value.length,z=input.selectionEnd??a;if(input.maxLength>=0&&input.value.length-(z-a)+symbol.length>input.maxLength)return;input.setRangeText(symbol,a,z,'end');input.focus();input.dispatchEvent(new Event('input',{bubbles:true}));};panel.append(b);
 }
 input.after(panel);attachSetFormulaInput(input,panel);contextualKeyboard(input,panel,{shortcuts:false});
 return panel;
}
