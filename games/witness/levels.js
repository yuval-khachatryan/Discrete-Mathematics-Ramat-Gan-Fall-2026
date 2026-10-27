/* levels.js — "מצאו עד" (quantifiers). Pure data, no DOM.
   ---------------------------------------------------------------------------
   The book embeds single levels by id (?level=<id>&embed=1): keep the ids.
   Fields besides the shell's {id, title, goal, hints, debrief}:
       mode       "evidence"  check cards + a verdict          (levels 1–4)
                  "negation"  pick the negation, then a card   (level 5)
                  "order"     a student × snack grid, 2 parts  (level 6)
       domain     the six students with this level's attributes (see roster)
       preds / rels / ys    the world, as rules.js reads it
       claim      what the robot claims (data, see rules.js)
       claimText  the claim in Hebrew, quoted in the feedback
       say        the robot's speech bubble (the claim, said out loud)
       aside      the robot's remark under it; asideWin replaces it on a win
       show       which attributes the cards show, in order
       example    the element the hints name (tests check it really works)
       expect     what the level advertises; tests/witness.test.mjs checks it
                  against a brute-force evaluation, so a typo in the data
                  fails the tests instead of reaching the classroom.
   --------------------------------------------------------------------------- */

const X = `<span class="m">x</span>`;
const Y = `<span class="m">y</span>`;
const T = true, F = false;

/* avatar = a sprite in games/shared/sprites.js */
export const ROSTER = [
  { id: "alon", name: "אלון", g: "m", avatar: "alon" },
  { id: "batya", name: "בתיה", g: "f", avatar: "batya" },
  { id: "carmel", name: "כרמל", g: "m", avatar: "carmel" },
  { id: "dana", name: "דנה", g: "f", avatar: "ada" },
  { id: "noa", name: "נועה", g: "f", avatar: "emmy" },
  { id: "rami", name: "רמי", g: "m", avatar: "ramanujan" },
];

/** The six students with this level's attributes, one array entry per student
    in ROSTER order: roster({ hw: [T, F, ...] }). */
function roster(attrs) {
  return ROSTER.map((s, i) => {
    const o = { ...s };
    for (const k of Object.keys(attrs)) o[k] = attrs[k][i];
    return o;
  });
}

export const PREDS = {
  submitted: {
    attr: "hw", is: true, letter: "P",
    def: `${X} הגיש/ה את העבודה`,
    yes: { m: "{n} הגיש את העבודה", f: "{n} הגישה את העבודה" },
    no: { m: "{n} לא הגיש את העבודה", f: "{n} לא הגישה את העבודה" },
  },
  locker: {
    attr: "locker", is: true, letter: "P",
    def: `ל־${X} יש תא אחסון`,
    yes: { m: "ל{n} יש תא אחסון", f: "ל{n} יש תא אחסון" },
    no: { m: "ל{n} אין תא אחסון", f: "ל{n} אין תא אחסון" },
  },
  pineapple: {
    attr: "pizza", is: "pineapple", letter: "P",
    def: `${X} אוכל/ת פיצה עם אננס`,
    yes: { m: "{n} אוכל פיצה עם אננס", f: "{n} אוכלת פיצה עם אננס" },
    no: { m: "{n} לא אוכל פיצה עם אננס", f: "{n} לא אוכלת פיצה עם אננס" },
  },
};

export const RELS = {
  likes: {
    attr: "snacks", letter: "L",
    def: `${X} אוהב/ת את ${Y}`,
    yes: { m: "{n} אוהב {y}", f: "{n} אוהבת {y}" },
    no: { m: "{n} לא אוהב {y}", f: "{n} לא אוהבת {y}" },
  },
};

export const SNACKS = [
  { id: "pizza", name: "פיצה", art: "pizza-plain" },
  { id: "falafel", name: "פלאפל", art: "falafel" },
  { id: "apple", name: "תפוחים", art: "apple" },
  { id: "coffee", name: "קפה", art: "coffee" },
];

const DOMAIN = "עולם הדיון D: ששת הסטודנטים שבכרטיסים";
//                         אלון בתיה כרמל דנה נועה רמי
const LOCKERS_SOME = [T, F, T, T, F, F];

export const LEVELS = [
  {
    id: "witness",
    title: "מצאו עד",
    mode: "evidence",
    domainText: DOMAIN,
    preds: PREDS,
    domain: roster({ hw: [F, T, F, F, F, T], locker: LOCKERS_SOME }),
    show: ["hw", "locker"],
    claim: { type: "exists", pred: "submitted" },
    claimText: "יש סטודנט שהגיש את העבודה",
    say: "יש סטודנט שהגיש את העבודה!",
    aside: "לא בדקתי. אבל אני רובוט, אז אני בטוח.",
    asideWin: "ראיתם? עד! אני תמיד צודק. כמעט תמיד. לפעמים.",
    example: "batya",
    expect: { value: true, evidence: "witness" },
    goal: "<p>הרובוט טוען: ״יש סטודנט שהגיש את העבודה״.</p><p><b>איך משחקים:</b> התחום הוא ששת הסטודנטים בכיתה. כל כרטיס מציג את הנתונים על אחד מהם. לחצו על הכרטיסים שישמשו לנימוק התשובה שלכם. לאחר מכן בחרו ״הטענה נכונה״ או ״הטענה שגויה״ ולחצו ״בדיקה״. צריך גם מסקנה נכונה וגם כרטיסים שמספיקים להצדיק אותה.</p><p><b>המשימה:</b> מצאו בכרטיסים ראיה שמאפשרת לקבוע אם הטענה נכונה. שימו לב: ״יש״ פירושו לפחות אחד, ולא בהכרח כולם.</p>",
    hints: [
      "הסתכלו בכל כרטיס על השורה של העבודה: דף עם ✓ ירוק פירושו ״הגיש/ה״, דף עם ✗ אדום פירושו ״לא הגיש/ה״.",
      "בתיה הגישה את העבודה. היא יכולה להיות העדה.",
      "לחצו על הכרטיס של בתיה. יופיע עליו <span class=\"m\">P(בתיה) = <span class=\"tv-T\">T</span></span>, וה״או״ הארוך שמתחת לכרטיסים יהיה מיד <span class=\"tv-T\">T</span>. סמנו <b>הטענה נכונה</b> ולחצו <b>בדיקה</b>.",
    ],
    debrief:
      "<p>טענת ״יש״ מוכיחים עם <b>עד</b> אחד: איבר אחד בתחום שמקיים את <span class=\"m\">P(x)</span>, ואת השאר לא צריך לבדוק. " +
      "על תחום סופי <span class=\"m\">∃x∈D P(x)</span> הוא ״או״ ארוך, <span class=\"m\">P(אלון) ∨ P(בתיה) ∨ … ∨ P(רמי)</span>, ו״או״ נכון ברגע שחלק אחד בו נכון.</p>",
  },
  {
    id: "counter",
    title: "דוגמה נגדית",
    mode: "evidence",
    domainText: DOMAIN,
    preds: PREDS,
    domain: roster({ hw: [T, T, F, T, T, T], locker: LOCKERS_SOME }),
    show: ["hw", "locker"],
    claim: { type: "forall", pred: "submitted" },
    claimText: "כל הסטודנטים הגישו את העבודה",
    say: "כל הסטודנטים הגישו!",
    aside: "כיתה מושלמת. כבר הגשתי בקשה למדליה.",
    asideWin: "כרמל?! אני מבטל את הבקשה למדליה. בינתיים.",
    example: "carmel",
    expect: { value: false, evidence: "counterexample" },
    goal: "<p>הרובוט טוען: ״כל הסטודנטים הגישו את העבודה״.</p><p><b>איך משחקים:</b> התחום הוא ששת הסטודנטים בכיתה. כל כרטיס מציג את הנתונים על אחד מהם. לחצו על הכרטיסים שישמשו לנימוק התשובה שלכם. לאחר מכן בחרו ״הטענה נכונה״ או ״הטענה שגויה״ ולחצו ״בדיקה״. צריך גם מסקנה נכונה וגם כרטיסים שמספיקים להצדיק אותה.</p><p><b>המשימה:</b> בדקו אם הטענה מתאימה לנתונים. אם היא שגויה, בחרו כרטיס שמראה מדוע.</p>",
    hints: [
      "טענת ״לכל״ נופלת בגלל איבר אחד. חפשו כרטיס עם דף ו־✗ אדום: ״לא הגיש/ה״.",
      "הסתכלו על הכרטיס של כרמל.",
      "כרמל לא הגיש: <span class=\"m\">P(כרמל) = <span class=\"tv-F\">F</span></span>. לחצו על הכרטיס שלו (ה״וגם״ הארוך יהיה מיד <span class=\"tv-F\">F</span>), סמנו <b>הטענה שגויה</b> ולחצו <b>בדיקה</b>.",
    ],
    debrief:
      "<p>טענת ״לכל״ מפריכים עם <b>דוגמה נגדית</b> אחת: איבר אחד בתחום שלא מקיים את <span class=\"m\">P(x)</span>. " +
      "על תחום סופי <span class=\"m\">∀x∈D P(x)</span> הוא ״וגם״ ארוך, ו״וגם״ שקרי ברגע שחלק אחד בו שקרי: <span class=\"m\">P(כרמל) = <span class=\"tv-F\">F</span></span> מספיק.</p>",
  },
  {
    id: "check-all",
    title: "לבדוק את כולם",
    mode: "evidence",
    domainText: DOMAIN,
    preds: PREDS,
    domain: roster({ locker: [T, T, T, T, T, T], hw: [T, F, T, T, F, T] }),
    show: ["locker", "hw"],
    claim: { type: "forall", pred: "locker" },
    claimText: "לכל סטודנט בכיתה יש תא אחסון",
    say: "לכל סטודנט בכיתה יש תא אחסון!",
    aside: "הוכחה: בדקתי את אלון, ויש לו תא אחסון. מש״ל.",
    asideWin: "בדקתם את כל השישה? גם אני הייתי עושה את זה. בפעם הבאה. אולי.",
    robotExample: "alon",
    expect: { value: true, evidence: "all" },
    goal: "<p>הרובוט טוען: ״לכל סטודנט בכיתה יש תא אחסון״. הוא בדק רק את אלון והסתפק בכך.</p><p><b>איך משחקים:</b> התחום הוא ששת הסטודנטים בכיתה. כל כרטיס מציג את הנתונים על אחד מהם. לחצו על הכרטיסים שישמשו לנימוק התשובה שלכם. לאחר מכן בחרו ״הטענה נכונה״ או ״הטענה שגויה״ ולחצו ״בדיקה״. צריך גם מסקנה נכונה וגם כרטיסים שמספיקים להצדיק אותה.</p><p><b>המשימה:</b> בדקו אם הטענה עצמה נכונה, ואספו מספיק ראיות כדי להצדיק את תשובתכם. גם טענה נכונה עשויה להיות מלווה בנימוק שאינו מספיק.</p>",
    hints: [
      "הרובוט בדק סטודנט אחד. האם אחד מספיק כדי לדעת משהו על <b>כל</b> השישה?",
      "גם את בתיה, כרמל, דנה, נועה ורמי צריך לבדוק: כל אחד מהם יכול להיות דוגמה נגדית.",
      "לחצו על ששת הכרטיסים, אחד אחרי השני. אם אצל כולם <span class=\"m\">P(x) = <span class=\"tv-T\">T</span></span>, ה״וגם״ הארוך הוא <span class=\"tv-T\">T</span>: סמנו <b>הטענה נכונה</b> ולחצו <b>בדיקה</b>.",
    ],
    debrief: "<p>הטענה נכונה: לכל ששת הסטודנטים יש תא אחסון. אבל בדיקת אלון לבדו לא הספיקה להצדיק אותה. במקרה הזה בדקנו את כל התחום הסופי: <span class=\"m\">P(אלון) ∧ P(בתיה) ∧ … ∧ P(רמי)</span>, וכל החלקים אמת. בתחום אינסופי אי אפשר לבדוק את האיברים אחד־אחד; צריך נימוק כללי.</p>",
  },
  {
    id: "nobody",
    title: "אף אחד",
    mode: "evidence",
    domainText: DOMAIN,
    preds: PREDS,
    domain: roster({ pizza: ["olives", "corn", "mushrooms", "plain", "olives", "corn"], locker: LOCKERS_SOME }),
    show: ["pizza", "locker"],
    claim: { type: "exists", pred: "pineapple" },
    claimText: "יש סטודנט שאוכל פיצה עם אננס",
    say: "יש סטודנט שאוכל פיצה עם אננס!",
    sayIcon: "pizza-pineapple",
    aside: "בכל כיתה יש אחד כזה. סטטיסטיקה!",
    asideWin: "אף אחד? אף אחד?! אני מעדכן את הסטטיסטיקה שלי.",
    expect: { value: false, evidence: "all" },
    goal: "<p>הרובוט טוען: ״יש סטודנט שאוכל פיצה עם אננס״. בכל כרטיס מופיעה הפיצה של אותו סטודנט.</p><p><b>איך משחקים:</b> התחום הוא ששת הסטודנטים בכיתה. כל כרטיס מציג את הנתונים על אחד מהם. לחצו על הכרטיסים שישמשו לנימוק התשובה שלכם. לאחר מכן בחרו ״הטענה נכונה״ או ״הטענה שגויה״ ולחצו ״בדיקה״. צריך גם מסקנה נכונה וגם כרטיסים שמספיקים להצדיק אותה.</p><p><b>המשימה:</b> קבעו אם הטענה נכונה, ובחרו מספיק כרטיסים כדי להצדיק זאת. האם בדיקת פיצה אחת בלי אננס מספיקה?</p>",
    hints: [
      "קראו בכל כרטיס אילו תוספות יש על הפיצה. זהירות: תירס הוא לא אננס.",
      "כרטיס אחד בלי אננס לא מפריך ״יש״, כי אולי האננס אצל מישהו אחר. גם הכרטיס של רמי, האחרון, צריך בדיקה.",
      "לחצו על ששת הכרטיסים. אם אצל כולם <span class=\"m\">P(x) = <span class=\"tv-F\">F</span></span>, ה״או״ הארוך הוא <span class=\"tv-F\">F</span>: סמנו <b>הטענה שגויה</b> ולחצו <b>בדיקה</b>.",
    ],
    debrief:
      "<p>כדי להפריך <span class=\"m\">∃x∈D P(x)</span> לא מספיק איבר אחד שלא מתאים: צריך להראות ש<b>אף</b> איבר לא מתאים, כלומר <span class=\"m\">∀x∈D ¬P(x)</span>, ולכן בודקים את כולם. " +
      "הנה כל הכלל של המשחק:</p>" +
      "<table class=\"w-rule\"><thead><tr><th scope=\"col\">הטענה</th><th scope=\"col\">כשהיא נכונה</th><th scope=\"col\">כשהיא שקרית</th></tr></thead><tbody>" +
      "<tr><th scope=\"row\"><span class=\"m\">∀x∈D P(x)</span></th><td>בודקים את כולם</td><td>דוגמה נגדית אחת</td></tr>" +
      "<tr><th scope=\"row\"><span class=\"m\">∃x∈D P(x)</span></th><td>עד אחד</td><td>בודקים את כולם</td></tr>" +
      "</tbody></table>",
  },
  {
    id: "negation",
    title: "״לא כולם״",
    mode: "negation",
    domainText: DOMAIN,
    preds: PREDS,
    domain: roster({ hw: [T, F, F, T, F, F], locker: LOCKERS_SOME }),
    show: ["hw", "locker"],
    target: { type: "forall", pred: "submitted" },               // ״כולם הגישו״
    claim: { type: "forall", pred: "submitted", neg: true },     // the robot's reading: ״אף אחד לא הגיש״
    claimText: "אף אחד לא הגיש",
    say: "״לא כולם הגישו״? כלומר אף אחד לא הגיש!",
    aside: "אני מבטל את השיעור לכולם. יעילות!",
    asideWin: "מישהו כן הגיש? אז השיעור לא מבוטל. ביטלתי את הביטול.",
    example: "alon",
    options: [
      {
        claim: { type: "forall", pred: "submitted", neg: true },
        text: "״אף סטודנט לא הגיש״", robot: true,
        why: "זה בדיוק הפירוש של הרובוט: ״כל סטודנט לא הגיש״, כלומר אף אחד. אבל ״לא כולם״ אומר רק שחסר לפחות אחד, לא שחסרים כולם.",
      },
      {
        claim: { type: "exists", pred: "submitted" },
        text: "״יש סטודנט שהגיש״",
        why: "״יש מי שהגיש״ נכון גם כשכולם הגישו, ואז ״לא כולם הגישו״ שקרי. השלילה צריכה להיות נכונה בדיוק כש״כולם הגישו״ שקרי.",
      },
      {
        claim: { type: "exists", pred: "submitted", neg: true },
        text: "״יש סטודנט שלא הגיש״",
      },
      {
        claim: { type: "not", of: { type: "exists", pred: "submitted", neg: true } },
        text: "״אין סטודנט שלא הגיש״",
        why: "״אין סטודנט שלא הגיש״ אומר בדיוק ש״כולם הגישו״. זו הטענה עצמה, לא השלילה שלה.",
      },
    ],
    expect: { robotValue: false, messageValue: true, robotEvidence: "counterexample", correct: 2, robotOption: 0 },
    goal: "<p>המרצה כתבה ״לא כולם הגישו את העבודה״. הרובוט פירש זאת כ״אף אחד לא הגיש את העבודה״. התחום הוא ששת הסטודנטים בכיתה; נתוני ההגשה של כולם מופיעים בכרטיסים.</p><p><b>משימה 1 — תרגום:</b> בחרו את המשפט והנוסחה שפירושם בדיוק ״לא כולם הגישו״. הסימון <span class=\"m\">P(x)</span> פירושו ״x הגיש את העבודה״.</p><p><b>משימה 2 — בדיקת הפירוש של הרובוט:</b> בחרו כרטיס שמפריך את הטענה ״אף אחד לא הגיש״. כאן מחפשים מי שכן הגיש, ולא מי שלא הגיש. לאחר שתי הבחירות לחצו ״בדיקה״.</p>",
    hints: [
      "״לא כולם הגישו״ נכון ברגע שחסר/ה <b>אחד/ת</b>. איזו נוסחה אומרת ״יש מישהו שלא הגיש״?",
      "הנוסחה היא <span class=\"m\">∃x∈D ¬P(x)</span>. עכשיו, כדי להפריך את הפירוש של הרובוט, <span class=\"m\">∀x∈D ¬P(x)</span>, הסתכלו על אלון.",
      "אלון הגיש: <span class=\"m\">P(אלון) = <span class=\"tv-T\">T</span></span>, וזו דוגמה נגדית ל״אף אחד לא הגיש״. בחרו <span class=\"m\">∃x∈D ¬P(x)</span>, לחצו על הכרטיס של אלון ולחצו <b>בדיקה</b>.",
    ],
    debrief:
      "<p>״לא כולם הגישו״ הוא <span class=\"m\">¬∀x∈D P(x)</span>, וזה שקול ל־<span class=\"m\">∃x∈D ¬P(x)</span>, ״יש מישהו שלא הגיש״. הוא לא שקול ל־<span class=\"m\">∀x∈D ¬P(x)</span>, ״אף אחד לא הגיש״. " +
      "זה כלל דה מורגן המוכלל: <span class=\"m\">¬∀x∈D P(x) ≡ ∃x∈D ¬P(x)</span> וגם <span class=\"m\">¬∃x∈D P(x) ≡ ∀x∈D ¬P(x)</span>. השלילה נכנסת פנימה, ו־<span class=\"m\">∀</span> ו־<span class=\"m\">∃</span> מתחלפים.</p>",
  },
  {
    id: "order",
    title: "סדר הכמתים",
    mode: "order",
    domainText: DOMAIN,
    rels: RELS,
    ys: SNACKS,
    domain: roster({
      snacks: [
        ["pizza", "coffee"],                 // אלון
        ["falafel", "apple", "coffee"],      // בתיה
        ["pizza", "falafel", "coffee"],      // כרמל
        ["apple", "coffee"],                 // דנה
        ["pizza", "falafel", "apple"],       // נועה
        ["coffee"],                          // רמי
      ],
    }),
    parts: [
      { claim: { type: "forall-exists", rel: "likes" }, text: "כל סטודנט אוהב פריט כלשהו" },
      { claim: { type: "exists-forall", rel: "likes" }, text: "יש פריט שכל הסטודנטים אוהבים" },
    ],
    say: "כל סטודנט אוהב פריט כלשהו. לכן יש פריט שכל הסטודנטים אוהבים!",
    aside: "אזמין להפסקה רק אותו, ואחסוך לקמפוס הון.",
    asideWin: "אז צריך להזמין יותר מפריט אחד? התקציב שלי בוכה. בשקט, כמו רובוט.",
    expect: { values: [true, false], evidence: ["witness-per-x", "counterexample-per-y"] },
    // the picks hint 3 spells out (tests check that they are correct)
    example: [
      { alon: "pizza", batya: "falafel", carmel: "pizza", dana: "apple", noa: "pizza", rami: "coffee" },
      { pizza: "batya", falafel: "alon", apple: "carmel", coffee: "noa" },
    ],
    goal: "<p>התחום של x הוא ששת הסטודנטים בכיתה. התחום של y הוא ארבעת הפריטים בתפריט: פיצה, פלאפל, תפוחים וקפה. לב מסמן שהסטודנט אוהב את הפריט; נקודה מסמנת שאינו אוהב אותו. <span class=\"m\">L(x, y)</span> פירושו ״הסטודנט x אוהב את הפריט y״.</p><p><b>חלק 1:</b> הטבלה מציגה מי אוהב כל פריט. הראו שלכל סטודנט יש לפחות פריט אחד שהוא אוהב. בחרו תא עם לב בכל שורה ולחצו ״בדיקה״. אין צורך לבחור אותו פריט לכולם.</p><p><b>חלק 2:</b> הראו שאין פריט אחד שכולם אוהבים. בחרו תא בלי לב בכל עמודה ולחצו ״בדיקה״. כל בחירה מצביעה על סטודנט שאינו אוהב את הפריט שבאותה עמודה.</p>",
    hints: [
      "בחלק 1 עוברים <b>שורה־שורה</b>: לכל סטודנט מחפשים לב בשורה שלו/ה. בחלק 2 עוברים <b>עמודה־עמודה</b>: לכל פריט מחפשים משבצת בלי לב.",
      "בחלק 1 שימו לב לרמי: הוא אוהב רק קפה. בחלק 2 החשוד העיקרי הוא הקפה, כי כמעט כולם אוהבים אותו. כמעט. בדקו את נועה.",
      "חלק 1, למשל: אלון ← פיצה, בתיה ← פלאפל, כרמל ← פיצה, דנה ← תפוחים, נועה ← פיצה, רמי ← קפה. חלק 2, למשל: פיצה ← בתיה, פלאפל ← אלון, תפוחים ← כרמל, קפה ← נועה.",
    ],
    debrief: "<p>שתי הטענות מתייחסות לאותה טבלה, אך משמעותן שונה. בטענה <span class=\"m\">∀x∈D ∃y∈M L(x, y)</span> מותר לבחור פריט אחר לכל סטודנט; למשל, קפה לרמי ופיצה לנועה. בטענה <span class=\"m\">∃y∈M ∀x∈D L(x, y)</span> צריך למצוא פריט מסוים שכולם אוהבים. כאן אין פריט כזה, כפי שמראות הבחירות בחלק 2. הטענה השנייה גוררת את הראשונה, אך הראשונה אינה גוררת את השנייה.</p>",
  },
];
