import {chromium} from 'playwright-core';
import {buildSync} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {placementStages,areaStages,membership,anchors} from '../games/shared/venn-workshop.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1100,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<html dir="rtl" lang="he"><head></head><body><main style="max-width:800px;margin:auto"><div class="venn-workshop" data-venn-workshop="numbers"></div><div class="venn-workshop" data-venn-workshop="areas"></div></main></body></html>');
 await page.addStyleTag({content:readFileSync(new URL('../games/shared/venn-workshop.css',import.meta.url),'utf8')});
 await page.addStyleTag({content:readFileSync(new URL('../games/shared/stage-navigation.css',import.meta.url),'utf8')});
 await page.addScriptTag({content:buildSync({stdin:{contents:'import {initVennWorkshop} from "./venn-workshop.js"; document.querySelectorAll(".venn-workshop").forEach(initVennWorkshop);',resolveDir:fileURLToPath(new URL('../games/shared',import.meta.url))},bundle:true,write:false,format:'iife'}).outputFiles[0].text});
 const numbers=page.locator('[data-venn-workshop=numbers]'),areas=page.locator('[data-venn-workshop=areas]');
 async function point(box,size,m){await box.locator('svg').scrollIntoViewIfNeeded();const r=await box.locator('svg').boundingBox(),[x,y]=anchors(size)[m];return {x:r.x+x/560*r.width,y:r.y+y/450*r.height};}
 for(let i=0;i<placementStages.length;i++){
  await numbers.locator('select').selectOption(String(i));const s=placementStages[i];
  await numbers.getByRole('button',{name:'בדיקה',exact:true}).click();assert.match(await numbers.locator('.bk-msg').innerText(),/נותרו/);
  for(const n of s.numbers){
   const t=numbers.locator(`[data-number="${n}"]`),m=membership(s.sets,n);
   if(n===s.numbers[0]){await t.scrollIntoViewIfNeeded();const r=await t.boundingBox(),end=await point(numbers,s.sets.length,m);const start=await t.boundingBox();await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();await page.mouse.move(end.x+7,end.y-5,{steps:12});await page.mouse.up();const dropped=await t.boundingBox();assert.ok(Math.abs(dropped.x+dropped.width/2-(end.x+7))<1);assert.ok(Math.abs(dropped.y+dropped.height/2-(end.y-5))<1);}
   else {await t.focus();await page.keyboard.press('Enter');await numbers.locator('.vw-regions button').nth(m).click();}
  }
  await numbers.getByRole('button',{name:'בדיקה',exact:true}).click();assert.match(await numbers.locator('.bk-msg').innerText(),/כל המספרים במקומם/);
  assert.equal(await numbers.locator('.vw-bank .vw-token').count(),0);
 }
 for(let i=0;i<areaStages.length;i++){
  const s=areaStages[i];await areas.locator('select').selectOption(String(i));
  for(const m of s.masks){const p=await point(areas,s.size,m);await page.mouse.click(p.x,p.y);}
  await areas.getByRole('button',{name:'בדיקה',exact:true}).click();assert.match(await areas.locator('.bk-msg').innerText(),/נכון/);
  await areas.locator('.vw-regions button').nth(s.masks[0]).click();await areas.getByRole('button',{name:'בדיקה',exact:true}).click();assert.match(await areas.locator('.bk-msg').innerText(),/עדיין לא/);
 }
 await numbers.locator('select').selectOption('0');
 const one=numbers.locator('[data-number="1"]');
 const before=await one.boundingBox();await numbers.locator('[data-number="9"]').click();await numbers.locator('.vw-regions button').nth(0).click();const after=await one.boundingBox();assert.deepEqual(after,before);
 await one.click();const boundary=await numbers.locator('svg').boundingBox();await page.mouse.click(boundary.x+70/560*boundary.width,boundary.y+220/450*boundary.height);
 assert.ok(await numbers.locator('dialog').isVisible());assert.equal(await one.getAttribute('aria-label'),'1: על גבול — יש להזיז לתוך אזור');
 await numbers.locator('dialog button').click();
 await numbers.locator('[data-number="1"]').click();await numbers.locator('.vw-regions button').nth(3).click();await numbers.getByRole('button',{name:'בדיקה',exact:true}).click();assert.equal(await numbers.locator('.vw-wrong').count(),1);
 await numbers.getByRole('button',{name:'איפוס השלב'}).click();assert.equal(await numbers.locator('.vw-bank .vw-token').count(),9);
 for(const width of [1100,390]){await page.setViewportSize({width,height:1000});await numbers.screenshot({path:`/tmp/venn-workshop-${width}.png`});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(errors,[]);console.log('Passed: number placement in all stages, dragging, keyboard, area selection, retry, reset, mobile layout.');
}finally{await browser.close();}
