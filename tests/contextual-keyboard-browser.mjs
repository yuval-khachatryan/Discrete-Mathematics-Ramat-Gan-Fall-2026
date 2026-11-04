import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1200,height:900},hasTouch:true});
 await context.route(/^https?:/,r=>r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL('../_book/01-logic.html',import.meta.url).href);
 await page.locator('.argument-translation').first().waitFor();
 assert.equal(await page.locator('.bk-keys:not([hidden])').count(),0);
 const box=page.locator('[data-argument="library"]'),fields=box.locator('.argument-translation input'),panels=box.locator('.argument-translation .bk-keys');
 await fields.nth(0).fill('AB');await fields.nth(0).evaluate(n=>n.setSelectionRange(1,1));
 assert.equal(await panels.nth(0).isVisible(),true);
 assert.equal(await page.locator('.bk-keys:not([hidden])').count(),1);
 await panels.nth(0).getByRole('button',{name:'גרירה',exact:true}).click();
 assert.equal(await fields.nth(0).inputValue(),'A→B');assert.equal(await fields.nth(0).evaluate(n=>document.activeElement===n),true);
 await fields.nth(1).focus();assert.equal(await panels.nth(0).isVisible(),false);assert.equal(await panels.nth(1).isVisible(),true);
 await page.keyboard.press('Tab');assert.equal(await panels.nth(1).isVisible(),true);assert.ok(await panels.nth(1).evaluate(n=>n.contains(document.activeElement)));
 await page.keyboard.press('Enter');assert.equal(await fields.nth(1).inputValue(),'¬');assert.equal(await fields.nth(1).evaluate(n=>document.activeElement===n),true);
 await panels.nth(1).locator('button').last().focus();await page.keyboard.press('Tab');assert.equal(await panels.nth(1).isVisible(),false);
 await fields.nth(0).fill('A -> B');await fields.nth(1).fill('A');await fields.nth(2).fill('B');
 await box.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();
 await panels.nth(2).waitFor({state:'hidden'});
 assert.equal(await box.locator('.bk-keys:not([hidden])').count(),0);
 assert.equal(await box.locator('.argument-steps').isVisible(),true,'translation approval button must receive the click even when the panel closes');
 const step=box.locator('.proof-step').first();await step.locator('.proof-rule').selectOption('mp');await step.locator('.proof-input').focus();assert.equal(await step.locator('.step-editor > .bk-keys').isVisible(),true);
 await step.locator('.proof-rule').focus();await step.locator('.proof-rule').selectOption('mp');assert.equal(await step.locator('.step-editor > .bk-keys').isVisible(),false);

 const proof=page.locator('#practice-q-eq-neither .proof-editor');await proof.locator('.proof-custom-start > summary').click();await proof.locator('.proof-start-input').fill('!(!A & !B)');
 assert.equal(await proof.locator('.proof-custom-start > .bk-keys').isVisible(),true);
 await proof.getByRole('button',{name:'בדיקת נקודת המוצא',exact:true}).click();
 const rewrite=proof.locator('.proof-steps > .proof-step').first();assert.equal(await rewrite.locator('.replacement-parts').evaluate(n=>n.open),true);await rewrite.locator('.replacement-choice input[value="r"]').check();
 await proof.locator('.proof-custom-start > .bk-keys').waitFor({state:'hidden'});
 const local=rewrite.locator('.replacement-after');await local.fill('A');assert.equal(await rewrite.locator('.replacement-item .bk-keys').isVisible(),true);
 await rewrite.locator('.replacement-item .bk-keys').getByRole('button',{name:'וגם',exact:true}).click();assert.equal(await local.inputValue(),'A∧');
 await rewrite.locator('.proof-input').focus();assert.equal(await rewrite.locator('.replacement-item .bk-keys').isVisible(),false);assert.equal(await rewrite.locator('.step-editor > .bk-keys').isVisible(),true);

 const knight=page.locator('[data-knight-proof="contradiction"]');await knight.locator('.kp-statement').focus();assert.equal(await knight.locator('.kp-translation > .bk-keys').first().isVisible(),true);
 const fq=page.locator('.bk-fq').first();await fq.locator('.bk-fq-row > input').focus();assert.equal(await fq.locator('.bk-keys').isVisible(),true);
 assert.equal(await knight.locator('.kp-translation > .bk-keys').first().isVisible(),false);
 assert.equal(await page.locator('.bk-keys:not([hidden])').count(),1);

 await page.setViewportSize({width:390,height:900});await box.getByRole('button',{name:'עריכת נתון 1',exact:true}).click();await fields.nth(0).fill('AB');await fields.nth(0).evaluate(n=>n.setSelectionRange(1,1));
 await panels.nth(0).getByRole('button',{name:'גרירה',exact:true}).tap();assert.equal(await fields.nth(0).inputValue(),'A→B');assert.equal(await panels.nth(0).isVisible(),true);
 await box.locator('.argument-translation').first().screenshot({path:'/tmp/contextual-keyboard-mobile.png'});
 assert.ok(await panels.nth(0).evaluate(n=>n.scrollWidth<=n.clientWidth+2));
 await fields.nth(0).evaluate(n=>n.blur());assert.equal(await panels.nth(0).isVisible(),false);
 assert.deepEqual(errors,[]);
 console.log('Passed: panels hidden initially; one active panel; caret insertion; Tab/Enter; touch; translation, proof, replacement, knights and formula fields.');
}finally{await browser.close();}
