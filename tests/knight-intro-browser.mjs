import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route(/^https?:/,r=>r.abort());
 await page.goto(new URL('../_book/01-logic.html',import.meta.url).href);
 const box=page.locator('[data-knight-intro=true]'),input=box.locator('.kw-formula-input');
 const submit=()=>box.getByRole('button',{name:'בדיקת ההצרנה',exact:true}).click();
 assert.equal(await box.locator('table').count(),0);
 await input.fill('!A | !B');await submit();assert.equal(await input.getAttribute('aria-invalid'),'true');assert.equal(await box.locator('table').count(),0);
 await input.fill('!(A | B)');await input.press('Enter');
 assert.equal(await box.locator('.kw-statement bdi').innerText(),'¬(A ∨ B)');
 assert.equal(await box.locator('table').getAttribute('dir'),'rtl');
 assert.equal(await box.locator('.kw-statement .kw-column-meaning').innerText(),'שנינו נוכלים');
 assert.equal(await page.locator('.kw-meanings > div').count(),4);
 assert.ok(await page.locator('.knights-island img').evaluate(n=>n.complete&&n.naturalWidth>0));
 await page.locator('.knights-island').screenshot({path:'/tmp/knights-island.png'});
 const cols=await box.locator('thead th').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().x));assert.ok(cols[0]>cols[1]&&cols[1]>cols[2]);
 assert.equal(await box.locator('thead th').count(),5);assert.equal(await box.locator('tbody tr').count(),4);
 assert.equal(await box.locator('.kw-models').count(),0);
 assert.equal(await box.locator('.kw-conclusion').isVisible(),false);
 assert.equal(await box.locator('.kw-truth-heading').innerText(),'אלון אומר אמת?');
 const check=()=>box.getByRole('button',{name:'בדיקת הטבלה',exact:true}).click();
 await check();assert.equal(await box.locator('.kw-compact-feedback .bk-bad').count(),4);
 for(const row of await box.locator('tbody tr').all()){
  const a=await row.locator('td').nth(0).innerText()==='T',b=await row.locator('td').nth(1).innerText()==='T';
  await row.locator('.kw-value').selectOption(String(!a&&!b));await row.locator('.kw-fits').selectOption(String(!a&&b));
  assert.equal(await row.locator('.kw-truth').innerText(),!a&&!b?'כן':'לא');
 }
 await check();assert.match(await box.locator('.kw-compact-feedback').innerText(),/הטבלה נכונה/);
 const finish=box.locator('.kw-conclusion'),roles=finish.locator('select');assert.ok(await finish.isVisible());
 await finish.getByRole('button',{name:'בדיקת המסקנה',exact:true}).click();assert.match(await finish.locator('.bk-msg').innerText(),/בחרו סוג/);
 await roles.nth(0).selectOption('true');await roles.nth(1).selectOption('true');
 await finish.getByRole('button',{name:'בדיקת המסקנה',exact:true}).click();assert.equal(await finish.locator('.bk-bad').count(),1);
 await roles.nth(0).selectOption('false');await finish.getByRole('button',{name:'בדיקת המסקנה',exact:true}).click();
 assert.match(await finish.locator('.bk-good').innerText(),/אלון נוכל ובתיה אבירה/);
 await box.locator('.kw-fits').first().selectOption('true');await check();assert.equal(await box.locator('.kw-compact-feedback .bk-bad').count(),1);assert.equal(await finish.isVisible(),false);
 await box.locator('.kw-fits').first().selectOption('false');await check();assert.equal(await roles.nth(0).inputValue(),'');
 await roles.nth(0).selectOption('false');await roles.nth(1).selectOption('true');await finish.getByRole('button',{name:'בדיקת המסקנה',exact:true}).click();
 for(const width of [1200,390]){
  await page.setViewportSize({width,height:1000});await box.screenshot({path:`/tmp/knight-intro-${width}.png`});
  assert.ok(await box.locator('.kw-table-scroll').evaluate(n=>n.scrollWidth<=n.clientWidth+1));
 }
 await input.fill('!A & !B');assert.equal(await box.locator('.kw-compact-work').isVisible(),false);await submit();
 assert.equal(await box.locator('.kw-statement bdi').innerText(),'¬A ∧ ¬B');assert.equal(await box.locator('.kw-value').first().inputValue(),'');
 await box.getByRole('button',{name:'התחלה מחדש',exact:true}).click();assert.equal(await input.inputValue(),'');assert.equal(await box.locator('table').count(),0);
 await box.getByRole('button',{name:'שלילה',exact:true}).click();assert.equal(await input.inputValue(),'¬');
 assert.deepEqual(errors,[]);console.log('Passed: formalization gating, student formula as table heading, five-column RTL table, truth-in-words column, final role submission and invalidation, edit/reset, keyboard, desktop and mobile.');
}finally{await browser.close();}
