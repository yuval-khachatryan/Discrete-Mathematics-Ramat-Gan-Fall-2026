import {chromium} from 'playwright-core';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {ARGUMENTS} from '../games/shared/argument-exercises.js';
import {rename} from '../games/shared/argument-rules.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,async r=>{if(r.request().url().includes('mathjax'))await r.fulfill({path:fileURLToPath(new URL('../../Alternative Versions/source/node_modules/mathjax/es5/tex-svg.js',import.meta.url)),contentType:'application/javascript'});else await r.abort();});
 await page.goto(new URL('../_book/01-logic.html',import.meta.url).href);
 const proof=page.locator('#practice-q-eq-neither .proof-editor');await proof.locator('.proof-start-input').fill('A');await proof.getByRole('button',{name:'בדיקת נקודת המוצא',exact:true}).click();assert.match(await proof.locator('.proof-start .bk-msg').innerText(),/נקודת המוצא שהזנתם אינה נכונה/);
 await proof.locator('.proof-start-input').fill('!(!A & !B)');await proof.getByRole('button',{name:'בדיקת נקודת המוצא',exact:true}).click();
 const add=()=>proof.getByRole('button',{name:'הוספת צעד',exact:true}).click();
 let row=proof.locator('.proof-step').first();await row.locator('.proof-input').fill('!!A | !!B');await row.locator('.proof-rule').selectOption('demorgan');await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();await add();
 row=proof.locator('.proof-step').nth(1);await row.locator('.proof-input').fill('A | B');await row.locator('.proof-rule').selectOption('double');await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
 assert.match(await proof.locator('.proof-form > .bk-msg').innerText(),/הגעתם לנוסחת היעד/);
 await row.locator('.proof-rule').selectOption('replacements');
 async function change(row,i,path,after,rule){const item=row.locator('.replacement-item').nth(i);await item.locator('.replacement-part').selectOption(path);await item.locator('.replacement-after').fill(after);await item.locator('.replacement-rule').selectOption(rule);}
 await change(row,0,'r.0','A','double');await row.getByRole('button',{name:'הוספת החלפה',exact:true}).click();await change(row,1,'r.1','B','double');
 assert.equal(await row.locator('.replacement-highlight').count(),2);
 assert.equal(await row.locator('.replacement-item').nth(1).locator('option[value="r"]').evaluate(o=>o.disabled),true,JSON.stringify(await row.locator('.replacement-part').evaluateAll(ss=>ss.map(s=>({value:s.value,options:[...s.options].map(o=>[o.value,o.disabled])})))));
 await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();assert.match(await proof.locator('.proof-form > .bk-msg').innerText(),/הפתרון הושלם/);
 assert.equal(await proof.locator('.proof-preview').count(),1);assert.equal(await proof.locator('.proof-local').count(),0);assert.equal(await proof.locator('.proof-chain-line').count(),3);assert.match(await proof.locator('.proof-preview').innerText(),/¬¬B ↦ B/);
 await add();await proof.getByRole('button',{name:'בדיקת הפתרון',exact:true}).click();assert.match(await proof.locator('.proof-form > .bk-msg').innerText(),/הפתרון הושלם/);
 // Editing an earlier source clears replacement selections and the accepted proof suffix.
 await proof.locator('.proof-step').first().locator('.proof-input').fill('!!B | !!A');assert.equal(await row.locator('.replacement-part').first().inputValue(),'');assert.equal(await proof.locator('.proof-chain-line').count(),1);
 await proof.locator('.proof-step').first().locator('.proof-input').fill('!!A | !!B');await change(row,0,'r.0','A','double');await row.getByRole('button',{name:'הוספת החלפה',exact:true}).click();await change(row,1,'r.1','B','double');await proof.getByRole('button',{name:'בדיקת הפתרון',exact:true}).click();
 for(const width of [1400,390]){await page.setViewportSize({width,height:1000});await row.screenshot({path:`/tmp/replacement-${width}.png`});const rect=await row.boundingBox();assert.ok(rect.x>=-1&&rect.x+rect.width<=width+1);}
 await page.setViewportSize({width:1400,height:1000});
 // Actual reversible exercise can start at its right-hand side.
 const reverse=page.locator('#box-q-name-the-law .proof-editor');await reverse.locator('.proof-start-input').fill('A -> B');
 for(const [i,[formula,rule]]of [['!A | B','implication'],['!(!!A & !B)','demorgan'],['!(A & !B)','double']].entries()){
  if(i)await reverse.getByRole('button',{name:'הוספת צעד',exact:true}).click();const r=reverse.locator('.proof-step').nth(i);await r.locator('.proof-input').fill(formula);await r.locator('.proof-rule').selectOption(rule);await r.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
 }assert.match(await reverse.locator('.proof-form > .bk-msg').innerText(),/הפתרון הושלם/);
 assert.equal(await reverse.locator('.proof-goal .proof-formula').innerText(),'A → B ≡ ¬(A ∧ ¬B)');
 // 1.8.7 exposes multiple selections without changing mode, and accepts either direction.
 const multi=page.locator('#box-q-ex-simplify .proof-editor');
 await multi.locator('.proof-start-input').fill('!(!A | (A & !B))');
 let mr=multi.locator('.proof-step').first();
 assert.equal(await mr.locator('.replacement-editor').isVisible(),true);
 await mr.locator('.proof-input').fill('!!A & !(A & !B)');
 await mr.locator('.replacement-choice input[value="r"]').check();
 await change(mr,0,'r','!!A & !(A & !B)','demorgan');
 await mr.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
 await multi.getByRole('button',{name:'הוספת צעד',exact:true}).click();
 mr=multi.locator('.proof-step').nth(1);
 await mr.locator('.proof-input').fill('A & (!A | !!B)');
 await mr.locator('.replacement-choice input[value="r.0"]').check();
 await mr.locator('.replacement-choice input[value="r.1"]').check();
 assert.equal(await mr.locator('.replacement-choice input:checked').count(),2);
 assert.equal(await mr.locator('.replacement-item').count(),2);
 assert.ok(await mr.locator('.replacement-choice input[value="r"]').isDisabled());
 await change(mr,0,'r.0','A','double');await change(mr,1,'r.1','!A | !!B','demorgan');
 // The replacement fields have their own symbol buttons, including insertion at the caret.
 const item=mr.locator('.replacement-item').nth(1),input=item.locator('.replacement-after');
 for(const [name,symbol]of [['שלילה','¬'],['וגם','∧'],['או','∨'],['גרירה','→']]){
  await input.fill('AB');await input.evaluate(n=>n.setSelectionRange(1,1));
  await item.getByRole('button',{name,exact:true}).click();assert.equal(await input.inputValue(),`A${symbol}B`);
 }
 await input.fill('A ∨ ¬¬B');await input.evaluate(n=>n.setSelectionRange(0,0));
 await item.getByRole('button',{name:'שלילה',exact:true}).click();
 assert.equal(await input.inputValue(),'¬A ∨ ¬¬B');
 const ruleOptions=await item.locator('.replacement-rule option').allTextContents();
 assert.ok(ruleOptions.includes('טאוטולוגיה')&&ruleOptions.includes('סתירה'));
 assert.ok(!ruleOptions.includes('טאוטולוגיה וסתירה'));

 await mr.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
 assert.equal(await multi.locator('.proof-chain-line').count(),3);
 assert.match(await multi.locator('.proof-form > .bk-msg').innerText(),/כל הצעדים שכתבתם נכונים/);
 await mr.screenshot({path:'/tmp/example-1-8-7-multiple.png'});
 for(const [formula,rule]of [['A & (!A | B)','double'],['(A & !A) | (A & B)','distribute'],['F | (A & B)','contradiction'],['A & B','identity']]){
  await multi.getByRole('button',{name:'הוספת צעד',exact:true}).click();const r=multi.locator('.proof-step').last();
  await r.locator('.proof-input').fill(formula);await r.locator('.proof-rule').selectOption(rule);
  await r.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
 }
 assert.match(await multi.locator('.proof-form > .bk-msg').innerText(),/הפתרון הושלם/);
 await multi.locator('.proof-start-input').fill('A & B');
 await multi.getByRole('button',{name:'בדיקת נקודת המוצא',exact:true}).click();
 assert.match(await multi.locator('.proof-start .bk-msg').innerText(),/נקודת המוצא מתאימה/);
 assert.equal(await multi.locator('.proof-goal .proof-formula').innerText(),'A ∧ B ≡ ¬(¬A ∨ (A ∧ ¬B))');
 // All authored deduction routes remain accepted, with one preview per editor.
 for(const [id,ex]of Object.entries(ARGUMENTS)){
  const box=page.locator(`[data-argument="${id}"]`);if(!await box.count())continue;
  const map=Object.fromEntries(ex.atoms.map(a=>[a.id,a.id]));await box.getByRole('button',{name:'אישור הסימונים',exact:true}).click();
  for(const [i,item]of [...ex.premises,ex.goal].entries())await box.locator('.argument-translation input').nth(i).fill(rename(item.formula,map));
  await box.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();
  for(const [i,step]of ex.solution.entries()){
   if(i)await box.getByRole('button',{name:'הוספת צעד',exact:true}).click();const r=box.locator('.argument-steps .proof-step').nth(i);await r.locator('.proof-input').fill(rename(step.formula,map));await r.locator('.proof-rule').selectOption(step.rule);
   for(const [j,ref]of step.refs.entries())await r.locator('.argument-source').nth(j).selectOption(ref.replace(/^s/,'d'));
   await r.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
  }
  assert.match(await box.locator('form > .bk-msg').innerText(),/ההוכחה הושלמה/,id);
  assert.equal(await box.locator('.argument-local').count(),0);assert.equal(await box.locator('.argument-preview').count(),1);
 }
 // Explicit replacement controls inside a real deduction exercise.
 const box=page.locator('[data-argument="practice-double"]'),r=box.locator('.argument-steps .proof-step').last();
 const ex=ARGUMENTS['practice-double'],last=ex.solution.at(-1);assert.equal(last.rule,'eq:double');
 await r.locator('.proof-rule').selectOption('eq:replacements');await change(r,0,'r',last.formula,'double');await r.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();assert.match(await box.locator('form > .bk-msg').innerText(),/ההוכחה הושלמה/);
 await box.getByRole('button',{name:'הוספת צעד',exact:true}).click();await box.getByRole('button',{name:'בדיקת ההוכחה',exact:true}).click();assert.match(await box.locator('form > .bk-msg').innerText(),/ההוכחה הושלמה/);
 assert.deepEqual(errors,[]);console.log('Passed: parallel replacements, overlap controls, source invalidation, completion, reverse proofs, one preview, all deduction exercises and mobile layout.');
}finally{await browser.close();}
