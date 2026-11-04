import { LEVELS } from '../gate/levels.js';
const people=[{id:'A',name:'אלון',g:'m'},{id:'B',name:'בתיה',g:'f'},{id:'C',name:'כרמל',g:'m'}];
const puzzle=(n,statements)=>({people:people.slice(0,n),statements:statements.map(([by,text,formula])=>({by,text,formula}))});
export const KNIGHT_PUZZLES={
  ...Object.fromEntries(LEVELS.map(l=>[l.id,l])),
  'lecture-different':puzzle(2,[['A','בתיה אבירה','B'],['B','בדיוק אחד מאיתנו אביר','A ^ B']]),
  'lecture-undetermined':puzzle(3,[['A','כולנו אבירים','A & B & C'],['B','אלון נוכל','!A']]),
  'lecture-robot':puzzle(2,[['A','שנינו אבירים','A & B'],['B','שנינו אבירים','A & B']]),
  'lecture-impossible':puzzle(2,[['A','אם אני אביר, אז בתיה נוכלת','A -> !B'],['B','אלון אביר','A']]),
};
// Model proofs are optional examples, never the validator's expected sequence.
export const KNIGHT_PROOFS={
 contradiction:{
  level:'both-knaves',premises:['A <-> (!A & !B)'],
  hints:['התחילו מהנחה זמנית A. השתמשו בכלל האי כדי להסיק את האמירה של אלון.','הוציאו מן האמירה את ¬A. כעת אפשר לציין במפורש את שתי השורות הסותרות.','אחרי סגירת ההנחה מתקבל ¬A. מה אומר כעת כלל האי על האמירה של אלון, ומה נובע מכך על B?'],
  model:[
   {formula:'A',rule:'assume',refs:[]},
   {formula:'!A & !B',rule:'iff-use',refs:[1,2]},
   {formula:'!A',rule:'and-out',refs:[3]},
   {formula:'F',rule:'false',refs:[2,4]},
   {formula:'!A',rule:'raa',refs:[2,5]},
   {formula:'!(!A & !B)',rule:'iff-use',refs:[1,6]},
   {formula:'B',rule:'table',refs:[6,7]},
   {formula:'!A & B',rule:'and-in',refs:[6,8]},
  ],
 },
 direct:{
  level:'lecture-different',premises:['A <-> B','B <-> (A ^ B)'],
  hints:['דברי אלון נותנים A ↔ B. באילו שורות התנאי הזה אמת, ומה ערך A ⊕ B בשורות האלה?','אפשר להסיק ¬(A ⊕ B) מן הנתון הראשון בעזרת טבלת אמת.','שלבו את שלילת האמירה של בתיה עם כלל האי עבורה, ואז חזרו לנתון הראשון.'],
  model:[
   {formula:'!(A ^ B)',rule:'table',refs:[1]},
   {formula:'!B',rule:'iff-use',refs:[2,3]},
   {formula:'!A',rule:'iff-use',refs:[1,4]},
   {formula:'!A & !B',rule:'and-in',refs:[5,4]},
  ],
 },
 cases:{
  level:'lecture-robot',allowCases:true,premises:['A <-> (A & B)','B <-> (A & B)'],
  hints:['אפשר לחלק לפי A ו־¬A. בכל מקרה נסו להוכיח A ↔ B.','מתוך ההנחה A וכלל האי של אלון מסיקים A ∧ B.','מתוך ¬A מסיקים שהאמירה A ∧ B שקרית. מה נובע מכך על בתיה? סגרו כל מקרה כגרירה לפני איחוד המקרים.'],
  model:[
   {formula:'A',rule:'assume',refs:[]},
   {formula:'A & B',rule:'iff-use',refs:[1,3]},
   {formula:'A <-> B',rule:'table',refs:[4]},
   {formula:'A -> (A <-> B)',rule:'conditional',refs:[3,5]},
   {formula:'!A',rule:'assume',refs:[]},
   {formula:'!(A & B)',rule:'iff-use',refs:[1,7]},
   {formula:'!B',rule:'iff-use',refs:[2,8]},
   {formula:'A <-> B',rule:'table',refs:[7,9]},
   {formula:'!A -> (A <-> B)',rule:'conditional',refs:[7,10]},
   {formula:'A <-> B',rule:'cases',refs:[6,11]},
  ],
 },
 impossible:{
  level:'lecture-impossible',allowCases:true,premises:['A <-> (A -> !B)','B <-> A'],
  hints:['נסו להניח ¬A. מה ערכה של הגרירה A → ¬B כאשר A שקר?','אם הגרירה אמת, כלל האי של אלון מחייב A. זו סתירה להנחה ¬A.','אחרי שהוכחתם A ללא הנחה זמנית, בדקו מה שתי האמירות מחייבות לגבי B.'],
  model:[
   {formula:'!A',rule:'assume',refs:[]},
   {formula:'A -> !B',rule:'table',refs:[3]},
   {formula:'A',rule:'iff-use',refs:[1,4]},
   {formula:'F',rule:'false',refs:[3,5]},
   {formula:'A',rule:'raa',refs:[3,6]},
   {formula:'A -> !B',rule:'iff-use',refs:[1,7]},
   {formula:'!B',rule:'mp',refs:[8,7]},
   {formula:'B',rule:'iff-use',refs:[2,7]},
   {formula:'F',rule:'false',refs:[9,10]},
  ],
 },
};
