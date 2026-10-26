// Every game page loads game.bundle.js (see tools/build-games.mjs). If a source
// file changed and nobody rebuilt, the page would run old code: fail loudly.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gameNames, bundle, bundleFile, targets } from "../tools/build-games.mjs";

for (const name of gameNames()) {
  test(`games/${name}: bundle is up to date and is what index.html loads`, () => {
    const dir = new URL(`../games/${name}/`, import.meta.url);
    const onDisk = readFileSync(new URL("game.bundle.js", dir), "utf8");
    assert.equal(onDisk, bundle(name), `stale bundle — run: node tools/build-games.mjs`);
    const html = readFileSync(new URL("index.html", dir), "utf8");
    assert.match(html, /<script src="game\.bundle\.js"><\/script>/);
    assert.doesNotMatch(html, /type="module"/, "module scripts do not load from file://");
  });
}

test("games/shared/book.bundle.js (chapter exercises) is up to date and loaded by every page", () => {
  const t = targets().find(x => x.label === "games/shared/book.bundle.js");
  assert.equal(readFileSync(t.out, "utf8"), bundleFile(t.entry), "stale bundle — run: node tools/build-games.mjs");
  const head = readFileSync(new URL("../_styles.html", import.meta.url), "utf8");
  assert.match(head, /<script src="games\/shared\/book\.bundle\.js" defer><\/script>/);
});
