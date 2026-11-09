import {parseStatement,expandSubset,show,node,substituteName} from '../games/shared/set-proof-syntax.js';
import {chromium} from 'playwright-core';
import {pathToFileURL,fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {MODELS,step} from './set-proof-models.mjs';
import {elementContributions} from '../games/shared/set-counting-lab.js';
import {setRuleCategory} from '../games/shared/set-proof-checker.js';
import {SET_PROOFS} from '../games/shared/set-proof-exercises.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,async r=>{
  if(r.request().url().includes('mathjax'))await r.fulfill({path:fileURLToPath(new URL('../../Alternative Versions/source/node_modules/mathjax/es5/tex-svg.js',import.meta.url)),contentType:'application/javascript'});
  else await r.abort();
 });
 await page.goto(pathToFileURL(fileURLToPath(new URL('../_book/02-sets.html',import.meta.url))).href);
 await page.waitForFunction(()=>window.MathJax?.startup?.promise);await page.evaluate(()=>window.MathJax.startup.promise);
 assert.equal(await page.locator('.set-proof-editor').count(),Object.keys(SET_PROOFS).length);
 assert.equal(await page.locator('mjx-merror').count(),0);
 async function openEditor(box){
  const work=box.locator('.set-proof-workspace');
  if(!await work.evaluate(n=>n.open))await work.locator(':scope>summary').click();
 }
 async function fill(box,step){
  await openEditor(box);
  if(step.rule==='open-forall'){
   const text=step.formula||await box.locator('.set-proof-current-goal .set-proof-formula').innerText();
   const goal=parseStatement(text),q=goal.type==='subset'?expandSubset(goal):goal,x={type:'name',name:step.variable||'x'};
   const membership=node('member',x,q.args[1]),body=substituteName(q.args[2],q.args[0].name,x);
   await box.getByLabel('סוג הפעולה',{exact:true}).selectOption('let');
   await box.getByLabel('יהי',{exact:true}).fill(step.style==='conditional'?x.name:show(membership));
   await box.getByLabel('הטענה בצעד החדש',{exact:true}).fill(show(step.style==='conditional'?node('imp',membership,body):body));
   await box.getByRole('button',{name:'בדיקת הצעד',exact:true}).click();
   assert.equal(await box.locator('.set-proof-input .bk-bad').count(),0,await box.innerText());
   assert.equal(await box.locator(':scope>.bk-bad').count(),0,await box.innerText());return;
  }
  await box.getByLabel('סוג הפעולה',{exact:true}).selectOption(step.kind||'step');
  if(step.kind==='match-goal')await box.getByLabel('המטרה שאליה מקשרים',{exact:true}).selectOption(step.target||'R');
  await box.getByLabel('תחום ההצדקה',{exact:true}).selectOption(setRuleCategory(step.rule));
  await box.getByLabel('כלל ההצדקה',{exact:true}).selectOption(step.rule);
  for(const [i,ref]of step.sources.entries())await box.getByLabel(`מקור ${i+1}`,{exact:true}).selectOption(ref);
  if(step.kind!=='match-goal')await box.getByLabel('הטענה בצעד החדש',{exact:true}).fill(step.formula);
  await box.getByRole('button',{name:step.kind==='restate-goal'?'בדיקת הניסוח':'בדיקת הצעד',exact:true}).click();
  assert.equal(await box.locator('.set-proof-input .bk-bad').count(),0,await box.innerText());
 }
 if(process.argv.includes('--solution-views-only')){
  const box=page.locator('[data-set-proof="complement-inclusion"]');
  await openEditor(box);
  await fill(box,{rule:'open-forall',formula:'∀x ∈ Bᶜ: (x ∈ Aᶜ)',variable:'x'});
  await fill(box,step('assume','x ∈ A'));
  await fill(box,step('subset-use','x ∈ B','G1','S2'));
  const input=box.getByLabel('הטענה בצעד החדש',{exact:true});await input.fill('F');
  await box.getByRole('button',{name:'פתרון לדוגמה',exact:true}).click();
  assert.equal(await box.locator('.set-proof-workspace').isVisible(),false);
  assert.match(await box.locator('.set-model-panel').innerText(),/דרך השלילה/);
  await box.getByRole('button',{name:'השוואה',exact:true}).click();
  assert.equal(await input.inputValue(),'F');
  assert.equal(await box.locator('.set-proof-workspace').isVisible(),true);
  const workRect=await box.locator('.set-proof-workspace').boundingBox(),modelRect=await box.locator('.set-model-panel').boundingBox();
  assert.ok(workRect.x>modelRect.x,'student proof should be the right-hand panel');
  assert.ok(Math.abs(workRect.y-modelRect.y)<3,'comparison panels should align');
  await fill(box,step('false','F','S1','S3'));
  await box.getByRole('button',{name:'סגירת ההנחה בדרך השלילה',exact:true}).click();
  assert.match(await box.locator('[data-row="S5"]').innerText(),/x ∉ A/);
  assert.equal(await box.locator('[data-assumption="S2"]').getAttribute('data-state'),'closed');
  await fill(box,step('universe-member','x ∈ U','S1'));
  await fill(box,step('complement','x ∈ Aᶜ','S5','S6'));
  await box.getByRole('button',{name:'סגירת ההנחה — האיבר היה כלשהו',exact:true}).click();
  await fill(box,step('subset-definition','Bᶜ ⊆ Aᶜ','S8'));
  await box.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();
  assert.match(await box.locator(':scope>.bk-msg').innerText(),/ההוכחה הושלמה/);
  await box.screenshot({path:'/tmp/set-proof-comparison-desktop.png'});
  await box.locator('[data-row="S3"] button').click();
  await box.getByRole('button',{name:'פתרון לדוגמה',exact:true}).click();
  await box.getByRole('button',{name:'ההוכחה שלי',exact:true}).click();
  assert.equal(await box.getByLabel('הטענה בצעד החדש',{exact:true}).inputValue(),'x ∈ B');
  await box.getByRole('button',{name:'ביטול העריכה ושחזור ההמשך',exact:true}).click();
  assert.equal(await box.locator('[data-row="S9"]').count(),1);
  // Every exercise exposes a complete checked model without changing student work.
  for(const id of Object.keys(SET_PROOFS)){
   const other=page.locator(`[data-set-proof="${id}"]`);
   const count=await other.locator('.set-proof-rows [data-row]').count();
   await other.getByRole('button',{name:'פתרון לדוגמה',exact:true}).click();
   assert.equal(await other.locator('.set-model-part').count(),SET_PROOFS[id].parts.length);
   assert.equal(await other.locator('.set-proof-rows [data-row]').count(),count);
  }
  await box.getByRole('button',{name:'השוואה',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  const workMobile=await box.locator('.set-proof-workspace').boundingBox(),modelMobile=await box.locator('.set-model-panel').boundingBox();
  assert.ok(modelMobile.y>=workMobile.y+workMobile.height,'mobile comparison should stack');
  assert.ok(await box.evaluate(n=>n.scrollWidth<=n.clientWidth+2),'comparison overflows mobile');
  await box.screenshot({path:'/tmp/set-proof-comparison-mobile.png'});
  assert.deepEqual(errors,[]);
  console.log('Contradiction route, closing assumptions, all 17 model solutions, view switching, editing and desktop/mobile comparison passed.');
  await browser.close();process.exit(0);
 }
 // Symbol-only controls must retain LTR glyphs even inside a Hebrew editor.
 const first=page.locator('[data-set-proof="inclusion-chain"]');
 assert.equal(await first.locator('.set-proof-workspace').evaluate(n=>n.open),false);
 assert.ok((await first.locator('.set-proof-question').innerText()).includes('הוכיחו'));
 await openEditor(first);
 assert.equal(await first.getByLabel('כלל ההצדקה',{exact:true}).isDisabled(),true);
 await first.getByLabel('תחום ההצדקה',{exact:true}).selectOption('definitions');
 assert.equal(await first.getByLabel('כלל ההצדקה').locator('option[value="mp"]').count(),0);
 await first.getByLabel('כלל ההצדקה',{exact:true}).selectOption('subset-definition');
 await first.getByLabel('תחום ההצדקה',{exact:true}).selectOption('inference');
 assert.equal(await first.getByLabel('כלל ההצדקה',{exact:true}).inputValue(),'');
 assert.equal(await first.locator('.set-proof-sources select').count(),0);
 assert.equal(await first.getByLabel('כלל ההצדקה').locator('option[value="subset-definition"]').count(),0);
 await first.getByLabel('הטענה בצעד החדש',{exact:true}).focus();
 for(const symbol of ['∈','∉','⊆','⊇']){
  const key=first.getByRole('button',{name:'הוספת '+symbol,exact:true});
  assert.equal(await key.evaluate(n=>getComputedStyle(n).direction),'ltr');
  await first.getByLabel('הטענה בצעד החדש',{exact:true}).fill('');
  await key.click();assert.equal(await first.getByLabel('הטענה בצעד החדש',{exact:true}).inputValue(),symbol);
 }
 await first.locator('.set-proof-keyboard').screenshot({path:'/tmp/set-symbol-directions.png'});
 await first.getByRole('button',{name:'איפוס החלק הזה',exact:true}).click();
 if(process.argv.includes('--layout-only')){
  await first.getByRole('button',{name:'ניסוח שקול של המטרה',exact:true}).click();
  await fill(first,{rule:'open-forall',variable:'x',style:'member'});
  await first.getByLabel('תחום ההצדקה',{exact:true}).selectOption('definitions');
  await first.getByLabel('כלל ההצדקה',{exact:true}).selectOption('subset-definition');
  await first.getByLabel('מקור 1',{exact:true}).selectOption('G1');
  assert.match(await first.getByLabel('כלל ההצדקה').locator('option:checked').innerText(),/∀x∈X/);
  assert.equal(await first.locator('.set-proof-rule-explanation').count(),0);
  const domainBox=await first.getByLabel('תחום ההצדקה').boundingBox(),ruleBox=await first.getByLabel('כלל ההצדקה').boundingBox();
  assert.ok(ruleBox.y>=domainBox.y+domainBox.height,'rule should occupy a separate full-width row');
  await first.screenshot({path:'/tmp/set-proof-rule-layout.png'});
  await page.setViewportSize({width:390,height:844});
  await first.screenshot({path:'/tmp/set-proof-rule-layout-mobile.png'});
  assert.equal(await first.locator('.set-proof-goal-row').count(),0);
  assert.match(await first.locator('[data-row="S1"]').innerText(),/יהי/);
  assert.match(await first.locator('[data-row="S1"]').innerText(),/יהי x ∈ A/);
  assert.match(await first.locator('.set-proof-local-goal').innerText(),/נוכיח ש־/);
  assert.ok(await first.evaluate(n=>n.scrollWidth<=n.clientWidth+2),'mobile rule picker overflows');
  assert.deepEqual(errors,[]);console.log('Rule picker, expanded goal, arbitrary-element opening and mobile layout checked.');
  await browser.close();process.exit(0);
 }
 // Manual opening is available before expanding the target, with checked optional hints.
 await first.getByLabel('סוג הפעולה',{exact:true}).selectOption('let');
 assert.equal(await first.getByLabel('יהי',{exact:true}).inputValue(),'');
 await first.getByLabel('יהי',{exact:true}).fill('y ∈ C');
 await first.getByLabel('הטענה בצעד החדש',{exact:true}).fill('y ∈ C');
 await first.getByRole('button',{name:'בדיקת הצעד',exact:true}).click();
 assert.match(await first.locator('.set-proof-input .bk-bad').innerText(),/התחום/);
 await first.locator('.set-proof-hint > summary').click();
 await first.locator('.set-proof-hint button').first().click();
 assert.equal(await first.locator('[data-row="S1"]').count(),0);
 await first.getByRole('button',{name:'בדיקת הצעד',exact:true}).click();
 assert.match(await first.locator('[data-row="S1"]').innerText(),/יהי x ∈ A/);
 await first.locator('[data-row="S1"] button').click();
 assert.equal(await first.getByLabel('יהי',{exact:true}).inputValue(),'x ∈ A');
 await first.getByRole('button',{name:'ביטול העריכה ושחזור ההמשך',exact:true}).click();
 await first.getByRole('button',{name:'איפוס החלק הזה',exact:true}).click();
 // A student writes (or requests a hint for) an equivalent target; it is never a premise.
 await first.getByRole('button',{name:'ניסוח שקול של המטרה',exact:true}).click();
 await first.getByLabel('תחום ההצדקה',{exact:true}).selectOption('definitions');
 await first.getByLabel('כלל ההצדקה',{exact:true}).selectOption('subset-definition');
 const goalInput=first.getByLabel('הטענה בצעד החדש',{exact:true});
 await goalInput.fill('for');await goalInput.press('Tab');assert.equal(await goalInput.inputValue(),'∀');
 await goalInput.fill('x notin ');assert.equal(await goalInput.inputValue(),'x ∉ ');
 await goalInput.fill('∀x ∈ C: (x ∈ A)');
 await first.getByRole('button',{name:'בדיקת הניסוח',exact:true}).click();
 assert.equal(await first.locator('.set-proof-input .bk-bad').count(),1);
 assert.equal(await first.locator('.set-proof-goal-row').count(),0);
 await first.locator('.set-proof-hint > summary').click();
 await first.locator('.set-proof-hint button').filter({hasText:'∀x ∈ A (x ∈ C)'}).click();
 assert.equal(await first.locator('.set-proof-goal-row').count(),0,'hint fills the field without proving anything');
 await first.getByRole('button',{name:'בדיקת הניסוח',exact:true}).click();
 assert.equal(await first.locator('.set-proof-goal-row').count(),1);
 await fill(first,{rule:'open-forall',variable:'x',style:'member'});
 await fill(first,step('subset-use','x ∈ B','G1','S1'));
 await fill(first,step('subset-use','x ∈ C','G2','S2'));
 await first.getByRole('button',{name:'סגירת ההנחה — האיבר היה כלשהו',exact:true}).click();
 await first.getByLabel('סוג הפעולה',{exact:true}).selectOption('match-goal');
 await first.getByLabel('תחום ההצדקה',{exact:true}).selectOption('definitions');
 await first.getByLabel('כלל ההצדקה',{exact:true}).selectOption('subset-definition');
 assert.equal(await first.getByLabel('מקור 1',{exact:true}).locator('option[value="R1"]').count(),0);
 await first.getByLabel('מקור 1',{exact:true}).selectOption('S4');
 assert.equal(await goalInput.isEditable(),false);
 await first.getByRole('button',{name:'בדיקת הצעד',exact:true}).click();
 await first.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();
 assert.match(await first.locator('[data-row="S5"]').innerText(),/הגדרת ההכלה/);
 await first.getByRole('button',{name:'איפוס החלק הזה',exact:true}).click();
 const testBox=page.locator('[data-set-proof="hw-intersection"]');
 await openEditor(testBox);
 await testBox.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();assert.match(await testBox.locator(':scope>.bk-msg').innerText(),/עדיין לא/);
 await testBox.getByLabel('תחום ההצדקה',{exact:true}).selectOption('definitions');
 await testBox.getByLabel('כלל ההצדקה',{exact:true}).selectOption('intersection');
 await testBox.getByLabel('מקור 1',{exact:true}).selectOption('G1');
 await testBox.getByLabel('הטענה בצעד החדש',{exact:true}).fill('x ∈ C');
 await testBox.getByRole('button',{name:'בדיקת הצעד',exact:true}).click();assert.equal(await testBox.locator('.set-proof-input .bk-bad').count(),1);
 await testBox.getByRole('button',{name:'איפוס החלק הזה',exact:true}).click();
 for(const [id,parts]of Object.entries(MODELS)){
  const box=page.locator(`[data-set-proof="${id}"]`);
  for(let i=0;i<parts.length;i++){
   await openEditor(box);
   if(i)await box.locator('.set-proof-tabs button').nth(i).click();
   for(const step of parts[i])await fill(box,step);
   if(SET_PROOFS[id].parts[i].flow==='goals'){
    assert.match(await box.locator('[data-row="S1"]').innerText(),/יהי/);
    assert.equal(await box.locator('.set-proof-goal-row').count(),0);
   }
   await box.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();
   assert.equal(await box.locator('.set-proof-input').count(),0,id+' remains incomplete');
   if(SET_PROOFS[id].parts[i].goal.includes('⊇')){
    assert.match(await box.locator('.set-proof-rows .set-proof-row').last().innerText(),/⊇/);
    assert.match(await box.locator('.set-proof-current-goal').innerText(),/⊇/);
   }
  }
  assert.match(await box.locator(':scope>.bk-msg').innerText(),/ההוכחה הושלמה/,id);
 }
 // Expanding the target adds no premise. The conditional route has explicit scopes.
 const chain=page.locator('[data-set-proof="inclusion-chain"]');
 await chain.getByRole('button',{name:'איפוס החלק הזה',exact:true}).click();
 assert.equal(await chain.locator('.set-proof-row[data-row]').count(),2);
 await chain.getByRole('button',{name:'ניסוח שקול של המטרה',exact:true}).click();
 assert.equal(await chain.locator('.set-proof-row[data-row]').count(),2);
 await fill(chain,{kind:'restate-goal',rule:'subset-definition',formula:'∀x ∈ A: (x ∈ C)',sources:[]});
 assert.match(await chain.locator('.set-proof-current-goal').innerText(),/∀x/);
 assert.match(await chain.locator('.set-proof-goal-row').innerText(),/ניסוח שקול למטרה/);
 assert.match(await chain.locator('.set-proof-goal-row').innerText(),/∀x/);
 await fill(chain,{rule:'open-forall',variable:'y',style:'conditional'});
 assert.match(await chain.locator('[data-row="S1"]').innerText(),/יהי y איבר כלשהו/);
 assert.match(await chain.locator('[data-assumption="S1"] .set-proof-local-goal').innerText(),/y ∈ A/);
 assert.equal(await chain.getByRole('button',{name:'סגירת ההנחה — האיבר היה כלשהו',exact:true}).isDisabled(),true);
 await fill(chain,step('assume','y ∈ A'));
 await fill(chain,step('subset-use','y ∈ B','G1','S2'));
 await fill(chain,step('subset-use','y ∈ C','G2','S3'));
 assert.equal(await chain.getByRole('button',{name:'סגירת ההנחה — האיבר היה כלשהו',exact:true}).isDisabled(),true);
 await fill(chain,step('conditional','(y ∈ A) → (y ∈ C)','S2','S4'));
 await chain.getByRole('button',{name:'סגירת ההנחה — האיבר היה כלשהו',exact:true}).click();
 assert.equal(await chain.locator('[data-assumption="S1"]').getAttribute('data-state'),'closed');
 await fill(chain,step('subset-definition','A ⊆ C','S6'));
 await chain.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();
 assert.match(await chain.locator('[data-row="S7"] .set-proof-row-id').innerText(),/R/);
 await chain.locator('[data-row="S1"] button').click();
 assert.equal(await chain.getByLabel('יהי',{exact:true}).inputValue(),'y');
 assert.equal(await chain.locator('[data-row="S2"]').count(),0);
 await chain.getByRole('button',{name:'ביטול העריכה ושחזור ההמשך',exact:true}).click();
 assert.equal(await chain.locator('[data-row="S7"]').count(),1);
 // Reformulate the local goal; closing the assumption cites that verified equivalence.
 const local=page.locator('[data-set-proof="intersection-target"]');
 await local.getByRole('button',{name:'איפוס החלק הזה',exact:true}).click();
 await fill(local,{kind:'restate-goal',rule:'subset-definition',formula:'∀x ∈ A: (x ∈ B ∩ C)',sources:[]});
 await fill(local,{rule:'open-forall',variable:'x',style:'member'});
 await fill(local,{kind:'restate-goal',rule:'intersection',formula:'(x ∈ B) ∧ (x ∈ C)',sources:[]});
 await fill(local,step('subset-use','x ∈ B','G1','S1'));
 await fill(local,step('subset-use','x ∈ C','G2','S1'));
 await fill(local,step('and-in','(x ∈ B) ∧ (x ∈ C)','S2','S3'));
 await local.getByRole('button',{name:'סגירת ההנחה — האיבר היה כלשהו',exact:true}).click();
 assert.match(await local.locator('[data-row="S5"]').innerText(),/R2/);
 await local.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();
 assert.match(await local.locator('[data-row="S6"]').innerText(),/הניסוחים השקולים/);
 assert.equal(await local.locator('.set-proof-input').count(),0);
 // Editing the earlier goal invalidates dependent work; cancellation restores it.
 await local.locator('[data-row="R1"] button').click();
 assert.equal(await local.locator('[data-row="S1"]').count(),0);
 assert.equal(await local.getByLabel('סוג הפעולה',{exact:true}).inputValue(),'restate-goal');
 await local.getByRole('button',{name:'ביטול העריכה ושחזור ההמשך',exact:true}).click();
 assert.equal(await local.locator('[data-row="S6"]').count(),1);
 // Editing is reversible and invalidates the previous completion.
 await testBox.locator('[data-row="S2"] button').click();
 assert.equal(await testBox.locator('[data-row="S4"]').count(),0);
 assert.equal(await testBox.getByLabel('תחום ההצדקה',{exact:true}).inputValue(),'sets');
 assert.equal(await testBox.getByLabel('כלל ההצדקה',{exact:true}).inputValue(),'subset-use');
 await testBox.getByRole('button',{name:'ביטול העריכה ושחזור ההמשך',exact:true}).click();
 assert.equal(await testBox.locator('[data-row="S4"]').count(),1);
 assert.match(await testBox.locator('[data-row="S4"] .set-proof-row-id').innerText(),/R/);
 // Switching proof strategy preserves completed independent work.
 const equal=page.locator('[data-set-proof="double-difference"]');
 await equal.getByLabel('דרך ההוכחה').selectOption('equivalence');
 const eqSteps=[
  ['difference','(x ∈ A) ∧ (x ∉ A ∖ B)'],['difference','(x ∈ A) ∧ ¬((x ∈ A) ∧ (x ∉ B))'],
  ['eq:demorgan','(x ∈ A) ∧ ((x ∉ A) ∨ (x ∈ B))'],['eq:distribute','((x ∈ A) ∧ (x ∉ A)) ∨ ((x ∈ A) ∧ (x ∈ B))'],
  ['eq:contradiction','F ∨ ((x ∈ A) ∧ (x ∈ B))'],['eq:identity','(x ∈ A) ∧ (x ∈ B)'],['intersection','x ∈ A ∩ B']
 ];
 for(const [i,[rule,formula]]of eqSteps.entries())await fill(equal,{rule,formula,sources:['S'+(i+1)]});
 await equal.getByRole('button',{name:'סיימתי את ההוכחה — בדקו',exact:true}).click();assert.match(await equal.locator('.set-proof-final').innerText(),/מש״ל/);
 await equal.getByLabel('דרך ההוכחה').selectOption('inclusions');assert.equal(await equal.locator('.set-proof-input').count(),0);
 const inclusion=page.locator('[data-sets="inclusion"]');
 assert.equal(await inclusion.locator('.sets-binary').count(),4);
 assert.equal(await inclusion.locator('select').count(),1);
 await inclusion.locator('.sets-binary').first().getByRole('button',{name:'לא',exact:true}).click();
 await inclusion.getByRole('button',{name:'בדיקת התשובות',exact:true}).click();
 assert.match(await inclusion.locator('.sets-item').first().innerText(),/כדאי לבדוק שוב/);
 await inclusion.locator('.sets-binary').first().getByRole('button',{name:'כן',exact:true}).click();
 await inclusion.getByRole('button',{name:'בדיקת התשובות',exact:true}).click();
 assert.equal(await inclusion.locator('.sets-item').first().locator('.bk-good').count(),1);
 await inclusion.getByRole('button',{name:'איפוס',exact:true}).click();
 assert.equal(await inclusion.locator('[aria-pressed="true"]').count(),0);
 const membership=page.locator('[data-sets="member-or-subset"]');
 assert.match(await membership.locator('.sets-item').first().innerText(),/\u20665 _ A\u2069\./);
 assert.equal(await membership.locator('select').first().evaluate(n=>getComputedStyle(n).direction),'ltr');
 await membership.screenshot({path:'/tmp/chapter2-relations-direction.png'});
 // The counting activities require contributions from each intersection.
 for(const size of [2,3]){
  const lab=page.locator(`[data-set-lab="count-contributions-${size===2?'two':'three'}"]`);
  await lab.getByRole('button',{name:'בדיקת הספירה',exact:true}).click();
  assert.equal(await lab.locator('.bk-bad').count(),1,'blank counts are not zero answers');
  const cases=size===2?[[true,false],[true,true],[false,false]]:[[true,false,false],[true,true,false],[true,true,true],[false,false,false]];
  for(const [i,membership]of cases.entries()){
   await lab.getByLabel('מיקום האיבר',{exact:true}).selectOption(String(i));
   const terms=elementContributions(membership);
   for(const t of terms)await lab.getByLabel('ספירת האיבר ב־'+t.name,{exact:true}).fill(String(t.count));
   await lab.getByLabel('מספר הספירות לאחר החיבור והחיסור',{exact:true}).fill(membership.some(Boolean)?'1':'0');
   if(size===3&&i===2){
    await lab.getByLabel('ספירת האיבר ב־A ∩ B',{exact:true}).fill('0');
    await lab.getByRole('button',{name:'בדיקת הספירה',exact:true}).click();
    assert.equal(await lab.getByLabel('ספירת האיבר ב־A ∩ B',{exact:true}).getAttribute('aria-invalid'),'true');
    assert.equal(await lab.locator('.set-counting-conclusion').innerText(),'');
    await lab.getByLabel('ספירת האיבר ב־A ∩ B',{exact:true}).fill('1');
   }
   await lab.getByRole('button',{name:'בדיקת הספירה',exact:true}).click();
   assert.equal(await lab.locator('.bk-good').count(),1);
  }
  assert.match(await lab.locator('.set-counting-conclusion').innerText(),/כל איבר באיחוד נספר בדיוק פעם אחת/);
 }
 // Constructive activities require evidence, not merely a verdict.
 const grid=page.locator('[data-set-lab="quantifier-grid"]');
 for(let i=0;i<3;i++)await grid.locator('tbody tr').nth(i).locator('button').nth(i).click();
 await grid.getByRole('button',{name:'בדיקת הלוח',exact:true}).click();assert.equal(await grid.locator('.bk-good').count(),1);
 const counter=page.locator('[data-set-lab="inclusion-error"]');
 for(const [name,value]of Object.entries({A:'{4}',B:'{9}',C:'{4,9}'}))await counter.getByLabel('קבוצה '+name,{exact:true}).fill(value);
 await counter.getByLabel('איבר שמפריך את הטענה',{exact:true}).fill('4');await counter.getByRole('button',{name:'בדיקת הדוגמה',exact:true}).click();assert.equal(await counter.locator('.bk-good').count(),1);
 const mail=page.locator('[data-set-lab="mailing"]');
 for(const [i,f]of ['A ∩ B','A ∪ B','A ∖ B'].entries()){
  await mail.getByLabel('ביטוי של קבוצת הנמענים',{exact:true}).fill(f);await mail.getByRole('button',{name:'בדיקת הרשימה',exact:true}).click();assert.equal(await mail.locator('.bk-good').count(),1);
  if(i<2)await mail.getByRole('button',{name:'למשימה הבאה',exact:true}).click();
 }
 await chain.screenshot({path:'/tmp/chapter2-assumption-block-desktop.png'});
 await testBox.screenshot({path:'/tmp/chapter2-proof-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await testBox.screenshot({path:'/tmp/chapter2-proof-mobile.png'});
 await chain.screenshot({path:'/tmp/chapter2-assumption-block-mobile.png'});
 const counting=page.locator('[data-set-lab="count-contributions-three"]');
 await counting.getByLabel('מיקום האיבר',{exact:true}).selectOption('2');
 await counting.getByRole('button',{name:'בדיקת הספירה',exact:true}).click();
 await counting.screenshot({path:'/tmp/chapter2-counting-mobile.png'});
 assert.ok(await counting.evaluate(n=>n.scrollWidth<=n.clientWidth+2),'mobile counting table overflows');
 await chain.getByRole('button',{name:'איפוס החלק הזה',exact:true}).click();
 await chain.getByRole('button',{name:'ניסוח שקול של המטרה',exact:true}).click();
 await chain.screenshot({path:'/tmp/chapter2-arbitrary-opening-mobile.png'});
 assert.ok(await chain.evaluate(n=>n.scrollWidth<=n.clientWidth+2),'mobile arbitrary-element controls overflow');
 assert.ok(await testBox.evaluate(n=>n.scrollWidth<=n.clientWidth+2),'mobile proof overflows');
 assert.deepEqual(errors,[]);console.log(`All ${Object.keys(SET_PROOFS).length} proof activities solved; editing, alternative proof routes, R conclusions, games and mobile layout checked.`);
}finally{await browser.close();}
