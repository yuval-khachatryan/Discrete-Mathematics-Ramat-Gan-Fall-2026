/* signal.js — the two-colour signal that shows a truth value.
   ---------------------------------------------------------------------------
   The book's picture of T and F: a pedestrian signal with a red lamp on top
   and a green lamp below. EXACTLY ONE lamp is lit, always (a proposition is
   true or false, never both, never neither):
       green, walking figure   T
       red, standing figure    F
   Colour is never the only cue: position (top / bottom) and the figure carry
   the same meaning for colour-blind readers.

   signalMarkup(cx, cy, s, state) returns SVG markup (no <svg> wrapper) for a
   signal centred at (cx, cy), housing 22s × 44s:
       state  true → green lit,  false → red lit,  null → hooded ("?").
   Used for the big signal in the circuit game and, via sprites.js, for the
   small icons (signalT / signalF / signalQ).
   --------------------------------------------------------------------------- */

const LIT = { red: "#ef4444", green: "#22c55e" };
const GLOW = { red: "#fecaca", green: "#bbf7d0" };
const DARK = { red: "#3f1d1d", green: "#123320" };
const STENCIL = { red: "#450a0a", green: "#052e16" };
const FAINT = "#4b5563";

function figure(cx, cy, s, walking, colour) {
  const st = `stroke="${colour}" stroke-width="${1.6 * s}" stroke-linecap="round" fill="none"`;
  if (!walking) {   // standing still, arms by the sides
    return `<circle cx="${cx}" cy="${cy - 4.6 * s}" r="${1.5 * s}" fill="${colour}"/>` +
      `<path d="M${cx} ${cy - 2.6 * s} V${cy + 1.6 * s} M${cx - 0.1 * s} ${cy + 1.6 * s} L${cx - 1.1 * s} ${cy + 5.6 * s} M${cx + 0.1 * s} ${cy + 1.6 * s} L${cx + 1.1 * s} ${cy + 5.6 * s} M${cx} ${cy - 2 * s} L${cx - 1.9 * s} ${cy + 1.2 * s} M${cx} ${cy - 2 * s} L${cx + 1.9 * s} ${cy + 1.2 * s}" ${st}/>`;
  }
  // walking, mid-stride
  return `<circle cx="${cx + 0.7 * s}" cy="${cy - 4.6 * s}" r="${1.5 * s}" fill="${colour}"/>` +
    `<path d="M${cx + 0.4 * s} ${cy - 2.6 * s} L${cx - 0.4 * s} ${cy + 1.4 * s} L${cx - 2.6 * s} ${cy + 5.6 * s} M${cx - 0.4 * s} ${cy + 1.4 * s} L${cx + 1.2 * s} ${cy + 3.2 * s} L${cx + 1.6 * s} ${cy + 5.8 * s} M${cx + 0.2 * s} ${cy - 1.8 * s} L${cx + 2.4 * s} ${cy + 0.4 * s} M${cx + 0.2 * s} ${cy - 1.8 * s} L${cx - 2 * s} ${cy - 0.2 * s}" ${st}/>`;
}

/** One lamp: colour "red" (standing figure) or "green" (walking figure).
    Exported for the circuit game, which places the two lamps of a stretched
    signal at the heights of the two circuits that feed them. */
export function lampMarkup(cx, cy, s, colour, lit) {
  return lamp(cx, cy, s, colour, lit, colour === "green");
}

function lamp(cx, cy, s, colour, lit, walking) {
  const r = 8.4 * s;
  return (lit ? `<circle cx="${cx}" cy="${cy}" r="${r + 3.2 * s}" fill="${GLOW[colour]}" opacity=".85" class="sig-glow"/>` : "") +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${lit ? LIT[colour] : DARK[colour]}"/>` +
    figure(cx, cy, s, walking, lit ? STENCIL[colour] : FAINT);
}

export function signalMarkup(cx, cy, s = 1, state = true) {
  const w = 22 * s, h = 44 * s;
  let out = `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${5 * s}" fill="#1f2937"/>`;
  out += lamp(cx, cy - 10.5 * s, s, "red", state === false, false);
  out += lamp(cx, cy + 10.5 * s, s, "green", state === true, true);
  if (state === null) {
    out += `<rect x="${cx - w / 2 - 1.5 * s}" y="${cy - h / 2 - 1.5 * s}" width="${w + 3 * s}" height="${h + 3 * s}" rx="${6 * s}" fill="#94a3b8"/>` +
      `<text x="${cx}" y="${cy + 6 * s}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="${18 * s}" fill="#fff">?</text>`;
  }
  return out;
}

/** A plain circular bulb for the introductory true/false activities. */
export function bulbMarkup(cx, cy, s = 1, lit = true) {
  return (lit ? `<circle cx="${cx}" cy="${cy}" r="${25 * s}" fill="#fef08a" opacity=".6"/>` : "") +
    `<circle class="bulb" cx="${cx}" cy="${cy}" r="${17 * s}" fill="${lit ? "#fde047" : "#e2e8f0"}" stroke="#475569" stroke-width="${2 * s}"/>` +
    `<path d="M${cx - 8 * s} ${cy + 10 * s} L${cx + 8 * s} ${cy - 10 * s} M${cx - 8 * s} ${cy - 10 * s} L${cx + 8 * s} ${cy + 10 * s}" stroke="${lit ? "#854d0e" : "#64748b"}" stroke-width="${2 * s}"/>`;
}
