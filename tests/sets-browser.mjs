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
 assert.equal(await page.locator('.sets-ready').count(),Object.keys(SET_TASKS).length);
 assert.equal(await page.locator('mjx-merror,[data-mml-node="merror"]').count(),0);
 assert.equal(await page.locator('main').innerText().then(t=>t.includes('TODO')),false);
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
    await roster.fill(q.answer);await roster.press('Enter');assert.match(await form.locator(':scope > .bk-msg').last().innerText(),/גם מספר האיברים/);
    await form.getByRole('button',{name:'איפוס',exact:true}).click();assert.equal(await count.inputValue(),'');assert.equal(await roster.inputValue(),'');
   }
   await box.locator('select').selectOption(String(data.comparison[0].answer));await box.getByRole('button',{name:'בדיקת התשובות',exact:true}).click();
   assert.match(await box.locator('form').last().innerText(),/התשובה להשוואת הקבוצות נכונה/);
  }
  if(data.type==='choice'){
   for(const [i,q]of data.items.entries())await box.locator('select').nth(i).selectOption({value:String(q.answer)});
   await box.getByRole('button',{name:'בדיקת התשובות',exact:true}).click();assert.match(await box.locator('form > .bk-msg').innerText(),/כל התשובות נכונות/,id+' '+JSON.stringify(await box.locator('select').evaluateAll(ns=>ns.map(n=>n.value)))+' '+await box.innerText());
   await box.locator('select').first().selectOption({value:String((data.items[0].answer+1)%data.items[0].options.length)});
   await box.getByRole('button',{name:'בדיקת התשובות',exact:true}).click();assert.ok(await box.locator('.bk-bad').count());
   await box.getByRole('button',{name:'איפוס',exact:true}).click();assert.equal(await box.locator('select').first().inputValue(),'');
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
  if(data.type==='proof'){
   const rules=[...new Set(data.steps.map(s=>s.rule)),'משפט נכון בדוגמה אחת'];
   for(const [i,step]of data.steps.entries()){
    await box.locator('select').first().selectOption({value:String((step.answer+1)%step.options.length)});await box.locator('select').last().selectOption({value:String(rules.indexOf(step.rule))});
    await box.getByRole('button',{name:'בדיקת הצעד',exact:true}).click();assert.equal(await box.locator('.sets-proof-preview li').count(),i+1);
    await box.locator('select').first().selectOption({value:String(step.answer)});await box.locator('select').last().selectOption({value:String(rules.length-1)});
    await box.getByRole('button',{name:'בדיקת הצעד',exact:true}).click();assert.equal(await box.locator('.sets-proof-preview li').count(),i+1);
    await box.locator('select').last().selectOption({value:String(rules.indexOf(step.rule))});await box.getByRole('button',{name:'בדיקת הצעד',exact:true}).click();assert.equal(await box.locator('.sets-proof-preview li').count(),i+2);
   }
   assert.match(await box.locator('.bk-good').innerText(),/ההוכחה הושלמה/);
   await box.getByRole('button',{name:'התחלה מחדש',exact:true}).click();assert.equal(await box.locator('.sets-proof-preview li').count(),1);
  }
 }
 for(const width of [1200,390,320]){
  await page.setViewportSize({width,height:900});
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('.sets-ready')].filter(n=>n.getBoundingClientRect().right>innerWidth+2||n.getBoundingClientRect().left<-2).map(n=>n.dataset.sets));
  assert.deepEqual(overflow,[],`activity overflow at ${width}`);
  for(const id of ['cardinality','membership','venn-basic','powers','proof-union'])await page.locator(`[data-sets="${id}"]`).screenshot({path:`/tmp/sets-${id}-${width}.png`});
 }
 assert.deepEqual(errors,[]);
 console.log(`Passed: all ${Object.keys(SET_TASKS).length} set activities, wrong/correct answers, proof justifications, keyboard Venn controls, written sets, nested sets, reset, offline math, desktop and mobile.`);
}finally{await browser.close();}
