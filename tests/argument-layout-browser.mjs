import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {ARGUMENTS} from '../games/shared/argument-exercises.js';
import {rename} from '../games/shared/argument-rules.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,r=>r.abort());
 await page.goto(new URL('../_book/01-logic.html',import.meta.url).href);
 for(const id of ['library','projector']){
  const ex=ARGUMENTS[id],box=page.locator(`[data-argument="${id}"]`),map={A:'C',B:'A',C:'B'};
  for(const [i,a]of ex.atoms.entries())await box.locator('.argument-letter').nth(i).selectOption(map[a.id]);
  await box.getByRole('button',{name:'אישור הסימונים',exact:true}).click();
  for(const [i,p]of [...ex.premises,ex.goal].entries())await box.locator('.argument-translation input').nth(i).fill(rename(p.formula,map));
  await box.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();
  const preview=box.locator('.argument-preview');
  assert.deepEqual(await preview.locator('.argument-written > section').evaluateAll(ns=>ns.map(n=>n.className)),['argument-written-givens','argument-written-goal','argument-written-steps']);
  assert.equal(await preview.locator('.argument-written-givens li').count(),ex.premises.length);
  assert.equal(await preview.locator('tbody tr').count(),0);
  for(const [i,s]of ex.solution.entries()){
   if(i)await box.getByRole('button',{name:'הוספת צעד',exact:true}).click();
   const row=box.locator('.argument-steps .proof-step').nth(i);
   await row.locator('.proof-input').fill(rename(s.formula,map));await row.locator('.proof-rule').selectOption(s.rule);
   for(const [j,ref]of s.refs.entries())await row.locator('.argument-source').nth(j).selectOption(ref.replace(/^s/,'d'));
   await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
  }
  assert.match(await box.locator('form > .bk-msg').innerText(),/ההוכחה הושלמה/);
  assert.equal(await preview.locator('tbody tr').count(),ex.solution.length);
  assert.equal(await preview.locator('tbody th').first().innerText(),String(ex.premises.length+1));
  if(id==='library'){
   assert.match(await preview.locator('.argument-line-reason').innerText(),/כלל הניתוק/);
   assert.match(await preview.locator('.argument-line-reason').innerText(),/משורות 1 ו־2/);
   assert.equal(await preview.locator('.argument-written-goal .proof-formula').innerText(),'A');
   for(const width of [1200,390]){await page.setViewportSize({width,height:900});await preview.screenshot({path:`/tmp/noa-proof-${width}.png`});const r=await preview.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width);}
  }
  await box.getByRole('button',{name:'הצגת דרך פתרון לפי האותיות שלי',exact:true}).click();
  assert.equal(await box.locator('.argument-solution .argument-written-givens li').count(),ex.premises.length);
  assert.equal(await box.locator('.argument-solution tbody tr').count(),ex.solution.length);
 }
 assert.deepEqual(errors,[]);console.log('Passed: givens–goal–proof order, derived steps only, line references, chosen letters, authored solution, desktop and mobile.');
}finally{await browser.close();}
