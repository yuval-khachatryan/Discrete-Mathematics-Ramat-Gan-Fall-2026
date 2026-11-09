import {chromium} from 'playwright-core';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,async r=>{if(r.request().url().includes('mathjax'))await r.fulfill({path:fileURLToPath(new URL('../../Alternative Versions/source/node_modules/mathjax/es5/tex-svg.js',import.meta.url)),contentType:'application/javascript'});else await r.abort();});
 await page.goto(new URL('../_book/02-sets.html',import.meta.url).href);
 await page.waitForFunction(()=>window.MathJax?.startup?.promise);await page.evaluate(()=>window.MathJax.startup.promise);
 await page.locator('.answer-panel').evaluateAll(ns=>ns.forEach(n=>n.open=true));
 const quizzes=page.locator('.example-choice');assert.equal(await quizzes.count(),36);
 for(let i=0;i<await quizzes.count();i++){
  const quiz=quizzes.nth(i),why=quiz.locator('.tf-why');assert.equal(await why.isVisible(),false,`unanswered part ${i}`);
  const correct=await quiz.getAttribute('data-correct'),wrong=quiz.locator(`.tf-opt:not([data-val="${correct}"])`).first();
  await wrong.focus();await page.keyboard.press('Enter');
  assert.ok(await why.isVisible());assert.ok(await wrong.evaluate(n=>n.classList.contains('incorrect')));
  assert.match(await quiz.locator('.tf-feedback').innerText(),/לא מדויק/);
  const right=quiz.locator(`.tf-opt[data-val="${correct}"]`);await right.click();
  assert.ok(await right.evaluate(n=>n.classList.contains('correct')));assert.match(await quiz.locator('.tf-feedback').innerText(),/נכון/);
 }
 const coins=page.locator('.coin-sets');assert.equal(await coins.locator('img').count(),5);assert.ok(await coins.locator('img').evaluateAll(ns=>ns.every(n=>n.complete&&n.naturalWidth>0)));
 const example=page.locator('.thmbox-example').filter({hasText:'בודקים את הרשימה, לא מנחשים'});
 assert.equal(await example.count(),1);assert.equal(await example.locator('.example-choice').count(),2);
 assert.ok(!(await example.innerText()).includes('2,5,8'));
 for(const width of [1200,390]){
  await page.setViewportSize({width,height:1000});await example.screenshot({path:`/tmp/sets-example-${width}.png`});await coins.locator('..').screenshot({path:`/tmp/coin-example-${width}.png`});await page.locator('#box-exm-set-boxes').screenshot({path:`/tmp/set-boxes-${width}.png`});
  const overflow=await quizzes.evaluateAll(ns=>ns.filter(n=>n.getBoundingClientRect().left< -1||n.getBoundingClientRect().right>innerWidth+1).length);assert.equal(overflow,0);
 }
 assert.equal(await page.locator('mjx-merror,[data-mml-node="merror"]').count(),0);
 assert.deepEqual(errors,[]);console.log('Passed: all 36 example parts hide explanations until answered, independent feedback, retry, keyboard, maths and mobile layout.');
}finally{await browser.close();}
