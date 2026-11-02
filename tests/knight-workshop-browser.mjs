import {chromium} from 'playwright-core';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {KNIGHT_PROOFS} from '../games/shared/knight-workshop-data.js';
import {LEVELS} from '../games/gate/levels.js';
import * as K from '../games/gate/knights.js';
import {evaluate} from '../games/shared/logic.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,async r=>{if(r.request().url().includes('mathjax'))await r.fulfill({path:fileURLToPath(new URL('../../Alternative Versions/source/node_modules/mathjax/es5/tex-svg.js',import.meta.url)),contentType:'application/javascript'});else await r.abort();});
 const url=file=>new URL('../_book/'+file,import.meta.url).href;
 await page.goto(url('01-logic.html'));await page.locator('[data-knight-table="both-knaves"] form').waitFor();
 assert.equal(await page.locator('#sec-knights .knight-activity').count(),6);
 assert.equal(await page.locator('.knight-scene').count(),9);
 assert.ok(await page.locator('.knight-scene img').evaluateAll(ns=>ns.every(n=>n.complete&&n.naturalWidth>0)));
 assert.match(await page.locator('#sec-knights-rule .thmbox-method').innerText(),/כלל 1.9.3/);
 assert.equal(await page.locator('#knight-rule-proof').count(),1);
 assert.notEqual(await page.locator('#knight-rule-proof').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 255, 255)');
 for(const [id,data] of Object.entries(KNIGHT_PROOFS)){
  const box=page.locator(`[data-knight-proof="${id}"]`);
  assert.equal(await box.locator('.kw-proof').isVisible(),false);
  assert.equal(await box.locator('select').count(),0);
  for(let i=0;i<data.steps.length;i++){
   const groups=box.locator('.kw-proof-stage .kw-options'),submit=box.getByRole('button',{name:'בדיקת הצעד',exact:true});
   await submit.click();assert.equal(await box.locator('.kw-proof li').count(),i);
   for(const group of await groups.all())await group.locator('input[value="0"]').check();
   await groups.first().locator('input[value="1"]').check();await submit.click();assert.equal(await box.locator('.kw-proof li').count(),i);
   assert.ok(await box.locator('[aria-invalid=true]').count());
   await groups.first().locator('input[value="0"]').check();
   if(data.steps[i].reasons){await groups.nth(1).locator('input[value="1"]').check();await submit.click();assert.equal(await box.locator('.kw-proof li').count(),i);await groups.nth(1).locator('input[value="0"]').check();}
   await submit.click();assert.equal(await box.locator('.kw-proof li').count(),i+1);
  }
  assert.equal(await box.locator('.kw-proof').count(),1);
  assert.match(await box.locator('.kw-proof').innerText(),/ההוכחה המלאה/);
  assert.equal(await box.locator('.kw-proof-stage input').count(),0);
  await box.screenshot({path:`/tmp/knight-proof-${id}.png`});
  await box.getByRole('button',{name:'התחלה מחדש',exact:true}).click();assert.equal(await box.locator('.kw-proof li').count(),0);
 }
 const evidence=page.locator('[data-knight-evidence]'),fields=evidence.locator('select');
 const submitEvidence=evidence.getByRole('button',{name:'בדיקת התשובה',exact:true});
 await submitEvidence.click();assert.ok(await evidence.locator('.bk-bad').count());
 for(const [i,v] of ['false','true','true','false','true','true','false','true','unknown'].entries())await fields.nth(i).selectOption(v);
 await submitEvidence.click();assert.match(await evidence.locator('.bk-msg').innerText(),/סוגו שונה/);
 await fields.nth(5).selectOption('false');await fields.nth(0).selectOption('true');await submitEvidence.click();assert.ok(await evidence.locator('.bk-bad').count());
 await fields.nth(0).selectOption('false');await submitEvidence.click();assert.ok(await evidence.locator('.bk-good').count());
 await evidence.getByRole('button',{name:'התחלה מחדש',exact:true}).click();assert.equal(await fields.first().inputValue(),'');
 for(const width of [1200,390]){
  await page.setViewportSize({width,height:1000});const box=page.locator('[data-knight-proof="contradiction"]');await box.screenshot({path:`/tmp/knight-step-${width}.png`});assert.ok(await page.locator('#box-q-kk-undetermined .knight-speaker').evaluateAll(ns=>Math.max(...ns.map(n=>n.getBoundingClientRect().top))-Math.min(...ns.map(n=>n.getBoundingClientRect().top))<2));await page.locator('#box-q-kk-undetermined .knight-scene').screenshot({path:`/tmp/knight-scene-${width}.png`});
  assert.ok(await box.evaluate(n=>n.getBoundingClientRect().left>=0&&n.getBoundingClientRect().right<=innerWidth+1));
 }
 await page.setViewportSize({width:1200,height:1000});
 for(const level of LEVELS){
  await page.goto(url(`games/gate/index.html?levels=${level.id}&embed=1`));const box=page.locator('.knight-workshop');await box.locator('form').waitFor();
  assert.equal(await page.locator('.k-role,.k-ftoggle,.k-formula').count(),0);
  assert.equal(await page.locator('.g-primary').isVisible(),false);
  assert.equal(await box.getByRole('button',{name:'בדיקת התשובה',exact:true}).count(),1);
  const rows=K.rows(level),good=rows.map((env,i)=>K.consistent(level,env)?i:-1).filter(i=>i!==-1),submit=box.getByRole('button',{name:'בדיקת התשובה',exact:true}),feedback=box.locator('form > .bk-msg');
  await submit.click();assert.ok(await feedback.innerText());
  if(good.length>1){await box.locator('.kw-model input').nth(good[0]).check();await submit.click();assert.match(await feedback.innerText(),/חסרה/);}
  if(good.length)for(const i of good)await box.locator('.kw-model input').nth(i).check();else await box.getByRole('checkbox',{name:'אין אפשרות מתאימה',exact:true}).check();
  await submit.click();assert.match(await feedback.getAttribute('class'),/bk-good/);assert.equal(await page.locator('.g-cheer').count(),1,level.id);
  // Optional table is not required for success and has just one check control.
  assert.equal(await box.locator('details[open]').count(),0);
  await page.getByRole('button',{name:'איפוס',exact:true}).click();assert.equal(await box.locator('input:checked').count(),0);
  if(level.id==='both-knights'){
   await box.locator('summary').click();await box.getByRole('button',{name:'בדיקת הטבלה',exact:true}).click();assert.ok(await box.locator('[aria-invalid=true]').count());
   const tableRows=box.locator('tbody tr:not(.kw-row-feedback)');
   for(const [i,env] of rows.entries()){
    for(const [j,st] of level.statements.entries())await tableRows.nth(i).locator('.kw-value').nth(j).selectOption(String(evaluate(st.formula,env)));
    await tableRows.nth(i).locator('.kw-fits').selectOption(String(K.consistent(level,env)));
   }
   await box.getByRole('button',{name:'בדיקת הטבלה',exact:true}).click();assert.equal(await box.locator('[aria-invalid=true]').count(),0);
   assert.equal(await box.locator('tbody button').count(),0);
  }
  await page.getByRole('button',{name:'פתרון',exact:true}).click();assert.equal(await box.locator('details[open]').count(),1);
 }
 await page.setViewportSize({width:390,height:1000});await page.goto(url('games/gate/index.html?levels=three&embed=1'));await page.locator('.knight-workshop form').waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'game fits mobile');assert.ok(await page.locator('.k-card').evaluateAll(ns=>Math.max(...ns.map(n=>n.getBoundingClientRect().top))-Math.min(...ns.map(n=>n.getBoundingClientRect().top))<2));await page.screenshot({path:'/tmp/knight-game-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('Passed: four strategy-specific proofs, two-witness exercise, all game stages, single answer area, optional table, errors, resets, reveals and mobile layout.');
}finally{await browser.close();}
