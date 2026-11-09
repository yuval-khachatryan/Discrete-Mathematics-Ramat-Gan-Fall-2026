import {BASIC_RULES} from './set-proof-checker.js';
const defaults={sets:['A','B','C','U','X'],objects:['x'],rules:[...BASIC_RULES,'intersection','union','difference','empty']};
const part=(givens,start,goal,extra={})=>({...defaults,givens,start,goal,...extra});
const inc=(givens,left,right,extra={})=>part(givens.filter(g=>g!=='x ∈ U'),null,`(${left}) ⊆ (${right})`,{
  flow:'goals',conclusion:`${left} ⊆ ${right}`,...extra});
function inclusion(title,givens,left,right,hint,extra={}){return {title,target:`${left} ⊆ ${right}`,hint,parts:[inc(givens,left,right,extra)]};}
function equality(title,givens,left,right,hint,extra={}){
  const rules=extra.rules||defaults.rules;
  return {title,target:`${left} = ${right}`,hint,
    parts:[inc(givens,left,right,{...extra,title:'ההכלה הראשונה'}),inc(givens,right,left,{...extra,title:'ההכלה השנייה',goal:`(${left}) ⊇ (${right})`,conclusion:`${left} ⊇ ${right}`})],
    equivalence:[part(givens,`x ∈ (${left})`,`x ∈ (${right})`,{...extra,mode:'equivalence',intro:'יהי x איבר כלשהו. נראה שתנאי השייכות לשתי הקבוצות שקולים.',conclusion:`${left} = ${right}`,rules:rules.filter(r=>r.startsWith('eq:')||['equal-use','intersection','union','difference','complement','empty','symmetric','power'].includes(r))})]};
}
const withComplement={universe:'U',rules:[...defaults.rules,'complement','universe-member']};
export const SET_PROOFS={
  'inclusion-chain':inclusion('שרשרת הכלות',['A ⊆ B','B ⊆ C'],'A','C','פתחו את הגדרת ההכלה במטרה. עקבו אחר איבר כלשהו באמצעות שתי ההכלות הנתונות.'),
  'intersection-target':inclusion('שתי דרישות לאותו איבר',['A ⊆ B','A ⊆ C'],'A','B ∩ C','כדי להגיע לחיתוך, הראו בנפרד שייכות ל־B ול־C.'),
  'union-target':inclusion('שתי דרכים לאותה קבוצה',['A ⊆ C','B ⊆ C'],'A ∪ B','C','פתחו שני מקרים על פי השייכות לאיחוד. סגרו כל ענף כגרירה, ואז השתמשו בכלל המקרים.'),
  'mixed-union':inclusion('וגם, ואז או',[],'A ∩ (B ∪ C)','(A ∩ B) ∪ C','פצלו את השייכות לחיתוך. מן השייכות לאיחוד מתקבלים שני מקרים.'),
  'double-difference':equality('הפרש בתוך הפרש',[],'A ∖ (A ∖ B)','A ∩ B','פתחו את הגדרת ההפרש, תחילה בחוץ ואחר כך בפנים. אפשר להשתמש בדה מורגן ובפילוג.'),
  'proof-union':inclusion('מהאיחוד אל איחוד גדול יותר',['A ⊆ B'],'A ∪ C','B ∪ C','בשני המקרים אפשר להגיע לאיחוד המבוקש, אך לאותו מקור אין תפקיד בשניהם.'),
  'proof-demorgan':equality('דה מורגן בקבוצות',['x ∈ U'],'(A ∪ B)ᶜ','Aᶜ ∩ Bᶜ','פענחו את המשלים ואת האיחוד; שלילת ״או״ נותנת ״וגם״ של שתי השלילות.',withComplement),
  'complement-inclusion':inclusion('הכיוון מתהפך במשלים',['A ⊆ B','x ∈ U'],'Bᶜ','Aᶜ','מאיבר שאינו ב־B אפשר להסיק שאינו ב־A. אל תשכחו שהמשלים נלקח בתוך U.',withComplement),
  'hw-intersection':{title:'משתמשים בשני הנתונים',target:'x ∈ A ∩ C',hint:'הוציאו משייכות לחיתוך את שתי השייכויות. איזו מהן מאפשרת להשתמש בהכלה?',parts:[part(['x ∈ A ∩ B','B ⊆ C'],null,'x ∈ A ∩ C')]},
  'hw-union':inclusion('די באחד הצדדים',[],'A ∩ B','A ∪ C','לא נדרש להוכיח שייכות ל־C. איזה חלק מהנתון מספיק?'),
  'hw-absorption':{title:'שוויון והכלה — שני הכיוונים',target:'(A ∩ B = A) ↔ (A ⊆ B)',hint:'בכיוון הראשון משתמשים בשוויון הנתון. בכיוון השני מוכיחים שתי הכלות.',parts:[
    inc(['A ∩ B = A'],'A','B',{title:'מן השוויון אל ההכלה'}),
    inc(['A ⊆ B'],'A ∩ B','A',{title:'מן ההכלה אל השוויון: הכלה ראשונה'}),
    inc(['A ⊆ B'],'A','A ∩ B',{title:'מן ההכלה אל השוויון: הכלה שנייה'}),
  ]},
  'hw-difference':inclusion('מוציאים יותר, נשאר פחות',['A ⊆ B'],'C ∖ B','C ∖ A','מן ההכלה ומאי־שייכות ל־B אפשר להסיק אי־שייכות ל־A. אפשר גם להוכיח זאת בדרך השלילה.'),
  'hw-witness':{title:'אותו איבר מפריך גם את ההכלה השנייה',target:'(x ∈ B) ∧ (x ∉ C)',hint:'השתמשו באיבר הנתון. אין צורך לחפש איבר חדש.',parts:[part(['A ⊆ B','x ∈ A','x ∉ C'],null,'(x ∈ B) ∧ (x ∉ C)',{conclusion:'האיבר x שייך ל־B ואינו שייך ל־C, ולכן B אינה מוכלת ב־C.'})]},
  'hw-demorgan':equality('הפרש של איחוד',[],'A ∖ (B ∪ C)','(A ∖ B) ∩ (A ∖ C)','השתמשו בהגדרת ההפרש, בהגדרת האיחוד ובדה מורגן.'),
  'hw-union-diff':inclusion('הכלה אינה בהכרח שוויון',[],'(A ∪ B) ∖ C','A ∪ (B ∖ C)','חלקו למקרים על פי השייכות לאיחוד. אי־השייכות ל־C נתונה בשני המקרים.'),
  'hw-difference-cases':inclusion('בוחרים בעצמנו את המקרים',[],'A ∖ C','(A ∖ B) ∪ (B ∖ C)','חלקו לפי השאלה אם x שייך ל־B. הטענה ושלילתה מכסות את כל האפשרויות.'),
  'hw-association':equality('איך הסוגריים משפיעים?',[],'(A ∖ B) ∖ C','A ∖ (B ∪ C)','בשני הצדדים יש שייכות ל־A ואי־שייכות לכל אחת מן הקבוצות האחרות.'),
};

// Restrict the reference bank to definitions introduced before each activity.
for(const id of ['inclusion-chain'])for(const p of SET_PROOFS[id].parts)p.rules=p.rules.filter(r=>!['intersection','union','difference','subset-chain'].includes(r));
for(const id of ['intersection-target'])for(const p of SET_PROOFS[id].parts)p.rules=p.rules.filter(r=>!['union','difference'].includes(r));
for(const id of ['union-target','mixed-union','proof-union'])for(const p of SET_PROOFS[id].parts)p.rules=p.rules.filter(r=>r!=='difference');
// Later exercises may cite the set laws already stated in the chapter.
for(const [id,exercise]of Object.entries(SET_PROOFS))if(id.startsWith('hw-')||['proof-union','mixed-union','proof-demorgan'].includes(id)){
  for(const p of [...exercise.parts,...(exercise.equivalence||[])]){
    p.rules=[...p.rules,'set-commute','set-associate','set-distribute','set-empty'];
    if(p.universe&&id!=='proof-demorgan')p.rules.push('set-demorgan','set-double-complement');
  }
}
