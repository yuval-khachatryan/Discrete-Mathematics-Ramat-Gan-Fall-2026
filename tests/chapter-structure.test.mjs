import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const pages = Object.fromEntries(['index.qmd','01-logic.qmd','02-sets.qmd']
  .map(file => [file,readFileSync(new URL(`../${file}`,import.meta.url),'utf8')]));

test('chapters keep sets before quantifiers and retain the complete exercise bank',()=>{
  const logic=pages['01-logic.qmd'], sets=pages['02-sets.qmd'];
  assert.doesNotMatch(logic,/\{#sec-quantifiers\}|\{#practice-quantifiers\}/);
  assert.doesNotMatch(logic,/\\(?:in|notin|forall|exists)\b|\\\{|[∈∉∀∃]/);
  assert.ok(sets.indexOf('{#sec-sets-membership}') < sets.indexOf('{#sec-quantifiers}'));
  assert.ok(sets.indexOf('{#sec-quantifiers}') < sets.indexOf('{#sec-set-equality '));
  assert.ok(sets.indexOf('{#sec-set-equality ') < sets.indexOf('{#sec-set-order}'));
  assert.ok(sets.indexOf('{#sec-set-order}') < sets.indexOf('{#sec-set-subset}'));
  assert.ok(sets.indexOf('{#sec-set-equality ') < sets.indexOf('data-sets="cardinality"'));
  const quantifiers=sets.slice(sets.indexOf('## כמתים'),sets.indexOf('## שוויון והכלה'));
  assert.doesNotMatch(quantifiers,/\\(?:subseteq|subsetneq|cup|cap|setminus)\b/);
  assert.doesNotMatch(sets,/^TODO$/m);
  assert.equal((logic.match(/\{#practice-q-/g)||[]).length,40);
  assert.equal((sets.match(/\{#practice-q-/g)||[]).length,8);
  assert.ok(sets.indexOf('{#practice-quantifiers}') > sets.indexOf('{#sec-quantifiers}'));
  assert.ok(sets.indexOf('{#practice-quantifiers}') < sets.indexOf('{#sec-set-equality-inclusion}'));
  assert.ok((sets.match(/\.thmexm/g)||[]).length >= 12);
  assert.equal((logic.match(/<iframe/g)||[]).length,15);
  assert.equal((sets.match(/<iframe/g)||[]).length,5);
  assert.match(sets,/levels=witness,counter,check-all,nobody&embed=1/);
  assert.ok(sets.indexOf('level=negation&embed=1') > sets.indexOf('### שלילה של כמתים'));
  assert.ok(sets.indexOf('level=order&embed=1') > sets.indexOf('### סדר הכמתים'));
  const summary=logic.slice(logic.indexOf('## סיכום {#sec-summary}'),logic.indexOf('## תרגול עצמי לפי נושאים'));
  assert.doesNotMatch(summary,/\\forall|\\exists/);
  assert.match(summary,/אבירים ונוכלים/);
});

test('all authored links between chapter sources resolve to retained anchors',()=>{
  const ids=Object.fromEntries(Object.entries(pages).map(([file,source])=>[file,new Set(
    [...source.matchAll(/\{#([\w-]+)/g),...source.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]))]));
  for(const [file,source] of Object.entries(pages)) {
    for(const [,target,fragment] of source.matchAll(/\]\(([^\s)#]*)(?:#([\w-]+))?\)/g)) {
      if(target && !target.endsWith('.qmd')) continue;
      const destination=target||file;
      assert.ok(pages[destination],`${file} → ${destination}`);
      if(fragment) assert.ok(ids[destination].has(fragment),`${file} → ${destination}#${fragment}`);
    }
  }
});

test('De Morgan proof precedes the logic-to-sets explanation and set laws table',()=>{
 const chapter=pages['02-sets.qmd'];
 assert.ok(chapter.indexOf('data-set-proof="proof-demorgan"')<chapter.indexOf('{#sec-set-laws}'));
 assert.ok(chapter.indexOf('{#sec-set-laws}')<chapter.indexOf('title="חוקי קבוצות"'));
});

test('section practice stays with its topic; mixed exercises remain at the end',()=>{
 const chapter=pages['02-sets.qmd'];
 const sections=[...chapter.matchAll(/^## .*?\{#([^}]+)\}/gm)];
 const within=(section,activity)=>{
  const i=sections.findIndex(m=>m[1]===section),start=sections[i].index,end=sections[i+1]?.index??chapter.length;
  assert.ok(chapter.slice(start,end).includes(activity),`${activity} belongs in ${section}`);
 };
 for(const [section,activities]of Object.entries({
  'sec-sets-membership':['data-sets="practice-roster"','data-sets="practice-relations"','data-sets="practice-counting-basics"'],
  'sec-quantifiers':['#practice-quantifiers','#practice-q-quant-not-all'],
  'sec-set-equality-inclusion':['data-sets="practice-counter"','data-set-lab="inclusion-error"','data-sets="practice-relations-inclusion"'],
  'sec-union-intersection':['data-set-proof="hw-intersection"','data-set-proof="hw-union"','data-set-proof="hw-absorption"'],
  'sec-set-difference-complement':['data-sets="practice-complement"','data-set-proof="hw-difference"'],
  'sec-inclusion-exclusion':['data-sets="practice-counting"'],
  'sec-power-set':['data-sets="practice-power"','data-sets="practice-counting-power"'],
  'sec-cartesian-product':['data-sets="practice-product"'],
  'practice-sets':['data-sets="practice-operations"','data-set-proof="hw-demorgan"','data-set-proof="hw-union-diff"','data-set-lab="two-witnesses"'],
 }))for(const activity of activities)within(section,activity);
});

test('exercises follow all teaching subsections of their full section',()=>{
 const sections=pages['02-sets.qmd'].split(/(?=^## )/m);
 for(const section of sections){
  if(section.startsWith('## תרגול משולב'))continue;
  const practice=section.search(/^### תרגול לסעיף:/m);
  const teaching=practice<0?section:section.slice(0,practice);
  assert.doesNotMatch(teaching,/\.thm(?:qst|chk)\b/,section.split('\n')[0]);
  if(practice>=0){
   const tail=section.slice(practice);
   assert.equal((tail.match(/^### /gm)||[]).length,1,'No teaching subsection follows section practice');
   assert.doesNotMatch(tail,/\.thm(?:def|thm|method|summary)\b/);
  }
 }
});

test('proof examples retain the shared engine and include a prose proof',()=>{
 const chapter=pages['02-sets.qmd'];
 const examples=[...chapter.matchAll(/^:::: \{[^\n]*\.thmexm[^\n]*\}\n::: \{\.set-proof data-set-proof="([^"]+)"\}([\s\S]*?)^::::\s*$/gm)];
 assert.equal(examples.length,7);
 for(const [,id,body]of examples){
  assert.ok(body.includes(`#written-proof-${id} .foldable`),`${id} has an expandable prose proof`);
 }
});
