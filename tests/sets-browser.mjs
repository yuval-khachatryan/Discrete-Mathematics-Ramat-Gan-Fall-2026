import {chromium} from 'playwright-core';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {SET_TASKS} from '../games/shared/sets-data.js';
import {subsets,parseObject,key} from '../games/shared/sets.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,async r=>{
  if(r.request().url().includes('mathjax'))await r.fulfill({path:fileURLToPath(new URL('../../Alternative Versions/source/node_modules/mathjax/es5/tex-svg.js',import.meta.url)),contentType:'application/javascript'});
  else await r.abort();
 });
 await page.goto(pathToFileURL(fileURLToPath(new URL('../_book/02-sets.html',import.meta.url))).href);
 await page.waitForFunction(()=>window.MathJax?.startup?.promise);
 await page.evaluate(()=>window.MathJax.startup.promise);
 if(process.argv.includes('--field-keyboards')){
  const {checkFieldKeyboards}=await import('./field-keyboard-checks.mjs');
  await checkFieldKeyboards(page);assert.deepEqual(errors,[]);
  console.log('Per-field keyboards: positioning, focus switching, insertion, independent fields, submit and mobile layout passed.');
  await browser.close();process.exit(0);
 }
 if(process.argv.includes('--answer-widgets')){
  const {checkAnswerWidgets}=await import('./answer-widget-checks.mjs');
  await checkAnswerWidgets(page);assert.deepEqual(errors,[]);
  console.log('Folded answer panels, independent checking/reveals, retries, written answers, both chapters and mobile layout passed.');
  await browser.close();process.exit(0);
 }
 await page.locator('.answer-panel').evaluateAll(ns=>ns.forEach(n=>n.open=true));
 assert.equal(await page.locator('.sets-ready').count(),Object.keys(SET_TASKS).length);
 assert.equal(await page.locator('mjx-merror,[data-mml-node="merror"]').count(),0);
 assert.equal(await page.locator('main').innerText().then(t=>t.includes('TODO')),false);
 const helperImages=page.locator('.helper-box-art');
 assert.ok(await helperImages.count()>0);
 assert.ok(await helperImages.evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0)),'helper images load');
 const warning=page.locator('#sec-nested-sets > .thmbox-warning').first();
 assert.match(await warning.innerText(),/טעות נפוצה.*בלבול בין קבוצה לאיבריה/);
 assert.equal(await warning.locator('p > strong').first().evaluate(n=>getComputedStyle(n,'::before').content),'none');
 await warning.screenshot({path:'/tmp/set-element-warning-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await warning.screenshot({path:'/tmp/set-element-warning-mobile.png'});
 assert.ok(await warning.evaluate(n=>n.scrollWidth<=n.clientWidth+2),'helper box fits mobile');
 await page.setViewportSize({width:1200,height:900});
 const earlyQuizzes=page.locator('#sec-quantifier-basics .tf-quiz');
 assert.equal(await earlyQuizzes.count(),14);
 for(const quiz of await earlyQuizzes.all()){
  assert.equal(await quiz.locator('.tf-why').isVisible(),false);
  const answer=await quiz.getAttribute('data-correct');
  await quiz.locator(`.tf-opt[data-val="${answer}"]`).click();
  assert.equal(await quiz.locator('.tf-opt.correct').count(),1);
  assert.equal(await quiz.locator('.tf-why').isVisible(),true);
 }
 assert.match(await page.locator('#sec-bar > h3').innerText(),/שלושה מתמטיקאים/);
 assert.equal(await page.locator('#sec-quantifier-basics .thmbox-notation').count(),1);
 const classify=page.locator('#sec-quantifier-basics .thmbox-example[title="כמת על משתנה אחד, ומשתנה נוסף"] .tf-quiz').first();
 assert.equal(await classify.locator('.tf-opt').count(),4);
 for(const [title,answers]of [['בודקים שתי טענות על אותה קבוצה',['0','0']],['קוראים את הכתיב החלופי',['1','1']]])assert.deepEqual(await page.locator(`#sec-quantifier-basics .thmbox-example[title="${title}"] .tf-quiz`).evaluateAll(ns=>ns.map(n=>n.dataset.correct)),answers);
 for(const [kind,valid]of [['witness',['11','14']],['counter',['2']]]){
  const part=page.locator(`[data-quantifier-evidence="${kind}"]`),field=part.locator('input');
  await field.fill('100');await field.press('Enter');assert.match(await part.locator('.bk-bad').innerText(),/אינו שייך/);
  await field.fill('6');await field.press('Enter');assert.equal(await part.locator('.bk-bad').count(),1);
  for(const answer of valid){await field.fill(answer);await field.press('Enter');assert.equal(await part.locator('.bk-good').count(),1);}
  await part.getByRole('button',{name:'איפוס',exact:true}).click();assert.equal(await field.inputValue(),'');
 }
 const answerParts=page.locator('#box-q-ex-negate details').filter({has:page.locator('summary').filter({hasText:/^(רמז|תשובה) לסעיף [אב]$/})});
 assert.equal(await answerParts.count(),4);
 const answerA=page.locator('#box-q-ex-negate details').filter({has:page.getByText('תשובה לסעיף א',{exact:true})});
 const answerB=page.locator('#box-q-ex-negate details').filter({has:page.getByText('תשובה לסעיף ב',{exact:true})});
 await answerA.locator('summary').click();
 assert.equal(await answerA.getAttribute('open'),'');
 assert.equal(await answerB.getAttribute('open'),null);
 await answerA.locator('summary').click();
 await answerB.locator('summary').click();
 assert.equal(await answerA.getAttribute('open'),null);
 assert.equal(await answerB.getAttribute('open'),'');
 await answerB.locator('summary').click();
 for(const [kind,answer]of [['menu','forall a in S exists b in M (L(a,b))'],['menu-negation','exists a in S forall b in M (not L(a,b))']]){
  const part=page.locator(`[data-quantifier-writing="${kind}"]`),field=part.locator('input');
  await field.fill('forall x in S: exists y in M: L(y,x)');await field.press('Enter');assert.equal(await part.locator('.bk-bad').count(),1);
  await field.fill(answer);await field.press('Enter');assert.equal(await part.locator('.bk-good').count(),1);
 }
 const games=await browser.newPage();
 games.on('pageerror',e=>errors.push(e.message));
 await games.route(/^https?:/,r=>r.abort());
 for(const name of ['barman','circuit','detective','gate','witness']){
  await games.goto(new URL(`../_book/games/${name}/index.html?embed=1`,import.meta.url).href);
  const previous=games.locator('.g-prev'),levels=games.locator('.g-lvl');
  await previous.waitFor();assert.ok(await previous.isDisabled(),name+' first stage');
  const first=await games.locator('.g-mission-title').innerText();
  await levels.nth(1).click();assert.equal(await previous.isDisabled(),false);
  await previous.click();assert.equal(await games.locator('.g-mission-title').innerText(),first);
 }
 await games.goto(new URL('../_book/games/barman/index.html?levels=no-early,after-no,anyone,anyone-serve,design&embed=1',import.meta.url).href);
 await games.locator('.g-lvl').nth(1).click();
 assert.equal(await games.locator('.bm-say.bm-empty').count(),0,'stage B supplied conversation is visible');
 assert.equal(await games.locator('.bm-say').count(),4);
 await games.getByRole('button',{name:'פתרון',exact:true}).click();
 await games.locator('.g-next').click();assert.match(await games.locator('.g-mission-title').innerText(),/שלב 3/);
 await games.locator('.g-prev').click();assert.match(await games.locator('.g-mission-title').innerText(),/שלב 2/);
 assert.equal(await games.locator('.bm-say.bm-empty').count(),0);
 await games.getByRole('button',{name:'איפוס',exact:true}).click();assert.equal(await games.locator('.bm-say.bm-empty').count(),0);
 await games.setViewportSize({width:390,height:844});await games.screenshot({path:'/tmp/falafel-stage-b-mobile.png',fullPage:true});
 await games.goto(new URL('../_book/games/barman/index.html?level=classic&embed=1',import.meta.url).href);
 assert.equal(await games.locator('.g-prev').isVisible(),false);
 await games.locator('.bm-next').click();assert.equal(await games.locator('.bm-say.bm-empty').count(),2);
 await games.goto(new URL('../_book/games/witness/index.html?level=order&embed=1',import.meta.url).href);
 await games.locator('.w-robot svg').waitFor();
 assert.equal(await games.locator('.w-robot svg').isVisible(),true);
 await games.screenshot({path:'/tmp/quantifier-order-game.png',fullPage:true});
 await games.close();
 const negations=page.locator('[data-quantifier-negation]');
 assert.equal(await negations.count(),2);
 for(const [i,answer]of ['exists x in D (not P(x))','forall x in D (not P(x))'].entries()){
  const part=negations.nth(i),input=part.locator('input');
  await part.getByRole('button',{name:'בדיקה',exact:true}).click();
  assert.equal(await part.locator('.bk-bad').count(),1);
  await input.fill(i===0?'∀x ∈ D: ¬P(x)':'∃x ∈ D: ¬P(x)');
  await input.press('Enter');assert.match(await part.locator('.bk-bad').innerText(),/מחליפים את הכמת/);
  await input.fill(answer);await input.press('Enter');
  assert.equal(await part.locator('.bk-good').count(),1);
  assert.equal(await input.getAttribute('aria-invalid'),'false');
  assert.equal(await part.getByRole('button',{name:'הוספת ∃',exact:true}).evaluate(n=>getComputedStyle(n).direction),'ltr');
 }
 if(process.argv.includes('--quantifiers-only')){
  await page.setViewportSize({width:390,height:844});
  const question=page.locator('#box-q-negate-each-quantifier');
  await question.screenshot({path:'/tmp/quantifier-negation-mobile.png'});
  assert.ok(await question.evaluate(n=>n.scrollWidth<=n.clientWidth+2),'quantifier inputs overflow');
  assert.deepEqual(errors,[]);console.log('Quantifier examples, written evidence/formulas/negations, four classifications, varied truth values, five-game back navigation, falafel conversation, math and mobile layout passed.');
  await browser.close();process.exit(0);
 }
 for(const [id,data]of Object.entries(SET_TASKS)){
  const box=page.locator(`[data-sets="${id}"]`);
  const check=()=>box.getByRole('button',{name:'בדיקה',exact:true}).click();
  if(data.type==='cardinality'){
   for(const [i,q]of data.items.entries()){
    const form=box.locator('.sets-count-item').nth(i),count=form.locator('.sets-count-input'),roster=form.locator('.sets-roster-input');
    await form.getByRole('button',{name:'בדיקה',exact:true}).click();assert.equal(await form.locator('[aria-invalid=true]').count(),2);
    await count.fill('99');await roster.fill(q.answer);await roster.press('Enter');
    assert.equal(await count.getAttribute('aria-invalid'),'true');assert.equal(await roster.getAttribute('aria-invalid'),'false');
    await count.fill(String(new Set(parseObject(q.answer).items.map(key)).size));await roster.fill('{999}');await roster.press('Enter');
    assert.equal(await count.getAttribute('aria-invalid'),'false');assert.equal(await roster.getAttribute('aria-invalid'),'true');
    await roster.fill(q.answer);await roster.press('Enter');assert.match(await form.locator('.bk-msg').last().innerText(),/גם מספר האיברים/);
    await form.getByRole('button',{name:'איפוס',exact:true}).click();assert.equal(await count.inputValue(),'');assert.equal(await roster.inputValue(),'');
   }
   await box.locator('.sets-binary').getByRole('button',{name:data.comparison[0].options[data.comparison[0].answer],exact:true}).click();await box.locator('form').last().getByRole('button',{name:'בדיקה',exact:true}).click();
   assert.equal(await box.locator('form').last().locator('.bk-good').count(),1);
  }
  if(data.type==='choice'&&data.independent){
   for(const [i,q]of data.items.entries()){
    const form=box.locator('form').nth(i),checkPart=()=>form.getByRole('button',{name:'בדיקה',exact:true}).click();
    await checkPart();assert.equal(await form.locator('[aria-invalid=true]').count(),1);
    assert.equal(await box.locator('form').filter({has:page.locator('[aria-invalid=true]')}).count(),1);
    if(q.input==='number'){
     await form.locator('input').fill('99');await checkPart();assert.equal(await form.locator('[aria-invalid=true]').count(),1);
     await form.locator('input').fill(q.options[q.answer]);await form.locator('input').press('Enter');
    }else{
     await form.getByRole('button',{name:q.options[q.answer],exact:true}).click();await checkPart();
    }
    assert.equal(await form.locator('[aria-invalid=false]').count(),1);
    await form.getByRole('button',{name:'איפוס',exact:true}).click();assert.equal(await form.locator('[aria-invalid]').count(),0);
   }
  }
  if(data.type==='choice'&&!data.independent){
   const choose=async(i,value)=>{const row=box.locator('.sets-item').nth(i);if(data.items[i].input==='number')await row.locator('input').fill(data.items[i].options[value]);else if(await row.locator('.sets-binary').count())await row.getByRole('button',{name:data.items[i].options[value],exact:true}).click();else await row.locator('select').selectOption({value:String(value)});};
   for(const [i,q]of data.items.entries()){
    await choose(i,q.answer);await box.locator('.sets-item').nth(i).getByRole('button',{name:'בדיקה',exact:true}).click();
    assert.equal(await box.locator('.sets-item').nth(i).locator('.bk-good').count(),1);
   }
   await choose(0,(data.items[0].answer+1)%data.items[0].options.length);
   await box.locator('.sets-item').first().getByRole('button',{name:'בדיקה',exact:true}).click();assert.equal(await box.locator('.bk-bad').count(),1);
   for(const reset of await box.getByRole('button',{name:'איפוס',exact:true}).all())await reset.click();
   assert.ok((await box.locator('select').evaluateAll(ns=>ns.map(n=>n.value))).every(v=>v===''));assert.equal(await box.locator('.sets-binary [aria-pressed="true"]').count(),0);
  }
  if(data.type==='write'){
   for(const [i,q]of data.items.entries()){
    const form=box.locator('form').nth(i),input=form.locator('input');
    await input.fill('{999}');await input.press('Enter');assert.equal(await form.locator('.bk-bad').count(),1);
    await input.fill(q.answer);await input.press('Enter');assert.equal(await form.locator('.bk-good').count(),1);
    await input.fill('');assert.equal(await form.locator('.bk-good').count(),0);
   }
  }
  if(data.type==='select'){
   await check();assert.equal(await box.locator('.bk-bad').count(),1);
   for(const c of data.answer)await box.locator('.sets-cards button').nth(data.candidates.indexOf(c)).click();
   await check();assert.equal(await box.locator('.bk-good').count(),1);
   const bad=data.candidates.find(c=>!data.answer.includes(c));await box.locator('.sets-cards button').nth(data.candidates.indexOf(bad)).click();await check();assert.equal(await box.locator('.bk-bad').count(),1);
   await box.getByRole('button',{name:'איפוס',exact:true}).click();assert.equal(await box.locator('[aria-pressed=true]').count(),0);
  }
  if(data.type==='venn'){
   for(const [i,t]of data.tasks.entries()){
    await check();assert.equal(await box.locator('.bk-bad').count(),1);
    for(const region of t.regions){const b=box.locator('.sets-cards button').nth(region);await b.focus();await page.keyboard.press('Space');}
    await check();assert.equal(await box.locator('.bk-good').count(),1);
    assert.equal(await box.locator('.sets-venn .selected').count(),t.regions.length);
    if(i<data.tasks.length-1)await box.getByRole('button',{name:'לשלב הבא',exact:true}).click();
   }
   await box.getByRole('button',{name:'איפוס',exact:true}).click();
   await box.locator('[data-region="1"]').click();assert.equal(await box.locator('.sets-cards button').nth(1).getAttribute('aria-pressed'),'true');
  }
  if(data.type==='power'){
   for(const subset of subsets(data.atoms)){
    for(const a of subset.items)await box.locator('.sets-cards button').nth(data.atoms.indexOf(a.value)).click();
    await box.getByRole('button',{name:'הוספת הקבוצה',exact:true}).click();
   }
   assert.equal(await box.locator('.sets-saved button').count(),8);assert.match(await box.locator('.bk-good').innerText(),/כל תת־הקבוצות/);
   await box.getByRole('button',{name:'הוספת הקבוצה',exact:true}).click();assert.equal(await box.locator('.sets-saved button').count(),8);assert.equal(await box.locator('.bk-bad').count(),1);
   await box.getByRole('button',{name:'איפוס',exact:true}).click();assert.equal(await box.locator('.sets-saved button').count(),0);
  }

 }
 for(const width of [1200,390,320]){
  await page.setViewportSize({width,height:900});
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('.sets-ready')].filter(n=>n.getBoundingClientRect().right>innerWidth+2||n.getBoundingClientRect().left<-2).map(n=>n.dataset.sets));
  assert.deepEqual(overflow,[],`activity overflow at ${width}`);
  for(const id of ['cardinality','membership','venn-basic','powers'])await page.locator(`[data-sets="${id}"]`).screenshot({path:`/tmp/sets-${id}-${width}.png`});
 }
 assert.deepEqual(errors,[]);
 console.log(`Passed: all ${Object.keys(SET_TASKS).length} set activities, wrong/correct answers, keyboard Venn controls, written sets, nested sets, reset, offline math, desktop and mobile.`);
}finally{await browser.close();}
