import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {assignments,evaluate} from '../games/shared/logic.js';
import {evidenceAt} from '../games/shared/table-evidence.js';
import {ARGUMENTS} from '../games/shared/argument-exercises.js';
import {rename} from '../games/shared/argument-rules.js';
const base=process.argv[2]||'http://127.0.0.1:8799';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/01-logic.html`,{waitUntil:'networkidle'});
 assert.equal(await page.locator('.table-evidence').count(),7);
 for(const box of await page.locator('.ttq[data-evidence]').all()){
  const data=await box.evaluate(n=>({...n.dataset,cols:n.getAttribute('cols')}));
  const cols=(data.cols||'').split(';').map(s=>s.trim()),rows=assignments(data.vars.split(','));
  const spec=data.evidence==='truth'?{mode:'truth',formula:a.formula,value:a.value==='true'}:a.evidence==='argument'?{mode:'argument',premises:data.premises.split(';'),conclusion:data.conclusion}:{mode:'equivalence',left:data.left,right:data.right};
  const expected=rows.findIndex(r=>evidenceAt(spec,r).counter);
  const select=box.locator('.evidence-choice');
  assert.equal(await select.isDisabled(),false);
  for(const [i,env] of rows.entries())for(const [j,f] of cols.entries()){
   const cell=box.locator('tbody tr').nth(i).locator('.bk-cell').nth(j);await cell.click();if(!evaluate(f,env))await cell.click();
  }
  await box.getByRole('button',{name:'בדיקה',exact:true}).click();
  assert.equal(await select.isEnabled(),true);
  assert.equal(await box.locator('.after').isVisible(),false);
  const wrong=expected<0?'0':'none';await select.selectOption(wrong);
  await box.getByRole('button',{name:'בדיקה',exact:true}).click();
  assert.equal(await box.locator('.table-evidence .bk-bad').count(),1);
  assert.equal(await box.locator('.after').isVisible(),false);
  await select.selectOption(expected<0?'none':String(expected));
  await box.getByRole('button',{name:'בדיקה',exact:true}).click();
  assert.equal(await box.locator('.table-evidence .bk-good').count(),1);
  assert.equal(await box.locator('.after').isVisible(),true);
  if(data.evidence==='argument'&&expected>=0){
   const text=await box.locator('.table-evidence .bk-good').innerText();
   assert.match(text,/A → B = T/);assert.match(text,/¬A = T/);assert.match(text,/¬B = F/);
   await box.screenshot({path:'/tmp/deduction-counterexample.png'});
  }
  await box.locator('.bk-cell').first().click();
  assert.equal(await select.isDisabled(),false);assert.equal(await box.locator('.after').isVisible(),false);
  await box.getByRole('button',{name:'איפוס',exact:true}).click();assert.equal(await select.inputValue(),'');
  await box.getByRole('button',{name:'פתרון מלא',exact:true}).click();assert.equal(await select.inputValue(),expected<0?'none':String(expected));
 }
 const ex=ARGUMENTS.projector,b=page.locator('[data-argument="projector"]'),map={A:'C',B:'A',C:'B'};
 for(const [i,a] of ex.atoms.entries())await b.locator('.argument-letter').nth(i).selectOption(map[a.id]);
 await b.getByRole('button',{name:'אישור הסימונים',exact:true}).click();
 for(const [i,item] of [...ex.premises,ex.goal].entries())await b.locator('.argument-translation input').nth(i).fill(rename(item.formula,map));
 await b.getByRole('button',{name:'בדיקת התרגום ופתיחת ההוכחה',exact:true}).click();
 const bottom=b.locator('.argument-preview');
 assert.equal(await bottom.locator('tbody tr').count(),3);
 assert.match(await bottom.innerText(),/נראה שמתוך ההנחות/);
 for(const [i,step] of ex.solution.entries()){
  if(i)await b.getByRole('button',{name:'הוספת צעד',exact:true}).click();
  const row=b.locator('.argument-steps .proof-step').nth(i);
  await row.locator('input').fill(rename(step.formula,map));await row.locator('.proof-rule').selectOption(step.rule);
  for(const [j,ref] of step.refs.entries())await row.locator('.argument-source').nth(j).selectOption(ref.replace(/^s/,'d'));
  await row.getByRole('button',{name:'בדיקת הצעד והוספה להוכחה',exact:true}).click();
  assert.equal(await row.locator('.argument-local tbody tr').count(),4+i);
  assert.equal(await bottom.locator('tbody tr').count(),4+i);
 }
 assert.match(await bottom.innerText(),/משורות 2 ו־4/);
 assert.match(await bottom.innerText(),/התמונה מופיעה על המסך/);
 assert.match(await bottom.innerText(),/אפשר להתחיל את ההצגה/);
 await bottom.screenshot({path:'/tmp/deduction-proof.png'});
 for(const width of [390,320]){
  await page.setViewportSize({width,height:1000});
  assert.equal(await b.evaluate(n=>n.scrollWidth>n.clientWidth+2),false);
 }
 await b.locator('.argument-steps .proof-step input').first().fill('B');
 assert.equal(await bottom.locator('tbody tr').count(),3);
 assert.equal(await b.locator('.argument-local:visible').count(),0);
 await b.getByRole('button',{name:'בדיקת ההוכחה',exact:true}).click();
 assert.equal(await bottom.locator('tbody tr').count(),3);
 await b.locator('.argument-steps .proof-step input').first().fill('A');
 await b.getByRole('button',{name:'בדיקת ההוכחה',exact:true}).click();assert.equal(await bottom.locator('tbody tr').count(),5);
 await b.locator('.argument-steps .proof-step').first().getByRole('button',{name:'מחיקת צעד 1',exact:true}).click();
 assert.equal(await bottom.locator('tbody tr').count(),3);
 await b.getByRole('button',{name:'בדיקת ההוכחה',exact:true}).click();assert.equal(await bottom.locator('tbody tr').count(),3);
 assert.deepEqual(errors,[]);
 console.log('Passed: six table-evidence activities; explicit counterexamples, valid claims, reset/solution/invalidation; incremental deduction proof, custom letters, verbal readings, source lines, deletion and mobile layout.');
}finally{await browser.close();}
