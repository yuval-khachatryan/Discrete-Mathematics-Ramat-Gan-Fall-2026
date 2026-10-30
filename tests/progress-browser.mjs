// A saved completion is history; a tick requires success in the current attempt.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.argv[2]||'http://127.0.0.1:8798';
try {
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(const name of ['circuit','barman','gate','detective','witness']) {
  await page.goto(`${base}/games/${name}/index.html`,{waitUntil:'networkidle'});
  assert.equal(await page.locator('.g-tick, .g-feedback.g-good').count(),0,`${name}: no initial success`);
 }
 await page.evaluate(()=>localStorage.setItem('dm:circuit:v1',JSON.stringify({done:{single:true}})));
 await page.goto(`${base}/games/circuit/index.html?levels=single,not&embed=1`,{waitUntil:'networkidle'});
 assert.equal(await page.locator('.g-tick').count(),0);
 assert.equal(await page.locator('.g-history').count(),1);
 assert.match(await page.locator('.g-lvl').first().getAttribute('aria-label'),/הושלם קודם/);
 const reset=()=>page.getByRole('button',{name:'איפוס',exact:true}).click();
 const solve=async()=>{
  const lever=page.getByRole('switch').first();
  if(await lever.getAttribute('aria-checked')==='false')await lever.click();
  await page.getByRole('button',{name:'בדיקה',exact:true}).click();
 };
 await reset();assert.equal(await page.locator('.g-history,.g-tick').count(),0);
 await solve();assert.equal(await page.locator('.g-tick').count(),1);
 await reset();assert.equal(await page.locator('.g-history,.g-tick').count(),0);
 assert.equal(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('dm:circuit:v1')).done.single),false);
 await page.getByRole('button',{name:'פתרון',exact:true}).click();
 assert.equal(await page.locator('.g-tick').count(),0);
 await reset();await solve();await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.locator('.g-tick').count(),0);assert.equal(await page.locator('.g-history').count(),1);
 await page.goto(`${base}/01-logic.html`,{waitUntil:'networkidle'});
 assert.ok(await page.locator('#TOC a[href$="#sec-naming-open-statements"]').count());
 assert.equal(await page.locator('.thmbox-components .component-figures svg').count(),3);
 assert.match(await page.locator('.thmbox-components').innerText(),/^רכיבי המשחק/);
 for (const summary of await page.locator('.thmbox-summary').all()) assert.match(await summary.innerText(),/^סיכום/);
 for(const width of [1280,390,320]) {
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`overflow ${width}`);
 }
 await page.locator('.thmbox-components').screenshot({path:'/tmp/logic-components.png'});
 assert.deepEqual(errors,[]);
 console.log('Passed: five games start without success marks; saved history, real completion, reset, solution and reload; component figures, summary label, deep TOC and narrow screens.');
}finally{await browser.close();}
