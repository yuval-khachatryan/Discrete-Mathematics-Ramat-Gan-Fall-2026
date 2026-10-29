import { parse, format } from './logic.js';
import { rename, ruleName } from './argument-rules.js';

// Prefer the author's natural Hebrew for known premises, atoms and the goal.
// Other legal intermediate formulas are translated compositionally, preserving
// grouping rather than guessing an implication's causal meaning.
export function formulaWords(formula, exercise, mapping) {
  const text = s => s.replace(/[.。]+$/, '');
  const exact = [...exercise.premises, exercise.goal,
    ...exercise.atoms.map(a => ({formula:a.id,text:a.text}))];
  const normalized = format(formula);
  const match = exact.find(item => rename(item.formula,mapping) === normalized);
  if (match) return text(match.text);
  const names = Object.fromEntries(exercise.atoms.map(a => [mapping[a.id],text(a.text)]));
  function say(n) {
    if(n.type === 'var') return names[n.name] || n.name;
    if(n.type === 'const') return n.value ? 'אמת' : 'שקר';
    if(n.type === 'not') return `לא נכון ש־(${say(n.arg)})`;
    if(n.type === 'and') return n.args.map(a => `(${say(a)})`).join(' וגם ');
    if(n.type === 'or') return n.args.map(a => `(${say(a)})`).join(' או ')+' (לפחות אחד)';
    if(n.type === 'imp') return `אם (${say(n.left)}), אז (${say(n.right)})`;
    if(n.type === 'iff') return `(${say(n.left)}) אם ורק אם (${say(n.right)})`;
    if(n.type === 'xor') return `בדיוק אחד משני המשפטים: (${say(n.left)}) או (${say(n.right)})`;
  }
  return say(parse(formula,{flatten:false}));
}

export function argumentLines(exercise,mapping,premises,steps) {
  const numbers=new Map(premises.map((_,i)=>[`p${i+1}`,i+1]));
  const lines=premises.map((formula,i)=>({number:i+1,formula:format(formula),reason:'נתון',words:formulaWords(formula,exercise,mapping)}));
  steps.forEach(step=>{
    const number=lines.length+1;
    const refs=step.refs.map(id=>numbers.get(id));
    lines.push({number,formula:format(parse(step.formula,{flatten:false})),
      reason:`${ruleName(step.rule)}, ${refs.length===1?'משורה':'משורות'} ${refs.join(' ו־')}`,
      words:formulaWords(step.formula,exercise,mapping)});
    numbers.set(step.id,number);
  });
  return lines;
}
