// Unlocked navigation for inline activities; answer state belongs to each activity.
export function stageNavigation(labels,onChange){
 let active=0,completion=[];
 const root=document.createElement('nav');root.className='stage-navigation';root.setAttribute('aria-label','שלבי הפעילות');root.hidden=labels.length<2;
 const button=(text,click)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',click);return b;};
 const prev=button('→ הקודם',()=>onChange(active-1));prev.className='stage-direction';
 const steps=labels.map((label,i)=>{const b=button(String(i+1),()=>onChange(i));b.title=label;b.setAttribute('aria-label',`שלב ${i+1}: ${label}`);b.dataset.stage=String(i);return b;});
 const next=button('הבא ←',()=>onChange(active+1));next.className='stage-direction';
 root.append(prev,...steps,next);
 function update(index,done=completion){completion=done;active=index;prev.disabled=index===0;next.disabled=index===labels.length-1;steps.forEach((b,i)=>{if(i===index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');b.classList.toggle('stage-complete',Boolean(done[i]));b.textContent=String(i+1)+(done[i]?' ✓':'');});}
 update(0);return {root,update};
}
export function stageSelectNavigation(box,select){
 const nav=stageNavigation([...select.options].map(o=>o.textContent),i=>{select.selectedIndex=i;select.dispatchEvent(new Event('change'));});
 const sync=()=>nav.update(select.selectedIndex);
 select.addEventListener('change',sync);select.hidden=true;
 const label=select.closest('label');if(label)label.hidden=true;
 box.prepend(nav.root);sync();return nav;
}
