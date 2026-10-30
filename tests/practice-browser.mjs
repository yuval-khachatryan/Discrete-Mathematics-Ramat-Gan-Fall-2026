// Run after quarto render, serving _book locally.
// node tests/practice-browser.mjs http://127.0.0.1:8798
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { ARGUMENTS } from '../games/shared/argument-exercises.js';
import { PRACTICE_CHOICES } from '../games/shared/practice-choices.js';
import { rename } from '../games/shared/argument-rules.js';
import { assignments, evaluate } from '../games/shared/logic.js';
const base=process.argv[2]||'http://127.0.0.1:8798';
const browser=await chromium.launch({channel:'chrome',headless:true});
const problems=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:1000}});
 page.on('pageerror',e=>problems.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))problems.push(r.url());});
 if (!process.argv.includes('--domains')) {
  await page.goto(`${base}/01-logic.html#box-q-name-the-law`,{waitUntil:'networkidle'});
  const proof = page.locator('#box-q-name-the-law .proof-editor');
  const start = proof.locator('.proof-start-input');
  assert.match(await proof.locator('.proof-preview .proof-goal').innerText(),/נראה ש־/);
  assert.match(await proof.locator('.proof-preview .proof-goal').innerText(),/¬\(A ∧ ¬B\) ≡ A → B/);
  const lines = proof.locator('.proof-preview .proof-chain-line');
  const check = () => proof.getByRole('button',{name:'בדיקת הפתרון',exact:true}).click();
  await check();
  assert.equal(await start.getAttribute('aria-invalid'),'true');
  assert.equal(await lines.count(),0);
  await start.fill('!A | B'); // Equivalent, but skips the required justifications.
  await check();assert.equal(await lines.count(),0);
  await start.fill('!(A & !B)');
  await proof.getByRole('button',{name:'בדיקת נקודת המוצא',exact:true}).click();
  assert.equal(await lines.count(),1);
  const firstStep = proof.locator('.proof-step').first();
  await firstStep.locator('input').fill('!A | B');
  await firstStep.locator('select').selectOption('demorgan');
  await check();
  assert.match(await firstStep.locator('.bk-msg').innerText(),/התוצאה נכונה/);
  assert.match(await firstStep.locator('.bk-msg').innerText(),/¬A ∨ ¬¬B/);
  assert.equal(await firstStep.locator('[aria-invalid]').count(),0);
  assert.equal(await firstStep.locator('.proof-local').isVisible(),false);
  assert.equal(await lines.count(),1);
  const steps=[['!A | !!B','demorgan'],['!A | B','double'],['A -> B','implication']];
  for (const [i,[formula,rule]] of steps.entries()) {
   if(i)await proof.getByRole('button',{name:'הוספת צעד',exact:true}).click();
   const row=proof.locator('.proof-step').nth(i);
   await row.locator('input').fill(formula);await row.locator('select').selectOption(rule);
   await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
   assert.equal(await lines.count(),i+2);
   assert.equal(await row.locator('.proof-local .proof-chain-line').count(),i+2);
  }
  assert.match(await proof.locator('.proof-form > .bk-msg').innerText(),/הושלם/);
  assert.deepEqual(await lines.locator('.proof-formula').allTextContents(),['¬(A ∧ ¬B)','¬A ∨ ¬¬B','¬A ∨ B','A → B']);
  assert.match(await lines.nth(1).innerText(),/דה מורגן/);
  await proof.locator('.proof-step').nth(1).locator('select').selectOption('commute');
  assert.equal(await lines.count(),2); // No stale accepted suffix after editing.
  assert.equal(await proof.locator('.proof-step').nth(1).locator('.proof-local').isVisible(),false);
  await check();assert.equal(await lines.count(),2);
  assert.equal(await proof.locator('.proof-step').nth(1).locator('select').getAttribute('aria-invalid'),'true');
  await proof.locator('.proof-step').nth(1).locator('select').selectOption('double');
  await check();assert.equal(await lines.count(),4);
  for(const width of [1280,390,320]) {
   await page.setViewportSize({width,height:1000});
   assert.equal(await proof.evaluate(n=>n.scrollWidth>n.clientWidth+2),false,`proof overflow at ${width}`);
   const first=await lines.nth(1).locator('.proof-chain-sign').boundingBox();
   const formula=await lines.nth(1).locator('.proof-formula').boundingBox();
   assert.ok(first.x<formula.x,'equivalence sign precedes the formula in LTR order');
  }
  await page.setViewportSize({width:1280,height:1000});
  await proof.locator('.proof-preview').screenshot({path:'/tmp/discrete-proof-chain.png'});
  await proof.locator('.proof-step').last().screenshot({path:'/tmp/discrete-proof-local.png'});
  await proof.locator('.proof-step').nth(1).getByRole('button',{name:'מחיקת צעד 2',exact:true}).click();
  assert.equal(await lines.count(),2);
  await check();assert.equal(await lines.count(),2); // Cannot skip double negation.
  await page.reload({waitUntil:'networkidle'});
  await start.fill('A -> B');
  for(const [i,[formula,rule]] of [['!A | B','implication'],['!A | !!B','double'],['!(A & !B)','demorgan']].entries()) {
   if(i)await proof.getByRole('button',{name:'הוספת צעד',exact:true}).click();
   const row=proof.locator('.proof-step').nth(i);
   await row.locator('input').fill(formula);await row.locator('select').selectOption(rule);
  }
  await check();assert.match(await proof.locator('.proof-form > .bk-msg').innerText(),/הושלם/);
  await start.fill('!(A & !B)');assert.equal(await lines.count(),0);
  // The longer simplification uses the same editor with a fixed starting expression.
  const simplify=page.locator('#box-q-ex-simplify .proof-editor');
  await simplify.locator('.proof-start-input').fill('A & B');
  await simplify.getByRole('button',{name:'בדיקת הפתרון',exact:true}).click();
  assert.equal(await simplify.locator('.proof-start-input').getAttribute('aria-invalid'),'true');
  await simplify.locator('.proof-start-input').fill('!(!A | (A & !B))');
  await simplify.getByRole('button',{name:'בדיקת נקודת המוצא',exact:true}).click();
  const startFeedback=simplify.locator('.proof-start > .bk-msg');
  assert.doesNotMatch(await startFeedback.innerText(),/A ∧ B|המטרה/);
  assert.equal(await startFeedback.locator('.proof-formula').count(),0);
  assert.doesNotMatch(await simplify.locator('.proof-preview .proof-goal').innerText(),/A ∧ B|≡/);
  assert.match(await simplify.locator('.proof-preview .proof-goal').innerText(),/נפשט/);
  assert.match(await page.locator('#box-def-equivalence').locator('..').innerText(),/שקילות פועלת בשני הכיוונים/);
  const model = page.locator('.proof-model');
  assert.equal(await model.locator('.proof-chain-line').count(),4);
  await model.locator('xpath=ancestor::details[1]').locator('summary').click();
  await page.evaluate(async()=>{if(window.MathJax?.startup?.promise)await window.MathJax.startup.promise;});
  assert.equal(await model.locator('mjx-container').count(),4);
  assert.equal(await model.isVisible(),true);
  await model.screenshot({path:'/tmp/discrete-proof-model.png'});
  for(const id of ['mp','mt','hs']) {
   const rule=page.locator(`#box-thm-${id}`);
   assert.equal(await rule.locator('mjx-mtr').count(),2);
  }
  await page.locator('#box-thm-hs').screenshot({path:'/tmp/discrete-stacked-rule.png'});
  const argument=page.locator('[data-argument="library"]');
  await argument.getByRole('button',{name:'אישור הסימונים',exact:true}).click();
  const ex=ARGUMENTS.library;
  for(const [i,f] of [...ex.premises.map(p=>p.formula),ex.goal.formula].entries())
   await argument.locator('.argument-translation input').nth(i).fill(f);
  await argument.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();
  for(const [id,expected] of [['mp',['P → Q','P','Q']],['mt',['P → Q','¬Q','¬P']],['hs',['P → Q','Q → R','P → R']]]) {
   await argument.locator('.proof-rule').selectOption(id);
   const rule=argument.locator('.inference-rule');
   assert.deepEqual(await rule.locator('.proof-formula').allTextContents(),expected);
   const boxes=await rule.locator('.proof-formula').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().y));
   assert.ok(boxes[0]<boxes[1] && boxes[1]<boxes[2]);
  }
  await argument.getByRole('button',{name:'הצגת דרך פתרון לפי האותיות שלי',exact:true}).click();
  assert.match(await argument.locator('.argument-solution').innerText(),/נראה שמתוך ההנחות/);

  assert.equal(await page.locator('mjx-merror').count(),0);

 }
 if(process.argv.includes('--proofs')) {
  const response=await page.request.get(`${base}/games/barman/index.html?level=classic&embed=1`);
  assert.equal(response.status(),200);
  assert.deepEqual(problems,[]);
  console.log('Passed: both proof directions, local and full proof displays, missing double negation, editing, deletion, narrow layouts, hidden simplification target, and model proof.');
 } else if(process.argv.includes('--domains')) {
  await page.goto(`${base}/02-sets.html#sec-quantifiers`,{waitUntil:'networkidle'});
  await page.evaluate(async()=>{if(window.MathJax?.startup?.promise)await window.MathJax.startup.promise;});
  const quant=page.locator('#sec-quantifiers');
  assert.match(await quant.innerText(),/עולם הדיון/);
  assert.match(await page.locator('#box-def-quantifiers').innerText(),/∈/);
  for(const width of [1280,390,320]) {
   await page.setViewportSize({width,height:1000});
   await page.locator('#box-def-quantifiers').screenshot({path:`/tmp/quantifiers-definition-${width}.png`});
  }
  await page.goto(`${base}/02-sets.html#practice-quantifiers`,{waitUntil:'networkidle'});
  for(const [id,questions]of Object.entries(PRACTICE_CHOICES).filter(([id])=>(id.startsWith('quant-')||id==='free'))) {
   const box=page.locator(`[data-choice="${id}"]`);
   for(const [i,q]of questions.entries())await box.locator('select').nth(i).selectOption(String(q.options.findIndex(o=>o.correct)));
   await box.getByRole('button',{name:'בדיקת התשובות',exact:true}).click();
   assert.match(await box.locator('form > .bk-msg').innerText(),/כל התשובות נכונות/);
   await box.locator('..').getByRole('button',{name:'כל הפתרון',exact:true}).click();
  }
  assert.equal(await page.locator('mjx-merror').count(),0);
  for(const width of [1280,390,320]) {
   await page.setViewportSize({width,height:1000});
   const overflow=await page.evaluate(()=>[...document.querySelectorAll('#practice-quantifiers *, #box-def-quantifiers *')].filter(n=>{
    if(n.closest('.math.display, .table-responsive, .proof-formula'))return false;
    const r=n.getBoundingClientRect();return r.width&&(r.left < -1||r.right > innerWidth+1);
   }).map(n=>({tag:n.tagName,text:n.textContent.slice(0,80)})));
   assert.deepEqual(overflow,[],`quantifier content overflow ${width}`);
   await page.locator('#practice-quantifiers').screenshot({path:`/tmp/quantifiers-practice-${width}.png`});
  }
  for(const width of [1100,390,320]) {
   await page.setViewportSize({width,height:1000});
   for(const id of ['witness','counter','check-all','nobody','negation','order']) {
    await page.goto(`${base}/games/witness/index.html?level=${id}&embed=1`);
    await page.locator('.w-world').waitFor();
    assert.match(await page.locator('.w-world').innerText(),/∈/);
    await page.getByRole('button',{name:'פתרון',exact:true}).click();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    assert.equal(overflow,false,`${id} game overflow ${width}`);
    if(id==='order')await page.screenshot({path:`/tmp/quantifiers-game-${width}.png`,fullPage:true});
   }
  }
  assert.deepEqual(problems,[]);
  console.log('Passed: explicit domains, eight quantifier choice exercises and solutions, math rendering, six witness-game levels and narrow layouts.');
 } else {
 await page.goto(`${base}/01-logic.html#sec-self-practice`,{waitUntil:'networkidle'});
 await page.evaluate(async()=>{if(window.MathJax?.startup?.promise)await window.MathJax.startup.promise;});
 const bank=page.locator('#sec-self-practice');
 assert.equal(await bank.locator('[id^="practice-q-"]').count(),40);
 assert.equal(await bank.locator('.argument-ready').count(),16);
 assert.equal(await bank.locator('.proof-ready').count(),4);
 assert.equal(await bank.locator('.choice-ready').count(),11);
 assert.match(await page.locator('h1').innerText(),/הכללים לבניית משפטים ולהסקת מסקנות/);
 for(const [id,ex]of Object.entries(ARGUMENTS).filter(([id])=>id.startsWith('practice-'))) {
  const b=bank.locator(`[data-argument="${id}"]`);
  const names=['C','A','B'];
  const map=Object.fromEntries(ex.atoms.map((a,i)=>[a.id,names[i]]));
  for(const [i,name]of ex.atoms.map((a,i)=>names[i]).entries())await b.locator('.argument-letter').nth(i).selectOption(name);
  await b.getByRole('button',{name:'אישור הסימונים',exact:true}).click();
  const formulas=[...ex.premises.map(p=>p.formula),ex.goal.formula].map(f=>rename(f,map));
  for(const [i,f]of formulas.entries())await b.locator('.argument-translation input').nth(i).fill(f);
  await b.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();
  assert.equal(await b.locator('.argument-stage').nth(2).isVisible(),true,id);
  for(const [i,step]of ex.solution.entries()) {
   if(i)await b.getByRole('button',{name:'הוספת צעד',exact:true}).click();
   const row=b.locator('.argument-steps .proof-step').nth(i);
   await row.locator('.argument-formula-bank').selectOption(rename(step.formula,map));
   assert.equal(await row.locator('input').inputValue(),rename(step.formula,map));
   await row.locator('.proof-rule').selectOption(step.rule);
   for(const [j,ref]of step.refs.entries())await row.locator('.argument-source').nth(j).selectOption(ref.startsWith('s')?'d'+ref.slice(1):ref);
  }
  const summary=b.locator('.argument-stage').nth(2).locator('form > .bk-msg');
  await b.getByRole('button',{name:'בדיקת ההוכחה',exact:true}).click();
  assert.match(await summary.innerText(),/הושלמה/,id);
  await b.getByRole('button',{name:'הצגת דרך פתרון לפי האותיות שלי',exact:true}).click();
  for(const step of ex.solution)assert.ok((await b.locator('.argument-solution').innerText()).includes(rename(step.formula,map)),id);
  await b.getByRole('button',{name:'רמז',exact:true}).click();
  assert.ok((await b.locator('.argument-hints').innerText()).length>0);
  console.log(`Assisted argument: ${id}`);
 }
 // A bank selection is not automatically justified. Check the wrong step,
 // dependent-step blocking, and a different legal route using the bank alone.
 const bus=bank.locator('[data-argument="practice-bus"]');
 const first=bus.locator('.argument-steps .proof-step').nth(0);
 const second=bus.locator('.argument-steps .proof-step').nth(1);
 await first.locator('.argument-formula-bank').selectOption('B');
 await bus.getByRole('button',{name:'בדיקת ההוכחה',exact:true}).click();
 assert.equal(await first.locator('input').getAttribute('aria-invalid'),'true');
 assert.match(await first.locator('.bk-msg').innerText(),/אינה מובטחת/);
 assert.match(await second.locator('.bk-msg').innerText(),/ממתין/);
 await first.locator('.argument-formula-bank').selectOption('C → B');
 await first.locator('.proof-rule').selectOption('hs');
 await first.locator('.argument-source').nth(0).selectOption('p1');
 await first.locator('.argument-source').nth(1).selectOption('p2');
 await second.locator('.argument-source').nth(0).selectOption('d1');
 await second.locator('.argument-source').nth(1).selectOption('p3');
 await bus.getByRole('button',{name:'בדיקת ההוכחה',exact:true}).click();
 assert.match(await bus.locator('.argument-stage').nth(2).locator('form > .bk-msg').innerText(),/הושלמה/);
 // Editing a bank choice by typing is allowed and clears stale bank selection.
 await first.locator('input').fill('C -> B');
 assert.equal(await first.locator('.argument-formula-bank').inputValue(),'');
 await bus.getByRole('button',{name:'בדיקת ההוכחה',exact:true}).click();
 assert.match(await bus.locator('.argument-stage').nth(2).locator('form > .bk-msg').innerText(),/הושלמה/);

 for(const [id,questions]of Object.entries(PRACTICE_CHOICES).filter(([id])=>!id.startsWith('quant-')&&id!=='free')) {
  const box=bank.locator(`[data-choice="${id}"]`);
  const submit=()=>box.getByRole('button',{name:'בדיקת התשובות',exact:true}).click();
  await submit();assert.equal(await box.locator('.choice-item [aria-invalid="true"]').count(),questions.length);
  for(const [i,q]of questions.entries()){if(q.substitution){const row=box.locator('.choice-item').nth(i);await row.locator('input').fill(q.substitution.expected);await row.getByRole('button',{name:'בדיקת ההצבה',exact:true}).click();}await box.locator('select').nth(i).selectOption(String(q.options.findIndex(o=>!o.correct)));}
  await submit();assert.equal(await box.locator('.choice-item .bk-bad').count(),questions.length);
  for(const [i,q]of questions.entries()) {
   assert.ok((await box.locator('.choice-item .bk-msg').nth(i).innerText()).length>30);
   await box.locator('select').nth(i).selectOption(String(q.options.findIndex(o=>o.correct)));
  }
  assert.equal(await box.locator('form > .bk-msg').innerText(),'');
  await submit();assert.match(await box.locator('form > .bk-msg').innerText(),/כל התשובות נכונות/);
  await box.getByRole('button',{name:'ניסיון חדש',exact:true}).click();
  for(const select of await box.locator('select').all())assert.equal(await select.inputValue(),'');
  assert.equal(await box.locator('[aria-invalid]').count(),0);
 }
 const equivalents=[
  [['!A | !B','demorgan'],['!A & !!B','demorgan'],['!A & B','double']],
  [['!(!A | !B)','implication'],['!!A & !!B','demorgan'],['A & !!B','double'],['A & B','double']],
  [['!A | (B & C)','implication'],['(!A | B) & (!A | C)','distribute'],['(A -> B) & (!A | C)','implication'],['(A -> B) & (A -> C)','implication']],
  [['!!A | !!B','demorgan'],['A | !!B','double'],['A | B','double']],
 ];
 // First exercise: a wrong formula must be rejected before correcting it.
 for(let i=0;i<4;i++) {
  const b=bank.locator('.proof-editor').nth(i);
  const steps=equivalents[i];
  await b.locator(".proof-start-input").fill(await b.getAttribute("data-start"));
  if(i===0) {
   await b.locator('.proof-input').fill(steps[0][0]);await b.locator('.proof-rule').selectOption(steps[0][1]);
   await b.getByRole('button',{name:'בדיקת הפתרון',exact:true}).click();
   assert.match(await b.locator('.proof-form > .bk-msg').innerText(),/לתקן/);steps.shift();
  }
  for(const [j,[f,rule]]of steps.entries()) {
   if(j)await b.getByRole('button',{name:'הוספת צעד',exact:true}).click();
   const row=b.locator('.proof-step').nth(j);await row.locator('input').fill(f);await row.locator('.proof-rule').selectOption(rule);
  }
  await b.getByRole('button',{name:'בדיקת הפתרון',exact:true}).click();
  assert.match(await b.locator('.proof-form > .bk-msg').innerText(),/הושלם/);
 }
 for(const fq of await bank.locator('.fq').all()) {
  const expected=await fq.getAttribute('data-answer');
  await fq.locator('input').fill(`!(${expected})`);await fq.getByRole('button',{name:'בדיקה',exact:true}).click();
  assert.equal(await fq.locator('.bk-msg.bk-bad').count(),1);
  await fq.locator('input').fill(expected);await fq.getByRole('button',{name:'בדיקה',exact:true}).click();
  assert.equal(await fq.locator('.bk-msg.bk-good').count(),1);
 }
 for(const table of await bank.locator('.ttq').all()) {
  const cols=(await table.getAttribute('cols')).split(';').map(s=>s.trim());
  const names=(await table.getAttribute('data-vars')).split(',');
  for(const [i,row]of assignments(names).entries())for(const [j,col]of cols.entries()) {
   const cell=table.locator('tbody tr').nth(i).locator('.bk-cell').nth(j);
   await cell.click();if(!evaluate(col,row))await cell.click();
  }
  await table.getByRole('button',{name:'בדיקה',exact:true}).click();
  if(await table.locator('.evidence-choice').count()) {
   const left=await table.getAttribute('data-left'),right=await table.getAttribute('data-right');
   const formula=await table.getAttribute('data-formula');const value=await table.getAttribute('data-value');const index=assignments(names).findIndex(env=>formula?evaluate(formula,env)===(value==='true'):evaluate(left,env)!==evaluate(right,env));
   await table.locator('.evidence-choice').selectOption(index<0?'none':String(index));
   await table.getByRole('button',{name:'בדיקה',exact:true}).click();
  }
  assert.equal(await table.locator(':scope > .bk-msg.bk-good').count(),1);
  // Check that the column hint names XOR / iff correctly.
  if(cols.some(c=>c.includes('^')||c.includes('<->'))) {
   await table.getByRole('button',{name:'איפוס',exact:true}).click();
   for(let j=0;j<cols.length;j++)await table.getByRole('button',{name:'העמודה הבאה',exact:true}).click();
   assert.match(await table.locator(':scope > .bk-msg').innerText(),cols.at(-1).includes('^')?/או מפריד/:/אם ורק אם/);
  }
 }
 for(const box of await bank.locator('.solve').all()) {
  assert.equal(await box.locator('.step:not(.bk-hidden)').count(),0);
  await box.getByRole('button',{name:'כל הפתרון',exact:true}).click();
  assert.ok(await box.locator('.step:not(.bk-hidden)').count());
 }
 assert.equal(await page.locator('mjx-merror').count(),0);
 for(const width of [1280,390,320]) {
  await page.setViewportSize({width,height:1000});
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('#sec-self-practice *')].filter(n=>{
   if(n.closest('.bk-tt-wrap, .proof-formula, .math.display'))return false;
   const r=n.getBoundingClientRect();return r.width&&(r.left < -1||r.right > innerWidth+1);
  }).map(n=>({tag:n.tagName,text:n.textContent.slice(0,80)})));
  assert.deepEqual(overflow,[],`new content overflow ${width}`);
  for(const id of ['practice-q-practice-coupon','practice-q-eq-distribute','practice-q-dessert','practice-q-classify']) {
   await page.locator('#'+id).screenshot({path:`/tmp/${id}-${width}.png`});
  }
 }
 await page.setViewportSize({width:1280,height:1000});
 await page.goto(`${base}/01-logic.html`,{waitUntil:'networkidle'});
 await page.locator('#sec-about').screenshot({path:'/tmp/logic-opening-1280.png'});
 await page.goto(`${base}/games/gate/index.html?embed=1`,{waitUntil:'networkidle'});
 assert.equal(await page.locator('.k-legend sup').count(),0);
 assert.match(await page.locator('.k-legend').first().innerText(),/בטבלה \d+ שורות/);
 assert.deepEqual(problems,[]);
 console.log('Passed: 40 logic exercises have inputs; 8 choice activities, 16 custom-letter arguments with formula banks, alternative proof routes, invalid steps, 4 equivalence proofs, formula inputs, tables, solutions, title, game wording, and three viewport sizes.');
 }
} finally {await browser.close();}
