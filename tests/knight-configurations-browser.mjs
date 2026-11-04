import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {KNIGHT_PUZZLES} from '../games/shared/knight-workshop-data.js';
import * as K from '../games/gate/knights.js';
import {assignments,evaluate,variables} from '../games/shared/logic.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,r=>r.abort());await page.goto(new URL('../_book/01-logic.html',import.meta.url).href);
 assert.match(await page.locator('#sec-proof-methods > h3').innerText(),/1\.8\.4/);
 assert.equal(await page.locator('#sec-knights [data-knight-proof]').count(),0);
 assert.equal(await page.locator('#sec-proof-methods #rule-cases-steps').count(),1);
 assert.equal(await page.locator('#sec-proof-methods #rule-contradiction-steps').count(),1);
 for(const id of ['lecture-different','lecture-robot','lecture-undetermined','lecture-impossible']){
  const level=KNIGHT_PUZZLES[id],box=page.locator(`[data-knight-table="${id}"]`),rows=K.rows(level);
  await box.getByRole('button',{name:'בדיקת התשובה',exact:true}).click();assert.equal(await box.locator('form > .bk-bad').count(),1);
  for(const [i,env]of rows.entries())if(K.consistent(level,env))await box.locator('.kw-model input').nth(i).check();
  if(!K.solutions(level).length)await box.getByRole('checkbox',{name:'אין אפשרות מתאימה',exact:true}).check();
  await box.getByRole('button',{name:'בדיקת התשובה',exact:true}).click();assert.equal(await box.locator('form > .bk-good').count(),1);
  await box.locator('.kw-work > summary').click();
  for(const [i,env]of rows.entries()){
   for(const [j,st] of level.statements.entries())await box.locator('.kw-value').nth(i*level.statements.length+j).selectOption(String(evaluate(st.formula,env)));
   await box.locator('.kw-fits').nth(i).selectOption(String(K.consistent(level,env)));
  }
  await box.getByRole('button',{name:'בדיקת הטבלה',exact:true}).click();assert.equal(await box.locator('[aria-invalid="true"]').count(),0);
 }
 const intro=page.locator('[data-knight-intro="true"]');await intro.locator('.kw-formula-input').fill('!A & !B');await intro.getByRole('button',{name:'בדיקת ההצרנה',exact:true}).click();assert.equal(await intro.locator('.kw-compact-work').isVisible(),true);
 const eq=page.locator('.proof-editor[data-start="A -> (B & C)"] .proof-table-practice');await eq.locator('summary').click();
 async function fillTable(box,formulas){
  const names=[...new Set(formulas.flatMap(variables))].sort(),rows=assignments(names),cells=box.locator('.bk-tt select');
  for(const [i,env]of rows.entries())for(const [j,f] of formulas.entries())await cells.nth(i*formulas.length+j).selectOption(String(evaluate(f,env)));
 }
 await eq.locator('.evidence-choice').selectOption('none');await eq.getByRole('button',{name:'בדיקת הטבלה והמסקנה',exact:true}).click();assert.equal(await eq.locator('.bk-tt [aria-invalid="true"]').count(),16);
 await fillTable(eq,['A -> (B & C)','(A -> B) & (A -> C)']);await eq.getByRole('button',{name:'בדיקת הטבלה והמסקנה',exact:true}).click();assert.match(await eq.locator(':scope > div > .bk-msg').innerText(),/הוכחת השקילות/);
 const lib=page.locator('[data-argument="library"]');for(const [i,f]of ['A -> B','A','B'].entries())await lib.locator('.argument-translation input').nth(i).fill(f);
 await lib.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();const arg=lib.locator('.proof-table-practice');await arg.locator('summary').click();await fillTable(arg,['A -> B','A','B']);await arg.locator('.evidence-choice').selectOption('0');await arg.getByRole('button',{name:'בדיקת הטבלה והמסקנה',exact:true}).click();assert.match(await arg.locator(':scope > div > .bk-msg').innerText(),/תקנו את הבחירה/);
 await arg.locator('.evidence-choice').selectOption('none');await arg.getByRole('button',{name:'בדיקת הטבלה והמסקנה',exact:true}).click();assert.match(await arg.locator(':scope > div > .bk-msg').innerText(),/הוכחה לתקפות/);
 assert.equal(await lib.locator('.step-accepted').count(),0,'a table proof does not fabricate symbolic steps');
 await page.setViewportSize({width:390,height:900});await arg.screenshot({path:'/tmp/fillable-proof-table-mobile.png'});
 assert.deepEqual(errors,[]);console.log('Passed: methods in 1.8.4; all knight activities use configurations/tables; single, multiple and no-solution puzzles; fillable equivalence/argument tables with missing-cell and counterexample feedback.');
}finally{await browser.close();}
