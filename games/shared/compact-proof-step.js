// Keep a checked line readable without discarding any editable fields or listeners.
export function compactProofStep(fieldset,onEdit=()=>{}){
 const legend=fieldset.querySelector(':scope > legend');
 if(legend){
  const label=document.createElement('span');label.className='step-label';label.setAttribute('aria-hidden','true');
  const updateLabel=()=>{label.textContent=legend.textContent;};updateLabel();
  new MutationObserver(updateLabel).observe(legend,{childList:true,characterData:true,subtree:true});
  legend.after(label);fieldset.classList.add('side-labelled');
 }
 const editor=document.createElement('div');editor.className='step-editor';
 for(const child of [...fieldset.children])if(child.tagName!=='LEGEND'&&!child.classList.contains('step-label'))editor.append(child);
 const summary=document.createElement('div');summary.className='step-compact';summary.hidden=true;
 const claim=document.createElement('bdi');claim.className='proof-formula';claim.dir='ltr';
 const reason=document.createElement('div');reason.className='step-compact-reason';
 const words=document.createElement('small');words.className='step-compact-words';
 const edit=document.createElement('button');edit.type='button';edit.className='bk-btn step-edit';edit.textContent='עריכה';
 const statement=document.createElement('div');statement.className='step-statement';statement.append(claim,words);
 const qed=document.createElement('span');qed.className='proof-qed';qed.textContent='מש״ל';qed.title='מה שהיה להוכיח';qed.setAttribute('aria-label','מש״ל — מה שהיה להוכיח');qed.hidden=true;
 summary.append(statement,reason,edit,qed);fieldset.append(summary,editor);
 let locked=false;
 function expand(){
  if(locked){qed.hidden=true;return;}
  qed.hidden=true;summary.hidden=true;editor.hidden=false;fieldset.classList.remove('step-accepted');
 }
 edit.addEventListener('click',()=>{onEdit();expand();focus();});
 function focus(){
  if(locked)return;
  const control=[...editor.querySelectorAll('select,input,button,summary')].find(n=>!n.disabled&&n.getClientRects().length);
  control?.focus({preventScroll:true});
 }
 return {
  accept(formula,justification,wording='',detail=''){qed.hidden=true;statement.classList.toggle('has-words',!!wording);summary.querySelectorAll(':scope > details').forEach(n=>n.remove());words.textContent=wording;words.hidden=!wording;claim.textContent=formula;if(typeof justification==='string')reason.textContent=justification;else reason.replaceChildren(justification);if(detail){const explanation=document.createElement('details'),label=document.createElement('summary'),body=document.createElement('div');label.textContent=justification;body.textContent=detail;explanation.append(label,body);reason.replaceChildren(explanation);}summary.hidden=false;editor.hidden=true;fieldset.classList.add('step-accepted');},
  lock(){locked=true;edit.hidden=true;fieldset.classList.add('step-fixed');fieldset.setAttribute('data-fixed','true');summary.title='הצעד הזה קבוע בתרגיל';editor.querySelectorAll('input,select,button,textarea').forEach(control=>control.disabled=true);},
  finish(){qed.hidden=false;},
  invalidate:expand,focus,
 };
}
