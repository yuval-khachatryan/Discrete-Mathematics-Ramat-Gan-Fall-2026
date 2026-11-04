import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {KNIGHT_PROOFS} from '../games/shared/knight-workshop-data.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,r=>r.abort());await page.goto(new URL('../_book/01-logic.html',import.meta.url).href);
 const box=page.locator('[data-knight-proof="contradiction"]');await box.locator('.kp-statement').fill('!A & !B');await box.getByRole('button',{name:'בדיקת ההצרנה ופתיחת ההוכחה',exact:true}).click();
 const enabled=select=>select.locator('option').evaluateAll(ns=>ns.filter(n=>n.value&&!n.disabled).map(n=>Number(n.value)));
 for(const [i,step]of KNIGHT_PROOFS.contradiction.model.entries()){
  if(i)await box.getByRole('button',{name:'הוספת שורה',exact:true}).click();
  const row=box.locator('.kp-step').nth(i);await row.locator('.kp-rule').selectOption(step.rule);
  assert.equal(await row.locator('input.kp-sources').count(),0);
  for(const [j,ref]of step.refs.entries()){
   if(j>=await row.locator('.kp-sources').count())await row.getByRole('button',{name:'הוספת שורת מקור',exact:true}).click();
   const select=row.locator('.kp-sources').nth(j),options=await enabled(select);assert.ok(options.includes(ref),JSON.stringify({i,j,ref,options}));assert.ok(options.every(n=>n<i+2));
   await select.selectOption(String(ref));assert.match(await select.locator('option:checked').innerText(),new RegExp('שורה '+ref+' —'));
   assert.ok((await row.locator('.kp-source-preview').nth(j).innerText()).length>0);
  }
  if(step.rule==='raa'){
   assert.deepEqual(await enabled(row.locator('.kp-sources').nth(0)),[2]);assert.deepEqual(await enabled(row.locator('.kp-sources').nth(1)),[5]);
  }
  if(i===5){ // The contradiction subproof has been closed.
   const sources=await enabled(row.locator('.kp-sources').first());assert.ok(sources.every(n=>![2,3,4,5].includes(n)));
  }
  await row.locator('.kp-formula').fill(step.formula);await row.getByRole('button',{name:'בדיקת השורה',exact:true}).click();assert.equal(await row.getAttribute('aria-invalid'),'false',await row.innerText());
 }
 assert.match(await box.locator('.kp-work > .bk-msg').innerText(),/ההוכחה הושלמה/);
 const inference=box.locator('.kp-step').nth(1),first=box.locator('.kp-step').first();
 await first.locator('.kp-formula').fill('!A');assert.match(await inference.locator('.kp-sources').nth(1).locator('option:checked').innerText(),/¬A/);
 const dependent=box.locator('.kp-step').nth(2).locator('.kp-sources');assert.equal(await dependent.locator('option:checked').evaluate(n=>n.disabled),true);assert.match(await dependent.locator('option:checked').innerText(),/אינה זמינה/);
 await first.locator('.kp-formula').fill('A');assert.equal(await dependent.locator('option:checked').evaluate(n=>n.disabled),false,'restoring an earlier step restores existing references');
 for(const width of [1200,390]){await page.setViewportSize({width,height:1000});await inference.locator('.kp-source-list').screenshot({path:`/tmp/source-dropdown-${width}.png`});assert.ok(await inference.evaluate(n=>n.scrollWidth<=n.clientWidth+2));}
 // Removing the assumption clears just its references, and renumbers later ones.
 await first.getByRole('button',{name:'מחיקת השורה',exact:true}).click();assert.equal(await box.locator('.kp-step').first().locator('.kp-sources').nth(1).inputValue(),'');
 const arg=page.locator('[data-argument="library"]');
 for(const [i,text]of ['A -> B','A','B'].entries())await arg.locator('.argument-translation input').nth(i).fill(text);
 await arg.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();const ar=arg.locator('.proof-step').first();await ar.locator('.proof-rule').selectOption('mp');
 await ar.locator('.argument-source').nth(0).selectOption('p1');await ar.locator('.argument-source').nth(1).selectOption('p2');
 assert.match(await ar.locator('.argument-source').first().locator('option:checked').innerText(),/A.*B/);
 assert.ok(await ar.locator('.argument-source').nth(1).locator('option[value="p1"]').evaluate(n=>n.disabled));
 await ar.locator('.proof-input').fill('B');await ar.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();assert.match(await arg.locator('form > .bk-msg').innerText(),/ההוכחה הושלמה/);
 assert.deepEqual(errors,[]);console.log('Passed: labelled dropdowns, valid preceding lines, duplicate prevention, closed-scope filtering, discharge roles, changing/deleting/restoring lines, complete proof and mobile layout.');
}finally{await browser.close();}
