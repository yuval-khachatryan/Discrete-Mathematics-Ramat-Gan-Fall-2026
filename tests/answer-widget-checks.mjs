import assert from 'node:assert/strict';
import {PRACTICE_CHOICES} from '../games/shared/practice-choices.js';
import {SET_TASKS} from '../games/shared/sets-data.js';

export async function checkAnswerWidgets(page){
  const open=async part=>{
    const panel=part.locator('.answer-panel').first();
    assert.equal(await panel.getAttribute('open'),null);
    await panel.locator(':scope > summary').click();
    return panel;
  };
  const reveal=async part=>{
    const solution=part.locator('.answer-reveal');
    assert.equal(await solution.getAttribute('open'),null);
    await solution.locator('summary').click();
    assert.equal(await solution.getAttribute('open'),'');
    await solution.locator('summary').click();
  };
  for(const chapter of ['02-sets','01-logic']){
    await page.goto(new URL(`../_book/${chapter}.html`,import.meta.url).href);
    await page.waitForFunction(()=>window.MathJax?.startup?.promise);
    await page.evaluate(()=>window.MathJax.startup.promise);
    assert.equal(await page.getByRole('button',{name:'בדיקת התשובות',exact:true}).count(),0);
    assert.equal(await page.locator('.answer-panel[open]').count(),0);
    for(const box of await page.locator('.choice-exercise').all()){
      const questions=PRACTICE_CHOICES[await box.getAttribute('data-choice')];
      for(const [i,q]of questions.entries()){
        const part=box.locator('.choice-item').nth(i);await open(part);
        await reveal(part);
        assert.equal(await part.locator('select').inputValue(),'','reveal leaves the answer untouched');
        if(q.substitution){
          await part.locator('input').fill(q.substitution.expected);
          await part.getByRole('button',{name:'בדיקת ההצבה',exact:true}).click();
        }
        const select=part.locator('select');
        await select.selectOption(String(q.options.findIndex(o=>!o.correct)));
        await part.getByRole('button',{name:'בדיקה',exact:true}).click();
        assert.equal(await select.getAttribute('aria-invalid'),'true');
        await select.selectOption(String(q.options.findIndex(o=>o.correct)));
        await part.getByRole('button',{name:'בדיקה',exact:true}).click();
        assert.equal(await select.getAttribute('aria-invalid'),'false');
        if(i+1<questions.length){
          const next=box.locator('.choice-item').nth(i+1);
          assert.equal(await next.locator('.answer-panel').getAttribute('open'),null);
          assert.equal(await next.locator('[aria-invalid]').count(),0);
        }
      }
    }
    const quiz=page.locator('.tf-quiz').first();
    await open(quiz);await reveal(quiz);
    assert.equal(await quiz.locator('.tf-opt.correct').count(),0,'reveal does not mark an answer');
    await quiz.locator(`.tf-opt[data-val="${await quiz.getAttribute('data-correct')}"]`).click();
    assert.equal(await quiz.locator('.tf-opt.correct').count(),1);
    if(chapter==='02-sets'){
      for(const [id,data]of Object.entries(SET_TASKS)){
        if(!['choice','write','cardinality','select'].includes(data.type))continue;
        const box=page.locator(`[data-sets="${id}"]`);
        if(data.type==='choice'){
          for(const [i,q]of data.items.entries()){
            const part=box.locator('.sets-item').nth(i);await open(part);await reveal(part);
            if(q.input==='number')await part.locator('input').fill(q.options[q.answer]);
            else if(await part.locator('select').count())await part.locator('select').selectOption(String(q.answer));
            else await part.locator('.sets-binary button').nth(q.answer).click();
            await part.getByRole('button',{name:'בדיקה',exact:true}).click();
            assert.equal(await part.locator('.bk-good').count(),1,id);
            assert.equal(await box.locator('.bk-bad').count(),0,'no errors on unattempted parts');
          }
        }else if(data.type==='write'){
          for(const [i,q]of data.items.entries()){
            const part=box.locator('form').nth(i);await open(part);await reveal(part);
            await part.locator('input').fill(q.answer);await part.locator('input').press('Enter');
            assert.equal(await part.locator('.bk-good').count(),1);
          }
        }else if(data.type==='cardinality'){
          for(const part of await box.locator('.sets-count-item').all()){await open(part);await reveal(part);}
        }else{await open(box);await reveal(box);}
      }
      for(const part of await page.locator('[data-quantifier-evidence]').all()){
        await open(part);await reveal(part);
        const isWitness=await part.getAttribute('data-quantifier-evidence')==='witness';
        await part.locator('input').fill(isWitness?'11':'2');await part.locator('input').press('Enter');
        assert.equal(await part.locator('.bk-good').count(),1);
      }
      for(const part of await page.locator('[data-quantifier-negation]').all()){
        await open(part);await reveal(part);
        const forall=await part.getAttribute('data-quantifier-negation')==='∀';
        await part.locator('input').fill(`${forall?'exists':'forall'} x in D (not P(x))`);
        await part.locator('input').press('Enter');assert.equal(await part.locator('.bk-good').count(),1);
      }
      for(const part of await page.locator('[data-quantifier-writing]').all()){
        await open(part);
        const positive=await part.getAttribute('data-quantifier-writing')==='menu';
        await part.locator('input').fill(positive?'forall x in S exists y in M (L(x,y))':'exists x in S forall y in M (not L(x,y))');
        await part.locator('input').press('Enter');assert.equal(await part.locator('.bk-good').count(),1);
      }
      await page.setViewportSize({width:390,height:844});
      const sample=page.locator('[data-sets="membership"]');
      await sample.screenshot({path:'/tmp/independent-answer-panels-mobile.png'});
      assert.ok(await sample.evaluate(n=>n.scrollWidth<=n.clientWidth+2));
      await page.setViewportSize({width:1200,height:900});
    }
    assert.equal(await page.locator('mjx-merror,[data-mml-node="merror"]').count(),0);
  }
}
