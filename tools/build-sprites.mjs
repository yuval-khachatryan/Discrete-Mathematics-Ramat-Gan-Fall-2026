// node tools/build-sprites.mjs — write every sprite in games/shared/sprites.js
// to games/shared/sprites/<name>.svg (used by the book's CSS) and a contact
// sheet, games/shared/sprites/index.html, for eyeballing them all at once.
import { writeFileSync, mkdirSync } from "node:fs";
import { SPRITES } from "../games/shared/sprites.js";
const dir = new URL("../games/shared/sprites/", import.meta.url);   // tools/ → games/shared/sprites/
mkdirSync(dir, { recursive: true });
const cells = [];
for (const [name, svg] of Object.entries(SPRITES)) {
  writeFileSync(new URL(`${name}.svg`, dir), svg + "\n");
  cells.push(`<figure><img src="${name}.svg" alt="${name}"><figcaption>${name}</figcaption></figure>`);
}
writeFileSync(new URL("index.html", dir), `<!DOCTYPE html><html lang="he" dir="rtl"><meta charset="utf-8"><title>sprites</title>
<style>body{font:14px Arial;display:flex;flex-wrap:wrap;gap:12px;padding:16px;background:#f8fafc}figure{margin:0;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:8px;text-align:center}img{width:110px;height:110px;display:block}</style>
${cells.join("\n")}</html>\n`);
console.log(`wrote ${cells.length} sprites`);
