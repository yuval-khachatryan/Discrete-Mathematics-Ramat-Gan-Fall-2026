import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1280,height:900}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.argv[2]||'http://127.0.0.1:8798'}/01-logic.html`,{waitUntil:'networkidle'});
 const g=page.locator('.open-statement-game'), inputs=g.locator('input');
 const answer=v=>g.locator(`[data-answer="${v}"]`).click();
 const phase=async v=>assert.equal(await g.getAttribute('data-phase'),v);
 const fill=async(x,y)=>{await inputs.nth(0).fill(x);if(y!==undefined)await inputs.nth(1).fill(y);};
 await phase('classify');assert.equal(await inputs.first().isDisabled(),true);
 assert.equal(await g.locator('.os-card').nth(1).isVisible(),false);
 await answer(true);await phase('classify');assert.equal(await inputs.first().isDisabled(),true);
 await answer(null);await phase('choose');assert.equal(await inputs.first().isDisabled(),false);
 await fill('1.5');await answer(false);await phase('choose');assert.equal(await inputs.first().getAttribute('aria-invalid'),'true');
 await fill('999');await answer(false);await phase('choose');
 await answer(true);await phase('opposite');assert.match(await g.locator('.os-first').innerText(),/999 > 5/);
 await fill('7');await answer(true);await phase('opposite');assert.match(await g.locator('.bk-msg').innerText(),/סיווגתם נכון/);
 await fill('0');await answer(false);await phase('done');
 await g.getByRole('button',{name:'לסיבוב הבא',exact:true}).click();
 await phase('classify');assert.equal(await inputs.count(),2);
 await answer(null);await fill('−3');await answer(null);await phase('choose');
 assert.match(await g.locator('.bk-msg').innerText(),/חסר ערך ל־y/);
 await fill('-3','0');await answer(false);await phase('opposite');
 await fill('9007199254740993','-9007199254740983');await answer(true);await phase('done');
 await g.getByRole('button',{name:'לסיבוב הבא',exact:true}).click();await phase('classify');
 assert.equal(await inputs.count(),1);await answer(null);await fill('5');await answer(true);await phase('opposite');
 await g.getByRole('button',{name:'התחילו את הסיבוב מחדש',exact:true}).click();await phase('classify');
 assert.equal(await inputs.first().inputValue(),'');assert.equal(await g.locator('.os-first').isVisible(),false);
 await answer(null);await fill('2');await answer(false);await phase('opposite');
 await g.getByRole('button',{name:'המשיכו בלי ההצבה הנוספת',exact:true}).click();await phase('done');
 assert.match(await g.locator('.bk-msg').innerText(),/דילגתם/);
 assert.doesNotMatch(await g.locator('.os-status').innerText(),/חסר ערך/);
 await g.getByRole('button',{name:'שחקו שוב',exact:true}).click();await phase('classify');
 assert.match(await g.locator('.os-title').innerText(),/סיבוב 1 מתוך 3/);
 // Read actual box contents rather than relying on a particular heading class.
 assert.match(await page.locator('#box-game-substitution').innerText(),/משחק 1\.3\.12/);
 assert.match(await page.locator('#box-exm-liar').innerText(),/דוגמה 1\.3\.14/);
 assert.ok(await page.locator('.thmbox-terminology').count()>5);
 assert.ok(await page.locator('.thmbox-method').count()>0);
 assert.match(await page.locator('.thmbox-warning').filter({hasText:'ערך שלא בחרנו'}).innerText(),/טעות נפוצה/);
 assert.equal(await page.locator('#box-exm-liar details[open]').count(),0);
 for(const width of[390,320]) {
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`overflow ${width}`);
 }
 assert.equal(await page.locator('mjx-merror').count(),0);assert.deepEqual(errors,[]);
 console.log('Passed: gated classification, arbitrary integer entry, invalid input, both challenge directions, partial substitution, repeated variable, reset/skip/replay, numbering, box types, mobile and math.');
}finally{await browser.close();}
