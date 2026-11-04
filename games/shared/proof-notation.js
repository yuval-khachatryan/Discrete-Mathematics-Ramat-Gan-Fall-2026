import {parse,format} from './logic.js';
// Keep every parenthesis the author/student actually wrote. Only normalize
// operator glyphs and spacing; citations must not silently rewrite the source.
export function proofFormula(source){
 if(typeof source!=='string'){
  if(['iff','imp'].includes(source.type)){
   const side=n=>['var','const','not'].includes(n.type)?format(n):`(${format(n)})`;
   return `${side(source.left)} ${source.type==='iff'?'↔':'→'} ${side(source.right)}`;
  }
  return format(source);
 }
 parse(source);
 return source.trim().replace(/<->|->|[!~&|^⊻]/g,s=>({'<->':'↔','->':'→','!':'¬','~':'¬','&':'∧','|':'∨','^':'⊕','⊻':'⊕'}[s]))
  .replace(/\s*([∧∨⊕→↔])\s*/g,' $1 ').replace(/¬\s+/g,'¬').replace(/\(\s+/g,'(').replace(/\s+\)/g,')');
}

// In the part selector, show every compound child's scope, without wrapping
// the entire expression. This also preserves the grouping of repeated AND/OR.
export function partFormula(node){
 const compound=n=>!['var','const','not'].includes(n.type);
 const child=n=>compound(n)?`(${partFormula(n)})`:partFormula(n);
 if(node.type==='var')return node.name;
 if(node.type==='const')return node.value?'T':'F';
 if(node.type==='not')return '¬'+child(node.arg);
 return (node.args||[node.left,node.right]).map(child).join(' '+{and:'∧',or:'∨',xor:'⊕',imp:'→',iff:'↔'}[node.type]+' ');
}
