import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {ARGUMENTS} from '../games/shared/argument-exercises.js';
import {KNIGHT_PROOFS} from '../games/shared/knight-workshop-data.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1200,height:1000},hasTouch:true});
 await context.route(/^https?:/,r=>r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 await page.goto(new URL('../_book/01-logic.html',import.meta.url).href);
 const box=page.locator('#box-q-ex-simplify'),proof=box.locator('.proof-editor'),rows=proof.locator('.proof-steps > .proof-step');
 await proof.locator('.proof-start-choice').selectOption('!(!A | (A & !B))');
 assert.equal(await proof.locator('.proof-start > .step-editor').isVisible(),false);
 assert.equal(await proof.locator('.proof-start > .step-compact').isVisible(),true);
 assert.equal(await proof.locator('.proof-preview').count(),0);
 async function replacement(row,path,rule,after){
  const parts=row.locator('.replacement-parts');if(!await parts.evaluate(n=>n.open))await parts.locator('summary').click();
  await row.locator(`.replacement-choice input[value="${path}"]`).check();
  const entry=row.locator(`.replacement-item[data-path="${path}"]`);await entry.locator('.replacement-rule').selectOption(rule);
  if(after!==undefined)await entry.locator('.replacement-after').fill(after);
  return entry;
 }
 async function submit(row,full){
  if(full!==undefined)await row.locator('.proof-input').fill(full);
  await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
 }
 let row=rows.nth(0),entry=await replacement(row,'r.0','distribute:1','(!A | A) & (!A | !B)');
 assert.equal(await entry.locator('optgroup[label="פילוג"] option').count(),2);
 assert.match(await entry.locator('option[value="distribute:1"]').textContent(),/∨.*≡/);
 // No hint is revealed automatically, and local mistakes explain what fails.
 assert.equal(await entry.locator('.replacement-suggestions').getAttribute('open'),null);
 await submit(row,'!((!A | A) & (!A | !B))');
 assert.equal(await row.locator('.step-editor').isVisible(),false);assert.equal(await rows.count(),2);
 await proof.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();assert.match(await proof.locator('form > .bk-msg').innerText(),/עדיין לא/);assert.equal(await proof.locator('.proof-qed:not([hidden])').count(),0);
 await proof.getByRole('button',{name:'חזרה לצעד האחרון',exact:true}).click();
 assert.equal(await rows.count(),1);assert.equal(await row.locator('.step-editor').isVisible(),true);
 assert.equal(await entry.locator('.replacement-after').inputValue(),'(!A | A) & (!A | !B)');
 await submit(row);assert.equal(await rows.count(),2);
 row=rows.nth(1);entry=await replacement(row,'r.0.0','tautology','F');
 await entry.locator('.replacement-check').click();assert.equal(await rows.count(),2);assert.match(await entry.locator('.bk-msg').innerText(),/בהצבה/);
 await entry.locator('.replacement-after').fill('T');await entry.locator('.replacement-check').click();assert.equal(await entry.locator('.replacement-check').isVisible(),false);await submit(row,'!T');
 assert.equal(await row.locator('.replacement-difference').count(),1);
 await row.locator('.replacement-difference > summary').click();assert.match(await row.locator('.replacement-difference').innerText(),/כתבתם/);
 await row.getByRole('button',{name:'הרכבת הנוסחה מן ההחלפות',exact:true}).click();
 assert.equal(await row.locator('.proof-input').inputValue(),'¬(T ∧ (¬A ∨ ¬B))');assert.equal(await row.locator('.step-editor').isVisible(),false);
 assert.equal(await rows.count(),3);
 row=rows.nth(2);entry=await replacement(row,'r.0','identity');
 await entry.locator('.replacement-suggestions > summary').click();
 await entry.locator('.replacement-suggestions button').filter({hasText:/^¬A ∨ ¬B$/}).click();
 assert.equal(await entry.locator('.replacement-after').inputValue(),'¬A ∨ ¬B');assert.equal(await entry.locator('.replacement-check').isVisible(),false);
 await row.getByRole('button',{name:'הרכבת הנוסחה מן ההחלפות',exact:true}).click();assert.equal(await row.locator('.step-editor').isVisible(),false);
 row=rows.nth(3);entry=await replacement(row,'r','demorgan');
 await entry.locator('.replacement-suggestions > summary').click();await entry.locator('.replacement-suggestions button').first().waitFor();assert.equal(await entry.locator('.replacement-suggestions button').count(),4);
 await entry.locator('.replacement-suggestions button').filter({hasText:/^A ∧ B$/}).click();
 await row.getByRole('button',{name:'הרכבת הנוסחה מן ההחלפות',exact:true}).click();assert.equal(await proof.locator('.proof-qed:not([hidden])').count(),0);await proof.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();assert.match(await proof.locator('form > .bk-msg').innerText(),/הפתרון הושלם/);
 assert.equal(await rows.count(),4);assert.equal(await proof.locator('.proof-ledger .step-accepted').count(),5);assert.equal(await proof.locator('.proof-qed:not([hidden])').count(),1);assert.equal(await rows.last().locator('.proof-qed').innerText(),'מש״ל');
 assert.ok(await proof.locator('.proof-start').evaluate(n=>{const label=n.querySelector('.step-label').getBoundingClientRect(),content=n.querySelector('.step-compact').getBoundingClientRect();return label.left>=content.right&&Math.abs(label.top-content.top)<10;}));
 await proof.locator('.proof-ledger').screenshot({path:'/tmp/compact-proof-complete.png'});
 await page.setViewportSize({width:390,height:900});assert.ok(await proof.locator('.proof-ledger').evaluate(n=>n.scrollWidth<=n.clientWidth+2));
 await proof.locator('.proof-ledger').screenshot({path:'/tmp/compact-proof-complete-mobile.png'});
 // Editing a verified row invalidates the dependent rows while preserving work.
 await rows.nth(1).locator('.step-edit').click();assert.equal(await proof.locator('.proof-qed:not([hidden])').count(),0);assert.equal(await rows.nth(1).locator('.step-editor').isVisible(),true);
 assert.equal(await rows.nth(2).locator('.step-editor').isVisible(),true);
 assert.equal(await rows.nth(0).locator('.step-editor').isVisible(),false);
 await entry.locator('.replacement-rule').scrollIntoViewIfNeeded();
 assert.ok(await entry.locator('.replacement-rule').evaluate(n=>n.getBoundingClientRect().right<=innerWidth));
 await page.setViewportSize({width:1200,height:1000});
 // A reversed starting side updates the heading; manual input remains available.
 const eq=page.locator('#practice-q-eq-neither .proof-editor');await eq.locator('.proof-start-choice').selectOption({index:2});
 assert.match(await eq.locator('.proof-goal').innerText(),/A ∨ B ≡/);
 await eq.locator('.proof-start .step-edit').click();await eq.locator('.proof-custom-start > summary').click();
 await eq.locator('.proof-start-input').fill('A');await eq.getByRole('button',{name:'בדיקת נקודת המוצא',exact:true}).click();
 assert.match(await eq.locator('.proof-start .bk-msg').innerText(),/אינה נכונה/);
 // Parallel manual replacements still work in one step.
 const eqRow=eq.locator('.proof-steps > .proof-step').first();
 await eq.locator('.proof-start-choice').selectOption({index:1});
 await replacement(eqRow,'r','demorgan','!!A | !!B');await submit(eqRow,'!!A | !!B');
 const next=eq.locator('.proof-steps > .proof-step').nth(1);
 const firstPart=await replacement(next,'r.0','double','A');await firstPart.locator('.replacement-check').click();
 const secondPart=await replacement(next,'r.1','double','F');await secondPart.locator('.replacement-check').click();
 assert.equal(await firstPart.locator('.replacement-check').isVisible(),false);
 await next.getByRole('button',{name:'הרכבת הנוסחה מן ההחלפות',exact:true}).click();assert.equal(await next.locator('.step-editor').isVisible(),true);
 await secondPart.locator('.replacement-after').fill('B');await secondPart.locator('.replacement-check').click();
 await next.getByRole('button',{name:'הרכבת הנוסחה מן ההחלפות',exact:true}).click();
 await eq.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();assert.match(await eq.locator('form > .bk-msg').innerText(),/הפתרון הושלם/);
 // Inference proof: premises and accepted rows share one block, with verbal meaning.
 const arg=page.locator('[data-argument="projector"]'),ex=ARGUMENTS.projector;
 for(const [i,f]of [...ex.premises.map(p=>p.formula),ex.goal.formula].entries())await arg.locator('.argument-translation input').nth(i).fill(f);
 await arg.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();
 assert.equal(await arg.locator('.argument-translation').first().isVisible(),false);
 for(const [i,s]of ex.solution.entries()){
  const r=arg.locator('.proof-step').nth(i);await r.locator('.proof-rule').selectOption(s.rule);
  const reminder=r.locator('.argument-rule-help');assert.equal(await reminder.getAttribute('open'),null);
  assert.ok(await reminder.evaluate(n=>n.getBoundingClientRect().height<35&&getComputedStyle(n).backgroundColor==='rgba(0, 0, 0, 0)'));
  await reminder.locator('summary').click();assert.equal(await reminder.locator('.formal-rule-premise').count(),2);assert.equal(await reminder.locator('.formal-rule-conclusion').innerText(),'B');await reminder.locator('summary').click();
  for(const [j,ref]of s.refs.entries())await r.locator('.argument-source').nth(j).selectOption(ref.replace(/^s/,'d'));
  await r.locator('.proof-input').fill(s.formula);await r.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
  assert.equal(await r.locator('.step-editor').isVisible(),false);
 }
 assert.equal(await arg.locator('.proof-preview').count(),0);assert.equal(await arg.locator('.proof-ledger .argument-premises li').count(),3);
 assert.equal(await arg.locator('.proof-qed:not([hidden])').count(),0);await arg.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();assert.match(await arg.locator('form > .bk-msg').innerText(),/ההוכחה הושלמה/);
 assert.match(await arg.locator('.step-compact-words').last().innerText(),/אפשר להתחיל/);
 const inference=arg.locator('.step-compact-reason .formal-inference').first();assert.equal(await inference.locator('.formal-rule-name').innerText(),'כלל הניתוק');assert.match(await inference.locator('.formal-rule-premise').nth(0).innerText(),/נתון 1/);assert.match(await inference.locator('.formal-rule-premise').nth(1).innerText(),/נתון 3/);assert.equal(await inference.locator('.formal-rule-conclusion').innerText(),'B');
 assert.equal(await arg.locator('.proof-step .step-label').last().innerText(),'צעד 2');
 assert.match(await arg.locator('.proof-step').last().locator('.argument-source').nth(1).locator('option:checked').innerText(),/מסקנת צעד 1/);
 assert.equal(await arg.locator('.proof-qed:not([hidden])').count(),1);
 const geometry=await arg.locator('.step-compact').first().evaluate(n=>{
  const f=n.querySelector('.proof-formula').getBoundingClientRect(),w=n.querySelector('.step-compact-words').getBoundingClientRect(),e=n.querySelector('.step-edit').getBoundingClientRect();
  return {formulaLeft:f.right<=w.left+1,sameLevel:Math.abs(f.top-w.top)<12,editLeft:e.right<=f.left+1};
 });assert.deepEqual(geometry,{formulaLeft:true,sameLevel:true,editLeft:true});
 assert.ok(await arg.locator('.argument-premises li').first().evaluate(n=>{const f=n.querySelector('.proof-formula').getBoundingClientRect(),w=n.querySelector('strong').getBoundingClientRect(),e=n.querySelector('button').getBoundingClientRect();return f.right<=w.left+1&&e.right<=f.left+1&&Math.abs(f.top-w.top)<12;}));
 await arg.locator('.proof-ledger').screenshot({path:'/tmp/proof-source-citations.png'});
 // The deduction editor accepts composed rewrites automatically as well.
 const lib=page.locator('[data-argument="library"]');
 for(const [i,f]of ['A -> B','A','B'].entries())await lib.locator('.argument-translation input').nth(i).fill(f);
 await lib.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();
 const lr=lib.locator('.proof-step').first();await lr.locator('.proof-rule').selectOption('eq:replacements');await lr.locator('.argument-source').first().selectOption('p1');
 await replacement(lr,'r','implication','!A | B');await lr.getByRole('button',{name:'הרכבת הנוסחה מן ההחלפות',exact:true}).click();
 assert.equal(await lr.locator('.step-editor').isVisible(),false);assert.equal(await lib.locator('.proof-step').count(),2);
 await arg.getByRole('button',{name:'עריכת נתון 1',exact:true}).click();assert.equal(await arg.locator('.argument-translation').first().isVisible(),true);
 // Knight proof still handles all temporary-assumption scopes and auto advances.
 const knight=page.locator('[data-knight-proof="contradiction"]');await knight.locator('.kp-statement').fill('!A & !B');await knight.getByRole('button',{name:'בדיקת ההצרנה ופתיחת ההוכחה',exact:true}).click();
 for(const [i,s]of KNIGHT_PROOFS.contradiction.model.entries()){
  const r=knight.locator('.kp-step').nth(i);await r.locator('.kp-rule').selectOption(s.rule);
  for(const [j,ref]of s.refs.entries()){
   if(j>=await r.locator('.kp-sources').count())await r.getByRole('button',{name:'הוספת שורת מקור',exact:true}).click();
   await r.locator('.kp-sources').nth(j).selectOption(String(ref));
  }
  await r.locator('.kp-formula').fill(s.formula);await r.getByRole('button',{name:'בדיקת השורה',exact:true}).click();
  assert.equal(await r.locator('.step-editor').isVisible(),false);
 }
 assert.equal(await knight.locator('.proof-qed:not([hidden])').count(),0);await knight.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();assert.equal(await knight.locator('.proof-qed:not([hidden])').count(),1);assert.equal(await knight.locator('.kp-written').count(),0);assert.match(await knight.locator('.kp-work > .bk-msg').innerText(),/ההוכחה הושלמה/);
 assert.equal(await knight.locator('.proof-ledger .kp-givens').count(),1);
 assert.match(await knight.locator('.step-compact-words').first().innerText(),/תחת הנחה/);
 await knight.getByRole('button',{name:'איפוס ההוכחה',exact:true}).click();
 const kr=knight.locator('.kp-step').first();await kr.locator('.kp-rule').selectOption('eq:replacements');await kr.locator('.kp-sources').selectOption('1');
 await replacement(kr,'r','double','!!(A <-> (!A & !B))');await kr.getByRole('button',{name:'הרכבת הנוסחה מן ההחלפות',exact:true}).click();
 assert.equal(await kr.locator('.step-editor').isVisible(),false);assert.equal(await knight.locator('.proof-qed:not([hidden])').count(),0);await knight.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();assert.match(await knight.locator('.kp-work > .bk-msg').innerText(),/ההוכחה הושלמה/);assert.equal(await knight.locator('.kp-step').count(),1);
 assert.deepEqual(errors,[]);
 console.log('Passed: reported tautology route, rule variants, optional suggestions, specific errors and recovery, compact start, auto steps, undo/edit, parallel substitutions, completed inference and knights proofs, desktop/mobile.');
}finally{await browser.close();}
