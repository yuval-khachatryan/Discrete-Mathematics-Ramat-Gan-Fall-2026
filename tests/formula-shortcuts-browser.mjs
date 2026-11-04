import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.route(/^https?:/,r=>r.abort());await page.goto(new URL('../_book/01-logic.html',import.meta.url).href);
 const box=page.locator('[data-argument="library"]'),input=box.locator('.argument-translation input').first(),menu=box.locator('.formula-autocomplete').first();
 await input.pressSequentially('A -> B');assert.equal(await input.inputValue(),'A → B');
 await input.fill('');await input.pressSequentially('A <-> B');assert.equal(await input.inputValue(),'A ↔ B');
 await input.fill('A "AN');await menu.waitFor({state:'visible'});assert.equal(await menu.getByRole('option').count(),1);
 await input.press('Enter');assert.equal(await input.inputValue(),'A ∧');assert.equal(await menu.isVisible(),false);assert.equal(await box.locator('.proof-ledger').isVisible(),false);
 await input.fill('"NO');await input.press('Tab');assert.equal(await input.inputValue(),'¬');
 await input.fill('A "');await input.press('ArrowDown');await input.press('Enter');assert.equal(await input.inputValue(),'A ∨');
 await input.fill('A "XO');await menu.getByRole('option',{name:'XOR → ⊕',exact:true}).click();assert.equal(await input.inputValue(),'A ⊕');
 await input.fill('A "IF');await input.press('Escape');assert.equal(await menu.isVisible(),false);assert.equal(await input.inputValue(),'A "IF');
 await input.fill('CANDY');assert.equal(await input.inputValue(),'CANDY');assert.equal(await menu.isVisible(),false);
 await input.fill('A "IFF" B');assert.equal(await input.inputValue(),'A ↔ B');
 await input.fill('A B');await input.evaluate(n=>n.setSelectionRange(2,2));await input.pressSequentially('->');assert.equal(await input.inputValue(),'A →B');assert.equal(await input.evaluate(n=>n.selectionStart),3);
 // Reject rewritten givens and rewritten targets, while accepting direct notation.
 const fields=box.locator('.argument-translation input');await fields.nth(0).fill('!A | B');await fields.nth(1).fill('A');await fields.nth(2).fill('B');
 await box.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();assert.match(await box.locator('.argument-translation').first().innerText(),/הצרנה ישירה/);assert.equal(await box.locator('.proof-ledger').isVisible(),false);
 await fields.nth(0).fill('A -> B');await fields.nth(2).fill('!!B');await box.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();assert.match(await box.locator('.argument-translation').last().innerText(),/הצרנה ישירה/);
 await fields.nth(2).fill('B');await box.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();assert.equal(await box.locator('.proof-ledger').isVisible(),true);
 const row=box.locator('.proof-step').first();await row.locator('.proof-rule').selectOption('mp');await row.locator('.argument-source').nth(0).selectOption('p1');await row.locator('.argument-source').nth(1).selectOption('p2');
 await row.locator('.proof-input').fill('B');await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();assert.equal(await box.locator('.proof-qed:not([hidden])').count(),0);
 await box.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();assert.equal(await box.locator('.proof-qed:not([hidden])').count(),1);
 // The same capture-phase conversion is used by the other formula fields.
 const proof=page.locator('#box-q-ex-simplify .proof-editor');await proof.locator('.proof-custom-start > summary').click();const start=proof.locator('.proof-start-input');
 await start.fill('"NOT"("NOT" A "OR" (A "AND" "NOT" B))');assert.equal(await start.inputValue(),'¬(¬ A ∨ (A ∧ ¬ B))');
 await proof.getByRole('button',{name:'בדיקת נקודת המוצא',exact:true}).click();assert.equal(await proof.locator('.proof-start .step-editor').isVisible(),false);
 const knight=page.locator('[data-knight-proof="contradiction"]');await knight.locator('.kp-statement').fill('"NOT" A "AND" "NOT" B');assert.equal(await knight.locator('.kp-statement').inputValue(),'¬ A ∧ ¬ B');
 const fq=page.locator('.bk-fq').first();await fq.locator('.bk-fq-row > input').fill('A -> B');assert.equal(await fq.locator('.bk-fq-row > input').inputValue(),'A → B');
 await page.setViewportSize({width:390,height:900});await fq.locator('.bk-fq-row > input').fill('A "');await fq.locator('.formula-autocomplete').waitFor({state:'visible'});
 assert.ok(await fq.locator('.formula-autocomplete').evaluate(n=>n.scrollWidth<=n.clientWidth+1));await fq.screenshot({path:'/tmp/formula-autocomplete-mobile.png'});
 assert.deepEqual(errors,[]);console.log('Passed: arrow/quoted-word conversion, keyboard and mouse autocomplete, caret preservation, unquoted names, strict givens and target, explicit completion, shared fields, mobile.');
}finally{await browser.close();}
