/* art.js — the small pictures of "מצאו עד", as SVG strings.
   ---------------------------------------------------------------------------
   Same flat style as games/shared/sprites.js: no outlines, soft shapes, a
   48×48 box. The people come from sprites.js; everything else is here:
   the homework sheet, the locker, pizza slices with their toppings, the
   snacks of the "who likes what" table, a heart, a magnifying glass.
       art("hwYes")  →  "<svg …>…</svg>"   ("" for an unknown name)
   --------------------------------------------------------------------------- */

const svg48 = inner =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${inner}</svg>`;

/* ---- homework ------------------------------------------------------------ */
const sheet = (paper, fold, lines) =>
  `<path d="M10 4 H29 L37 12 V40 A3 3 0 0 1 34 43 H10 A3 3 0 0 1 7 40 V7 A3 3 0 0 1 10 4 Z" fill="${paper}"/>` +
  `<path d="M29 4 V9.5 A2.5 2.5 0 0 0 31.5 12 H37 Z" fill="${fold}"/>` +
  (lines ? `<path d="M12.5 17 H30 M12.5 23 H30 M12.5 29 H22" stroke="${lines}" stroke-width="2.6" stroke-linecap="round"/>` : "");
const badgeYes =
  `<circle cx="34" cy="35" r="10" fill="#16a34a"/>` +
  `<path d="M29 35.4 L32.6 39 L39.2 31.8" stroke="#fff" stroke-width="3.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const badgeNo =
  `<circle cx="34" cy="35" r="10" fill="#dc2626"/>` +
  `<path d="M30.2 31.2 L37.8 38.8 M37.8 31.2 L30.2 38.8" stroke="#fff" stroke-width="3.3" stroke-linecap="round"/>`;

/* ---- locker -------------------------------------------------------------- */
const locker = (outer, inner, vents, handle, feet) =>
  `<rect x="11" y="3" width="26" height="40" rx="3.5" fill="${outer}"/>` +
  `<rect x="14" y="6" width="20" height="34" rx="2.5" fill="${inner}"/>` +
  `<path d="M18 10.5 H30 M18 14.5 H30 M18 18.5 H30" stroke="${vents}" stroke-width="2" stroke-linecap="round"/>` +
  `<rect x="28" y="24" width="3.2" height="9" rx="1.6" fill="${handle}"/>` +
  `<rect x="13" y="42" width="5" height="4" rx="1" fill="${feet}"/><rect x="30" y="42" width="5" height="4" rx="1" fill="${feet}"/>`;

/* ---- pizza --------------------------------------------------------------- */
const SLICE =
  `<path d="M4 12 Q24 0 44 12 L24 46.5 Z" fill="#e59a3b"/>` +            // crust
  `<path d="M7.5 15.5 Q24 5.5 40.5 15.5 L24 43.5 Z" fill="#fef3c7"/>` +   // cheese
  `<path d="M7.5 15.5 Q24 5.5 40.5 15.5 L39.4 17.4 Q24 8.4 8.6 17.4 Z" fill="#f87171"/>`; // sauce rim
const SPOTS = [[16, 20.5], [31, 20.5], [23.5, 25.5], [19.6, 31], [28.4, 31], [24, 37.5]];
const TOPPING = {
  olives: ([x, y]) => `<circle cx="${x}" cy="${y}" r="2.7" fill="#1f2937"/><circle cx="${x}" cy="${y}" r="1.1" fill="#fef3c7"/>`,
  corn: ([x, y]) => `<circle cx="${x - 1.5}" cy="${y - 0.4}" r="1.6" fill="#eab308"/><circle cx="${x + 1.5}" cy="${y + 0.8}" r="1.6" fill="#ca8a04"/>`,
  mushrooms: ([x, y]) =>
    `<rect x="${x - 1.2}" y="${y}" width="2.4" height="3.2" rx="1" fill="#e7cfa8"/>` +
    `<path d="M${x - 3.3} ${y + 0.7} A3.3 3.1 0 0 1 ${x + 3.3} ${y + 0.7} Z" fill="#a8743f"/>`,
  pepper: ([x, y]) => `<path d="M${x - 3} ${y + 1.2} Q${x} ${y - 3} ${x + 3} ${y + 1.2}" stroke="#16a34a" stroke-width="2.3" fill="none" stroke-linecap="round"/>`,
  onion: ([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="none" stroke="#a855f7" stroke-width="1.5"/>`,
  plain: ([x, y], i) => (i % 2 ? `<circle cx="${x}" cy="${y}" r="2.6" fill="#f87171"/>` : `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="1.5" fill="#22c55e" transform="rotate(-30 ${x} ${y})"/>`),
  pineapple: ([x, y]) =>
    `<path d="M${x - 3} ${y + 2.1} L${x} ${y - 2.6} L${x + 3} ${y + 2.1} Z" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<circle cx="${x}" cy="${y + 0.4}" r="0.9" fill="#fde68a"/>`,
};
const pizza = kind => svg48(SLICE + SPOTS.map((s, i) => TOPPING[kind](s, i)).join(""));

/* ---- everything, by name ------------------------------------------------- */
const ART = {
  hwYes: svg48(sheet("#e2e8f0", "#cbd5e1", "#94a3b8") + badgeYes),
  hwNo: svg48(sheet("#cbd5e1", "#94a3b8", null) + badgeNo),
  locker: svg48(locker("#2563eb", "#3b82f6", "#1d4ed8", "#dbeafe", "#1e3a8a")),
  noLocker: svg48(locker("#cbd5e1", "#e2e8f0", "#94a3b8", "#f8fafc", "#94a3b8") +
    `<path d="M7 41 L41 7" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/>`),

  /* the snacks of the "who likes what" table (pizza: "pizza-plain") */
  falafel: svg48(
    `<circle cx="15" cy="20" r="6" fill="#92400e"/><circle cx="33" cy="20.5" r="6" fill="#92400e"/><circle cx="24" cy="16.5" r="6.2" fill="#a16207"/>` +
    `<path d="M7.5 22 Q12 17.5 16.5 21.5 Q21 17 25.5 21.5 Q30 17 34.5 21.5 Q38.5 17.5 41 22" stroke="#22c55e" stroke-width="3.2" fill="none" stroke-linecap="round"/>` +
    `<path d="M5 22.5 H43 V27 C43 37 35 44 24 44 C13 44 5 37 5 27 Z" fill="#f3d19c"/>` +
    `<path d="M5 22.5 H43 V25.5 H5 Z" fill="#e9b872"/>`,
  ),
  apple: svg48(
    `<path d="M24 14 C16 8 6 13 7 25 C8 36 15 44 21 43 C23 42.5 25 42.5 27 43 C33 44 40 36 41 25 C42 13 32 8 24 14 Z" fill="#ef4444"/>` +
    `<ellipse cx="15.5" cy="22" rx="3" ry="5" fill="#fff" opacity=".35" transform="rotate(20 15.5 22)"/>` +
    `<path d="M24 14 Q24 8 27 5" stroke="#78350f" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
    `<path d="M26.5 9 Q33 2.5 39 7.5 Q32.5 12.5 26.5 9 Z" fill="#22c55e"/>`,
  ),
  coffee: svg48(
    `<path d="M16 13 Q13 9.5 16 6 M22 13 Q19 9.5 22 6 M28 13 Q25 9.5 28 6" stroke="#94a3b8" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
    `<path d="M33 21 H35.5 A6 6 0 0 1 35.5 33 H33" stroke="#4f46e5" stroke-width="3.6" fill="none"/>` +
    `<path d="M8 17 H34 V31 C34 38 29 42 22 42 H20 C13 42 8 38 8 31 Z" fill="#6366f1"/>` +
    `<ellipse cx="21" cy="17.5" rx="13" ry="3.2" fill="#78350f"/>`,
  ),
  heart: svg48(
    `<path d="M24 41 C10 31.5 5 24.5 5 17.5 C5 11.5 9.5 7 15.5 7 C19.5 7 22.5 9.5 24 12.5 C25.5 9.5 28.5 7 32.5 7 C38.5 7 43 11.5 43 17.5 C43 24.5 38 31.5 24 41 Z" fill="#f43f5e"/>` +
    `<ellipse cx="14.5" cy="16" rx="3.4" ry="2.2" fill="#fff" opacity=".4" transform="rotate(-35 14.5 16)"/>`,
  ),
  dot: svg48(`<circle cx="24" cy="24" r="5" fill="#cbd5e1"/>`),
  magnifier: svg48(
    `<path d="M29 29 L41 41" stroke="#1e3a8a" stroke-width="6.5" stroke-linecap="round"/>` +
    `<circle cx="20" cy="20" r="13" fill="#1d4ed8"/><circle cx="20" cy="20" r="9.2" fill="#bfdbfe"/>` +
    `<path d="M14 17.5 A6.5 6.5 0 0 1 19 13" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  ),
};
for (const k of Object.keys(TOPPING)) ART["pizza-" + k] = pizza(k);

export const ART_NAMES = Object.keys(ART);

/** SVG markup of a picture ("" if the name is unknown). */
export function art(name) {
  return ART[name] || "";
}
