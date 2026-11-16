import test from 'node:test';
import assert from 'node:assert/strict';
import {placementStages,areaStages,membership,anchors,regionAt,dropPosition} from '../games/shared/venn-workshop.js';
test('region anchors occupy all distinct Venn regions',()=>{
 for(const size of [2,3]) anchors(size).forEach(([x,y],m)=>{
  assert.equal(regionAt(size,x,y),m);
  for(const dx of [-26,26])assert.equal(regionAt(size,x+dx,y),m);
 });
});
test('number stages cover overlaps, outside elements, and all three-set regions',()=>{
 assert.equal(membership(placementStages[0].sets,1),1);
 assert.equal(membership(placementStages[0].sets,2),3);
 assert.equal(membership(placementStages[0].sets,3),3);
 assert.equal(membership(placementStages[0].sets,5),2);
 for(const stage of placementStages){
  assert.deepEqual(stage.numbers,[1,2,3,4,5,6,7,8,9]);
  assert.ok(stage.numbers.some(n=>membership(stage.sets,n)===0));
  assert.ok(stage.sets.flat().every(n=>stage.numbers.includes(n)));
 }
 assert.deepEqual([...new Set(placementStages[2].numbers.map(n=>membership(placementStages[2].sets,n)))].sort(),[0,1,2,3,4,5,6,7]);
});
test('expression answers agree with membership logic',()=>{
 const predicates=[(a,b)=>a&&!b,(a,b)=>a!==b,(a,b)=>!(a||b),(a,b)=>a&&b,(a,b,c)=>(a||b)&&!c,(a,b,c)=>(a!==b)&&c,a=>!a];
 areaStages.forEach((s,i)=>assert.deepEqual(Array.from({length:1<<s.size},(_,m)=>m).filter(m=>predicates[i](!!(m&1),!!(m&2),!!(m&4))),s.masks));
});

test('drops retain their coordinates and flag boundaries without selecting a side',()=>{
 for(const size of [2,3])for(const [m,[x,y]]of anchors(size).entries()){
  const p=dropPosition(size,x+3,y-4);
  assert.deepEqual(p,{x:x+3,y:y-4,region:m});
 }
 for(const [x,y]of [[70,220],[350,220],[210,80]])assert.equal(dropPosition(2,x,y).region,null);
 assert.equal(dropPosition(2,355,220,6).region,null);
 assert.equal(dropPosition(2,358,220,6).region,2);
 assert.equal(dropPosition(3,65,145).region,null);
 assert.equal(dropPosition(2,2,300).region,null);
 assert.equal(dropPosition(2,-1,100),null);
 assert.equal(dropPosition(3,100,451),null);
});
