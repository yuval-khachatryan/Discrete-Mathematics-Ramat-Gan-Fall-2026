import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {initialMethodSteps} from '../games/shared/method-proof-editor.js';
import {METHOD_EXERCISES} from '../games/shared/method-exercises.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,r=>r.abort());await page.goto(new URL('../_book/01-logic.html',import.meta.url).href);
 for(const [id,ex]of Object.entries(METHOD_EXERCISES)){
  const box=page.locator(`[data-method-proof="${id}"]`);
  assert.equal(await box.locator('.kp-translation').count(),0);
  assert.equal(await box.locator('.kp-givens li').count(),ex.premises.length);
  assert.ok((await box.locator('.proof-goal').innerText()).includes(ex.goal.text));
  const fixed=initialMethodSteps(ex);
  if(fixed.length){
   const first=box.locator('.kp-step').first();
   assert.equal(await first.getAttribute('data-fixed'),'true');
   assert.equal(await first.locator('.kp-formula').isDisabled(),true);
   assert.equal(await first.locator('.step-edit').isVisible(),false);
   assert.equal(await box.getByRole('button',{name:'חזרה לצעד האחרון',exact:true}).isDisabled(),true);
  }
  for(const [i,step]of ex.solution.entries()){
   if(i<fixed.length)continue;
   const row=box.locator('.kp-step').nth(i);await row.locator('.kp-rule').selectOption(step.rule);
   assert.equal(await row.locator('.kp-sources').count(),step.refs.length);
   if(id==='instructions'&&i===4){
    await row.locator('.kp-rule').selectOption('mp');
    assert.equal(await row.locator('.kp-sources').first().locator('option[value="6"]').count(),0,'closed case cannot supply a source');
    await row.locator('.kp-rule').selectOption('assume');
   }
   for(const [j,ref]of step.refs.entries())await row.locator('.kp-sources').nth(j).selectOption(String(ref));
   await row.locator('.kp-formula').fill(step.formula);
   await row.getByRole('button',{name:'בדיקת השורה',exact:true}).click();
   assert.ok(await row.evaluate(n=>n.classList.contains('step-accepted')),`${id} step ${i+1}: ${await row.innerText()}`);
  }
  assert.equal(await box.locator('.proof-qed:not([hidden])').count(),0);
  await box.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();
  assert.equal(await box.locator('.proof-qed:not([hidden])').count(),1);
  await box.locator('.kp-model > summary').click();
  assert.match(await box.locator('.kp-document').innerText(),/מש״ל/);
  assert.doesNotMatch(await box.innerText(),/כלל האי|בחידה|תושב|אבירים/);
  if(fixed.length){
   await box.getByRole('button',{name:'איפוס ההוכחה',exact:true}).click();
   const first=box.locator('.kp-step').first();
   assert.equal(await first.locator('.kp-formula').inputValue(),fixed[0].formula);
   const next=box.locator('.kp-step').nth(1);
   await next.locator('.kp-rule').selectOption('mp');await next.locator('.kp-formula').fill('A');
   await next.getByRole('button',{name:'בדיקת השורה',exact:true}).click();
   assert.equal(await first.locator('.step-editor').isVisible(),false);
   assert.equal(await first.locator('.step-edit').isVisible(),false);
   assert.equal(await first.locator('.kp-rule').isDisabled(),true);
  }
 }
 // First proof remains a useful visual check of compact rows and explicit goal.
 const event=page.locator('[data-method-proof="event"]');if(await event.locator('.kp-model').evaluate(n=>n.open))await event.locator('.kp-model > summary').click();await event.screenshot({path:'/tmp/contradiction-exercise-complete.png'});
 assert.deepEqual(errors,[]);console.log('Passed: four complete, freely entered method proofs; source scopes; explicit goals; compact steps, QED and model proofs; no island-specific text.');
}finally{await browser.close();}
