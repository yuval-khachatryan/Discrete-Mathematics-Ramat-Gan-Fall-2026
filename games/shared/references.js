// Reference panels follow the BGU notes: a local copy, plus a new-tab source link.
import {initLectureTable} from './lecture-reveal.js';

export function initReferences() {
 const main=document.getElementById('quarto-document-content');
 if(!main||main.dataset.referencesReady)return;
 main.dataset.referencesReady='true';
 const boxes=new Map([...main.querySelectorAll('.thmbox[id], .equivalence-law[id]')].map(n=>[n.id,n.cloneNode(true)]));
 const root=new URL('./',location.href),current=new URL(location.href);current.hash='';
 let loading,serial=0,opened=[];
 const skip=a=>a.matches('.anchorjs-link,.footnote-ref,.footnote-back,[download]')||!a.getAttribute('href')||a.getAttribute('href')==='#';
 function newTabLinks(container){
  container.querySelectorAll('a[href]').forEach(a=>{
   if(skip(a))return;
   const url=new URL(a.href);
   if(!['http:','https:','file:'].includes(url.protocol))return;
   a.target='_blank';a.relList.add('noopener');
  });
 }
 newTabLinks(main);
 // Editors add links after initialization, and previews may contain more references.
 new MutationObserver(changes=>{
  for(const change of changes)for(const node of change.addedNodes)if(node.nodeType===1){
   if(node.matches('a[href]'))newTabLinks(node.parentElement);
   else newTabLinks(node);
  }
 }).observe(main,{childList:true,subtree:true});
 function loadIndex(){
  if(window.BOOK_REFERENCE_INDEX)return Promise.resolve(window.BOOK_REFERENCE_INDEX);
  return loading ||= new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src=new URL('reference-index.js',root).href;
   script.onload=()=>window.BOOK_REFERENCE_INDEX?resolve(window.BOOK_REFERENCE_INDEX):reject(Error('No reference index'));
   script.onerror=()=>{loading=null;script.remove();reject(Error('Reference index unavailable'));};
   document.head.append(script);
  });
 }
 function cleanCopy(source,url){
  const copy=source.cloneNode(true);
  copy.removeAttribute('title');
  copy.querySelectorAll('script, .anchorjs-link').forEach(n=>n.remove());
  const widgets='.argument-editor,.proof-editor,.knight-activity,.sets-exercise,.choice-exercise,.open-statement-game,.ttq,.fq,.tf-quiz,iframe';
  copy.querySelectorAll(widgets).forEach(n=>{
   if(n.parentElement?.closest(widgets))return;
   const note=document.createElement('p');note.className='xref-note';
   note.textContent='לפעילות האינטראקטיבית, פתחו את המקור בלשונית חדשה.';n.replaceWith(note);
  });
  // Raw solution markup has no event listeners: use a native disclosure instead.
  copy.querySelectorAll('.solve').forEach(n=>{
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='פתרון';
   details.append(summary,...n.childNodes);n.replaceWith(details);
  });
  for(const node of [copy,...copy.querySelectorAll('*')]){
   node.removeAttribute('id');node.removeAttribute('aria-controls');node.removeAttribute('aria-labelledby');
   for(const attr of [...node.attributes])if(attr.name.startsWith('on'))node.removeAttribute(attr.name);
  }
  copy.querySelectorAll('a[href]').forEach(a=>{
   const href=a.getAttribute('href');if(href&&!href.startsWith('javascript:'))a.href=new URL(href,url).href;
  });
  copy.querySelectorAll('[src]').forEach(n=>n.setAttribute('src',new URL(n.getAttribute('src'),url).href));
  copy.querySelectorAll('.lecture-table').forEach(initLectureTable);
  newTabLinks(copy);
  return copy;
 }
 function close(entry,focus=false){
  for(const child of [...opened])if(child!==entry&&entry.panel.contains(child.link))close(child);
  entry.panel.remove();entry.link.classList.remove('xref-open');entry.link.setAttribute('aria-expanded','false');entry.link.removeAttribute('aria-controls');
  opened=opened.filter(e=>e!==entry);if(focus)entry.link.focus({preventScroll:true});
 }
 document.addEventListener('click',async event=>{
  const link=event.target.closest?.('a[href]');
  if(!link||!main.contains(link)||skip(link)||link.classList.contains('xref-jump'))return;
  if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const url=new URL(link.href);let id;try{id=decodeURIComponent(url.hash.slice(1));}catch{return;}
  if(!id||url.origin!==root.origin||new URL('./',url).pathname!==root.pathname)return;
  const samePage=url.pathname===current.pathname;
  const local=samePage&&boxes.get(id);
  // Broad section references stay navigable; preview bounded boxes only.
  if(!local&&!/^(box-|rule-|law-table-|def-|thm-|exm-|prp-)/.test(id))return;
  let depth=0;for(let n=link.closest('.xref-panel');n;n=n.parentElement?.closest('.xref-panel'))depth++;
  if(depth>=3)return;
  event.preventDefault();event.stopImmediatePropagation();
  const existing=opened.find(e=>e.link===link);if(existing){close(existing);return;}
  const panel=document.createElement('aside');panel.className='xref-panel';panel.id=`xref-preview-${++serial}`;panel.setAttribute('aria-label','תוכן ההפניה');
  const head=document.createElement('div');head.className='xref-head';
  const jump=document.createElement('a');jump.className='xref-jump';jump.href=url.href;jump.target='_blank';jump.rel='noopener';jump.textContent='פתיחת המקור בלשונית חדשה';
  const button=document.createElement('button');button.className='xref-close';button.type='button';button.textContent='סגירה';
  const body=document.createElement('div');body.className='xref-body';body.setAttribute('aria-live','polite');body.textContent='טוען…';
  head.append(jump,button);panel.append(head,body);
  let block=link.closest('p,li,td,th,dd,figcaption')||link.parentElement;
  if(block.matches('td,th'))block=block.closest('table');
  block.after(panel);
  const entry={link,panel};opened.push(entry);link.classList.add('xref-open');link.setAttribute('aria-expanded','true');link.setAttribute('aria-controls',panel.id);
  button.addEventListener('click',()=>close(entry,true));
  try{
   let source=local;
   if(!source){
    const index=await loadIndex(),html=index[url.pathname.split('/').pop()]?.[id];
    if(!html)throw Error('No preview');
    const template=document.createElement('template');template.innerHTML=html;source=template.content.firstElementChild;
   }
   if(!panel.isConnected)return;
   body.replaceChildren(cleanCopy(source,url));
   window.MathJax?.typesetPromise?.([body]).catch(()=>{});
  }catch{
   if(panel.isConnected)body.textContent='לא ניתן להציג כאן את ההפניה. אפשר לפתוח את המקור בלשונית חדשה.';
  }
 },true);
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&opened.length){event.preventDefault();close(opened.at(-1),true);}
 });
}
