import {writeRewrite} from './rewrite-browser-helpers.mjs';
import {chromium} from 'playwright-core';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,async r=>{if(r.request().url().includes('mathjax'))await r.fulfill({path:fileURLToPath(new URL('../../Alternative Versions/source/node_modules/mathjax/es5/tex-svg.js',import.meta.url)),contentType:'application/javascript'});else await r.abort();});
 const url=file=>new URL('../_book/'+file,import.meta.url).href;
 await page.goto(url('01-logic.html'));
 const editor=page.locator('#box-q-ex-simplify .proof-editor'),input=editor.locator('.proof-start-input'),help=editor.locator('.activity-help');
 await input.waitFor();assert.equal(await help.count(),1);assert.equal(await help.getAttribute('open'),null);
 assert.equal(await editor.locator('.proof-preview').isVisible(),false);
 assert.match(await page.locator('#box-q-ex-simplify').innerText(),/פשטו את הביטוי/);
 assert.equal(await editor.getAttribute('data-reversible'),null);
 await input.fill('!(!A | (A & !B))');await help.locator('summary').click();assert.ok(await help.locator('ol').isVisible());await help.locator('summary').click();assert.equal(await input.inputValue(),'!(!A | (A & !B))');
 const route=[['!!A & !(A & !B)','demorgan'],['A & !(A & !B)','double'],['A & (!A | !!B)','demorgan'],['A & (!A | B)','double'],['(A & !A) | (A & B)','distribute'],['F | (A & B)','contradiction'],['A & B','identity']];
 for(const [i,[formula,rule]] of route.entries()){
  if(i)await editor.getByRole('button',{name:'הוספת צעד',exact:true}).click();const row=editor.locator('.proof-step').nth(i);
  await writeRewrite(row,i?route[i-1][0]:'!(!A | (A & !B))',formula,rule);await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
 }
 assert.match(await editor.locator('.proof-form > .bk-msg').innerText(),/הפתרון הושלם/);
 assert.equal(await editor.locator('.proof-chain-line').count(),8);
 assert.equal(await editor.locator('.proof-paper').count(),0);
 assert.equal(await page.locator('.argument-editor > .activity-help').count(),await page.locator('.argument-editor').count());
 const stairs=page.locator('.proof-stairs');assert.ok(await stairs.locator('img').evaluate(n=>n.complete&&n.naturalWidth>0));
 for(const width of [1200,390]){await page.setViewportSize({width,height:1000});await stairs.screenshot({path:`/tmp/proof-stairs-${width}.png`});}
 await page.setViewportSize({width:1200,height:1000});
 for(const [game,level] of [['circuit','explore'],['circuit','full-and'],['circuit','and-predict'],['circuit','dm-and'],['detective','mp'],['barman','classic'],['witness','witness']]){
  await page.goto(url(`games/${game}/index.html?level=${level}&embed=1`));await page.locator('.g-stage').waitFor();
  const panel=page.locator('.g-help');assert.equal(await panel.count(),1);assert.equal(await panel.isVisible(),true,`${game}/${level}`);assert.equal(await panel.getAttribute('open'),null);
  assert.ok((await page.locator('.g-goal').innerText()).length>20);
  if(level==='full-and')assert.match(await page.locator('.g-goal').innerText(),/האור האדום/);
  await panel.locator('summary').click();assert.ok(await panel.locator('div').isVisible());await panel.locator('summary').click();
 }
 assert.deepEqual(errors,[]);console.log('Passed: collapsed proof/game help, retained input, completed 1.8.7, one proof preview, argument help, visible game objectives and staircase image.');
}finally{await browser.close();}
