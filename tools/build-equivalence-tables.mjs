#!/usr/bin/env node
// Generate static, accessible disclosures from the same laws used by the checker.
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {RULES} from '../games/shared/proof-rules.js';
import {parse,format,variables,assignments,evaluate} from '../games/shared/logic.js';
export const groups=[
 ['double','שלילה כפולה','double',[[0,['!A']]]],
 ['commute','חילוף','commute',[[0,[]],[1,[]]]],
 ['associate','קיבוץ','associate',[[0,['A & B','B & C']],[1,['A | B','B | C']]]],
 ['distribute-and','פילוג של ״וגם״ על ״או״','distribute',[[0,['B | C','A & B','A & C']]]],
 ['distribute-or','פילוג של ״או״ על ״וגם״','distribute',[[1,['B & C','A | B','A | C']]]],
 ['demorgan','דה מורגן','demorgan',[[0,['A & B','!A','!B']],[1,['A | B','!A','!B']],[2,['!A','!B','!A & !B']],[3,['!A','!B','!A | !B']]]],
 ['implication','גרירה כ״או״','implication',[[0,['!A']],[1,['!A']],[2,['!A']],[3,['!B']]]],
 ['contrapositive','גרירה נגדית','contrapositive',[[0,['!A','!B']]]],
 ['iff','אם ורק אם','iff',[[0,['A -> B','B -> A']]]],
 ['xor-or','או מפריד כ״וגם״','xor',[[0,['A | B','A & B','!(A & B)']]]],
 ['xor-cases','או מפריד כ״או״','xor',[[1,['!A','!B','A & !B','!A & B']]]],
 ['xor-iff','או מפריד כ״אם ורק אם״','xor',[[2,['!B']]]],
 ['tautology','טאוטולוגיה','tautology',[[0,['!A']]]],
 ['contradiction','סתירה','contradiction',[[0,['!A']]]],
 ['identity','איבר ניטרלי','identity',[[0,[]],[1,[]],[2,[]],[3,[]]]],
];
const escape=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const tex=source=>format(parse(source,{flatten:false})).replace(/[¬∧∨⊕→↔]/g,c=>({'¬':'\\neg ','∧':'\\land ','∨':'\\lor ','⊕':'\\oplus ','→':'\\to ','↔':'\\leftrightarrow '}[c]));
const math=source=>`<span class="law-formula" dir="ltr">\\(${escape(tex(source))}\\)</span>`;
const chain=(...steps)=>`<div class="law-summary-formula" dir="ltr">${steps.map(math).join(' ≡ ')}</div>`;
// These variants follow from earlier laws; do not repeat their truth tables.
const derivations={
 'demorgan:2':()=>`<p>מציבים ${math('!A')} ו־${math('!B')} בחוק דה מורגן הראשון, ומסירים שלילות כפולות:</p>${chain('!(!A & !B)','!!A | !!B','A | B')}`,
 'demorgan:3':()=>`<p>באותה דרך, מציבים שלילות בחוק דה מורגן השני:</p>${chain('!(!A | !B)','!!A & !!B','A & B')}`,
 'implication:1':()=>`<p>לפי חוק החילוף, אפשר להחליף את סדר החלקים ב״או״:</p>${chain('A -> B','!A | B','B | !A')}`,
 'implication:2':()=>`<p>מציבים ${math('!A')} במקום ${math('A')} בגרירה כ״או״, ומסירים שלילה כפולה:</p>${chain('!A -> B','!!A | B','A | B')}`,
 'implication:3':()=>`<p>מחליפים את תפקידי ${math('A')} ו־${math('B')} בגרסה הקודמת, ומשתמשים בחוק החילוף:</p>${chain('!B -> A','B | A','A | B')}`,
 'contrapositive:0':()=>`<p>כותבים את שתי הגרירות בעזרת ״או״. בגרירה הנגדית מסירים גם שלילה כפולה:</p>${chain('A -> B','!A | B')}${chain('!B -> !A','!!B | !A','B | !A')}<p>שתי התוצאות שקולות לפי חוק החילוף.</p>`,
 'xor:2':()=>`<p>לפי הגדרת ״אם ורק אם״, ${math('A <-> !B')} הוא אמת בדיוק כאשר ${math('A')} ו־${math('!B')} מקבלים אותו ערך אמת. זה קורה בדיוק כאשר ${math('A')} ו־${math('B')} מקבלים ערכים שונים — כלומר, בדיוק אחד מהם אמת. זו הגדרת XOR.</p>`,
 'identity:1':()=>`<p>הגרסה שבה ${math('F')} מימין נובעת מחוק החילוף:</p>${chain('A | F','F | A','A')}`,
 'identity:3':()=>`<p>כך גם כשה־${math('T')} מימין:</p>${chain('A & T','T & A','A')}`,
};
export function buildLawTables(){
 const covered=new Set();
 const sections=groups.map(([id,name,ruleId,variants])=>{
  const rule=RULES.find(r=>r.id===ruleId);
  const proofs=variants.map(([index,aux])=>{
   covered.add(ruleId+':'+index);
   const [left,right]=rule.pairs[index],names=[...new Set([...variables(left),...variables(right)])].sort();
   if(derivations[ruleId+':'+index]){
    if(assignments(names).some(env=>evaluate(left,env)!==evaluate(right,env)))throw Error(`Invalid equivalence: ${left} ≡ ${right}`);
    return `<div class="law-derivation" data-rule="${ruleId}" data-variant="${index}">${derivations[ruleId+':'+index]()}</div>`;
   }
   const columns=[...names,...aux,left,right],resultAt=columns.length-2;
   const rows=assignments(names).map(env=>{
    const values=columns.map(c=>evaluate(c,env));
    if(values.at(-1)!==values.at(-2))throw Error(`Invalid equivalence: ${left} ≡ ${right}`);
    return '<tr>'+values.map((v,i)=>`<td${i>=resultAt?' class="law-result"':''}>${v?'T':'F'}</td>`).join('')+'</tr>';
   });
   const heading=columns.map((c,i)=>`<th scope="col" data-formula="${escape(c)}"${i>=resultAt?' class="law-result"':''}>${i>=resultAt?`<span class="law-side">${i===resultAt?'אגף שמאל':'אגף ימין'}</span>`:''}${math(c)}</th>`).join('');
   return `<div class="law-table-scroll" tabindex="0" role="region" aria-label="טבלת אמת: ${escape(name)}"><table class="law-truth-table" dir="rtl" data-rule="${ruleId}" data-variant="${index}"><caption dir="ltr">${math(left)} <span aria-label="שקול לוגית">≡</span> ${math(right)}</caption><thead><tr>${heading}</tr></thead><tbody>${rows.join('\n')}</tbody></table></div><p class="law-verdict">שתי עמודות התוצאה המודגשות זהות בכל שורה. לכן שני האגפים שקולים לוגית.</p>`;
  });
  // Show both grouping laws and all De Morgan forms while the tables are folded.
  const summaryVariants=['associate','demorgan','implication'].includes(id)?variants:variants.slice(0,1);
  const summaryPairs=summaryVariants.map(([index])=>rule.pairs[index]);
  if(id==='distribute-and')summaryPairs.push(['(B | C) & A','(B & A) | (C & A)']);
  if(id==='distribute-or')summaryPairs.push(['(B & C) | A','(B | A) & (C | A)']);
  const summaryFormulas=summaryPairs.map(([left,right])=>{
   return `<span class="law-summary-formula" dir="ltr">${math(left)} ≡ ${math(right)}</span>`;
  }).join('<br>');
  const note=id==='demorgan'?`<p>אפשר להשתמש בחוק בשני הכיוונים, גם כדי להוציא שלילה מחוץ לסוגריים. <strong>מותר להסיר באותו צעד שלילה כפולה שנוצרת בהפעלת החוק</strong>: למשל, ${math('!(A & !B)')} ≡ ${math('!A | B')}. אין חובה לכתוב תחילה ${math('!A | !!B')}.</p>`:ruleId==='distribute'?`<p>בשורה הראשונה ${math('A')} מופיע משמאל לסוגריים, ובשנייה מימינם. הגרסה השנייה נובעת מהראשונה ומחוק החילוף, ולכן אין צורך בטבלת אמת נוספת.</p>`:'';
  const explanation=id==='implication'?`<p>${math('A | B')} אומר שלפחות אחד החלקים אמת: אם ${math('A')} שקר, ${math('B')} חייב להיות אמת. לכן הוא שקול ל־${math('!A -> B')}. חילוף החלקים ב״או״ נותן גם את ${math('!B -> A')}. <strong>הגרירה עצמה אינה חילופית</strong>: כאן גם השלילה עוברת לחלק האחר.</p>`:id==='xor-or'?`<p>${math('A | B')} דורש שלפחות אחד החלקים אמת; ${math('!(A & B)')} פוסל את האפשרות ששניהם אמת. יחד הם דורשים בדיוק אחד.</p>`:id==='xor-cases'?`<p>שתי האפשרויות הן: ${math('A')} אמת ו־${math('B')} שקר, או להפך. אלה בדיוק המצבים שבהם XOR הוא אמת.</p>`:'';
  const alias=id==='implication'?'<span id="rule-or-implication"></span>':id==='xor-or'?'<span id="rule-xor-rewrite"></span>':'';
  return `${alias}<div class="equivalence-law" id="law-table-${id}"><div class="law-heading"><strong>${escape(name)}</strong><div class="law-formulas">${summaryFormulas}</div></div>\n<details class="law-proof"><summary><span class="law-proof-show">הצדקת הכלל</span><span class="law-proof-hide">הסתר הצדקה</span></summary>\n${note}${explanation}${proofs.join('\n')}</details></div>`;
 });
 for(const rule of RULES)rule.pairs.forEach((_,i)=>{if(!covered.has(rule.id+':'+i))throw Error(`Missing proof for ${rule.id}:${i}`);});
 return '```{=html}\n<!-- Generated by tools/build-equivalence-tables.mjs. -->\n<div class="equivalence-laws">\n'+sections.join('\n')+'\n</div>\n```\n';
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 mkdirSync(new URL('../includes/',import.meta.url),{recursive:true});
 writeFileSync(new URL('../includes/equivalence-truth-tables.qmd',import.meta.url),buildLawTables());
 console.log('includes/equivalence-truth-tables.qmd');
}
