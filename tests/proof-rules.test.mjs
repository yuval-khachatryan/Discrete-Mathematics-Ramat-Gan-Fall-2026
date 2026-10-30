import test from "node:test";
import assert from "node:assert/strict";
import { checkStep, checkProof, checkStart, RULES, ruleExamples } from "../games/shared/proof-rules.js";
import { compare, parse } from "../games/shared/logic.js";

const first = [
  { formula: "!A | !!B", rule: "demorgan" },
  { formula: "!A | B", rule: "double" },
  { formula: "A -> B", rule: "implication" },
];
const second = [
  { formula: "!!A & !(A & !B)", rule: "demorgan" },
  { formula: "A & !(A & !B)", rule: "double" },
  { formula: "A & (!A | !!B)", rule: "demorgan" },
  { formula: "A & (!A | B)", rule: "double" },
  { formula: "(A & !A) | (A & B)", rule: "distribute" },
  { formula: "F | (A & B)", rule: "complement" },
  { formula: "A & B", rule: "identity" },
];

test("both authored derivations require justified steps and reach their goals", () => {
  for (const [start, target, steps] of [["!(A & !B)","A -> B",first],["!(!A | (A & !B))","A & B",second]]) {
    const result = checkProof(start,target,steps);
    assert.ok(result.valid && result.complete);
    assert.ok(result.results.every(r=>r.kind==='valid'));
    assert.equal(checkProof(start,target,steps.slice(0,-1)).complete,false);
  }
});

test("rule schemas are equivalent and work in both directions with compound substitutions", () => {
  const substitute = s => s.replace(/[ABC]/g, x=>({A:"(P -> Q)",B:"(R | !P)",C:"(Q & R)"}[x]));
  for (const rule of RULES) for (const pair of rule.pairs) {
    assert.ok(compare(...pair).equal,rule.id);
    const [a,b]=pair.map(substitute);
    for (const [from,to] of [[a,b],[b,a]]) {
      assert.equal(checkStep(from,to,rule.id,["P","Q","R"]).kind,"valid",rule.id+': '+from);
      assert.equal(checkStep(`!(${from}) -> Q`,`!(${to}) -> Q`,rule.id,["P","Q","R"]).kind,"valid",rule.id+' inside a formula');
    }
    assert.ok(ruleExamples(rule.id).length>0);
  }
});

test("an equivalent answer is rejected when the selected law does not justify it", () => {
  assert.equal(checkStep("!(A & B)","!A | !B","double",["A","B"]).kind,"wrong-rule");
  assert.equal(checkStep("!(A & !B)","A -> B","demorgan",["A","B"]).kind,"wrong-rule");
  assert.equal(checkStep("!(A & !B)","!A | B","demorgan",["A","B"]).kind,"missing-step");
  assert.equal(checkStep("!!A & !!B","A & B","double",["A","B"]).kind,"missing-step");
  assert.equal(checkStep("A | !A","B | !B","complement",["A","B"]).kind,"wrong-rule");
});

test("counterexamples, invalid syntax, missing laws, unchanged and extra-variable answers", () => {
  const check = (answer,rule="demorgan")=>checkStep("!(A & B)",answer,rule,["A","B"]);
  const wrong=check("!A & !B");
  assert.equal(wrong.kind,"different");
  assert.ok(wrong.row && !compare("!(A & B)","!A & !B").equal);
  assert.equal(check("!A | !B","").kind,"rule");
  assert.equal(check("!A | !B","unknown").kind,"rule");
  assert.equal(check("!A | !C").kind,"variables");
  for (const text of ["A &", "((A)", "A = B", "<script>","(".repeat(241)]) assert.equal(check(text).kind,"syntax");
  assert.equal(check(" ").kind,"empty");
  assert.equal(check("!(A & B)").kind,"unchanged");
  assert.equal(check("¬a ∨ ¬b").kind,"valid");
});

test("association and commutation are checked without changing the default parser", () => {
  assert.equal(parse("A & (B & C)").args.length,3);
  assert.equal(parse("A & (B & C)",{flatten:false}).args.length,2);
  assert.equal(checkStep("A & (B & C)","(A & B) & C","associate",["A","B","C"]).kind,"valid");
  assert.equal(checkStep("!(A & B)","!B | !A","demorgan",["A","B"]).kind,"wrong-rule");
  assert.equal(checkStep("!A | !B","!B | !A","commute",["A","B"]).kind,"valid");
});

test("alternative order of independent steps and reversed final conjunction are accepted", () => {
  const alternate = [second[0],
    {formula:"!!A & (!A | !!B)",rule:"demorgan"},
    {formula:"!!A & (!A | B)",rule:"double"},
    second[3], ...second.slice(4), {formula:"B & A",rule:"commute"}];
  const result=checkProof("!(!A | (A & !B))","A & B",alternate);
  assert.ok(result.valid && result.complete);
});

test("proof checking stops at the first error and does not accept an unchanged starting formula as completion", () => {
  assert.equal(checkProof("!(A & !B)","A -> B",[]).valid,false);
  const result=checkProof("!(A & !B)","A -> B",[first[0],{formula:"A",rule:"double"},first[2]]);
  assert.equal(result.results.length,2);
  assert.equal(result.valid,false);
  assert.equal(result.complete,false);
  assert.equal(checkProof("!(A & !B)","A -> B",[{formula:"!(A & !B)",rule:"double"}]).complete,false);
});


test("a starting expression must be an authored endpoint, not an unjustified equivalent", () => {
  const start = "!(A & !B)", target = "A -> B";
  for (const input of ["", "!(", "!A | B", "B -> A", "A & B"])
    assert.equal(checkStart(input, start, target, true).valid, false, input);
  assert.equal(checkStart(" ¬(a ∧ ¬b) ", start, target).valid, true);
  assert.equal(checkStart(target, start, target).valid, false);
  const reverse = checkStart(target, start, target, true);
  assert.equal(reverse.target, start);
  assert.ok(checkProof(reverse.start, reverse.target, [
    { formula: "!A | B", rule: "implication" },
    { formula: "!A | !!B", rule: "double" },
    { formula: start, rule: "demorgan" },
  ]).complete);
});


test("omitted double negation gets a correct-result message and a justified intermediate", () => {
  for (const [before,after,rule] of [
    ["!(A & !B)","!A | B","demorgan"],
    ["!(!A | B)","A & !B","demorgan"],
    ["!(!A & !B)","A | B","demorgan"],
    ["!A | B","!(A & !B)","demorgan"],
    ["!!A & !!B","A & B","double"],
    ["!(A & !B) -> C","(!A | B) -> C","demorgan"],
  ]) {
    const result = checkStep(before,after,rule,["A","B","C"]);
    assert.equal(result.kind,"missing-step");
    assert.match(result.message,/התוצאה נכונה/);
    assert.ok(compare(before,result.intermediate).equal);
    assert.ok(compare(result.intermediate,after).equal);
    assert.ok(checkStep(before,result.intermediate,rule,["A","B","C"]).kind === "valid"
      || checkStep(result.intermediate,after,rule,["A","B","C"]).kind === "valid");
  }
  assert.equal(checkStep("!(A & !B)","!A & B","demorgan",["A","B"]).kind,"different");
  assert.equal(checkStep("!(A & !B)","B | !A","demorgan",["A","B"]).kind,"wrong-rule");
  assert.equal(checkStep("!(A & !B)","!A | B","commute",["A","B"]).kind,"wrong-rule");
  assert.equal(checkStep("!(A & !B)","!A | !!B","demorgan",["A","B"]).kind,"valid");
  assert.equal(checkProof("!(A & !B)","!A | B",[{formula:"!A | B",rule:"demorgan"}]).complete,false);
});
