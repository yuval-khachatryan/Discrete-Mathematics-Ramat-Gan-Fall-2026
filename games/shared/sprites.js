/* sprites.js — the campus characters and a few icons, as plain SVG strings.
   ---------------------------------------------------------------------------
   One flat style for everything: no outlines, soft shapes, a 100×100 box for
   characters and a 48×48 box for icons. Games inline them
   (el.innerHTML = sprite("euler")); the book uses the same pictures as files
   under games/shared/sprites/, written by `node tools/build-sprites.mjs`.

   To replace a character with hand-drawn art later, overwrite its file in
   games/shared/sprites/ AND its entry here (or make the entry load the file).
   --------------------------------------------------------------------------- */

import { signalMarkup, bulbMarkup } from "./signal.js";

const INK = "#1f2937";

const SKIN = {
  light: ["#f6d3b3", "#e8b994"],
  warm: ["#e9b98f", "#d39d72"],
  tan: ["#c98e62", "#b07650"],
  deep: ["#8d5a3b", "#77482d"],
};

/* ---- building blocks (100×100) --------------------------------------- */

const body = (shirt) =>
  `<path d="M16 100 C16 79 30 70 50 70 C70 70 84 79 84 100 Z" fill="${shirt}"/>`;
const neck = (s) => `<rect x="43" y="58" width="14" height="15" rx="4" fill="${s[1]}"/>`;
const head = (s) =>
  `<circle cx="30.5" cy="45" r="4.5" fill="${s[1]}"/><circle cx="69.5" cy="45" r="4.5" fill="${s[1]}"/>` +
  `<ellipse cx="50" cy="42" rx="19.5" ry="21.5" fill="${s[0]}"/>`;
const face = ({ smile = "smile", brows = false } = {}) => {
  let f = `<circle cx="42.5" cy="44" r="2.6" fill="${INK}"/><circle cx="57.5" cy="44" r="2.6" fill="${INK}"/>`;
  f += `<circle cx="38" cy="51" r="3.2" fill="#f87171" opacity=".28"/><circle cx="62" cy="51" r="3.2" fill="#f87171" opacity=".28"/>`;
  if (smile === "smile") f += `<path d="M44 53.5 Q50 58.5 56 53.5" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  if (smile === "grin") f += `<path d="M43 52.5 Q50 60 57 52.5 Z" fill="${INK}"/><path d="M45 53.3 Q50 55.5 55 53.3" stroke="#fff" stroke-width="1.6" fill="none"/>`;
  if (smile === "flat") f += `<path d="M45 55 L55 55" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
  if (brows) f += `<path d="M38.5 38.5 L46 37" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><path d="M54 37 L61.5 38.5" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
  return f;
};
const glasses = `<g fill="none" stroke="${INK}" stroke-width="1.8"><circle cx="42.5" cy="44" r="5.5"/><circle cx="57.5" cy="44" r="5.5"/><path d="M48 44 L52 44"/></g>`;
const moustache = (c) => `<path d="M40 51.5 Q45 47.5 50 50.5 Q55 47.5 60 51.5 Q55 53.5 50 52 Q45 53.5 40 51.5 Z" fill="${c}"/>`;
const collar = `<path d="M40 71 L50 81 L60 71 L56 69 L50 75 L44 69 Z" fill="#fff"/>`;
const bowtie = (c) => `<path d="M42 74 L50 78 L58 74 L58 84 L50 80 L42 84 Z" fill="${c}"/><circle cx="50" cy="79" r="2.4" fill="${c}"/>`;

const HAIR = {
  short: (c) => `<path d="M30.5 40 C30 22 40 17 50 17 C61 17 70 22 69.5 40 C66 31 58 28 50 29 C42 28 34 31 30.5 40 Z" fill="${c}"/>`,
  side: (c) => `<path d="M30.5 46 C28 34 32 26 37 25 L38 37 C35 39 33 42 30.5 46 Z" fill="${c}"/><path d="M69.5 46 C72 34 68 26 63 25 L62 37 C65 39 67 42 69.5 46 Z" fill="${c}"/>`,
  curly: (c) => [22, 32, 42, 50, 58, 68, 78].map((x, i) =>
    `<circle cx="${x * 0.55 + 22.5}" cy="${i % 2 ? 21 : 25}" r="7.5" fill="${c}"/>`).join("") +
    `<circle cx="31.5" cy="33" r="6" fill="${c}"/><circle cx="68.5" cy="33" r="6" fill="${c}"/>`,
  long: (c) => `<path d="M28 44 C26 18 40 14 50 14 C60 14 74 18 72 44 L74 70 C66 74 34 74 26 70 Z" fill="${c}"/>`,
  longTop: (c) => `<path d="M30.5 42 C31 24 40 19 50 19 C60 19 69 24 69.5 42 C63 30 55 26 46 30 C40 32 34 36 30.5 42 Z" fill="${c}"/>`,
  bun: (c) => `<circle cx="50" cy="15" r="8.5" fill="${c}"/>` +
    `<path d="M30.5 42 C30 23 40 19 50 19 C60 19 70 23 69.5 42 C66 32 58 29 50 30 C42 29 34 32 30.5 42 Z" fill="${c}"/>` +
    `<path d="M30 44 C26 50 28 56 31 58" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M70 44 C74 50 72 56 69 58" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  bob: (c) => `<path d="M28 50 C25 22 38 16 50 16 C62 16 75 22 72 50 L66 52 C68 40 64 32 50 31 C38 31 32 38 34 52 Z" fill="${c}"/>`,
  slick: (c) => `<path d="M30.5 40 C29 24 38 18 52 18 C63 18 70 25 69.5 38 C62 30 48 26 40 30 C35 32 32 36 30.5 40 Z" fill="${c}"/><path d="M44 21 Q56 22 64 30" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none"/>`,
};

function person({ skin = "light", hair, hairColour = "#4b3621", back, shirt = "#6366f1", extra = "", top = "", faceOpts }) {
  const s = SKIN[skin];
  return svg100(
    (back ? HAIR[back](hairColour) : "") +
    body(shirt) + neck(s) + head(s) +
    (hair ? HAIR[hair](hairColour) : "") +
    face(faceOpts) + extra + top,
  );
}
const svg100 = inner => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
const svg48 = inner => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true">${inner}</svg>`;

/* ---- the cast --------------------------------------------------------- */

export const SPRITES = {
  /* the bar: real mathematicians, cartoon versions */
  euler: person({
    skin: "light", hair: "side", hairColour: "#d1d5db", shirt: "#7c3aed",
    extra: collar,
    // Euler's famous soft cloth cap
    top: `<path d="M28 34 C26 18 40 10 52 11 C66 12 76 20 72 34 C64 28 38 27 28 34 Z" fill="#e7d3a8"/><path d="M30 33 C40 29 60 28 71 33" stroke="#c9b17f" stroke-width="2.5" fill="none"/>`,
  }),
  ada: person({
    skin: "light", hair: "bun", hairColour: "#3f2a1d", shirt: "#db2777",
    extra: `<path d="M38 72 Q50 82 62 72" stroke="#fbcfe8" stroke-width="3" fill="none"/>`,
  }),
  gauss: person({
    skin: "light", hair: "side", hairColour: "#e5e7eb", shirt: "#334155",
    extra: collar,
    // Gauss's black velvet cap
    top: `<path d="M31 31 C31 17 42 13 50 13 C58 13 69 17 69 31 C62 26 38 26 31 31 Z" fill="#111827"/>`,
    faceOpts: { brows: true },
  }),
  emmy: person({
    skin: "light", hair: "bob", hairColour: "#2d2418", shirt: "#0891b2",
    extra: glasses,
  }),
  ramanujan: person({
    skin: "deep", hair: "short", hairColour: "#111827", shirt: "#0d9488",
    extra: `<path d="M40 71 L50 79 L60 71" stroke="#cbd5e1" stroke-width="2.5" fill="none"/>`,
  }),

  /* campus */
  // the falafel seller (key "barman" kept: the game folder and URLs use it)
  barman: person({
    skin: "warm", hair: "slick", hairColour: "#1f2937", shirt: "#f8fafc",
    extra: `<path d="M32 100 L34 80 Q50 76 66 80 L68 100 Z" fill="#16a34a"/>` +          // green apron
      `<path d="M38 80 L36 72 M62 80 L64 72" stroke="#16a34a" stroke-width="3"/>` +
      `<rect x="44" y="86" width="12" height="7" rx="2" fill="#bbf7d0"/>` + moustache("#1f2937"),
    // white paper cap
    top: `<path d="M31 30 L33 17 Q50 11 67 17 L69 30 Q50 26 31 30 Z" fill="#ffffff" stroke="#e5e7eb" stroke-width="1.5"/><path d="M33 22 Q50 18 67 22" stroke="#16a34a" stroke-width="2" fill="none"/>`,
    faceOpts: { smile: "grin" },
  }),
  guard: person({
    skin: "tan", hair: null, shirt: "#1e3a8a",
    extra: moustache("#3f2a1d") +
      `<path d="M58 80 l3 -6 l3 6 l-3 2 z" fill="#facc15"/>`,
    // peaked cap with badge
    top: `<path d="M29 33 C29 20 40 15 50 15 C60 15 71 20 71 33 Z" fill="#1e3a8a"/><path d="M26 33 L74 33 Q70 39 50 38 Q30 39 26 33 Z" fill="#0f172a"/><circle cx="50" cy="24" r="4" fill="#facc15"/>`,
    faceOpts: { smile: "flat", brows: true },
  }),
  robot: svg100(
    `<rect x="47" y="6" width="6" height="12" rx="3" fill="#94a3b8"/><circle cx="50" cy="7" r="5" fill="#f43f5e"/>` +
    `<rect x="22" y="16" width="56" height="44" rx="12" fill="#cbd5e1"/>` +
    `<rect x="29" y="24" width="42" height="26" rx="7" fill="#1e293b"/>` +
    `<rect x="36" y="31" width="9" height="9" rx="2" fill="#22d3ee"/><rect x="55" y="31" width="9" height="9" rx="2" fill="#22d3ee"/>` +
    `<path d="M41 45 Q50 49 59 45" stroke="#22d3ee" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
    `<rect x="16" y="32" width="7" height="14" rx="3" fill="#94a3b8"/><rect x="77" y="32" width="7" height="14" rx="3" fill="#94a3b8"/>` +
    `<rect x="42" y="60" width="16" height="8" fill="#94a3b8"/>` +
    `<path d="M20 100 L22 76 Q24 68 34 68 L66 68 Q76 68 78 76 L80 100 Z" fill="#cbd5e1"/>` +
    `<rect x="38" y="78" width="24" height="12" rx="3" fill="#94a3b8"/><circle cx="44" cy="84" r="2.5" fill="#f43f5e"/><circle cx="50" cy="84" r="2.5" fill="#facc15"/><circle cx="56" cy="84" r="2.5" fill="#22c55e"/>`,
  ),
  pigeon: svg100(
    `<path d="M40 88 L38 98 M46 88 L47 98" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>` +
    `<ellipse cx="46" cy="66" rx="30" ry="22" fill="#94a3b8"/>` +
    `<path d="M20 60 Q8 70 6 82 Q22 76 30 72 Z" fill="#64748b"/>` +
    `<path d="M34 58 Q48 52 62 64 Q50 78 30 72 Z" fill="#7c8ea6"/>` +
    `<circle cx="66" cy="36" r="15" fill="#94a3b8"/>` +
    `<path d="M56 46 Q66 56 74 46 Q66 52 56 46 Z" fill="#10b981" opacity=".7"/>` +
    `<path d="M79 34 L92 38 L79 42 Z" fill="#f59e0b"/>` +
    `<circle cx="71" cy="33" r="4.2" fill="#fff"/><circle cx="72" cy="33" r="2.2" fill="${INK}"/>` +
    // the overconfident eyebrow
    `<path d="M65 26 L76 24" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`,
  ),

  /* the island of knights and knaves */
  alon: person({ skin: "warm", hair: "short", hairColour: "#3f2a1d", shirt: "#16a34a" }),
  batya: person({ skin: "light", back: "long", hair: "longTop", hairColour: "#b45309", shirt: "#f59e0b" }),
  carmel: person({ skin: "tan", hair: "curly", hairColour: "#1f2937", shirt: "#0ea5e9", faceOpts: { smile: "grin" } }),
  student: person({ skin: "warm", hair: "curly", hairColour: "#78350f", shirt: "#4f46e5" }),

  /* icons (48×48) */
  falafel: svg48(   // falafel in pita
    `<path d="M6 22 Q6 44 24 44 Q42 44 42 22 Z" fill="#f2c38b"/>` +
    `<path d="M6 22 Q24 28 42 22" stroke="#d9a066" stroke-width="2" fill="none"/>` +
    `<circle cx="15" cy="20" r="5.5" fill="#92400e"/><circle cx="25" cy="17" r="6" fill="#a16207"/><circle cx="34" cy="20" r="5.5" fill="#92400e"/>` +
    `<path d="M10 22 q3 -5 6 0 M30 22 q3 -5 6 0 M20 21 q3 -4 6 0" stroke="#16a34a" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
    `<circle cx="22" cy="23" r="2" fill="#ef4444"/><circle cx="31" cy="24" r="1.8" fill="#ef4444"/>`,
  ),
  nofalafel: svg48(
    `<path d="M6 22 Q6 44 24 44 Q42 44 42 22 Z" fill="#e2e8f0"/>` +
    `<circle cx="24" cy="28" r="17" fill="none" stroke="#dc2626" stroke-width="4"/><path d="M12 40 L36 16" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>`,
  ),
  unknown: svg48(
    `<circle cx="24" cy="24" r="20" fill="#e0e7ff"/>` +
    `<path d="M17 18 Q17 10 24 10 Q32 10 32 17 Q32 22 26 24 Q24 25 24 29" stroke="#4f46e5" stroke-width="4.5" fill="none" stroke-linecap="round"/><circle cx="24" cy="36" r="3" fill="#4f46e5"/>`,
  ),
  knight: svg48(
    `<path d="M24 4 L41 10 V22 C41 33 33 41 24 45 C15 41 7 33 7 22 V10 Z" fill="#2563eb"/>` +
    `<path d="M24 8 L37 12.5 V22 C37 31 31 37.5 24 41 Z" fill="#3b82f6"/>` +
    `<path d="M15 24 L21.5 30.5 L33.5 17.5" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  knave: svg48(
    `<path d="M4 18 Q4 12 12 12 Q20 12 24 16 Q28 12 36 12 Q44 12 44 18 Q44 30 34 31 Q28 31 24 26 Q20 31 14 31 Q4 30 4 18 Z" fill="#1f2937"/>` +
    `<ellipse cx="14" cy="20" rx="5" ry="3.6" fill="#fff"/><ellipse cx="34" cy="20" rx="5" ry="3.6" fill="#fff"/>` +
    `<path d="M4 17 L-1 12 M44 17 L49 12" stroke="#1f2937" stroke-width="2.5"/>` +
    `<path d="M16 38 Q24 44 32 38" stroke="#dc2626" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  ),
  // the truth-value signal (games/shared/signal.js): green = T, red = F, hooded = unknown
  signalT: svg48(signalMarkup(24, 24, 1, true)),
  signalF: svg48(signalMarkup(24, 24, 1, false)),
  signalQ: svg48(signalMarkup(24, 24, 1, null)),
  // the plain bulb of the first sections: lit = T, dark = F
  lampOn: svg48(bulbMarkup(24, 24, .9, true)),
  lampOff: svg48(bulbMarkup(24, 24, .9, false)),
  lampQ: svg48(`<rect x="5" y="5" width="38" height="38" rx="10" fill="#94a3b8"/><text x="24" y="33" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="24" fill="#fff">?</text>`),
  lock: svg48(
    `<path d="M15 21 V15 a9 9 0 0 1 18 0 V21" stroke="#64748b" stroke-width="4.5" fill="none"/>` +
    `<rect x="10" y="20" width="28" height="22" rx="4" fill="#94a3b8"/><circle cx="24" cy="30" r="3.2" fill="#334155"/><rect x="22.6" y="31" width="2.8" height="6" rx="1.2" fill="#334155"/>`,
  ),
};

/** SVG markup of a sprite (empty string if the name is unknown). */
export function sprite(name) {
  return SPRITES[name] || "";
}
