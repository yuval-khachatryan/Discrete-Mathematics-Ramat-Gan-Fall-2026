import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');
const scripts=[...read('../_styles.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const context={window:{}};
runInNewContext(scripts.find(s=>s.includes('window.MathJax =')),context);
const config=JSON.parse(JSON.stringify(context.window.MathJax));

test('Hebrew labels use the calculus macro and whole-text rendering in both MathJax outputs',()=>{
 assert.deepEqual(config.tex.macros.heb,['\\text{#1}',1]);
 for(const renderer of ['chtml','svg'])assert.equal(config[renderer].mtextInheritFont,true,renderer);
 assert.equal(config.chtml.linebreaks.inline,false);
 assert.equal(config.output.displayOverflow,'scroll');
});

test('every authored Hebrew math label uses heb in normal reading order',()=>{
 const files=[...readdirSync(new URL('../',import.meta.url)).filter(f=>f.endsWith('.qmd')),
  ...readdirSync(new URL('../includes/',import.meta.url)).filter(f=>f.endsWith('.qmd')).map(f=>'includes/'+f)];
 let labels=0;
 for(const file of files){
  const source=read('../'+file);
  const formulas=source.match(/(?<!\\)\$\$[\s\S]*?\$\$|(?<!\\)\$(?!\$)(?:\\.|[^$])*?(?<!\\)\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g)||[];
  for(const formula of formulas){
   const withoutLabels=formula.replace(/\\heb\{([^{}]*)\}/g,()=>{labels++;return '';});
   assert.doesNotMatch(withoutLabels,/[א-ת]/,`${file}: Hebrew outside \\heb in ${formula}`);
  }
 }
 assert.ok(labels>0,'the audit must encounter the chapter 3 labels');
 const relations=read('../03-relations.qmd');
 for(const word of ['וגם','דנה','נועם','רוני','שחמט','צילום'])assert.ok(relations.includes(`\\heb{${word}}`),word);
});

test('standalone exporters preserve the Hebrew macro instead of discarding it',()=>{
 for(const file of ['../../Tools/standalone-html/export.mjs','../../Alternative Versions/source/build.mjs','../../Alternative Versions/source/standalone.mjs']){
  const source=read(file);
  const expression=source.match(/JSON\.stringify\((\{tex:.*?options:\{enableMenu:false\}\})\)/)?.[1];
  assert.ok(expression,`${file}: explicit standalone MathJax configuration`);
  const exported=JSON.parse(JSON.stringify(runInNewContext('('+expression+')')));
  assert.deepEqual(exported.tex.macros.heb,config.tex.macros.heb,file);
  assert.equal(exported.svg.mtextInheritFont,true,file);
  assert.deepEqual(exported.tex.inlineMath,[['\\(','\\)']],file);
 }
});
