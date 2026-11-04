import assert from 'node:assert/strict';
import {expressionParts,checkReplacements} from '../games/shared/proof-rules.js';
import {variables} from '../games/shared/logic.js';
export async function chooseReplacement(row,path,after,rule){
 await row.locator(`.replacement-choice input[value="${path}"]`).check();
 const item=row.locator(`.replacement-item[data-path="${path}"]`);
 await item.locator('.replacement-rule').selectOption(rule);
 await item.locator('.replacement-after').fill(after);
 return item;
}
export async function writeRewrite(row,before,after,rule){
 const allowed=[...new Set([...variables(before),...variables(after)])];let match;
 for(const p of expressionParts(before))for(const q of expressionParts(after)){
  const replacement={path:p.path,before:p.formula,after:q.formula,rule};
  if(checkReplacements(before,after,[replacement],allowed).kind==='valid'){match=replacement;break;}
  if(match)break;
 }
 assert.ok(match,`No explicit rewrite for ${before} → ${after} (${rule})`);
 for(const input of await row.locator('.replacement-choice input:checked').all())await input.uncheck();
 await chooseReplacement(row,match.path,match.after,rule);
 await row.locator('.proof-input').fill(after);
}
export async function writeArgumentStep(box,row,step,formula){
 const rewrite=step.rule.startsWith('eq:');
 await row.locator('.proof-rule').selectOption(rewrite?'eq:replacements':step.rule);
 for(const [j,ref]of step.refs.entries())await row.locator('.argument-source').nth(j).selectOption(ref.replace(/^s/,'d'));
 if(rewrite){
  const ref=step.refs[0],index=Number(ref.slice(1))-1;
  const source=await box.locator(ref.startsWith('p')?'.argument-translation input':'.argument-steps .proof-input').nth(index).inputValue();
  await writeRewrite(row,source,formula,step.rule.slice(3));
 }else await row.locator('.proof-input').fill(formula);
}
