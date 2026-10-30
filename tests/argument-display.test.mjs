import test from 'node:test';
import assert from 'node:assert/strict';
import {ARGUMENTS} from '../games/shared/argument-exercises.js';
import {rename} from '../games/shared/argument-rules.js';
import {formulaWords,argumentLines} from '../games/shared/argument-display.js';
test('proof display translates chosen letters and numbers premises and references consistently',()=>{
 const ex=ARGUMENTS.projector, map={A:'X',B:'Z',C:'Y'};
 const premises=ex.premises.map(p=>rename(p.formula,map));
 const steps=[{id:'d4',formula:'X -> Y',rule:'hs',refs:['p1','p2']},{id:'d7',formula:'Y',rule:'mp',refs:['d4','p3']}];
 const lines=argumentLines(ex,map,premises,steps);
 assert.deepEqual(lines.map(l=>l.number),[1,2,3,4,5]);
 assert.equal(lines[3].reason,'כלל השרשרת, משורות 1 ו־2');
 assert.equal(lines[4].reason,'כלל הניתוק, משורות 4 ו־3');
 assert.match(lines[3].words,/אם \(המחשב מחובר למקרן\), אז \(אפשר להתחיל את ההצגה\)/);
 assert.equal(lines[4].words,'אפשר להתחיל את ההצגה');
 assert.equal(argumentLines(ex,map,premises,steps.slice(0,1)).length,4);
});
test('Hebrew readings retain negation and grouping and prefer authored natural sentences',()=>{
 const ex=ARGUMENTS.rain,map={A:'C',B:'B',C:'A'};
 assert.equal(formulaWords('!C',ex,map),'לא יורד גשם');
 assert.equal(formulaWords('!A',ex,map),'השומר לא הולך הביתה מוקדם');
 assert.notEqual(formulaWords('!(C & B)',ex,map),formulaWords('!C & B',ex,map));
 for(const [id,exercise] of Object.entries(ARGUMENTS)){
  const mapping=Object.fromEntries(exercise.atoms.map(a=>[a.id,a.id]));
  for(const step of exercise.solution)assert.ok(formulaWords(step.formula,exercise,mapping)?.length>0,id);
 }
});
