import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ARGUMENTS } from "../games/shared/argument-exercises.js";
import { LETTERS, rename, formulaBank, checkMapping, checkTranslations, checkArgument } from "../games/shared/argument-rules.js";
import { assignments, evaluate } from "../games/shared/logic.js";

const identity = ex => Object.fromEntries(ex.atoms.map(a=>[a.id,a.id]));
function run(ex,steps=ex.solution,mapping=identity(ex),premises=ex.premises.map(p=>rename(p.formula,mapping)),goal=rename(ex.goal.formula,mapping)) {
  return checkArgument(ex,mapping,premises,goal,steps.map(s=>({...s,formula:rename(s.formula,mapping)})));
}
const step=(id,formula,rule,refs)=>({id,formula,rule,refs});

test("all assisted arguments are embedded and have valid authored proofs under different letter choices",()=>{
  const qmd=readFileSync(new URL("../01-logic.qmd",import.meta.url),"utf8");
  for(const [id,ex] of Object.entries(ARGUMENTS)) {
    assert.ok(qmd.includes(`data-argument="${id}"`));
    for(const names of [["A","B","C"],["C","A","B"],["G","M","H"],["Z","Y","X"]]) {
      const mapping=Object.fromEntries(ex.atoms.map((a,i)=>[a.id,names[i]]));
      assert.ok(checkMapping(ex,mapping).ok);
      const result=run(ex,ex.solution,mapping);
      assert.ok(result.ok&&result.complete,`${id}: ${JSON.stringify(result)}`);
    }
    const environments = assignments(ex.atoms.map(a=>a.id));
    assert.ok(environments.some(env => ex.premises.every(p=>evaluate(p.formula,env))), `${id}: premises must be jointly satisfiable`);
    for(const env of environments) {
      if(ex.premises.every(p=>evaluate(p.formula,env))) assert.ok(evaluate(ex.goal.formula,env));
    }
  }
});

test("names must be unique letters; truth constants cannot name statements",()=>{
  const ex=ARGUMENTS.library;
  for(const mapping of [{A:"A",B:"A"},{A:"T",B:"B"},{A:"F",B:"B"},{A:"A1",B:"B"},{A:"",B:"B"}]) assert.equal(checkMapping(ex,mapping).ok,false);
  assert.ok(!LETTERS.includes("F")&&!LETTERS.includes("T"));
  assert.equal(rename("A -> !B",{A:"B",B:"A"}),"B → ¬A");
});

test("formula banks follow chosen letters and offer alternate legal routes without approving distractors",()=>{
  for(const ex of Object.values(ARGUMENTS)) {
    const mapping=Object.fromEntries(ex.atoms.map((a,i)=>[a.id,["C","A","B"][i]]));
    const bank=formulaBank(ex,mapping);
    assert.equal(new Set(bank).size,bank.length);
    for(const step of ex.solution)assert.ok(bank.includes(rename(step.formula,mapping)));
  }
  const ex=ARGUMENTS.projector,map={A:"X",B:"Y",C:"Z"};
  const bank=formulaBank(ex,map);
  assert.ok(bank.includes("X → Z")); // alternative: chain, then detachment
  assert.ok(bank.includes("Y → X")); // plausible converse, not a valid step
  assert.equal(run(ex,[step("s1","B -> A","hs",["p1","p2"])],map).ok,false);
  assert.ok(run(ex,[step("s1","A -> C","hs",["p1","p2"]),step("s2","C","mp",["s1","p3"])],map).complete);
});

test("translations are checked using the chosen names, including negation and implication direction",()=>{
  const ex=ARGUMENTS.printer,map={A:"P",B:"Q"};
  assert.ok(checkTranslations(ex,map,["P -> Q","!Q"],"!P").ok);
  for(const [premises,goal] of [[["Q -> P","!Q"],"!P"],[["P -> Q","Q"],"!P"],[["P -> Q","!Q"],"P"],[["P -> Q","!R"],"!P"],[["P -> Q","("],"!P"],[["P -> Q",""],"!P"]]) {
    assert.equal(checkTranslations(ex,map,premises,goal).ok,false);
    assert.equal(checkArgument(ex,map,premises,goal,[]).phase,"translation");
  }
});

test("equivalent translations work but a structural rewrite must be justified before inference",()=>{
  const ex=ARGUMENTS.library,map=identity(ex),premises=["!A | B","A"];
  assert.ok(checkTranslations(ex,map,premises,"B").ok);
  assert.equal(run(ex,ex.solution,map,premises).ok,false);
  const solution=[step("s1","A -> B","eq:implication",["p1"]),step("s2","B","mp",["s1","p2"])];
  assert.ok(run(ex,solution,map,premises).complete);
  assert.equal(run(ex,[step("s1","A -> B","eq:double",["p1"])],map,premises).ok,false);
});

test("different valid proof paths and reversed source selection are accepted",()=>{
  const projector=ARGUMENTS.projector;
  const chain=[step("s1","A -> C","hs",["p2","p1"]),step("s2","C","mp",["p3","s1"])];
  assert.ok(run(projector,chain).complete);
  const backwards=[step("s1","!B","mt",["p3","p2"]),step("s2","!A","mt",["p1","s1"])];
  assert.ok(run(ARGUMENTS.rain,backwards).complete);
  const partial=run(projector,[projector.solution[0]]);
  assert.ok(partial.ok&&!partial.complete);
});

test("proof sources cannot be a future, self, missing, repeated or goal line",()=>{
  for(const refs of [["p1","s1"],["p1","s2"],["p1","goal"],["p1","removed"],["p1","p1"],["p1"],["",""]]) {
    assert.equal(run(ARGUMENTS.library,[step("s1","B","mp",refs)]).ok,false,refs.join());
  }
  assert.equal(run(ARGUMENTS.library,[step("p1","B","mp",["p1","p2"])]).ok,false);
  assert.equal(run(ARGUMENTS.library,[]).complete,false);
});

test("named rules and chosen sources are enforced; common fallacies get counterexamples",()=>{
  const affirm={atoms:[{id:"A"},{id:"B"}],premises:[{formula:"A -> B"},{formula:"B"}],goal:{formula:"A"}};
  const wrong=run(affirm,[step("s1","A","mp",["p1","p2"])]);
  assert.equal(wrong.ok,false);
  assert.deepEqual(wrong.results[0].row,{A:false,B:true});
  assert.equal(run(ARGUMENTS.library,[step("s1","B","mt",["p1","p2"])]).ok,false);
  assert.equal(run(ARGUMENTS.projector,[step("s1","C","mp",["p1","p3"])]).ok,false);
  assert.equal(run(ARGUMENTS.library,[step("s1","B","",["p1","p2"])]).ok,false);
});

test("earlier mistakes invalidate dependent steps; malformed and foreign-variable input is rejected",()=>{
  const ex=ARGUMENTS.projector;
  const bad=[step("s1","A","mp",["p1","p3"]),step("s2","C","mp",["p2","s1"])];
  const result=run(ex,bad);
  assert.equal(result.results.length,1);assert.equal(result.complete,false);
  for(const formula of ["A &","D","", "(".repeat(241)]) {
    const r=checkArgument(ARGUMENTS.library,{A:"A",B:"B"},["A -> B","A"],"B",[step("s1",formula,"mp",["p1","p2"])]);
    assert.equal(r.ok,false);
  }
});
