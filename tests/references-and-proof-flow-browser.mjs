import {chromium} from 'playwright-core';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ARGUMENTS} from '../games/shared/argument-exercises.js';
import {KNIGHT_PROOFS} from '../games/shared/knight-workshop-data.js';
import {chooseReplacement} from './rewrite-browser-helpers.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1200,height:1000}}),errors=[];
 await context.route(/^https?:/,async r=>{
  if(r.request().url().includes('mathjax'))await r.fulfill({path:fileURLToPath(new URL('../../Alternative Versions/source/node_modules/mathjax/es5/tex-svg.js',import.meta.url)),contentType:'application/javascript'});
  else await r.abort();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 const original=new URL('../_book/01-logic.html',import.meta.url).href;
 await page.goto(original);await page.locator('.proof-ready').first().waitFor();
 const reference=page.locator('main a[href="#box-exm-formalization"]').first();
 await reference.click();
 let panel=page.locator('.xref-panel');assert.equal(await panel.count(),1);assert.equal(page.url(),original);
 assert.match(await panel.innerText(),/הבקשה/);
 assert.ok(await panel.evaluate(n=>[...n.querySelectorAll('[id]')].every(c=>[...document.querySelectorAll('[id]')].filter(other=>other.id===c.id).length===1)));
 assert.equal(await panel.locator('.xref-jump').getAttribute('target'),'_blank');
 assert.ok(await panel.locator('mjx-container').count()>0);
 await page.keyboard.press('Escape');assert.equal(await panel.count(),0);
 await reference.click();await reference.click();assert.equal(await panel.count(),0);
 const addLink=async(id,href)=>{
  await page.evaluate(({id,href})=>{const p=document.createElement('p'),a=document.createElement('a');a.id=id;a.href=href;a.textContent=id;p.append(a);document.querySelector('main').prepend(p);},{id,href});
  await page.waitForFunction(id=>document.getElementById(id).target==='_blank',id);
  return page.locator('#'+id);
 };
 const index=JSON.parse(readFileSync(new URL('../_book/reference-index.js',import.meta.url),'utf8').replace(/^window.BOOK_REFERENCE_INDEX = /,'').replace(/;\s*$/,''));
 const target=Object.keys(index['02-sets.html']).find(id=>id.startsWith('box-'));
 const cross=await addLink('test-cross',`02-sets.html#${target}`);await cross.click();
 await page.waitForFunction(()=>document.querySelector('.xref-body .thmbox'));
 assert.equal(page.url(),original);assert.equal(await page.locator('.xref-body .thmbox').count(),1);
 const popupPromise=context.waitForEvent('page');await page.locator('.xref-jump').click();
 const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');assert.ok(popup.url().includes('02-sets.html#'));await popup.close();
 await page.locator('.xref-close').click();
 const section=await addLink('test-section','#sec-iff');const jumpPromise=context.waitForEvent('page');await section.click();
 const sectionPage=await jumpPromise;await sectionPage.waitForLoadState('domcontentloaded');assert.equal(sectionPage.url(),original+'#sec-iff');await sectionPage.close();assert.equal(page.url(),original);
 const missing=await addLink('test-missing','#box-missing');await missing.click();
 await page.waitForFunction(()=>document.querySelector('.xref-body')?.textContent.includes('לא ניתן'));assert.equal(page.url(),original);await page.locator('.xref-close').click();
 const game=await addLink('test-game','#box-game-implies');await game.click();assert.equal(await page.locator('.xref-panel iframe').count(),0);assert.match(await page.locator('.xref-panel').innerText(),/לפעילות האינטראקטיבית/);await page.locator('.xref-close').click();
 console.log('References: local and cross-chapter previews, offline index, math, new-tab source/section links, close, toggle and fallback passed.');

 const proof=page.locator('#practice-q-eq-neither .proof-editor');
 await proof.locator('.proof-start-input').fill('!(!A & !B)');
 let row=proof.locator('.proof-step').first();await chooseReplacement(row,'r','!!A | !!B','demorgan');await row.locator('.proof-input').fill('!!A | !!B');
 await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
 assert.equal(await proof.locator('.proof-step').count(),2);assert.equal(await row.locator('.step-editor').isVisible(),false);
 assert.match(await row.locator('.step-compact').innerText(),/דה מורגן/);
 row=proof.locator('.proof-step').nth(1);await chooseReplacement(row,'r.0','A','double');await chooseReplacement(row,'r.1','B','double');await row.locator('.proof-input').fill('A | B');
 await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
 assert.equal(await proof.locator('.proof-step').count(),2);assert.equal(await proof.locator('.step-accepted').count(),2);
 assert.match(await proof.locator('.proof-form > .bk-msg').innerText(),/הפתרון הושלם/);
 const first=proof.locator('.proof-step').first();await first.locator('.step-edit').click();assert.equal(await first.locator('.proof-input').inputValue(),'!!A | !!B');
 await first.locator('.proof-input').fill('A');assert.equal(await proof.locator('.step-accepted').count(),0);assert.equal(await row.locator('.proof-input').inputValue(),'A | B');
 await first.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();assert.equal(await first.locator('.step-editor').isVisible(),true);
 await first.locator('.proof-input').fill('!!A | !!B');
 await chooseReplacement(row,'r.0','A','double');await chooseReplacement(row,'r.1','B','double');
 await proof.getByRole('button',{name:'בדיקת הפתרון',exact:true}).click();assert.equal(await proof.locator('.step-accepted').count(),2);
 console.log('Equivalence editor: automatic next step, compact accepted steps, completion and editing/rechecking earlier work passed.');

 const library=page.locator('[data-argument="library"]');await library.locator('.argument-symbol-options > summary').click();
 await library.locator('.argument-letter').nth(0).fill('T');await library.getByRole('button',{name:'אישור הסימונים',exact:true}).click();assert.match(await library.locator('.argument-symbol-options .bk-msg').innerText(),/שמורים/);
 await library.locator('.argument-letter').nth(0).fill('has_card');await library.locator('.argument-letter').nth(1).fill('can_borrow');await library.getByRole('button',{name:'אישור הסימונים',exact:true}).click();
 assert.equal(await library.locator('.argument-letter').first().inputValue(),'HAS_CARD');
 for(const [i,f]of ['HAS_CARD -> CAN_BORROW','HAS_CARD','CAN_BORROW'].entries())await library.locator('.argument-translation input').nth(i).fill(f);
 await library.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();
 row=library.locator('.proof-step').first();await row.locator('.proof-rule').selectOption('mp');await row.locator('.argument-source').nth(0).selectOption('p1');await row.locator('.argument-source').nth(1).selectOption('p2');await row.locator('.proof-input').fill('CAN_BORROW');
 await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();assert.equal(await library.locator('.step-accepted').count(),1);assert.match(await library.locator('form > .bk-msg').innerText(),/ההוכחה הושלמה/);
 const arg=page.locator('[data-argument="projector"]'),ex=ARGUMENTS.projector;
 for(const [i,f]of [...ex.premises.map(p=>p.formula),ex.goal.formula].entries())await arg.locator('.argument-translation input').nth(i).fill(f);
 await arg.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();
 for(const [i,step]of ex.solution.entries()){
  row=arg.locator('.proof-step').nth(i);await row.locator('.proof-rule').selectOption(step.rule);
  for(const [j,ref]of step.refs.entries())await row.locator('.argument-source').nth(j).selectOption(ref.replace(/^s/,'d'));
  await row.locator('.proof-input').fill(step.formula);await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();assert.equal(await row.locator('.step-editor').isVisible(),false);
 }
 assert.match(await arg.locator('form > .bk-msg').innerText(),/ההוכחה הושלמה/);
 console.log('Argument editor: typed identifiers, validation, formula parsing, multi-step inference and compact output passed.');

 const knight=page.locator('[data-knight-proof="contradiction"]');await knight.locator('.kp-statement').fill('!A & !B');await knight.getByRole('button',{name:'בדיקת ההצרנה ופתיחת ההוכחה',exact:true}).click();
 for(const [i,step]of KNIGHT_PROOFS.contradiction.model.entries()){
  row=knight.locator('.kp-step').nth(i);await row.locator('.kp-rule').selectOption(step.rule);
  for(const [j,ref]of step.refs.entries()){
   if(j>=await row.locator('.kp-sources').count())await row.getByRole('button',{name:'הוספת שורת מקור',exact:true}).click();
   await row.locator('.kp-sources').nth(j).selectOption(String(ref));
  }
  await row.locator('.kp-formula').fill(step.formula);await row.getByRole('button',{name:'בדיקת השורה',exact:true}).click();assert.equal(await row.locator('.step-editor').isVisible(),false,await row.innerText());
 }
 assert.match(await knight.locator('.kp-work > .bk-msg').innerText(),/ההוכחה הושלמה/);
 assert.equal(await knight.locator('.kp-step').count(),KNIGHT_PROOFS.contradiction.model.length);
 await page.setViewportSize({width:390,height:900});await knight.locator('.kp-step').first().screenshot({path:'/tmp/compact-proof-mobile.png'});assert.ok(await knight.locator('.kp-step').first().evaluate(n=>n.scrollWidth<=n.clientWidth+2));
 await library.locator('.argument-symbol-options').screenshot({path:'/tmp/identifier-mobile.png'});
 assert.deepEqual(errors,[]);console.log('Knights proof: automatic steps through a complete contradiction proof, compact rows and mobile layout passed.');
}finally{await browser.close();}
