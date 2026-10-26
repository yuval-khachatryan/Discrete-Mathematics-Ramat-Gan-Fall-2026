/* art.js — the detective game's own small pictures, in the flat style of
   ../shared/sprites.js (no outlines, soft shapes, 48×48 icons). */

const svg48 = inner => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${inner}</svg>`;

export const ART = {
  /* the guard's sandwich: a baguette with lettuce, tomato and cheese */
  sandwich: svg48(
    `<path d="M5 30 Q5 36 12 36 H36 Q43 36 43 30 Z" fill="#d99a4e"/>` +
    `<path d="M4 27 h40 l-4 5 l-4 -3 l-4 4 l-4 -4 l-4 4 l-4 -4 l-4 4 l-4 -4 l-4 3 Z" fill="#facc15"/>` +
    `<rect x="5" y="24" width="38" height="5" rx="2.5" fill="#ef4444"/>` +
    `<path d="M3 24 q3.5 -4 7 0 t7 0 t7 0 t7 0 t7 0 t7 0 v2 H3 Z" fill="#4ade80"/>` +
    `<path d="M5 23 Q5 11 24 11 Q43 11 43 23 Z" fill="#f2bf73"/>` +
    `<path d="M13 16 l3 -2 M22 14.5 l3 -1.5 M31 15.5 l3 -1" stroke="#fde7b0" stroke-width="2" stroke-linecap="round"/>`,
  ),
  /* the detective's magnifying glass */
  magnifier: svg48(
    `<path d="M29 31 L41 43" stroke="#92400e" stroke-width="6.5" stroke-linecap="round"/>` +
    `<circle cx="20" cy="20" r="15" fill="#64748b"/>` +
    `<circle cx="20" cy="20" r="11" fill="#bae6fd"/>` +
    `<path d="M13 16 Q15 11 20 10" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>`,
  ),
};
