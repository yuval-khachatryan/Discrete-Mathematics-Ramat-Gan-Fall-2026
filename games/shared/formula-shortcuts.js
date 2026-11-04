export const WORD_SYMBOLS={AND:'∧',OR:'∨',XOR:'⊕',NOT:'¬',IFF:'↔'};
const tokens=/<->|->|"\s*(AND|OR|XOR|NOT|IFF)\s*"|״\s*(AND|OR|XOR|NOT|IFF)\s*״|“\s*(AND|OR|XOR|NOT|IFF)\s*”/gi;
export function normalizeFormulaShortcuts(value,start=value.length,end=start){
 const edits=[...value.matchAll(tokens)].map(m=>({from:m.index,to:m.index+m[0].length,text:m[0]==='<->'?'↔':m[0]==='->'?'→':WORD_SYMBOLS[(m[1]||m[2]||m[3]).toUpperCase()]}));
 const caret=point=>{let delta=0;for(const e of edits){if(point<=e.from)break;if(point<e.to)return e.from+delta+e.text.length;delta+=e.text.length-(e.to-e.from);}return point+delta;};
 let result='',last=0;for(const e of edits){result+=value.slice(last,e.from)+e.text;last=e.to;}result+=value.slice(last);
 return {value:result,start:caret(start),end:caret(end)};
}
let serial=0;
export function attachFormulaShortcuts(input,panel){
 const menu=document.createElement('div');menu.className='formula-autocomplete';menu.id=`formula-autocomplete-${++serial}`;menu.setAttribute('role','listbox');menu.setAttribute('aria-label','השלמת קשר לוגי');menu.hidden=true;panel.append(menu);
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',menu.id);input.setAttribute('aria-expanded','false');input.setAttribute('autocomplete','off');
 let options=[],selected=0,range=null;
 function hide(){menu.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
 function highlight(){[...menu.children].forEach((b,i)=>b.setAttribute('aria-selected',String(i===selected)));if(menu.children[selected])input.setAttribute('aria-activedescendant',menu.children[selected].id);}
 function choose(word){
  if(!range)return;
  input.setRangeText(WORD_SYMBOLS[word],range.start,range.end,'end');hide();input.focus();input.dispatchEvent(new Event('input',{bubbles:true}));
 }
 function refresh(){
  const caret=input.selectionStart??input.value.length,before=input.value.slice(0,caret),match=/("|״|“)([A-Za-z]*)$/.exec(before);
  if(!match||input.selectionEnd!==caret){hide();return;}
  const opening=match[1];if(opening!=='“'&&[...before.slice(0,match.index)].filter(c=>c===opening).length%2){hide();return;}
  options=Object.keys(WORD_SYMBOLS).filter(word=>word.startsWith(match[2].toUpperCase()));
  if(!options.length){hide();return;}
  const tail=/^[A-Za-z]*("|״|”)/.exec(input.value.slice(caret));range={start:match.index,end:caret+(tail?.[0].length||0)};selected=0;
  menu.replaceChildren(...options.map(word=>{const b=document.createElement('button');b.type='button';b.id=menu.id+'-'+word;b.setAttribute('role','option');b.tabIndex=-1;b.textContent=`${word} → ${WORD_SYMBOLS[word]}`;b.dir='ltr';b.addEventListener('click',()=>choose(word));return b;}));
  menu.hidden=false;input.setAttribute('aria-expanded','true');highlight();
 }
 input.addEventListener('input',event=>{
  if(event.isComposing)return;
  const converted=normalizeFormulaShortcuts(input.value,input.selectionStart,input.selectionEnd);
  if(converted.value!==input.value){input.value=converted.value;input.setSelectionRange(converted.start,converted.end);}
  refresh();
 },true);
 input.addEventListener('compositionend',()=>input.dispatchEvent(new Event('input',{bubbles:true})));
 input.addEventListener('keydown',event=>{
  if(menu.hidden||event.isComposing)return;
  if(['ArrowDown','ArrowUp','Enter','Tab','Escape'].includes(event.key)){
   event.preventDefault();event.stopPropagation();
   if(event.key==='Escape')hide();
   else if(event.key==='Enter'||event.key==='Tab')choose(options[selected]);
   else {selected=(selected+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;highlight();}
  }
 });
 input.addEventListener('keyup',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key))refresh();});
 input.addEventListener('focus',refresh);input.addEventListener('click',refresh);panel.addEventListener('click',refresh);
 input.addEventListener('blur',event=>{if(!menu.contains(event.relatedTarget))hide();});
}
