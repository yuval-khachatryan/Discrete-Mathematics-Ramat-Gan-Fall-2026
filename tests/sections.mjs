// tests/sections.mjs — screenshot chosen sections of a rendered chapter.
//   node tests/sections.mjs <url> <outdir> <section-id>... [--w 1280]
// Each section is captured as its own PNG (after the embedded games have
// loaded and resized), so a long chapter can be checked piece by piece.
import { chromium } from "playwright-core";
const args = process.argv.slice(2);
let w = 1280;
const wi = args.indexOf("--w");
if (wi >= 0) { w = +args[wi + 1]; args.splice(wi, 2); }
const [url, outdir, ...ids] = args;
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: w, height: 1000 } });
const problems = [];
page.on("pageerror", e => problems.push("pageerror: " + e.message));
page.on("response", r => { if (r.status() >= 400 && !/favicon/.test(r.url())) problems.push(`http ${r.status()}: ${r.url()}`); });
await page.goto(url, { waitUntil: "networkidle" });
// lazy iframes only load when near the viewport: scroll through the page first
const H = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < H; y += 700) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
await page.waitForTimeout(800);
for (const id of ids) {
  const loc = page.locator(`section#${id}`).first();
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await loc.screenshot({ path: `${outdir}/${id}-${w}.png` });
  console.log("saved", `${outdir}/${id}-${w}.png`);
}
const frames = await page.evaluate(() => [...document.querySelectorAll("iframe.widget-frame")].map(f => [f.getAttribute("src"), f.style.height || "(default)"]));
for (const [src, h] of frames) console.log("iframe", h, src);
for (const p of problems) console.log(p);
await browser.close();
