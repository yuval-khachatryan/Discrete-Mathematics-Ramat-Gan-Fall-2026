// Small, keyboard-accessible completions for the set proof editor only.
const words={forall:'∀',in:'∈',notin:'∉',subset:'⊆',supset:'⊇',intersect:'∩',union:'∪',empty:'∅',not:'¬',and:'∧',or:'∨',iff:'↔'};
let serial=0;
export function attachSetFormulaInput(input,panel){
 const menu=document.createElement('div');menu.className='formula-autocomplete';menu.id='set-completion-'+(++serial);menu.hidden=true;menu.setAttribute('role','listbox');menu.setAttribute('aria-label','השלמת סימון מתמטי');panel.append(menu);
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',menu.id);input.setAttribute('aria-expanded','false');
 let choices=[],selected=0,start=0,end=0;
 const hide=()=>{menu.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');};
 const highlight=()=>{[...menu.children].forEach((n,i)=>n.setAttribute('aria-selected',String(i===selected)));input.setAttribute('aria-activedescendant',menu.children[selected].id);};
 const choose=word=>{input.setRangeText(words[word],start,end,'end');hide();input.focus();input.dispatchEvent(new Event('input',{bubbles:true}));};
 function refresh(){
  if(input.readOnly){hide();return;}
  const caret=input.selectionStart,match=/(?:^|[^A-Za-z0-9_])([A-Za-z]+)$/.exec(input.value.slice(0,caret));
  if(!match||match[1]!==match[1].toLowerCase()||caret!==input.selectionEnd){hide();return;}
  choices=Object.keys(words).filter(w=>w.startsWith(match[1].toLowerCase()));if(!choices.length){hide();return;}
  start=caret-match[1].length;end=caret;selected=0;
  menu.replaceChildren(...choices.map(word=>{const b=document.createElement('button');b.type='button';b.dir='ltr';b.textContent=word+' → '+words[word];b.id=menu.id+'-'+word;b.setAttribute('role','option');b.tabIndex=-1;b.addEventListener('mousedown',e=>e.preventDefault());b.addEventListener('click',()=>choose(word));return b;}));
  menu.hidden=false;input.setAttribute('aria-expanded','true');highlight();
 }
 input.addEventListener('input',e=>{
  if(e.isComposing)return;
  // Convert completed words only after a delimiter, so "notin" can be typed fully.
  const pos=input.selectionStart,before=input.value.slice(0,pos),m=/(<->|->|\b(forall|notin|subset|supset|intersect|union|empty|not|and|or|iff|in)(?=\s$))\s?$/i.exec(before);
  if(m){const value=m[1]==='<->'?'↔':m[1]==='->'?'→':words[m[2].toLowerCase()],space=/\s$/.test(m[0])?' ':'';input.setRangeText(value+space,m.index,pos,'end');}
  refresh();
 });
 input.addEventListener('keydown',e=>{
  if(menu.hidden||e.isComposing)return;
  if(['ArrowDown','ArrowUp','Enter','Tab','Escape'].includes(e.key)){
   e.preventDefault();e.stopPropagation();
   if(e.key==='Escape')hide();else if(['Enter','Tab'].includes(e.key))choose(choices[selected]);else{selected=(selected+(e.key==='ArrowDown'?1:-1)+choices.length)%choices.length;highlight();}
  }
 });
 input.addEventListener('focus',refresh);input.addEventListener('click',refresh);input.addEventListener('blur',hide);
}
