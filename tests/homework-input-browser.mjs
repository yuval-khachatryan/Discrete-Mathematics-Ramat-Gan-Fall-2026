import {chromium} from 'playwright-core';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),requests=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,r=>{requests.push(r.request().url());r.abort();});
 const url=pathToFileURL(fileURLToPath(new URL('../../Alternative Versions/Interactive Exercises/logic-exercises.html',import.meta.url))).href;
 await page.goto(url);await page.evaluate(()=>window.MathJax.startup.promise);
 for(const id of ['or-message-both','or-maps-both']){
  const box=page.locator(`[data-choice="${id}"]`);
  await box.locator('select').selectOption('1');
  await box.getByRole('button',{name:'בדיקת התשובות',exact:true}).click();
  assert.equal(await box.locator('.choice-item > .bk-bad').count(),1);
  await box.locator('select').selectOption('0');
  await box.getByRole('button',{name:'בדיקת התשובות',exact:true}).click();
  assert.match(await box.locator('form > .bk-msg').innerText(),/כל התשובות נכונות/);
 }
 const sub=page.locator('[data-choice="substitute"]');
 for(const [i,expected] of ['2 + 1 = 4','3 + 1 = 4'].entries()){
  const row=sub.locator('.choice-item').nth(i),input=row.locator('input'),select=row.locator('select');
  assert.equal(await input.inputValue(),'');assert.equal(await select.isDisabled(),true);
  assert.doesNotMatch(await row.locator('legend').innerText(),/\d\s*\+\s*1/);
  await input.fill('x+1=4');await row.getByRole('button',{name:'בדיקת ההצבה',exact:true}).click();assert.equal(await input.getAttribute('aria-invalid'),'true');assert.equal(await select.isDisabled(),true);
  await input.fill(i?'4=4':'3=4');await row.getByRole('button',{name:'בדיקת ההצבה',exact:true}).click();assert.match(await row.locator('.substitution-entry .bk-msg').innerText(),/לפני חישוב/);
  await input.fill(expected);await row.getByRole('button',{name:'בדיקת ההצבה',exact:true}).click();assert.equal(await select.isEnabled(),true);
  await select.selectOption(i?'1':'0');
 }
 await sub.locator('select').nth(2).selectOption('1');await sub.locator('select').nth(3).selectOption('0');
 await sub.getByRole('button',{name:'בדיקת התשובות',exact:true}).click();assert.equal(await sub.locator('.choice-item > .bk-bad').count(),2);
 await sub.locator('select').nth(0).selectOption('1');await sub.locator('select').nth(1).selectOption('0');
 await sub.getByRole('button',{name:'בדיקת התשובות',exact:true}).click();assert.match(await sub.locator('form > .bk-msg').innerText(),/כל התשובות נכונות/);
 await sub.locator('input').first().fill('2+1=3');assert.equal(await sub.locator('select').first().isDisabled(),true);assert.equal(await sub.locator('select').first().inputValue(),'');
 await sub.getByRole('button',{name:'ניסיון חדש',exact:true}).click();assert.equal(await sub.locator('input').first().inputValue(),'');
 for(const [id,rowIndex] of [['table-not-or','3'],['table-xor','1']]){
  const box=page.locator(`#practice-q-${id} .ttq`),select=box.locator('.evidence-choice');assert.equal(await select.isEnabled(),true);
  await select.selectOption('none');await box.getByRole('button',{name:'בדיקה',exact:true}).click();assert.equal(await box.locator('.table-evidence .bk-bad').count(),1);
  await select.selectOption(rowIndex);await box.getByRole('button',{name:'בדיקה',exact:true}).click();assert.equal(await box.locator('.table-evidence .bk-good').count(),1);
  assert.equal(await box.locator('.bk-cell .bk-q').count(),await box.locator('.bk-cell').count());
  assert.equal(await box.locator('.after').isVisible(),true);
  await box.locator('.bk-cell').first().click();await box.getByRole('button',{name:'בדיקת הטבלה',exact:true}).click();assert.ok(await box.locator('.bk-wrong').count());
  await box.getByRole('button',{name:'בדיקה',exact:true}).click();assert.ok(await box.locator('.table-evidence .bk-good').count());
 }
 assert.equal(await page.locator('#practice-q-table-xor .ttq').getAttribute('cols'),'!B; A | !B; A ^ !B');
 const twelve=page.locator('#practice-q-table-three');await twelve.locator('select').nth(0).selectOption('0');await twelve.locator('select').nth(1).selectOption('0');await twelve.getByRole('button',{name:'בדיקת התשובות',exact:true}).click();assert.match(await twelve.locator('form > .bk-msg').innerText(),/כל התשובות נכונות/);assert.equal(await twelve.locator('.bk-cell .bk-q').count(),24);
 const thirteen=page.locator('#practice-q-table-always');assert.equal(await thirteen.locator('.ttq').count(),0);
 for(const [i,formula] of ['(A & B) -> A','(A | B) & !A & !B'].entries()){
  const b=thirteen.locator('.fq').nth(i);await b.locator('input').fill(i?'F':'T');await b.getByRole('button',{name:'בדיקה',exact:true}).click();assert.match(await b.locator('.bk-msg').innerText(),/שתי האותיות/);
  await b.locator('input').fill('A & B');await b.getByRole('button',{name:'בדיקה',exact:true}).click();assert.match(await b.locator('.bk-msg').innerText(),/הנה שורה/);
  await b.locator('input').fill(formula);await b.getByRole('button',{name:'בדיקה',exact:true}).click();assert.equal(await b.locator('.bk-good').count(),1);
 }
 for(const width of [390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);}
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 console.log('Passed offline: written substitutions, staged truth choices, reset/edit invalidation, optional tables, selected rows, interpretation answers, arbitrary valid tautologies/contradictions, counterexamples and mobile layout.');
}finally{await browser.close();}
