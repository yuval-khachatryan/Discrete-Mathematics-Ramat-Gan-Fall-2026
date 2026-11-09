import assert from 'node:assert/strict';

export async function checkFieldKeyboards(page){
  async function expose(input){
    await input.evaluate(n=>{for(let p=n.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
  }
  async function keyboardFor(input){
    await expose(input);await input.focus();
    return input.locator('xpath=ancestor::label[1]/following-sibling::*[1]');
  }
  async function below(input,keys){
    assert.ok(await keys.evaluate(n=>n.classList.contains('field-symbol-keyboard')));
    assert.equal(await keys.isVisible(),true);
    const a=await input.boundingBox(),b=await keys.boundingBox();
    assert.ok(b.y>=a.y+a.height-1,'keyboard is below its own input');
  }
  const setProof=page.locator('[data-set-proof="inclusion-chain"]');
  await setProof.locator('.set-proof-workspace > summary').click();
  await setProof.getByLabel('סוג הפעולה',{exact:true}).selectOption('let');
  const assumption=setProof.getByLabel('יהי',{exact:true}),goal=setProof.getByLabel('הטענה בצעד החדש',{exact:true});
  assert.equal(await setProof.locator('.field-symbol-keyboard:visible').count(),0);
  await assumption.fill('x');const assumptionKeys=await keyboardFor(assumption);await below(assumption,assumptionKeys);
  await assumptionKeys.getByRole('button',{name:'הוספת ∈',exact:true}).click();assert.equal(await assumption.inputValue(),'x∈');
  await assumption.fill('x ∈ A');await goal.fill('x');
  const goalKeys=await keyboardFor(goal);await below(goal,goalKeys);
  assert.equal(await assumptionKeys.isVisible(),false);
  await goalKeys.getByRole('button',{name:'הוספת ∈',exact:true}).click();
  assert.equal(await goal.inputValue(),'x∈');assert.equal(await assumption.inputValue(),'x ∈ A');
  await goal.fill('x ∈ C');
  await setProof.getByRole('button',{name:'בדיקת הצעד',exact:true}).click();
  assert.equal(await setProof.locator('[data-row="S1"]').count(),1,'keyboard blur does not swallow submit');
  const quantifier=page.locator('[data-quantifier-negation]').first().locator('input');
  const qkeys=await keyboardFor(quantifier);await below(quantifier,qkeys);
  await qkeys.getByRole('button',{name:'הוספת ∃',exact:true}).click();assert.equal(await quantifier.inputValue(),'∃');
  await page.setViewportSize({width:390,height:844});await quantifier.focus();await below(quantifier,qkeys);
  assert.ok(await qkeys.evaluate(n=>n.scrollWidth<=n.clientWidth+2));
  await page.locator('[data-quantifier-negation]').first().screenshot({path:'/tmp/field-keyboard-mobile.png'});
  await page.setViewportSize({width:1200,height:900});
  await page.goto(new URL('../_book/01-logic.html',import.meta.url).href);
  await page.waitForFunction(()=>window.MathJax?.startup?.promise);await page.evaluate(()=>window.MathJax.startup.promise);
  const argument=page.locator('[data-argument="library"]');
  const first=argument.locator('.argument-translation input').nth(0),second=argument.locator('.argument-translation input').nth(1);
  const firstKeys=await keyboardFor(first);await below(first,firstKeys);
  const secondKeys=await keyboardFor(second);await below(second,secondKeys);
  assert.equal(await firstKeys.isVisible(),false);
  await secondKeys.locator('button').filter({hasText:'¬'}).first().click();
  assert.equal(await second.inputValue(),'¬');assert.equal(await first.inputValue(),'');
  const proof=page.locator('#box-q-name-the-law .proof-editor');
  const start=proof.locator('.proof-start-input');const startKeys=await keyboardFor(start);await below(start,startKeys);
  const formula=page.locator('.fq input').first();await expose(formula);await formula.focus();
  const fkeys=formula.locator('xpath=following-sibling::*[1]');await below(formula,fkeys);
  assert.equal(await page.locator('mjx-merror,[data-mml-node="merror"]').count(),0);
}
