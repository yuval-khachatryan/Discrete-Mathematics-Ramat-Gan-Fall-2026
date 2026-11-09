import {SET_PROOFS} from './set-proof-exercises.js';
import {parseStatement,expandSubset,show} from './set-proof-syntax.js';
export const step=(rule,formula,...sources)=>({rule,formula,sources});
export const MODELS={
 'inclusion-chain':[[step('subset-use','x ∈ B','G1','S1'),step('subset-use','x ∈ C','G2','S2')]],
 'hw-intersection':[[step('intersection','x ∈ B','G1'),step('subset-use','x ∈ C','G2','S1'),step('intersection','x ∈ A','G1'),step('intersection','x ∈ A ∩ C','S2','S3')]],
 'intersection-target':[[step('subset-use','x ∈ B','G1','S1'),step('subset-use','x ∈ C','G2','S1'),step('intersection','x ∈ B ∩ C','S2','S3')]],
 'hw-union':[[step('intersection','x ∈ A','S1'),step('union','x ∈ A ∪ C','S2')]],
 'union-target':[[step('union','(x ∈ A) ∨ (x ∈ B)','S1'),step('assume','x ∈ A'),step('subset-use','x ∈ C','G1','S3'),step('conditional','(x ∈ A) → (x ∈ C)','S3','S4'),step('assume','x ∈ B'),step('subset-use','x ∈ C','G2','S6'),step('conditional','(x ∈ B) → (x ∈ C)','S6','S7'),step('cases','x ∈ C','S2','S5','S8')]],
 'hw-difference':[[step('difference','x ∈ C','S1'),step('difference','x ∉ B','S1'),step('subset-negative','x ∉ A','G1','S3'),step('difference','x ∈ C ∖ A','S2','S4')]],
 'double-difference':[
  [step('difference','x ∈ A','S1'),step('difference','x ∉ A ∖ B','S1'),step('difference','¬((x ∈ A) ∧ (x ∉ B))','S3'),step('eq:demorgan','(x ∉ A) ∨ (x ∈ B)','S4'),step('or-out','x ∈ B','S5','S2'),step('intersection','x ∈ A ∩ B','S2','S6')],
  [step('intersection','x ∈ A','S1'),step('intersection','x ∈ B','S1'),step('assume','x ∈ A ∖ B'),step('difference','x ∉ B','S4'),step('false','F','S3','S5'),step('raa','x ∉ A ∖ B','S4','S6'),step('difference','x ∈ A ∖ (A ∖ B)','S2','S7')],
 ],
 'hw-witness':[[step('subset-use','x ∈ B','G1','G2'),step('and-in','(x ∈ B) ∧ (x ∉ C)','S1','G3')]],
 'hw-absorption':[
  [step('equal-use','x ∈ A ∩ B','G1','S1'),step('intersection','x ∈ B','S2')],
  [step('intersection','x ∈ A','S1')],
  [step('subset-use','x ∈ B','G1','S1'),step('intersection','x ∈ A ∩ B','S1','S2')],
 ],
};
function build(fn){const steps=[];const add=(r,f,...refs)=>{steps.push(step(r,f,...refs));return 'S'+(steps.length+1);};fn(add);return steps;}
MODELS['proof-union']=[build(add=>{
 const disj=add('union','(x ∈ A) ∨ (x ∈ C)','S1');
 const a=add('assume','x ∈ A'),b=add('subset-use','x ∈ B','G1',a),c=add('union','x ∈ B ∪ C',b),first=add('conditional','(x ∈ A) → (x ∈ B ∪ C)',a,c);
 const d=add('assume','x ∈ C'),e=add('union','x ∈ B ∪ C',d),second=add('conditional','(x ∈ C) → (x ∈ B ∪ C)',d,e);
 add('cases','x ∈ B ∪ C',disj,first,second);
})];
MODELS['mixed-union']=[build(add=>{
 const a=add('intersection','x ∈ A','S1'),bc=add('intersection','x ∈ B ∪ C','S1'),disj=add('union','(x ∈ B) ∨ (x ∈ C)',bc);
 const b=add('assume','x ∈ B'),ab=add('intersection','x ∈ A ∩ B',a,b),out=add('union','x ∈ (A ∩ B) ∪ C',ab),first=add('conditional','(x ∈ B) → (x ∈ (A ∩ B) ∪ C)',b,out);
 const c=add('assume','x ∈ C'),out2=add('union','x ∈ (A ∩ B) ∪ C',c),second=add('conditional','(x ∈ C) → (x ∈ (A ∩ B) ∪ C)',c,out2);
 add('cases','x ∈ (A ∩ B) ∪ C',disj,first,second);
})];
MODELS['hw-union-diff']=[build(add=>{
 const ab=add('difference','x ∈ A ∪ B','S1'),nc=add('difference','x ∉ C','S1'),disj=add('union','(x ∈ A) ∨ (x ∈ B)',ab);
 const a=add('assume','x ∈ A'),r=add('union','x ∈ A ∪ (B ∖ C)',a),first=add('conditional','(x ∈ A) → (x ∈ A ∪ (B ∖ C))',a,r);
 const b=add('assume','x ∈ B'),d=add('difference','x ∈ B ∖ C',b,nc),r2=add('union','x ∈ A ∪ (B ∖ C)',d),second=add('conditional','(x ∈ B) → (x ∈ A ∪ (B ∖ C))',b,r2);
 add('cases','x ∈ A ∪ (B ∖ C)',disj,first,second);
})];
MODELS['hw-difference-cases']=[build(add=>{
 const a=add('difference','x ∈ A','S1'),nc=add('difference','x ∉ C','S1');
 const b=add('assume','x ∈ B'),bc=add('difference','x ∈ B ∖ C',b,nc),r=add('union','x ∈ (A ∖ B) ∪ (B ∖ C)',bc),first=add('conditional','(x ∈ B) → (x ∈ (A ∖ B) ∪ (B ∖ C))',b,r);
 const nb=add('assume','x ∉ B'),ab=add('difference','x ∈ A ∖ B',a,nb),r2=add('union','x ∈ (A ∖ B) ∪ (B ∖ C)',ab),second=add('conditional','(x ∉ B) → (x ∈ (A ∖ B) ∪ (B ∖ C))',nb,r2);
 add('cases','x ∈ (A ∖ B) ∪ (B ∖ C)',first,second);
})];
MODELS['hw-demorgan']=[build(add=>{
 const a=add('difference','x ∈ A','S1'),not=add('difference','x ∉ B ∪ C','S1'),n=add('union','¬((x ∈ B) ∨ (x ∈ C))',not),both=add('eq:demorgan','(x ∉ B) ∧ (x ∉ C)',n),nb=add('and-out','x ∉ B',both),nc=add('and-out','x ∉ C',both),ab=add('difference','x ∈ A ∖ B',a,nb),ac=add('difference','x ∈ A ∖ C',a,nc);add('intersection','x ∈ (A ∖ B) ∩ (A ∖ C)',ab,ac);
}),build(add=>{
 const ab=add('intersection','x ∈ A ∖ B','S1'),ac=add('intersection','x ∈ A ∖ C','S1'),a=add('difference','x ∈ A',ab),nb=add('difference','x ∉ B',ab),nc=add('difference','x ∉ C',ac),both=add('and-in','(x ∉ B) ∧ (x ∉ C)',nb,nc),n=add('eq:demorgan','¬((x ∈ B) ∨ (x ∈ C))',both),not=add('union','x ∉ B ∪ C',n);add('difference','x ∈ A ∖ (B ∪ C)',a,not);
})];
MODELS['proof-demorgan']=[build(add=>{
 const not=add('complement','x ∉ A ∪ B','S1'),n=add('union','¬((x ∈ A) ∨ (x ∈ B))',not),both=add('eq:demorgan','(x ∉ A) ∧ (x ∉ B)',n),na=add('and-out','x ∉ A',both),nb=add('and-out','x ∉ B',both),u=add('universe-member','x ∈ U','S1'),a=add('complement','x ∈ Aᶜ',u,na),b=add('complement','x ∈ Bᶜ',u,nb);add('intersection','x ∈ Aᶜ ∩ Bᶜ',a,b);
}),build(add=>{
 const a=add('intersection','x ∈ Aᶜ','S1'),b=add('intersection','x ∈ Bᶜ','S1'),na=add('complement','x ∉ A',a),nb=add('complement','x ∉ B',b),both=add('and-in','(x ∉ A) ∧ (x ∉ B)',na,nb),n=add('eq:demorgan','¬((x ∈ A) ∨ (x ∈ B))',both),not=add('union','x ∉ A ∪ B',n);const u=add('universe-member','x ∈ U','S1');add('complement','x ∈ (A ∪ B)ᶜ',u,not);
})];
MODELS['hw-association']=[build(add=>{
 const ab=add('difference','x ∈ A ∖ B','S1'),nc=add('difference','x ∉ C','S1'),a=add('difference','x ∈ A',ab),nb=add('difference','x ∉ B',ab),both=add('and-in','(x ∉ B) ∧ (x ∉ C)',nb,nc),n=add('eq:demorgan','¬((x ∈ B) ∨ (x ∈ C))',both),not=add('union','x ∉ B ∪ C',n);add('difference','x ∈ A ∖ (B ∪ C)',a,not);
}),build(add=>{
 const a=add('difference','x ∈ A','S1'),not=add('difference','x ∉ B ∪ C','S1'),n=add('union','¬((x ∈ B) ∨ (x ∈ C))',not),both=add('eq:demorgan','(x ∉ B) ∧ (x ∉ C)',n),nb=add('and-out','x ∉ B',both),nc=add('and-out','x ∉ C',both),ab=add('difference','x ∈ A ∖ B',a,nb);add('difference','x ∈ (A ∖ B) ∖ C',ab,nc);
})];
MODELS['complement-inclusion']=[build(add=>{
 const a=add('assume','x ∈ A'),b=add('subset-use','x ∈ B','G1',a),contradiction=add('false','F',b,'S1');
 const na=add('raa','x ∉ A',a,contradiction),u=add('universe-member','x ∈ U','S1');add('complement','x ∈ Aᶜ',u,na);
})];

// The learner explicitly opens and closes the arbitrary-element proof.
export function wrapInclusion(config,body,variable='x'){
 const quantified=show(expandSubset(parseStatement(config.goal),variable));
 return [{rule:'open-forall',formula:quantified,variable,style:'member',sources:[]},...body,
  step('close-forall',quantified,'S1','S'+(body.length+1)),
  step('subset-definition',config.goal,'S'+(body.length+2))];
}
for(const [id,parts]of Object.entries(MODELS))MODELS[id]=parts.map((body,i)=>SET_PROOFS[id].parts[i].flow==='goals'?wrapInclusion(SET_PROOFS[id].parts[i],body):body);
