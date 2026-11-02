// Chapter and section links share one tree; every branch starts closed.
export function initNavigation(){
  const sidebar=document.getElementById('quarto-sidebar');
  if(!sidebar||sidebar.classList.contains('book-toc-ready'))return;
  const currentToc=document.getElementById('TOC');
  const data=document.getElementById('book-toc-data');
  const chapters=data?JSON.parse(data.textContent):[];
  const controls=[];
  function disclosure(container,list,label,chapter=false){
    const id=`toc-branch-${controls.length}`;list.id=list.id||id;
    const button=document.createElement('button');button.type='button';
    button.className=chapter?'toc-chapter-toggle':'toc-branch-toggle';
    button.setAttribute('aria-controls',list.id);button.setAttribute('aria-expanded','false');
    const arrow=document.createElement('span');arrow.className='toc-disclosure-arrow';arrow.textContent='◂';arrow.setAttribute('aria-hidden','true');button.append(arrow);
    const set=open=>{container.classList.toggle('toc-open',open);button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',`${open?'קיפול':'פתיחה'}: ${label}`);};
    button.addEventListener('click',()=>set(button.getAttribute('aria-expanded')!=='true'));
    set(false);controls.push({list,set});return button;
  }
  for(const link of sidebar.querySelectorAll('.sidebar-menu-container a.sidebar-link')){
    const url=new URL(link.href),file=url.pathname.split('/').pop();
    const chapter=chapters.find(c=>c.file===file);
    const isCurrent=url.pathname===location.pathname;
    if(!chapter&&!(isCurrent&&currentToc))continue;
    const toc=isCurrent&&currentToc?currentToc:document.createElement('div');
    if(toc!==currentToc){
      toc.innerHTML=chapter.html;
      toc.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
      toc.querySelectorAll('a').forEach(a=>{
        a.href=new URL(file+a.getAttribute('href'),location.href).href;
        a.removeAttribute('data-scroll-target');a.classList.remove('active');
      });
    }
    toc.querySelector(':scope > h2')?.remove();
    toc.classList.add('toc-tree');
    toc.setAttribute('aria-label',link.textContent.trim());
    const item=link.closest('li'),row=link.parentElement;
    item.classList.add('toc-chapter');row.classList.add('toc-chapter-row');
    row.prepend(disclosure(item,toc,link.textContent.trim(),true));item.append(toc);
    toc.querySelectorAll('li').forEach(li=>{
      const list=li.querySelector(':scope > ul'),a=li.querySelector(':scope > a');
      if(!list||!a)return;
      li.classList.add('toc-parent');li.insertBefore(disclosure(li,list,a.textContent.trim()),a);
    });
  }
  sidebar.classList.add('book-toc-ready');
  function revealHash(){
    if(!location.hash||!currentToc)return;
    const link=[...currentToc.querySelectorAll('a[href]')].find(a=>a.hash===location.hash);
    if(link)controls.filter(c=>c.list.contains(link)).forEach(c=>c.set(true));
  }
  window.addEventListener('hashchange',revealHash);revealHash();
}
