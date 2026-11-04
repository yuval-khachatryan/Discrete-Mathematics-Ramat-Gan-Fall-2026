import {chromium} from 'playwright-core';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {ARGUMENTS} from '../games/shared/argument-exercises.js';
import {rename} from '../games/shared/argument-rules.js';
import {chooseReplacement,writeRewrite,writeArgumentStep} from './rewrite-browser-helpers.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,async r=>{if(r.request().url().includes('mathjax'))await r.fulfill({path:fileURLToPath(new URL('../../Alternative Versions/source/node_modules/mathjax/es5/tex-svg.js',import.meta.url)),contentType:'application/javascript'});else await r.abort();});
 await page.goto(new URL('../_book/01-logic.html',import.meta.url).href);
 const proof=page.locator('#practice-q-eq-neither .proof-editor');
 await proof.locator('.proof-start-input').fill('!(!A & !B)');
 let row=proof.locator('.proof-step').first();
 assert.equal(await proof.locator('.proof-rule').count(),0,'no ambiguous rule-only mode');
 assert.equal(await row.locator('.replacement-part').count(),0,'no repeated subexpression picker');
 await chooseReplacement(row,'r','!!A | !!B','demorgan');
 const assemble=r=>r.getByRole('button',{name:'הרכבת הנוסחה מן ההחלפות',exact:true});
 await assemble(row).click();assert.equal(await row.locator('.proof-input').inputValue(),'¬¬A ∨ ¬¬B');
 await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
 await proof.getByRole('button',{name:'הוספת צעד',exact:true}).click();row=proof.locator('.proof-step').nth(1);
 await chooseReplacement(row,'r.0','A','double');await chooseReplacement(row,'r.1','B','double');
 assert.equal(await row.locator('.replacement-highlight').count(),2);
 assert.ok(await row.locator('.replacement-choice input[value="r"]').isDisabled());
 assert.ok(await row.locator('.replacement-choice input[value="r.0.0"]').isDisabled());
 const order=await row.evaluate(n=>{
  const before=(a,b)=>!!(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);
  return before(n.querySelector('.replacement-source'),n.querySelector('.replacement-rule'))&&before(n.querySelector('.replacement-rule'),n.querySelector('.replacement-after'))&&before(n.querySelector('.replacement-after'),n.querySelector('.proof-input'));
 });assert.ok(order,'source → rule → local result → full result');
 await row.locator('.proof-input').fill('A & B');
 await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
 assert.equal(await proof.locator('.proof-chain-line').count(),2,'wrong assembly is not accepted');
 assert.equal(await row.locator('.replacement-item[aria-invalid]').count(),0,'valid local changes are not marked wrong');
 assert.equal(await row.locator('.proof-input').getAttribute('aria-invalid'),'true');
 assert.equal(await row.locator('.replacement-difference').getAttribute('open'),null);
 await row.locator('.replacement-difference > summary').click();
 assert.match(await row.locator('.replacement-difference').innerText(),/A ∧ B/);assert.match(await row.locator('.replacement-difference').innerText(),/A ∨ B/);
 for(const width of [1400,390]){
  await page.setViewportSize({width,height:1000});await row.screenshot({path:`/tmp/rewrite-flow-${width}.png`});
  assert.ok(await row.evaluate(n=>n.scrollWidth<=n.clientWidth+2));
 }
 await page.setViewportSize({width:1400,height:1000});
 await assemble(row).click();assert.equal(await row.locator('.proof-input').inputValue(),'A ∨ B');
 assert.equal(await proof.locator('.proof-chain-line').count(),2,'assembly does not silently submit a proof');
 await proof.getByRole('button',{name:'בדיקת הפתרון',exact:true}).click();assert.match(await proof.locator('.proof-form > .bk-msg').innerText(),/הפתרון הושלם/);
 // A wrong local rule must never produce a correction for the whole formula.
 await row.locator('.replacement-rule').first().selectOption('demorgan');
 await assemble(row).click();assert.equal(await row.locator('.proof-input').inputValue(),'A ∨ B');assert.equal(await row.locator('.replacement-item[aria-invalid=true]').count(),1);
 assert.equal(await row.locator('.replacement-difference').count(),0);
 await row.locator('.replacement-rule').first().selectOption('double');
 // Only selected occurrences change; editing the source invalidates dependent selections.
 await proof.locator('.proof-step').first().locator('.proof-input').fill('!!B | !!A');assert.equal(await row.locator('.replacement-item').count(),0);
 await proof.locator('.proof-step').first().locator('.proof-input').fill('!!A | !!B');
 await chooseReplacement(row,'r.0','A','double');await assemble(row).click();assert.equal(await row.locator('.proof-input').inputValue(),'A ∨ ¬¬B');
 await chooseReplacement(row,'r.1','B','double');await assemble(row).click();await proof.getByRole('button',{name:'בדיקת הפתרון',exact:true}).click();assert.match(await proof.locator('.proof-form > .bk-msg').innerText(),/הפתרון הושלם/);
 // A representative longer exercise with separate rules applied in the same step.
 const multi=page.locator('#box-q-ex-simplify .proof-editor');await multi.locator('.proof-start-input').fill('!(!A | (A & !B))');
 let mr=multi.locator('.proof-step').first();await chooseReplacement(mr,'r','!!A & !(A & !B)','demorgan');await assemble(mr).click();await mr.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
 await multi.getByRole('button',{name:'הוספת צעד',exact:true}).click();mr=multi.locator('.proof-step').nth(1);
 await chooseReplacement(mr,'r.0','A','double');const local=await chooseReplacement(mr,'r.1','!A | !!B','demorgan');
 for(const [name,symbol]of [['שלילה','¬'],['וגם','∧'],['או','∨'],['גרירה','→']]){
  await local.locator('.replacement-after').fill('AB');await local.locator('.replacement-after').evaluate(n=>n.setSelectionRange(1,1));
  await local.getByRole('button',{name,exact:true}).click();assert.equal(await local.locator('.replacement-after').inputValue(),`A${symbol}B`);
 }
 await local.locator('.replacement-after').fill('!A | !!B');await assemble(mr).click();
 assert.equal(await mr.locator('.proof-input').inputValue(),'A ∧ (¬A ∨ ¬¬B)');
 await mr.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
 let previous='A & (!A | !!B)';
 for(const [next,rule]of [['A & (!A | B)','double'],['(A & !A) | (A & B)','distribute'],['F | (A & B)','contradiction'],['A & B','identity']]){
  await multi.getByRole('button',{name:'הוספת צעד',exact:true}).click();const r=multi.locator('.proof-step').last();await writeRewrite(r,previous,next,rule);await r.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();previous=next;
 }assert.match(await multi.locator('.proof-form > .bk-msg').innerText(),/הפתרון הושלם/);
 const reverse=page.locator('#box-q-name-the-law .proof-editor');await reverse.locator('.proof-start-input').fill('A -> B');previous='A -> B';
 for(const [i,[next,rule]]of [['!A | B','implication'],['!(!!A & !B)','demorgan'],['!(A & !B)','double']].entries()){
  if(i)await reverse.getByRole('button',{name:'הוספת צעד',exact:true}).click();const r=reverse.locator('.proof-step').nth(i);await writeRewrite(r,previous,next,rule);await r.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();previous=next;
 }assert.match(await reverse.locator('.proof-form > .bk-msg').innerText(),/הפתרון הושלם/);
 // Deduction still accepts every authored route, using explicit parts for rewrites.
 for(const [id,ex]of Object.entries(ARGUMENTS)){
  const box=page.locator(`[data-argument="${id}"]`);if(!await box.count())continue;
  const map=Object.fromEntries(ex.atoms.map(a=>[a.id,a.id]));
  for(const [i,item]of [...ex.premises,ex.goal].entries())await box.locator('.argument-translation input').nth(i).fill(rename(item.formula,map));
  await box.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();
  for(const [i,step]of ex.solution.entries()){
   if(i)await box.getByRole('button',{name:'הוספת צעד',exact:true}).click();const r=box.locator('.argument-steps .proof-step').nth(i);await writeArgumentStep(box,r,step,rename(step.formula,map));await r.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
  }assert.match(await box.locator('form > .bk-msg').innerText(),/ההוכחה הושלמה/,id);
 }
 const box=page.locator('[data-argument="practice-double"]'),r=box.locator('.argument-steps .proof-step').last();
 await r.locator('.proof-input').fill('');await box.getByRole('button',{name:'בדיקת ההוכחה',exact:true}).click();assert.equal(await r.locator('.replacement-difference').count(),1);
 await assemble(r).click();await box.getByRole('button',{name:'בדיקת ההוכחה',exact:true}).click();assert.match(await box.locator('form > .bk-msg').innerText(),/ההוכחה הושלמה/);
 // The same assembly assistance works in a proof with temporary assumptions.
 const knight=page.locator('[data-knight-proof="direct"]');await knight.locator('.kp-statement').nth(0).fill('B');await knight.locator('.kp-statement').nth(1).fill('A ^ B');await knight.getByRole('button',{name:'בדיקת ההצרנה ופתיחת ההוכחה',exact:true}).click();
 const kr=knight.locator('.kp-step').first();await kr.locator('.kp-rule').selectOption('eq:replacements');await kr.locator('.kp-sources').selectOption('1');await chooseReplacement(kr,'r','(A -> B) & (B -> A)','iff');
 await kr.locator('.kp-formula').fill('A');await kr.getByRole('button',{name:'בדיקת השורה',exact:true}).click();assert.equal(await kr.locator('.replacement-difference').count(),1);
 await assemble(kr).click();await kr.getByRole('button',{name:'בדיקת השורה',exact:true}).click();assert.equal(await kr.getAttribute('aria-invalid'),'false');assert.match(await knight.locator('.kp-written').innerText(),/אם ורק אם/);
 assert.deepEqual(errors,[]);console.log('Passed: source–rule–result order, explicit occurrences only, assembly/correction, invalid-rule protection, source invalidation, simultaneous rewrites, reverse proofs, all deduction routes, scoped proofs and mobile layout.');
}finally{await browser.close();}
