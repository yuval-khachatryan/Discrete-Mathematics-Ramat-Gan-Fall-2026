import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {ARGUMENTS} from '../games/shared/argument-exercises.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,r=>r.abort());await page.goto(new URL('../_book/01-logic.html',import.meta.url).href);
 for(const id of ['rule-parcel','rule-registration','rule-parking']){
  const ex=ARGUMENTS[id],box=page.locator(`[data-argument="${id}"]`);
  for(const [i,item] of [...ex.premises,ex.goal].entries())await box.locator('.argument-translation input').nth(i).fill(item.formula);
  await box.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();
  for(const [i,step] of ex.solution.entries()){
   const row=box.locator('.argument-steps .proof-step').nth(i);
   assert.equal(await row.locator('.proof-rule option[value="iff-use"]').count(),ex.rules.includes('iff-use')?1:0);
   await row.locator('.proof-rule').selectOption(step.rule);
   assert.equal(await row.locator('.argument-source:visible').count(),step.refs.length);
   for(const [j,ref] of step.refs.entries())await row.locator('.argument-source').nth(j).selectOption(ref.replace(/^s/,'d'));
   await row.locator('.deduction-hint > summary').click();
   await row.locator('.deduction-hint button').first().waitFor();
   await row.locator('.proof-input').fill(step.formula);
   await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
   assert.ok(await row.evaluate(n=>n.classList.contains('step-accepted')));
   if(step.text)assert.ok((await row.locator('.step-compact').innerText()).includes(step.text.replace(/\.$/,'')));
  }
  await box.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();
  assert.equal(await box.locator('.proof-qed:not([hidden])').count(),1);
 }
 assert.deepEqual(errors,[]);console.log('Passed: three two-step proofs, appropriate rules and source counts, hints, natural wording, compact steps and completion.');
}finally{await browser.close();}
