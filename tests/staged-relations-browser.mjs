import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {SET_TASKS} from '../games/shared/sets-data.js';

const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(/^https?:/,r=>r.request().url().includes('mathjax')?r.fulfill({path:fileURLToPath(new URL('../../Alternative Versions/source/node_modules/mathjax/es5/tex-svg.js',import.meta.url)),contentType:'application/javascript'}):r.abort());
  await page.goto(new URL('../_book/03-relations.html',import.meta.url).href);
  await page.waitForFunction(()=>document.querySelectorAll('[data-staged-ready="true"]').length===3);
  for(const [firstId,secondId]of [['relation-successor-roster','relation-successor-membership'],['relation-union-roster','relation-union-membership']]){
    const first=page.locator(`[data-sets="${firstId}"]`),question=page.locator('.staged-exercise').filter({has:first}),second=question.locator('.exercise-second');
    assert.equal(await second.isVisible(),false);
    await first.locator('.answer-panel > summary').click();
    await first.locator('.answer-reveal > summary').click();assert.equal(await second.isVisible(),false,'a reveal does not complete the construction');
    const input=first.locator('input'),answer=SET_TASKS[firstId].items[0].answer;
    await input.fill('{}');await input.press('Enter');assert.equal(await second.isVisible(),false);
    await input.fill(answer);await input.press('Enter');assert.equal(await second.isVisible(),true);
    for(const [i,q]of SET_TASKS[secondId].items.entries()){
      const row=second.locator('.sets-item').nth(i);await row.locator('.answer-panel > summary').click();
      await row.locator('.sets-binary button').nth(q.answer).click();await row.getByRole('button',{name:'בדיקה',exact:true}).click();
      assert.equal(await row.locator('.bk-good').count(),1);
    }
    await input.fill(answer+' ');assert.equal(await second.isVisible(),false,'editing invalidates the dependent answers');
    await input.press('Enter');assert.equal(await second.isVisible(),true);
    assert.equal(await second.locator('[aria-pressed="true"]').count(),0);
    assert.equal(await second.locator('.bk-good').count(),0);
    await first.getByRole('button',{name:'איפוס',exact:true}).click();assert.equal(await second.isVisible(),false);
  }
  const registration=page.locator('.staged-exercise').filter({has:page.locator('.registration-input')}),first=registration.locator('.registration-input'),second=registration.locator('.exercise-second');
  await first.locator('.answer-panel > summary').click();
  const inputs=first.locator('input');
  for(const i of [0,1,2,6,7,8])await inputs.nth(i).check();
  await first.getByRole('button',{name:'בדיקת שני היחסים'}).click();assert.equal(await second.isVisible(),false,'duplicate relations do not complete the first stage');
  await inputs.nth(8).uncheck();await inputs.nth(9).check();
  await first.getByRole('button',{name:'בדיקת שני היחסים'}).click();assert.equal(await second.isVisible(),true);
  await second.getByRole('button',{name:'נועם נרשם לצילום',exact:true}).click();
  await second.locator('fieldset').nth(0).getByRole('button',{name:'לא',exact:true}).click();
  await second.locator('fieldset').nth(1).getByRole('button',{name:'כן',exact:true}).click();
  await second.getByRole('button',{name:'בדיקת השייכויות'}).click();assert.equal(await second.locator('.bk-good').count(),1);
  await second.getByRole('button',{name:'נועם נרשם לשחמט',exact:true}).click();assert.equal(await second.locator('fieldset [aria-pressed="true"]').count(),0);
  await inputs.nth(0).uncheck();assert.equal(await second.isVisible(),false);
  await inputs.nth(0).check();await first.getByRole('button',{name:'בדיקת שני היחסים'}).click();
  assert.equal(await second.locator('[aria-pressed="true"]').count(),0);
  assert.equal(await page.locator('[data-set-proof="relation-union"].set-proof-editor').count(),1);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await registration.evaluate(n=>n.scrollWidth>n.clientWidth+2),false);
  assert.deepEqual(errors,[]);
  console.log('Staged entry, membership, reset/edit invalidation, registration constraints, proof mount and mobile layout passed.');
}finally{await browser.close();}
