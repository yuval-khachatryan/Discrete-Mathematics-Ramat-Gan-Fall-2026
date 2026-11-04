export const METHOD_EXERCISES = {
  "event": {
    "atoms": [
      {
        "id": "A",
        "text": "האירוע יתקיים ביום שני"
      },
      {
        "id": "B",
        "text": "דנה תשתתף באירוע"
      },
      {
        "id": "C",
        "text": "דנה תהיה בנסיעת עבודה"
      }
    ],
    "premises": [
      {
        "formula": "A -> B",
        "text": "אם האירוע יתקיים ביום שני, דנה תשתתף באירוע."
      },
      {
        "formula": "A -> C",
        "text": "אם האירוע יתקיים ביום שני, דנה תהיה בנסיעת עבודה."
      },
      {
        "formula": "C -> !B",
        "text": "אם דנה תהיה בנסיעת עבודה, דנה לא תשתתף באירוע."
      }
    ],
    "goal": {
      "formula": "!A",
      "text": "האירוע לא יתקיים ביום שני."
    },
    "method": "raa",
    "rules": [
      "mp",
      "mt",
      "hs",
      "and-out",
      "and-in",
      "iff-use",
      "assume",
      "eq:replacements",
      "false",
      "raa"
    ],
    "hints": [
      "מן ההנחה שהאירוע יתקיים ביום שני אפשר להסיק שתי מסקנות, בעזרת שני הנתונים הראשונים. מהן?",
      "מן הנתון השלישי אפשר להגיע לטענה שסותרת אחת ממסקנות הביניים. ציינו את שתי הטענות הסותרות."
    ],
    "solution": [
      {
        "formula": "A",
        "rule": "assume",
        "refs": []
      },
      {
        "formula": "B",
        "rule": "mp",
        "refs": [
          1,
          4
        ]
      },
      {
        "formula": "C",
        "rule": "mp",
        "refs": [
          2,
          4
        ]
      },
      {
        "formula": "!B",
        "rule": "mp",
        "refs": [
          3,
          6
        ],
        "text": "דנה לא תשתתף באירוע"
      },
      {
        "formula": "F",
        "rule": "false",
        "refs": [
          5,
          7
        ]
      },
      {
        "formula": "!A",
        "rule": "raa",
        "refs": [
          4,
          8
        ]
      }
    ]
  },
  "saved-file": {
    "atoms": [
      {
        "id": "A",
        "text": "הקובץ נשמר"
      },
      {
        "id": "B",
        "text": "מופיעה הודעת שגיאה"
      },
      {
        "id": "C",
        "text": "מופיע סמל אזהרה"
      }
    ],
    "premises": [
      {
        "formula": "!A -> B",
        "text": "אם הקובץ לא נשמר, מופיעה הודעת שגיאה."
      },
      {
        "formula": "B -> C",
        "text": "אם מופיעה הודעת שגיאה, מופיע סמל אזהרה."
      },
      {
        "formula": "!C",
        "text": "לא מופיע סמל אזהרה."
      }
    ],
    "goal": {
      "formula": "A",
      "text": "הקובץ נשמר."
    },
    "method": "raa",
    "rules": [
      "mp",
      "mt",
      "hs",
      "and-out",
      "and-in",
      "iff-use",
      "assume",
      "eq:replacements",
      "false",
      "raa"
    ],
    "hints": [
      "ההנחה הזמנית היא שהקובץ לא נשמר. מה נובע ממנה לפי הנתון הראשון?",
      "עקבו אחרי ההשלכות של ההנחה עד שתגיעו לטענה שסותרת נתון. בסוף דחו את ההנחה הזמנית."
    ],
    "solution": [
      {
        "formula": "!A",
        "rule": "assume",
        "refs": [],
        "text": "הקובץ לא נשמר"
      },
      {
        "formula": "B",
        "rule": "mp",
        "refs": [
          1,
          4
        ]
      },
      {
        "formula": "C",
        "rule": "mp",
        "refs": [
          2,
          5
        ]
      },
      {
        "formula": "F",
        "rule": "false",
        "refs": [
          3,
          6
        ]
      },
      {
        "formula": "A",
        "rule": "raa",
        "refs": [
          4,
          7
        ]
      }
    ]
  },
  "instructions": {
    "atoms": [
      {
        "id": "A",
        "text": "המדפסת פועלת"
      },
      {
        "id": "B",
        "text": "לדנה יש עותק מודפס של ההנחיות"
      },
      {
        "id": "C",
        "text": "לדנה יש עותק דיגיטלי של ההנחיות"
      },
      {
        "id": "D",
        "text": "דנה יכולה לקרוא את ההנחיות"
      }
    ],
    "premises": [
      {
        "formula": "A -> B",
        "text": "אם המדפסת פועלת, לדנה יש עותק מודפס של ההנחיות."
      },
      {
        "formula": "!A -> C",
        "text": "אם המדפסת אינה פועלת, לדנה יש עותק דיגיטלי של ההנחיות."
      },
      {
        "formula": "B -> D",
        "text": "אם לדנה יש עותק מודפס של ההנחיות, דנה יכולה לקרוא את ההנחיות."
      },
      {
        "formula": "C -> D",
        "text": "אם לדנה יש עותק דיגיטלי של ההנחיות, דנה יכולה לקרוא את ההנחיות."
      }
    ],
    "goal": {
      "formula": "D",
      "text": "דנה יכולה לקרוא את ההנחיות."
    },
    "method": "cases",
    "rules": [
      "mp",
      "mt",
      "hs",
      "and-out",
      "and-in",
      "iff-use",
      "assume",
      "eq:replacements",
      "conditional",
      "cases"
    ],
    "hints": [
      "חלקו לפי השאלה אם המדפסת פועלת. בכל מקרה צריך להגיע לאותה מסקנה, גם אם דרך הביניים שונה.",
      "במקרה הראשון עוברים דרך העותק המודפס; בשני דרך העותק הדיגיטלי. סגרו כל מקרה כגרירה לפני שתאחדו אותם."
    ],
    "solution": [
      {
        "formula": "A",
        "rule": "assume",
        "refs": []
      },
      {
        "formula": "B",
        "rule": "mp",
        "refs": [
          1,
          5
        ]
      },
      {
        "formula": "D",
        "rule": "mp",
        "refs": [
          3,
          6
        ]
      },
      {
        "formula": "A -> D",
        "rule": "conditional",
        "refs": [
          5,
          7
        ]
      },
      {
        "formula": "!A",
        "rule": "assume",
        "refs": [],
        "text": "המדפסת אינה פועלת"
      },
      {
        "formula": "C",
        "rule": "mp",
        "refs": [
          2,
          9
        ]
      },
      {
        "formula": "D",
        "rule": "mp",
        "refs": [
          4,
          10
        ]
      },
      {
        "formula": "!A -> D",
        "rule": "conditional",
        "refs": [
          9,
          11
        ]
      },
      {
        "formula": "D",
        "rule": "cases",
        "refs": [
          8,
          12
        ]
      }
    ]
  },
  "backup": {
    "atoms": [
      {
        "id": "A",
        "text": "המחשב מחובר לרשת"
      },
      {
        "id": "B",
        "text": "נוצר עותק גיבוי"
      },
      {
        "id": "C",
        "text": "מוצגת הודעת אישור"
      }
    ],
    "premises": [
      {
        "formula": "A -> (B & C)",
        "text": "אם המחשב מחובר לרשת, נוצר עותק גיבוי ומוצגת הודעת אישור."
      },
      {
        "formula": "!A -> B",
        "text": "אם המחשב אינו מחובר לרשת, נוצר עותק גיבוי."
      },
      {
        "formula": "!A -> C",
        "text": "אם המחשב אינו מחובר לרשת, מוצגת הודעת אישור."
      }
    ],
    "goal": {
      "formula": "B & C",
      "text": "נוצר עותק גיבוי ומוצגת הודעת אישור."
    },
    "method": "cases",
    "rules": [
      "mp",
      "mt",
      "hs",
      "and-out",
      "and-in",
      "iff-use",
      "assume",
      "eq:replacements",
      "conditional",
      "cases"
    ],
    "hints": [
      "חלקו לפי החיבור לרשת. המסקנה משותפת לשני המקרים, אבל לא מתקבלת באותו מספר צעדים.",
      "במקרה A אפשר להסיק את המסקנה כולה. במקרה ¬A צריך להסיק כל חלק בנפרד ולחבר אותם באמצעות ״וגם״."
    ],
    "solution": [
      {
        "formula": "A",
        "rule": "assume",
        "refs": []
      },
      {
        "formula": "B & C",
        "rule": "mp",
        "refs": [
          1,
          4
        ]
      },
      {
        "formula": "A -> (B & C)",
        "rule": "conditional",
        "refs": [
          4,
          5
        ]
      },
      {
        "formula": "!A",
        "rule": "assume",
        "refs": [],
        "text": "המחשב אינו מחובר לרשת"
      },
      {
        "formula": "B",
        "rule": "mp",
        "refs": [
          2,
          7
        ]
      },
      {
        "formula": "C",
        "rule": "mp",
        "refs": [
          3,
          7
        ]
      },
      {
        "formula": "B & C",
        "rule": "and-in",
        "refs": [
          8,
          9
        ]
      },
      {
        "formula": "!A -> (B & C)",
        "rule": "conditional",
        "refs": [
          7,
          10
        ]
      },
      {
        "formula": "B & C",
        "rule": "cases",
        "refs": [
          6,
          11
        ]
      }
    ]
  }
};
