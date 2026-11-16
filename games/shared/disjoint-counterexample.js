import {attachSetAnswerInput} from "./set-answer-input.js";
import {parseObject} from './sets.js';
export function checkDisjointCounterexample(a,b){
 try{
  const read=text=>{const n=parseObject(text);if(n.type!=='set'||n.items.length>10||n.items.some(x=>x.type!=='atom'||! /^-?\d+$/.test(x.value)||Math.abs(Number(x.value))>99))throw Error('כתבו קבוצה של עד 10 מספרים שלמים בין ‎−99 ל־99, למשל {1,2}. לקבוצה הריקה כתבו {} או ∅.');return new Set(n.items.map(x=>x.value));};
  const A=read(a),B=read(b);
  if([...A].some(x=>!B.has(x)))return {ok:false,message:'הדוגמה אינה מקיימת את הנתון A ⊆ B: יש איבר של A שאינו ב־B.'};
  if([...A].some(x=>B.has(x)))return {ok:false,message:'ההכלה מתקיימת, אבל יש איבר משותף. כדי להפריך את הטענה דרושות קבוצות זרות.'};
  return {ok:true,message:'נכון! A מוכלת ב־B, ובכל זאת החיתוך ריק. זו דוגמה נגדית לטענה.'};
 }catch(e){return {ok:false,message:e.message};}
}
export function initDisjointCounterexample(box){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.className='bk-btn';b.onclick=fn;return b;};
 const verdict=el('p'),feedback=el('p'),explanation=el('div'),form=el('form'),choices=el('div');
 verdict.className=feedback.className='bk-msg';verdict.setAttribute('aria-live','polite');feedback.setAttribute('aria-live','polite');
 const hint='רמז: האם הנתון A ⊆ B מבטיח שקיים איבר ב־A? בדקו גם את הקבוצה הריקה.';
 form.hidden=true;explanation.hidden=true;
 const fields=['A','B'].map(name=>{const label=el('label',`${name} = `),input=el('input');input.type='text';input.dir='ltr';input.className='bk-input';input.maxLength=120;input.placeholder='{ ... }';input.setAttribute('aria-label',`הקבוצה ${name}`);label.append(input);form.append(label);input.oninput=()=>{feedback.textContent='';explanation.hidden=true;};return input;});
 const choose=value=>{for(const b of choices.children)b.setAttribute('aria-pressed',String(b.dataset.verdict===String(value)));explanation.hidden=true;feedback.textContent='';form.hidden=false;verdict.textContent=value?'לא נכון. נסו למצוא דוגמה נגדית בעצמכם והזינו אותה בשדות שלמטה. '+hint:'כדי להצדיק שהטענה אינה נכונה, הזינו קבוצות שמקיימות A ⊆ B וגם A ∩ B = ∅.';};
 for(const[value,text]of [[true,'נכון'],[false,'לא נכון']]){const b=button(text,()=>choose(value));b.dataset.verdict=String(value);b.setAttribute('aria-pressed','false');choices.append(b);}
 const submit=el('button','בדיקת הדוגמה הנגדית');submit.type='submit';submit.className='bk-btn';form.append(el('p','השתמשו בקבוצות של עד 10 מספרים שלמים בין ‎−99 ל־99. לקבוצה הריקה אפשר לכתוב {} או ∅.'),submit,button('רמז',()=>{feedback.textContent=hint;}),feedback);
 form.onsubmit=e=>{e.preventDefault();const result=checkDisjointCounterexample(...fields.map(f=>f.value));feedback.textContent=result.message;feedback.className='bk-msg '+(result.ok?'bk-good':'bk-bad');explanation.hidden=!result.ok;if(result.ok)explanation.textContent='הנקודה היא ש־A יכולה להיות ריקה. למשל, A = ∅ ו־B = {1}: אפילו ההכלה ממש מתקיימת, אך הקבוצות זרות. אם מוסיפים A ≠ ∅, אפשר לבחור איבר של A; מההכלה הוא שייך גם ל־B, ולכן החיתוך אינו ריק.';};
 box.append(el('p','האם הטענה נכונה?'),choices,verdict,form,explanation);fields.forEach(attachSetAnswerInput);
}
