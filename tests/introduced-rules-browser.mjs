import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {chooseReplacement} from './rewrite-browser-helpers.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,r=>r.abort());await page.goto(new URL('../_book/01-logic.html',import.meta.url).href);
 for(const id of ['rule-and-parts','rule-and-join','rule-iff-use','rule-contradiction-steps','rule-cases-steps','rule-xor-rewrite']){
  assert.equal(await page.locator('#'+id).count(),1);
  assert.ok(await page.locator('#'+id).evaluate(n=>!!(n.compareDocumentPosition(document.querySelector('[data-knight-proof="cases"]'))&Node.DOCUMENT_POSITION_FOLLOWING)));
 }
 assert.equal(await page.locator('#rule-xor-rewrite').locator('xpath=ancestor::*[contains(@class,"thmbox-term")]').count(),0,'XOR is not nested in another terminology box');
 const box=page.locator('[data-knight-proof="direct"]');
 await box.locator('.kp-statement').nth(0).fill('B');await box.locator('.kp-statement').nth(1).fill('A ^ B');await box.getByRole('button',{name:'בדיקת ההצרנה ופתיחת ההוכחה',exact:true}).click();
 const row=box.locator('.kp-step').first();assert.equal(await row.locator('.kp-rule option[value="cases"]').count(),0);assert.equal(await row.locator('.kp-rule option[value="conditional"]').count(),0);
 await row.locator('.kp-rule').selectOption('iff-use');assert.equal(await row.locator('.kp-rule-help a').getAttribute('href'),'#rule-iff-use');
 await row.locator('.kp-rule').selectOption('eq:replacements');await row.locator('.kp-sources').selectOption('2');
 const replacement=await chooseReplacement(row,'r.1','(A & !B) | (!A & B)','xor');
 await replacement.locator('.replacement-rule-reference summary').click();assert.match(await replacement.locator('.replacement-rule-reference').innerText(),/⊕/);assert.doesNotMatch(await replacement.locator('.replacement-rule-reference').innerText(),/undefined/);
 for(const after of ['(A & !B) | (!A & B)','(A | B) & !(A & B)','A <-> !B']){
  await replacement.locator('.replacement-after').fill(after);await row.getByRole('button',{name:'הרכבת הנוסחה מן ההחלפות',exact:true}).click();await row.getByRole('button',{name:'בדיקת השורה',exact:true}).click();assert.equal(await row.getAttribute('aria-invalid'),'false');
 }
 const cases=page.locator('[data-knight-proof="cases"]');await cases.locator('.kp-statement').nth(0).fill('A & B');await cases.locator('.kp-statement').nth(1).fill('A & B');await cases.getByRole('button',{name:'בדיקת ההצרנה ופתיחת ההוכחה',exact:true}).click();assert.equal(await cases.locator('.kp-rule option[value="cases"]').count(),1);assert.equal(await cases.locator('.kp-rule option[value="conditional"]').count(),1);
 assert.deepEqual(errors,[]);console.log('Passed: prior rule explanations, scoped menus, reminder links, all XOR rewrites and formatted XOR reference.');
}finally{await browser.close();}
