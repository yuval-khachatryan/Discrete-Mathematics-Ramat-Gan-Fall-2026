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
  assert.equal((sets.match(/^TODO$/gm)||[]).length,7);
  assert.equal((logic.match(/\{#practice-q-/g)||[]).length,40);
  assert.equal((sets.match(/\{#practice-q-/g)||[]).length,8);
  assert.ok(sets.indexOf('{#practice-quantifiers}') > sets.indexOf('{#sec-set-proofs}'));
  assert.equal((Object.values(pages).join('\n').match(/\.thmexm/g)||[]).length,23);
  assert.equal((logic.match(/<iframe/g)||[]).length,14);
  assert.equal((sets.match(/<iframe/g)||[]).length,3);
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
