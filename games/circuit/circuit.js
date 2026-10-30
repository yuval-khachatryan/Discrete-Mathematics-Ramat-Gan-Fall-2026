/* Switch circuits: literals are contacts, AND is series, OR is parallel.
   A compound NOT is an isolated control circuit driving a normally closed
   output contact. The dashed control link is not an electrical wire.
   Keep written negation scope in the green/lamp network. Only the red network
   in the explicit complementary-traffic-light view uses NNF (De Morgan).
   layout(), networks(), explain() remain DOM-free. */

import { parse, nnf, evaluate, format } from "../shared/logic.js";
import { lampMarkup, bulbMarkup } from "../shared/signal.js";

const CW = 96;      // contact block width
const CH = 66;      // contact block height
const RAIL = 44;    // y of the wire inside a contact block
const GAP = 12;     // wire between blocks in series
const BUS = 20;     // room for the vertical bus on each side of a parallel block
const VGAP = 8;     // between parallel branches

// no green or red here: those colours mean T and F on the signal
export const VAR_COLOURS = ["#2563eb", "#7c3aed", "#b45309", "#0e7490", "#be185d"];

/** Expand derived connectives without pushing NOT through a group. */
function wiringTree(n) {
  const not = arg => ({ type: "not", arg });
  const join = (type, ...args) => ({ type, args });
  if (n.type === "imp") return wiringTree(join("or", not(n.left), n.right));
  if (n.type === "xor") return wiringTree(join("or", join("and", n.left, not(n.right)), join("and", not(n.left), n.right)));
  if (n.type === "iff") return wiringTree(join("or", join("and", n.left, n.right), join("and", not(n.left), not(n.right))));
  if (n.type === "and" || n.type === "or") return { ...n, args: n.args.map(wiringTree) };
  if (n.type === "not") return { ...n, arg: wiringTree(n.arg) };
  return n;
}

/** Block tree with sizes and child offsets, preserving whole-group NOT. */
function layoutTree(tree) {
  function lay(n) {
    if (n.type === "not" && n.arg.type !== "var") {
      const child = lay(n.arg);
      const w = Math.max(280, child.w + 124, 32 + format(n).length * 11);
      const rail = child.h + 132;
      return { kind: "inverter", node: n, child, w, h: rail + 36, rail };
    }
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

/** The written formula, plus an explicitly expanded complementary red path. */
export function networks(formula) {
  const f = parse(formula);
  return { green: layoutTree(wiringTree(f)), red: layoutTree(nnf({ type: "not", arg: f })) };
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
  if (b.kind === "inverter") return `מגע ה־NOT סגור, כי החלק ${m(format(b.node.arg))} שבתיבה שקר. הרכיב הופך שקר לאמת`;
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
  if (b.kind === "inverter") return `מגע ה־NOT פתוח, כי החלק ${m(format(b.node.arg))} שבתיבה אמת. הרכיב הופך אמת לשקר`;
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
    drawNetwork(svg, R, NX, PAD, redLive, env, colours, wire, !covered);
    drawNetwork(svg, G, NX, greenTop, greenLive, env, colours, wire, !covered);
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
  drawNetwork(svg, G, LB, PAD, live, env, colours, wire, !covered);

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
function drawNetwork(svg, top, ox0, oy0, liveTop, env, colours, wire, revealed = true) {
  function draw(b, ox, oy, live) {
    const r = oy + b.rail;
    if (b.kind === "inverter") {
      const input = evaluate(b.node.arg, env), output = !input;
      const g = s("g", { class: "not-module", "data-input": input, "data-output": output }, svg);
      s("rect", { x: ox + 2, y: oy + 2, width: b.w - 4, height: b.h - 4, rx: 12, class: "not-frame" }, g);
      s("text", { x: ox + b.w / 2, y: oy + 24, class: "not-label" }, g).textContent = format(b.node.arg);
      // The input has its own power supply. Its current never feeds the output.
      const control = s("g", { class: "not-control" }, g);
      const cx = ox + 44, cy = oy + 38, cr = cy + b.child.rail;
      const coilX = cx + b.child.w + 30, back = cy + b.child.h + 12;
      const hot = revealed && input;
      const cw = (x1,y1,x2,y2,on,parent) => wire(x1,y1,x2,y2,on,parent || control);
      drawNetwork(control, b.child, cx, cy, hot, env, colours, cw, revealed);
      cw(ox + 22, cr, cx, cr, hot);
      cw(cx + b.child.w, cr, coilX - 17, cr, hot);
      cw(coilX + 17, cr, ox + b.w - 14, cr, hot);
      cw(ox + b.w - 14, cr, ox + b.w - 14, back, hot);
      cw(ox + b.w - 14, back, ox + 22, back, hot);
      const by = (cr + back) / 2;
      cw(ox + 22, cr, ox + 22, by - 6, hot);
      cw(ox + 22, by + 6, ox + 22, back, hot);
      s("line", {x1:ox+11,y1:by-4,x2:ox+33,y2:by-4,class:"plate-long"}, control);
      s("line", {x1:ox+16,y1:by+4,x2:ox+28,y2:by+4,class:"plate-short"}, control);
      s("rect", { x: coilX - 17, y: cr - 14, width: 34, height: 28, rx: 5, class: "not-sensor" }, control);
      s("text", { x: coilX, y: cr + 5, class: "not-value" }, control).textContent = revealed ? (input ? "T" : "F") : "?";
      // Dashed line = control, NOT a conducting connection.
      const mid = ox + b.w / 2;
      s("path", { d: `M${coilX},${cr+14} V${back+14} H${mid} V${r-58}`, class: "not-link" }, g);
      tag(g, mid, r - 40, "NOT", "#7c3aed");
      const t1 = mid - 25, t2 = mid + 25, active = live && output;
      wire(ox, r, t1, r, active, g); wire(t2, r, ox + b.w, r, active, g);
      s("circle", {cx:t1,cy:r,r:4,class:"term"},g);
      s("circle", {cx:t2,cy:r,r:4,class:"term"},g);
      s("line", {x1:t1,y1:r,x2:output?t2:t2-8,y2:output?r:r-22,class:"blade"+(active?" live":"")},g);
      s("text", {x:mid,y:r+25,class:"not-label"},g).textContent = `${format(b.node)} = ${revealed ? (output ? "T" : "F") : "?"}`;
      return;
    }
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
