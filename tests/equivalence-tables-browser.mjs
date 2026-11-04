import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {RULES} from '../games/shared/proof-rules.js';
import {variables,assignments,evaluate} from '../games/shared/logic.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1200,height:1000}});
 await page.route(/^https?:/,async r=>{
  if(r.request().url().includes('mathjax'))await r.fulfill({path:fileURLToPath(new URL('../../Alternative Versions/source/node_modules/mathjax/es5/tex-svg.js',import.meta.url)),contentType:'application/javascript'});
  else await r.abort();
 });
 await page.goto(new URL('../_book/01-logic.html',import.meta.url).href);
 await page.evaluate(()=>MathJax.startup.promise);
 assert.equal(await page.locator('.equivalence-law').count(),15);
 assert.equal(await page.locator('.law-proof').count(),15);
 assert.equal(await page.locator('.law-proof[open]').count(),0);
 assert.equal(await page.locator('#law-table-demorgan > .law-heading .law-summary-formula').count(),4);
 assert.equal(await page.locator('#law-table-implication > .law-heading .law-summary-formula').count(),4);
 assert.equal(await page.locator('#law-table-or-implication').count(),0);
 for(const heading of await page.locator('.law-heading > strong, .law-formulas').all())assert.ok(await heading.isVisible());
 const list=page.locator('.equivalence-laws');
 const height=await list.evaluate(n=>n.getBoundingClientRect().height);
 console.log(`Collapsed equivalence list: ${Math.round(height)}px high.`);
 assert.ok(height<1100,'law list should stay compact on desktop');
 await list.screenshot({path:'/tmp/compact-equivalence-list.png'});
 const sections=['sec-rule-mp','sec-rule-mt','sec-rule-hs','sec-rule-and-out','sec-rule-and-in','sec-rule-iff'];
 for(const id of sections){
  assert.equal(await page.locator(`section#${id} > h4`).count(),1);
  assert.equal(await page.locator(`#quarto-sidebar a[href="#${id}"]`).count(),1);
 }
 assert.equal(await page.locator('#sec-rule-mp [data-argument="library"]').count(),1);
 assert.equal(await page.locator('#sec-rule-mt [data-argument="printer"]').count(),1);
 for(const proof of await page.locator('.law-proof').all()){
  assert.equal(await proof.locator('summary').innerText(),'הצדקת הכלל');
  for(const content of await proof.locator('.law-table-scroll, .law-derivation').all())assert.equal(await content.isVisible(),false);
 }
 const tables=await page.locator('.law-truth-table').evaluateAll(ns=>ns.map(n=>({
  rule:n.dataset.rule,variant:Number(n.dataset.variant),
  columns:[...n.querySelectorAll('th')].map(c=>c.dataset.formula),
  rows:[...n.querySelectorAll('tbody tr')].map(r=>[...r.cells].map(c=>c.textContent.trim())),
  resultCount:n.querySelectorAll('thead .law-result').length,
 })));
 const derivations=await page.locator('.law-derivation').evaluateAll(ns=>ns.map(n=>`${n.dataset.rule}:${n.dataset.variant}`));
 assert.equal(tables.length,17);
 assert.equal(derivations.length,9);
 const covered=[...derivations,...tables.map(t=>`${t.rule}:${t.variant}`)].sort();
 assert.deepEqual(covered,RULES.flatMap(r=>r.pairs.map((_,i)=>`${r.id}:${i}`)).sort());
 for(const table of tables){
  const pair=RULES.find(r=>r.id===table.rule).pairs[table.variant];
  assert.deepEqual(table.columns.slice(-2),pair);
  const names=[...new Set(pair.flatMap(variables))].sort();
  assert.equal(table.rows.length,2**names.length);
  assert.equal(table.resultCount,2);
  assignments(names).forEach((env,i)=>{
   assert.deepEqual(table.rows[i],table.columns.map(c=>evaluate(c,env)?'T':'F'));
   assert.equal(table.rows[i].at(-1),table.rows[i].at(-2));
  });
 }
 const box=page.locator('#law-table-distribute-and');
 await box.locator('summary').click();
 assert.equal(await box.locator('.law-proof').getAttribute('open'),'');
 assert.equal(await box.locator('summary').innerText(),'הסתר הצדקה');
 await box.locator('summary').click();
 assert.equal(await box.locator('summary').innerText(),'הצדקת הכלל');
 await box.locator('summary').click();
 assert.ok(await box.locator('mjx-container').count()>0);
 assert.equal(await page.locator('.equivalence-laws [data-mml-node="merror"]').count(),0);
 for(const width of [1200,390]){
  await page.setViewportSize({width,height:1000});
  assert.ok(await box.evaluate(n=>n.scrollWidth<=n.clientWidth+2));
  await box.screenshot({path:`/tmp/equivalence-tables-${width}.png`});
 }
 console.log(`Passed: ${tables.length} truth tables and ${derivations.length} concise derivations, complete rule coverage, closed proofs and mobile scrolling.`);
}finally{await browser.close();}
