/* circuit.js — draw a propositional formula as TWO switch circuits.
   ---------------------------------------------------------------------------
   The battery feeds two networks, one to each lamp of a two-colour signal:
       the GREEN network is wired for the formula φ,
       the RED network is wired for its negation ¬φ.
   φ and ¬φ always have opposite values, so in every setting of the levers
   exactly one of the two networks is closed and exactly one lamp is lit.
   Nothing decides "red" behind the scenes: it is the wiring.

   The building blocks of each network:
       a variable A      a contact, closed exactly when lever A is on T
       ¬A                a reversed contact, closed exactly when lever A is on F
       ∧ (וגם)            contacts in series:   every part must be closed
       ∨ (או)             branches in parallel: one closed branch is enough
   Both networks are put in negation normal form (logic.js → nnf), so ¬ only
   sits on a single variable. That is why the red network of A ∧ B comes out
   as ¬A ∨ ¬B in parallel: the drawing IS De Morgan's law. Negating a whole
   formula just swaps the two networks between the lamps.

   One lever moves all the contacts of its variable, in both networks (a
   "ganged" switch). A formula that is a single variable (A or ¬A) is drawn
   as one two-way switch instead, like railway points: the current goes up
   to red or down to green.

   THREE VIEWS, chosen per level so that nothing is shown before the chapter
   has justified it:
       "switch"  a single variable: the two-way switch and the signal
       "lamp"    ONE network (the formula) and ONE plain bulb: lit = T, dark = F.
                 Default for all introductory levels, including A and ¬A.
       "dual"    both networks and the signal, introduced when comparing formulas
                 for equivalence. The red network represents ¬φ.

   layout(), networks(), explain() are DOM-free (tests call them under node);
   render() builds the SVG.
   --------------------------------------------------------------------------- */

import { parse, nnf, evaluate } from "../shared/logic.js";
import { lampMarkup, bulbMarkup } from "../shared/signal.js";

const CW = 96;      // contact block width
const CH = 66;      // contact block height
const RAIL = 44;    // y of the wire inside a contact block
const GAP = 12;     // wire between blocks in series
const BUS = 20;     // room for the vertical bus on each side of a parallel block
const VGAP = 8;     // between parallel branches

// no green or red here: those colours mean T and F on the signal
export const VAR_COLOURS = ["#2563eb", "#7c3aed", "#b45309", "#0e7490", "#be185d"];

/** Block tree with sizes and child offsets for an NNF tree. */
function layoutTree(tree) {
  function lay(n) {
    if (n.type === "var" || n.type === "not" || n.type === "const") {
      return { kind: "contact", node: n, w: CW, h: CH, rail: RAIL };
    }
    const kids = n.args.map(lay);
    if (n.type === "and") {
      const rail = Math.max(...kids.map(k => k.rail));
      let x = 0, h = 0;
      kids.forEach((k, i) => {
        k.x = x; k.y = rail - k.rail;
        x += k.w + (i < kids.length - 1 ? GAP : 0);
        h = Math.max(h, k.y + k.h);
      });
      return { kind: "series", node: n, kids, w: x, h, rail };
    }
    const inner = Math.max(...kids.map(k => k.w));
    let y = 0;
    kids.forEach((k, i) => {
      k.x = BUS; k.y = y;
      y += k.h + (i < kids.length - 1 ? VGAP : 0);
    });
    return { kind: "parallel", node: n, kids, w: inner + 2 * BUS, h: y, rail: kids[0].rail, inner };
  }
  return lay(tree);
}

/** The two networks of a formula: green = nnf(φ), red = nnf(¬φ). */
export function networks(formula) {
  const f = parse(formula);
  return { green: layoutTree(nnf(f)), red: layoutTree(nnf({ type: "not", arg: f })) };
}

/** The green network (kept for the tests and for size estimates). */
export function layout(formula) {
  return networks(formula).green;
}

/** A single variable or its negation: drawn as one two-way switch. */
export function isLiteral(formula) {
  const f = parse(formula);
  return f.type === "var" || (f.type === "not" && f.arg.type === "var");
}

/* ---- explanations ------------------------------------------------------ */

const tv = b => `<span class="tv-${b ? "T" : "F"}">${b ? "T" : "F"}</span>`;
const m = s => `<span class="m">${s}</span>`;

function contactWhy(n, env) {
  if (n.type === "const") return n.value ? "חוט רציף" : "חוט קטוע";
  const v = n.type === "not" ? n.arg.name : n.name;
  // the whole "A = T" goes in one LTR span, or the bidi algorithm prints it as "T = A"
  return `${m((n.type === "not" ? "¬" : "") + v)} סגור, כי ${m(v + " = " + tv(env[v]))}`;
}

/** Why a CLOSED block is closed (Hebrew HTML). */
function closedWhy(b, env) {
  if (b.kind === "contact") return "המגע " + contactWhy(b.node, env);
  if (b.kind === "series") {
    return b.kids.map(k => (k.kind === "contact" ? contactWhy(k.node, env) : closedWhy(k, env))).join(", וגם ") +
      " (בטור, וכולם סגורים)";
  }
  const k = b.kids.find(c => evaluate(c.node, env));
  return (k.kind === "contact" ? "המגע " + contactWhy(k.node, env) : closedWhy(k, env)) +
    " (במקביל, ומספיק ענף סגור אחד)";
}

function contactOpen(n, env) {
  if (n.type === "const") return n.value ? "חוט רציף" : "חוט קטוע";
  const v = n.type === "not" ? n.arg.name : n.name;
  return `${m((n.type === "not" ? "¬" : "") + v)} פתוח, כי ${m(v + " = " + tv(env[v]))}`;
}

/** Why an OPEN block is open (Hebrew HTML). */
function openWhy(b, env) {
  if (b.kind === "contact") return "המגע " + contactOpen(b.node, env);
  if (b.kind === "series") {
    const k = b.kids.find(c => !evaluate(c.node, env));
    return (k.kind === "contact" ? "המגע " + contactOpen(k.node, env) : openWhy(k, env)) +
      " (בטור, ומספיק חלק פתוח אחד)";
  }
  return b.kids.map(k => (k.kind === "contact" ? contactOpen(k.node, env) : openWhy(k, env))).join(", וגם ") +
    " (במקביל, וכל הענפים פתוחים)";
}

/** The view a formula gets when the level does not choose one. */
export function defaultView(formula) {
  return "lamp";
}

/** Hebrew HTML: why the light is what it is, in the words of the view. */
export function explain(formula, env, view = "dual") {
  const f = parse(formula);
  const on = evaluate(f, env);
  if (isLiteral(f) && view !== "lamp") {
    const v = f.type === "var" ? f.name : f.arg.name;
    return `המתג שולח את הזרם ל${on ? "ירוק" : "אדום"}, כי ${m(v + " = " + tv(env[v]))}`;
  }
  const { green, red } = networks(f);
  if (view === "lamp") return on ? `המעגל סגור: ${closedWhy(green, env)}` : `המעגל פתוח: ${openWhy(green, env)}`;
  return `${on ? "המעגל הירוק" : "המעגל האדום"} סגור: ${closedWhy(on ? green : red, env)}`;
}

/* ---- SVG -------------------------------------------------------------- */

const NS = "http://www.w3.org/2000/svg";
function s(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  if (parent) parent.append(e);
  return e;
}

function tag(g, x, y, label, colour) {
  const lw = 16 + label.length * 11;
  s("rect", { x: x - lw / 2, y: y - 16, width: lw, height: 22, rx: 6, fill: colour, class: "tag" }, g);
  s("text", { x, y, class: "tag-text" }, g).textContent = label;
}

/**
 * Draw into `svg` (an <svg> element, emptied first).
 *   env      lever values {A: true, ...}
 *   colours  {A: "#2563eb", ...}
 *   lamp     "on" (green) | "off" (red / dark) | "covered" (hooded: predict / fill)
 *   view     "switch" | "lamp" | "dual"   (default: switch for one variable, else lamp)
 */
export function render(svg, formula, env, { colours = {}, lamp, view } = {}) {
  const f = parse(formula);
  view = view || defaultView(f);
  if (view === "lamp") return renderLamp(svg, f, env, colours, lamp);
  const on = evaluate(f, env);
  const covered = lamp === "covered";
  const anyLive = !covered;                        // current always flows somewhere
  const greenLive = anyLive && on, redLive = anyLive && !on;
  const literal = isLiteral(f);
  const { green: G, red: R } = networks(f);

  const PAD = 14, ROWGAP = 22;
  const bx = 26;                                   // battery
  const JX = 58;                                   // where the current splits
  const NX = literal ? JX + 70 : JX + 16;          // where the networks (or the switch's throws) start
  const yR = PAD + (literal ? 30 : R.rail);        // red row
  const greenTop = literal ? yR + 76 : PAD + R.h + ROWGAP;
  const yG = greenTop + (literal ? 0 : G.rail);    // green row
  const netW = literal ? 40 : Math.max(R.w, G.w);
  const XE = NX + netW + 18;                       // both rows end here
  const sx = XE + 34;                              // the signal
  const RX = sx + 44;                              // return bus
  const bottom = Math.max(literal ? yG + 34 : greenTop + G.h + 18, yG + 34);
  const yMid = (yR + yG) / 2;
  const W = RX + 14, H = bottom + 14;

  svg.replaceChildren();
  // exactly one path is live: all live wires take the colour of the lit lamp
  svg.classList.toggle("is-green", greenLive);
  svg.classList.toggle("is-red", redLive);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", W);
  svg.style.maxWidth = W + "px";

  const wire = (x1, y1, x2, y2, live, g) =>
    s("line", { x1, y1, x2, y2, class: "wire" + (live ? " live" : "") }, g || svg);

  /* battery and the return wire */
  const by = (yMid + bottom) / 2;
  wire(bx, yMid, bx, by - 12, anyLive);
  wire(bx, by + 12, bx, bottom, anyLive);
  const bat = s("g", { class: "battery" }, svg);
  s("line", { x1: bx - 16, y1: by - 6, x2: bx + 16, y2: by - 6, class: "plate-long" }, bat);
  s("line", { x1: bx - 9, y1: by + 6, x2: bx + 9, y2: by + 6, class: "plate-short" }, bat);
  s("text", { x: bx - 24, y: by - 10, class: "bat-sign" }, bat).textContent = "+";
  wire(bx, bottom, RX, bottom, anyLive);

  /* both rows run into the signal and back along the return bus */
  wire(XE, yR, RX, yR, redLive);
  wire(XE, yG, RX, yG, greenLive);
  wire(RX, yR, RX, yG, redLive);
  wire(RX, yG, RX, bottom, anyLive);

  if (literal) {
    /* one two-way switch: the blade points to the row that is closed */
    const v = f.type === "var" ? f.name : f.arg.name;
    const PX = JX + 6;
    const tR = { x: NX, y: yR }, tG = { x: NX, y: yG };
    wire(bx, yMid, PX, yMid, anyLive);
    wire(tR.x, yR, XE, yR, redLive);
    wire(tG.x, yG, XE, yG, greenLive);
    const g = s("g", { class: "contact two-way", "data-var": v }, svg);
    const to = on ? tG : tR;
    s("line", { x1: PX, y1: yMid, x2: to.x - 3, y2: to.y + (on ? -2 : 2), class: "blade" + (anyLive ? " live" : "") }, g);
    s("circle", { cx: PX, cy: yMid, r: 5, class: "term pivot" }, g);
    s("circle", { cx: tR.x, cy: tR.y, r: 4.5, class: "term" }, g);
    s("circle", { cx: tG.x, cy: tG.y, r: 4.5, class: "term" }, g);
    // which lever value sends the current where: "A = T" next to its throw
    const tWhenT = f.type === "var" ? tG : tR, tWhenF = f.type === "var" ? tR : tG;
    for (const [t, val] of [[tWhenT, "T"], [tWhenF, "F"]]) {
      s("text", { x: t.x + 8, y: t.y + (t === tR ? -10 : 22), class: "throw-label" }, g).textContent = `${v} = ${val}`;
    }
    tag(g, PX + 4, yMid - 14, v, colours[v] || "#475569");
  } else {
    /* the current splits into the two networks */
    wire(bx, yMid, JX, yMid, anyLive);
    wire(JX, yMid, JX, yR, redLive);
    wire(JX, yMid, JX, yG, greenLive);
    wire(JX, yR, NX, yR, redLive);
    wire(JX, yG, NX, yG, greenLive);
    wire(NX + R.w, yR, XE, yR, redLive);
    wire(NX + G.w, yG, XE, yG, greenLive);
    drawNetwork(svg, R, NX, PAD, redLive, env, colours, wire);
    drawNetwork(svg, G, NX, greenTop, greenLive, env, colours, wire);
  }

  /* the signal: one tall housing, red lamp on the red row, green lamp on the green row */
  const sig = s("g", { class: "signal " + (covered ? "covered" : on ? "green" : "red") }, svg);
  const LS = 1.55, HW = 19;
  let inner = `<rect x="${sx - HW}" y="${yR - HW}" width="${2 * HW}" height="${yG - yR + 2 * HW}" rx="9" fill="#1f2937"/>` +
    lampMarkup(sx, yR, LS, "red", redLive) + lampMarkup(sx, yG, LS, "green", greenLive);
  if (covered) {
    inner += `<rect x="${sx - HW - 3}" y="${yR - HW - 3}" width="${2 * HW + 6}" height="${yG - yR + 2 * HW + 6}" rx="10" fill="#94a3b8"/>` +
      `<text x="${sx}" y="${yMid + 9}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="26" fill="#fff">?</text>`;
  }
  sig.innerHTML = inner;

  return on;
}

/* ---- one network, one green lamp ----------------------------------------
   Before De Morgan, F is simply "no light": the lamp is lit exactly when
   current can get through the formula's network. */
function renderLamp(svg, f, env, colours, lamp) {
  const on = evaluate(f, env);
  const covered = lamp === "covered";
  const live = !covered && on;
  const G = networks(f).green;
  const PAD = 14, LB = 64, HW = 19;
  const Y = PAD + G.rail;
  const bottom = Math.max(PAD + G.h + 26, Y + HW + 22);
  const lx = LB + G.w + 46;
  const W = lx + 56, H = bottom + 16;
  svg.replaceChildren();
  svg.classList.toggle("is-green", live);
  svg.classList.toggle("is-red", false);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", W);
  svg.style.maxWidth = W + "px";
  const wire = (x1, y1, x2, y2, hot, g) =>
    s("line", { x1, y1, x2, y2, class: "wire" + (hot ? " live" : "") }, g || svg);

  const bx = 28, by = (Y + bottom) / 2;
  wire(bx, Y, LB, Y, live);
  wire(bx, Y, bx, by - 12, live);
  wire(bx, by + 12, bx, bottom, live);
  const bat = s("g", { class: "battery" }, svg);
  s("line", { x1: bx - 16, y1: by - 6, x2: bx + 16, y2: by - 6, class: "plate-long" }, bat);
  s("line", { x1: bx - 9, y1: by + 6, x2: bx + 9, y2: by + 6, class: "plate-short" }, bat);
  s("text", { x: bx - 24, y: by - 10, class: "bat-sign" }, bat).textContent = "+";
  wire(bx, bottom, W - 20, bottom, live);
  wire(LB + G.w, Y, W - 20, Y, live);
  wire(W - 20, Y, W - 20, bottom, live);
  drawNetwork(svg, G, LB, PAD, live, env, colours, wire);

  const g = s("g", { class: "signal single " + (covered ? "covered" : on ? "green" : "dark") }, svg);
  // A plain bulb before equivalence; pedestrian signals belong to the dual view.
  let inner = bulbMarkup(lx, Y, 1, live);
  if (covered) {
    inner += `<rect x="${lx - HW - 3}" y="${Y - HW - 3}" width="${2 * HW + 6}" height="${2 * HW + 6}" rx="10" fill="#94a3b8"/>` +
      `<text x="${lx}" y="${Y + 9}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="24" fill="#fff">?</text>`;
  }
  g.innerHTML = inner;
  return on;
}

/* one network: contacts in series / parallel, highlighted where current flows */
function drawNetwork(svg, top, ox0, oy0, liveTop, env, colours, wire) {
  function draw(b, ox, oy, live) {
    const r = oy + b.rail;
    if (b.kind === "contact") {
      const n = b.node;
      const closed = evaluate(n, env);
      const v = n.type === "not" ? n.arg.name : n.name;
      const g = s("g", { class: "contact" + (closed ? " closed" : " open") + (n.type === "not" ? " neg" : ""), "data-var": v || "" }, svg);
      const t1 = ox + 20, t2 = ox + b.w - 20;
      const hot = live && closed;
      wire(ox, r, t1, r, hot, g);
      wire(t2, r, ox + b.w, r, hot, g);
      if (n.type === "const") {
        if (n.value) wire(t1, r, t2, r, hot, g);
        return;
      }
      s("circle", { cx: t1, cy: r, r: 4, class: "term" }, g);
      s("circle", { cx: t2, cy: r, r: 4, class: "term" }, g);
      if (closed) s("line", { x1: t1, y1: r, x2: t2, y2: r, class: "blade" + (hot ? " live" : "") }, g);
      else s("line", { x1: t1, y1: r, x2: t2 - 8, y2: r - 22, class: "blade" }, g);
      tag(g, ox + b.w / 2, oy + 18, (n.type === "not" ? "¬" : "") + v, colours[v] || "#475569");
      return;
    }
    if (b.kind === "series") {
      b.kids.forEach((k, i) => {
        draw(k, ox + k.x, oy + k.y, live);
        if (i < b.kids.length - 1) wire(ox + k.x + k.w, r, ox + b.kids[i + 1].x, r, live);
      });
      return;
    }
    const xl = ox + BUS / 2, xr = ox + BUS + b.inner + BUS / 2;
    const rails = b.kids.map(k => oy + k.y + k.rail);
    const hotKids = b.kids.map(k => live && evaluate(k.node, env));
    const lowestHot = rails.filter((_, i) => hotKids[i]).pop();
    wire(ox, r, xl, r, live);
    wire(xr, r, ox + b.w, r, live);
    wire(xl, rails[0], xl, rails[rails.length - 1], false);
    wire(xr, rails[0], xr, rails[rails.length - 1], false);
    if (lowestHot !== undefined) {
      wire(xl, rails[0], xl, lowestHot, true);
      wire(xr, rails[0], xr, lowestHot, true);
    }
    b.kids.forEach((k, i) => {
      wire(xl, rails[i], ox + k.x, rails[i], hotKids[i]);
      draw(k, ox + k.x, oy + k.y, hotKids[i]);
      wire(ox + k.x + k.w, rails[i], xr, rails[i], hotKids[i]);
    });
  }
  draw(top, ox0, oy0, liveTop);
}
