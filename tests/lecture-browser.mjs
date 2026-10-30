// Questions and givens must remain visible, with answers disclosed on demand.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:8798';
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/01-logic.html`,{waitUntil:'networkidle'});
 await page.evaluate(async()=>{if(window.MathJax?.startup?.promise)await window.MathJax.startup.promise;});
 assert.doesNotMatch(await page.locator('main').innerText(),/לומדים במנות קטנות|בישיבה אחת|ההסברים הבסיסיים נשארים גלויים/);
 assert.match(await page.locator('#sec-consistency').innerText(),/טענה שגויה — אבל היא עדיין טענה/);
 assert.equal(await page.locator('.lecture-next, .lecture-pending').count(),0);
 const examples=page.locator('.thmbox-example');
 assert.equal(await examples.count(),20);
 for(const ex of await examples.all()) {
  assert.ok(await ex.locator('details.lecture-answer').count(),await ex.innerText());
  assert.equal(await ex.locator('details.lecture-answer[open]').count(),0);
 }
 const classify=page.locator('#box-exm-propositions');
 const answers=classify.locator('details.lecture-answer');
 assert.equal(await answers.count(),5);
 const questions=await classify.innerText();
 for(const text of ['2+2=4','3>5','בחדר 101','מה השעה','סגרו את הדלת'])assert.ok(questions.includes(text),text);
 assert.doesNotMatch(questions,/זהו פסוק כי הוא מבטא|כדי להיות פסוק, המשפט אינו חייב להיות נכון/);
 assert.equal(await classify.locator('.lecture-controls').count(),0);
 await answers.first().locator('summary').click();
 assert.equal(await classify.locator('details[open]').count(),1);
 assert.match(await answers.first().innerText(),/זהו פסוק כי הוא מבטא טענה שאפשר לבדוק/);
 assert.doesNotMatch(await answers.nth(1).innerText(),/כדי להיות פסוק, המשפט אינו חייב להיות נכון/);
 await answers.nth(1).locator('summary').click();
 assert.match(await answers.nth(1).innerText(),/כדי להיות פסוק, המשפט אינו חייב להיות נכון/);
 await answers.first().locator('summary').click();
 assert.equal(await answers.first().getAttribute('open'),null);
 // Keyboard can open the explanation, independently of the other questions.
 await answers.first().locator('summary').focus();await page.keyboard.press('Enter');
 assert.notEqual(await answers.first().getAttribute('open'),null);
 await classify.screenshot({path:'/tmp/presentation-classification-desktop.png'});
 // The counterexample illustration is part of the hidden explanation.
 const cat=page.locator('#box-exm-mammal-cat');
 assert.match(await cat.innerText(),/כל החתולים הם יונקים/);
 assert.equal(await cat.locator('figure').isVisible(),false);
 await cat.locator('summary').click();
 assert.equal(await cat.locator('figure').isVisible(),true);
 // Definitions expose the complete rule immediately for every connective.
 for(const[id,rows]of [['negation',2],['and',4],['or',4],['xor',4],['implication',4],['iff',4]]) {
  const box=page.locator(`#box-def-${id}`);
  assert.equal(await box.locator('tbody tr:visible').count(),rows);
  assert.equal(await box.locator('.lecture-cell-trigger, .lecture-table-controls').count(),0);
 }
 // Worked examples retain keyboard-operated, gradual disclosure.
 const table=page.locator('#box-exm-table-locked .lecture-table');
 assert.equal(await table.getAttribute('data-lecture-table-ready'),'true');
 assert.equal(await table.locator('.lecture-cell-answer:visible').count(),0);
 const cell=table.locator('.lecture-cell-trigger').first();
 await cell.focus();await page.keyboard.press('Enter');
 assert.equal(await table.locator('.lecture-cell-answer:visible').count(),1);
 assert.equal(await table.locator('.lecture-cell-answer:visible').evaluate(n=>n===document.activeElement),true);
 await table.getByRole('button',{name:'הצגת כל התוצאות',exact:true}).click();
 assert.equal(await table.locator('.lecture-cell-answer[hidden]').count(),0);
 await table.getByRole('button',{name:'הסתרת התוצאות',exact:true}).click();
 assert.equal(await table.locator('.lecture-cell-answer:visible').count(),0);
 const proof=page.locator('#box-exm-negate-implication');
 assert.match(await proof.innerText(),/נפשט/);
 assert.equal(await proof.locator('details.lecture-answer').count(),5);
 for(let i=0;i<3;i++)await proof.locator('summary').nth(i).click();
 assert.equal(await proof.locator('details[open]').count(),3);
 // Reveal controls must not bypass the existing interactive question.
 const candy=page.locator('#box-exm-candy-promise');
 assert.equal(await candy.locator('.tf-quiz').isVisible(),true);
 assert.equal(await candy.locator('.tf-why').isVisible(),false);
 assert.equal(await candy.locator('details[open]').count(),0);
 await candy.locator('.tf-opt').last().click();
 assert.equal(await candy.locator('.tf-why').isVisible(),true);
 const sunshine=page.locator('#box-exm-exam-sunshine');
 assert.equal(await sunshine.locator('details.lecture-answer').count(),2);
 assert.equal(await sunshine.locator('details[open]').count(),0);
 assert.match(await sunshine.innerText(),/גם אם תיכשל בבחינה/);
 await sunshine.locator('summary').first().click();
 assert.equal(await sunshine.locator('tbody tr:visible').count(),2);
 await sunshine.locator('summary').last().click();
 assert.match(await sunshine.innerText(),/הבחינה אינה גורמת לזריחה/);

 for(const answer of await page.locator('details.lecture-answer').all())if(!await answer.getAttribute('open'))await answer.evaluate(n=>{n.open=true;});
 for(const t of await page.locator('.lecture-table').all())await t.getByRole('button',{name:'הצגת כל התוצאות',exact:true}).click();
 assert.equal(await page.locator('mjx-merror').count(),0);
 assert.equal(await page.locator('[id^="practice-q-"]').count(),40);
 assert.equal(await page.locator('#sec-quantifiers').count(),0);
 const broken=await page.evaluate(()=>[...document.querySelectorAll('main a[href^="#"]')].map(a=>a.hash.slice(1)).filter(id=>id&&!document.getElementById(decodeURIComponent(id))));
 assert.deepEqual(broken,[]);
 for(const width of[1280,390,320]) {
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`overflow ${width}`);
 }
 await answers.evaluateAll(nodes=>nodes.forEach(n=>{n.open=false;}));
 await page.setViewportSize({width:390,height:1000});
 await classify.screenshot({path:'/tmp/presentation-classification-390.png'});
 const worked=page.locator('#box-exm-table-locked .lecture-table');
 await worked.getByRole('button',{name:'הסתרת התוצאות',exact:true}).click();
 await page.emulateMedia({media:'print'});
 assert.equal(await worked.locator('.lecture-cell-answer:visible').count(),24);
 assert.equal(await worked.locator('.lecture-table-controls').isVisible(),false);
 await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
 assert.equal(await classify.locator('details[open]').count(),5);
 await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
 assert.equal(await classify.locator('details[open]').count(),0);
 const plain=await browser.newContext({javaScriptEnabled:false});
 const offline=await plain.newPage();await offline.goto(`${base}/01-logic.html`,{waitUntil:'domcontentloaded'});
 const plainAnswer=offline.locator('#box-exm-propositions details').first();
 assert.equal(await plainAnswer.getAttribute('open'),null);
 await plainAnswer.locator('summary').click();assert.match(await plainAnswer.innerText(),/זהו פסוק כי הוא מבטא טענה שאפשר לבדוק/);
 assert.equal(await offline.locator('#box-exm-table-locked tbody tr:visible').count(),8);
 await plain.close();
 await page.emulateMedia({media:'screen'});
 await page.goto(`${base}/02-sets.html`,{waitUntil:'networkidle'});
 await page.evaluate(async()=>{if(window.MathJax?.startup?.promise)await window.MathJax.startup.promise;});
 assert.equal(await page.locator('.thmbox-example').count(),3);
 assert.equal(await page.locator('iframe.widget-frame').count(),3);
 assert.match(await page.locator('#box-def-quantifiers').innerText(),/הגדרה 2\.7\./);
 assert.ok(await page.locator('#sec-sets-membership').count());
 for(const ex of await page.locator('.thmbox-example').all()) {
  assert.ok(await ex.locator('details.lecture-answer').count());
  assert.equal(await ex.locator('details.lecture-answer[open]').count(),0);
 }
 for(const frame of await page.locator('iframe.widget-frame').all()) {
  await frame.scrollIntoViewIfNeeded();
  const content=await (await frame.elementHandle()).contentFrame();
  await content.waitForFunction(()=>document.body.innerText.includes('רמז'));
 }
 for(const width of [1280,390,320]) {
  await page.setViewportSize({width,height:1000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`sets overflow ${width}`);
 }
 assert.equal(await page.locator('mjx-merror').count(),0);
 assert.equal(await page.locator('#practice-quantifiers [id^="practice-q-"]').count(),8);
 await page.goto(`${base}/01-logic.html`,{waitUntil:'networkidle'});
 assert.equal(await page.locator('[id^="practice-q-"]').count(),40);
 assert.match(await page.locator('#practice-q-classify').innerText(),/שאלה 1\.12\.1/);
 assert.equal(await page.locator('#sec-self-practice').count(),1);
 assert.deepEqual(errors,[]);
 console.log('Passed: 20 question-first examples; independent answers, keyboard, visible table givens, cell reveals/reset, proofs, quiz feedback, maths, links, mobile, printing, and no-JS disclosures.');
} finally {await browser.close();}
