// tests/shot.mjs — screenshot a page in the locally installed Google Chrome.
//
//   node tests/shot.mjs <url> <out.png> [--w 1100] [--h 900] [--full]
//                       [--click "<css selector>"]... [--wait 300]
//
// --click may repeat; clicks run in order, each followed by a short pause.
// Console errors and failed requests are printed, so a broken game shows up
// even when the picture looks fine. Exit code 1 if any were seen.
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const url = args[0], out = args[1];
if (!url || !out) {
  console.error("usage: node tests/shot.mjs <url> <out.png> [--w N] [--h N] [--full] [--click sel]... [--wait ms]");
  process.exit(2);
}
let w = 1100, h = 900, full = false, wait = 300;
const clicks = [];
for (let i = 2; i < args.length; i++) {
  const a = args[i];
  if (a === "--w") w = +args[++i];
  else if (a === "--h") h = +args[++i];
  else if (a === "--full") full = true;
  else if (a === "--wait") wait = +args[++i];
  else if (a === "--click") clicks.push(args[++i]);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
const problems = [];
// "Failed to load resource" console lines are reported below with their URL instead.
page.on("console", m => { if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) problems.push("console: " + m.text()); });
page.on("pageerror", e => problems.push("pageerror: " + e.message));
const ignored = u => /\/favicon\.ico$/.test(u);   // browsers ask for it; the site has none
page.on("requestfailed", r => { if (!ignored(r.url())) problems.push("requestfailed: " + r.url()); });
page.on("response", r => { if (r.status() >= 400 && !ignored(r.url())) problems.push(`http ${r.status()}: ${r.url()}`); });

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(wait);
for (const sel of clicks) {
  await page.click(sel);
  await page.waitForTimeout(250);
}
await page.screenshot({ path: out, fullPage: full });
await browser.close();
for (const p of problems) console.log(p);
console.log(problems.length ? `${problems.length} problem(s)` : "ok");
process.exit(problems.length ? 1 : 0);
