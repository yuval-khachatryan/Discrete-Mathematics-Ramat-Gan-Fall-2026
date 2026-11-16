import assert from 'node:assert/strict';

export async function checkRobotActivities(page){
  const selectors=['[data-set-lab="quantifier-grid"]','[data-set-lab="mailing"]','[data-set-lab="union-equal"]','[data-sets="practice-false-law"]'];
  assert.equal(await page.locator('.robot-scene').count(),selectors.length);
  for(const selector of selectors){
    const box=page.locator(selector),scene=box.locator('.robot-scene');
    assert.equal(await scene.locator('.robot-portrait svg').count(),1);
    assert.equal(await scene.isVisible(),true);
    assert.ok((await scene.locator('.robot-bubble p').first().innerText()).length>10);
    for(const width of [1200,390]){
      await page.setViewportSize({width,height:900});
      const portrait=await scene.locator('.robot-portrait').boundingBox(),bubble=await scene.locator('.robot-bubble').boundingBox();
      assert.ok(portrait.width>=40&&portrait.height>=40);
      assert.ok(portrait.x>bubble.x,'robot appears on the right of its speech');
      assert.ok(await scene.evaluate(n=>n.scrollWidth<=n.clientWidth+2),'speech fits mobile width');
      await scene.screenshot({path:`/tmp/robot-activity-${selectors.indexOf(selector)}-${width}.png`});
    }
  }
  const mailing=page.locator(selectors[1]);
  await mailing.locator('input').fill('A ∩ B');
  await mailing.getByRole('button',{name:'בדיקת הרשימה',exact:true}).click();
  await mailing.getByRole('button',{name:'למשימה הבאה',exact:true}).click();
  assert.match(await mailing.locator('.robot-bubble').innerText(),/לפחות לאחת/);
  const union=page.locator(selectors[2]);
  await union.getByLabel('קבוצה A',{exact:true}).fill('{1}');
  await union.getByLabel('קבוצה B',{exact:true}).fill('{2}');
  await union.getByLabel('איבר שמפריך את הטענה',{exact:true}).fill('1');
  await union.getByRole('button',{name:'בדיקת הדוגמה',exact:true}).click();
  assert.equal(await union.locator('.bk-good').count(),1);
  const question=page.locator(selectors[3]);
  assert.equal(await question.locator('.answer-panel[open]').count(),0,'robot remains visible while answers stay folded');
  const classic=page.locator('#sec-neg-quantifiers > .says.robot');
  assert.match(await classic.evaluate(n=>getComputedStyle(n,'::before').backgroundImage),/robot\.svg/);
  const witness=page.locator('iframe[src*="witness"][src*="level=order"]');
  await witness.scrollIntoViewIfNeeded();
  assert.equal(await witness.contentFrame().locator('.w-robot svg').isVisible(),true);
}
