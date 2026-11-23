import {initTwoListCounting,initThreeListCounting} from "./two-list-counting.js";
// Count one arbitrary element's contribution, not the cardinality of the whole region.
export function elementContributions(membership){
  const names=['A','B','C'],terms=[];
  for(let i=0;i<membership.length;i++)terms.push({indices:[i],sign:1});
  for(let i=0;i<membership.length;i++)for(let j=i+1;j<membership.length;j++)terms.push({indices:[i,j],sign:-1});
  if(membership.length===3)terms.push({indices:[0,1,2],sign:1});
  return terms.map(t=>({...t,name:t.indices.map(i=>names[i]).join(' ∩ '),count:Number(t.indices.every(i=>membership[i]))}));
}
export function initCountingLab(box,size){
 return size===2?initTwoListCounting(box):initThreeListCounting(box);
}
