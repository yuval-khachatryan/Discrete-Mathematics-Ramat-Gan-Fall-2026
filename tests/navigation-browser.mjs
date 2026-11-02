import {chromium} from 'playwright-core';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/^https?:/,async r=>{if(r.request().url().includes('mathjax'))await r.fulfill({path:fileURLToPath(new URL('../../Alternative Versions/source/node_modules/mathjax/es5/tex-svg.js',import.meta.url)),contentType:'application/javascript'});else await r.abort();});
 const url=file=>pathToFileURL(fileURLToPath(new URL('../_book/'+file,import.meta.url))).href;
 for(const file of ['index.html','01-logic.html','02-sets.html']){
  await page.goto(url(file));await page.locator('.toc-chapter-toggle').first().waitFor();
  const nav=page.locator('#quarto-sidebar');
  assert.equal(await nav.locator('.toc-chapter').count(),3);
  assert.equal(await page.locator('#quarto-margin-sidebar #TOC').count(),0);
  const nr=await nav.boundingBox(),mr=await page.locator('main').boundingBox();
  assert.ok(nr.x>=mr.x+mr.width-2,'sidebar must be physically right of the text');
  for(const chapter of await nav.locator('.toc-chapter').all()){
   const root=chapter.locator('.toc-chapter-toggle'),toc=chapter.locator(':scope > .toc-tree');
   assert.equal(await root.getAttribute('aria-expanded'),'false');assert.equal(await toc.isVisible(),false);
   await root.focus();await page.keyboard.press('Space');assert.equal(await toc.isVisible(),true);
   const branch=toc.locator('li.toc-parent').first(),toggle=branch.locator(':scope > button'),children=branch.locator(':scope > ul');
   assert.equal(await children.isVisible(),false);await toggle.click();assert.equal(await children.isVisible(),true);
   await page.evaluate(()=>window.scrollTo(0,1200));await page.waitForTimeout(100);assert.equal(await children.isVisible(),true);
   await toggle.click();assert.equal(await children.isVisible(),false);
   // Every descendant link must point to the chapter it belongs to.
   const chapterFile=await chapter.locator(':scope > .sidebar-item-container > a').evaluate(a=>new URL(a.href).pathname);
   assert.ok(await toc.locator('a').evaluateAll((links,path)=>links.every(a=>new URL(a.href).pathname===path),chapterFile));
   await root.click();
  }
  await page.evaluate(()=>window.scrollTo(0,0));
  await nav.locator('.toc-chapter-toggle').nth(1).click();
  await page.screenshot({path:`/tmp/navigation-${file}.png`});
 }
 // Follow a subsection of the other chapter from the front page.
 await page.goto(url('index.html'));const chapter=page.locator('.toc-chapter').last();await chapter.locator('.toc-chapter-toggle').click();
 await chapter.locator('.toc-branch-toggle').first().click();const target=chapter.locator('.toc-parent').first().locator('ul a').first();const destination=await target.getAttribute('href');await target.click();
 await page.waitForURL(destination);await page.locator('#TOC.toc-tree').waitFor();
 assert.equal(await page.locator('#TOC').locator(`a[href="${new URL(destination).hash}"]`).isVisible(),true);
 await page.setViewportSize({width:390,height:900});await page.goto(url('02-sets.html'));
 await page.locator('.quarto-btn-toggle').click();
 const chapter2=page.locator('.toc-chapter').last(),root=chapter2.locator('.toc-chapter-toggle');await root.waitFor({state:'visible'});assert.equal(await root.getAttribute('aria-expanded'),'false');
 await root.click();const branch=chapter2.locator('li.toc-parent').first();await branch.locator(':scope > button').click();assert.equal(await branch.locator(':scope > ul').isVisible(),true);
 await page.waitForTimeout(400);
 const mobileNav=await page.locator('#quarto-sidebar').boundingBox();
 assert.ok(mobileNav.x>=-1 && mobileNav.x+mobileNav.width<=391,'mobile menu fits the screen');
 await page.screenshot({path:'/tmp/navigation-mobile.png'});
 assert.deepEqual(errors,[]);console.log('Passed: right navigation, both chapters nested on every page, closed defaults, keyboard toggles, scroll stability, cross-chapter links, direct links and mobile menu.');
}finally{await browser.close();}
