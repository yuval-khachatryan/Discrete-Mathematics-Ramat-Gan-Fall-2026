// node tools/draw-mitzi.mjs — draws Mitzi the cat for §1.3 (images/mitzi-*.svg).
// One head() for both pictures, so it is visibly the same cat.
import { writeFileSync, mkdirSync } from "node:fs";

const FUR = "#f59e42", FUR2 = "#e8873a", STRIPE = "#c2410c", CREAM = "#fde6c8", PINK = "#f9a8b4", INK = "#1f2937";

function head(x, y, mood) {
  const ear = (sx) => `<path d="M${x + sx * 30} ${y - 10} L${x + sx * 26} ${y - 46} L${x + sx * 6} ${y - 28} Z" fill="${FUR}"/>` +
    `<path d="M${x + sx * 25} ${y - 16} L${x + sx * 23} ${y - 38} L${x + sx * 11} ${y - 27} Z" fill="${PINK}"/>`;
  let h = ear(-1) + ear(1);
  h += `<path d="M${x - 37} ${y + 6} L${x - 29} ${y - 2} L${x - 40} ${y - 4} Z M${x + 37} ${y + 6} L${x + 29} ${y - 2} L${x + 40} ${y - 4} Z" fill="${FUR}"/>`; // cheek fluff
  h += `<ellipse cx="${x}" cy="${y}" rx="35" ry="30" fill="${FUR}"/>`;
  h += `<g stroke="${STRIPE}" stroke-width="4" stroke-linecap="round"><path d="M${x} ${y - 29} V${y - 19}"/><path d="M${x - 9} ${y - 27} L${x - 7} ${y - 18}"/><path d="M${x + 9} ${y - 27} L${x + 7} ${y - 18}"/></g>`;
  h += `<ellipse cx="${x}" cy="${y + 13}" rx="15" ry="10" fill="${CREAM}"/>`;
  // eyes
  for (const sx of [-1, 1]) {
    const ex = x + sx * 13, ey = y - 3;
    h += `<ellipse cx="${ex}" cy="${ey}" rx="8" ry="9" fill="#fff"/>`;
    if (mood === "happy") {
      h += `<ellipse cx="${ex + 1.5}" cy="${ey + 1}" rx="3.6" ry="6.5" fill="${INK}"/><circle cx="${ex + 3}" cy="${ey - 2}" r="1.6" fill="#fff"/>`;
    } else {
      // deadpan: half-closed lids, pupils looking at the reader
      h += `<ellipse cx="${ex}" cy="${ey + 2}" rx="3.6" ry="5" fill="${INK}"/>`;
      h += `<path d="M${ex - 9} ${ey - 1} Q${ex} ${ey - 13} ${ex + 9} ${ey - 1} Z" fill="${FUR}"/>`;
      h += `<path d="M${ex - 8.5} ${ey - 1} H${ex + 8.5}" stroke="${STRIPE}" stroke-width="2" stroke-linecap="round"/>`;
    }
  }
  if (mood !== "happy") h += `<path d="M${x + 5} ${y - 19} Q${x + 13} ${y - 25} ${x + 22} ${y - 20}" stroke="${STRIPE}" stroke-width="3" fill="none" stroke-linecap="round"/>`; // one raised brow
  h += `<path d="M${x - 4} ${y + 6} H${x + 4} L${x} ${y + 10} Z" fill="${PINK}" stroke="${PINK}" stroke-width="2" stroke-linejoin="round"/>`;
  h += mood === "happy"
    ? `<path d="M${x - 9} ${y + 13} Q${x} ${y + 25} ${x + 9} ${y + 13} Z" fill="${INK}"/><path d="M${x - 4} ${y + 18} Q${x} ${y + 22} ${x + 4} ${y + 18}" fill="#f87171"/>`
    : `<path d="M${x - 6} ${y + 15} H${x + 6}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
  h += `<g stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".7">` +
    `<path d="M${x - 14} ${y + 10} L${x - 40} ${y + 5}"/><path d="M${x - 14} ${y + 14} L${x - 39} ${y + 17}"/>` +
    `<path d="M${x + 14} ${y + 10} L${x + 40} ${y + 5}"/><path d="M${x + 14} ${y + 14} L${x + 39} ${y + 17}"/></g>`;
  return h;
}

const svg = (vb, inner, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img"><title>${title}</title>${inner}</svg>\n`;

/* 1.3.1 — Mitzi flies */
let fly = "";
fly += `<g fill="#fff" stroke="#cbd5e1" stroke-width="2"><path d="M24 168 q0 -14 16 -14 q6 -12 20 -6 q10 -6 18 4 q14 0 14 16 z"/><path d="M196 172 q0 -10 12 -10 q5 -9 15 -4 q8 -4 13 3 q10 0 10 11 z"/></g>`;
fly += `<g stroke="#94a3b8" stroke-width="4" stroke-linecap="round"><path d="M10 82 H46"/><path d="M2 102 H38"/><path d="M14 122 H44"/></g>`;
fly += `<path d="M84 110 C 62 106, 58 82, 38 86 C 26 88, 24 98, 33 101" fill="none" stroke="${FUR}" stroke-width="11" stroke-linecap="round"/>`;
fly += `<path d="M47 85 L44 95 M60 88 L55 98" stroke="${STRIPE}" stroke-width="4" stroke-linecap="round"/>`;
fly += `<path d="M98 122 L66 132" stroke="${FUR2}" stroke-width="13" stroke-linecap="round"/><path d="M104 126 L74 142" stroke="${FUR}" stroke-width="13" stroke-linecap="round"/>`;
fly += `<circle cx="65" cy="132" r="7" fill="${CREAM}"/><circle cx="73" cy="142" r="7" fill="${CREAM}"/>`;
fly += `<path d="M132 98 C 126 66, 146 42, 166 34 C 164 48, 172 52, 166 64 C 174 66, 176 74, 166 82 C 166 90, 154 96, 146 100 Z" fill="#e2e8f0"/>`; // far wing
fly += `<ellipse cx="136" cy="114" rx="58" ry="24" fill="${FUR}" transform="rotate(-6 136 114)"/>`;
fly += `<ellipse cx="146" cy="124" rx="36" ry="10" fill="${CREAM}" transform="rotate(-6 146 124)"/>`;
fly += `<g stroke="${STRIPE}" stroke-width="5" stroke-linecap="round" fill="none"><path d="M106 96 q4 8 0 16"/><path d="M122 93 q4 8 0 16"/><path d="M138 91 q4 8 0 16"/></g>`;
fly += `<path d="M178 112 L226 102" stroke="${FUR2}" stroke-width="13" stroke-linecap="round"/><path d="M176 121 L224 118" stroke="${FUR}" stroke-width="13" stroke-linecap="round"/>`;
fly += `<circle cx="229" cy="102" r="7.5" fill="${CREAM}"/><circle cx="227" cy="118" r="7.5" fill="${CREAM}"/>`;
fly += `<path d="M120 100 C 104 66, 118 36, 142 22 C 142 38, 152 40, 146 54 C 158 54, 160 64, 150 72 C 154 82, 140 88, 132 96 Z" fill="#fff" stroke="#cbd5e1" stroke-width="2.5" stroke-linejoin="round"/>`; // near wing
fly += `<path d="M128 88 C 126 72, 132 54, 140 40" stroke="#cbd5e1" stroke-width="2" fill="none"/>`;
fly += `<path d="M178 96 C 158 80, 140 92, 118 74 L 122 88 C 142 102, 160 92, 176 106 Z" fill="#dc2626"/>`; // scarf tails
fly += `<rect x="174" y="94" width="30" height="13" rx="6.5" fill="#ef4444" transform="rotate(-12 189 100)"/>`; // scarf band
fly += head(200, 72, "happy");
writeFileSync(new URL("../images/mitzi-flying.svg", import.meta.url), svg("0 0 250 185", fly, "מיצי, חתולה ג׳ינג׳ית עם כנפיים וצעיף אדום, עפה בין העננים"));

/* 1.3.2 — "Can't you see I am a dog?" */
let sit = "";
sit += `<path d="M118 168 C 150 168, 156 140, 140 128 C 132 122, 126 130, 132 136" fill="none" stroke="${FUR}" stroke-width="12" stroke-linecap="round"/>`; // tail
sit += `<path d="M138 132 L130 140 M146 146 L136 148" stroke="${STRIPE}" stroke-width="4" stroke-linecap="round"/>`;
sit += `<path d="M48 172 C 40 130, 52 92, 80 90 C 108 92, 120 130, 112 172 Z" fill="${FUR}"/>`; // sitting body
sit += `<path d="M64 168 C 60 136, 68 108, 80 104 C 92 108, 100 136, 96 168 Z" fill="${CREAM}"/>`; // chest
sit += `<g stroke="${STRIPE}" stroke-width="4.5" stroke-linecap="round" fill="none"><path d="M52 132 q8 2 10 10"/><path d="M50 150 q8 2 10 10"/><path d="M108 132 q-8 2 -10 10"/><path d="M110 150 q-8 2 -10 10"/></g>`;
sit += `<rect x="64" y="146" width="14" height="28" rx="7" fill="${FUR2}"/><rect x="82" y="146" width="14" height="28" rx="7" fill="${FUR2}"/>`; // front legs
sit += `<ellipse cx="71" cy="173" rx="9" ry="5" fill="${CREAM}"/><ellipse cx="89" cy="173" rx="9" ry="5" fill="${CREAM}"/>`;
sit += head(80, 62, "deadpan");
sit += `<path d="M56 88 Q80 98 104 88" stroke="#2563eb" stroke-width="7" fill="none" stroke-linecap="round"/>`; // collar
// bone-shaped tag
sit += `<g transform="translate(80 102)"><rect x="-9" y="-3.5" width="18" height="7" fill="#fff"/><circle cx="-9" cy="-3.5" r="4" fill="#fff"/><circle cx="-9" cy="3.5" r="4" fill="#fff"/><circle cx="9" cy="-3.5" r="4" fill="#fff"/><circle cx="9" cy="3.5" r="4" fill="#fff"/></g>`;
writeFileSync(new URL("../images/mitzi-dog.svg", import.meta.url), svg("0 0 165 185", sit, "מיצי, אותה חתולה ג׳ינג׳ית, יושבת עם קולר ותג בצורת עצם, ומביטה בזלזול"));
console.log("images/mitzi-flying.svg, images/mitzi-dog.svg");
