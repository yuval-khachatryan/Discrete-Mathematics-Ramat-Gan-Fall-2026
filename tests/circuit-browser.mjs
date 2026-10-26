// Run after quarto render, with _book served locally:
// node tests/circuit-browser.mjs http://127.0.0.1:8798
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { LEVELS } from "../games/circuit/levels.js";
import { assignments, evaluate } from "../games/shared/logic.js";

const base = process.argv[2] || "http://127.0.0.1:8798";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
  page.on("pageerror", e => errors.push(e.message));
  page.on("response", r => { if (r.status() >= 400 && !r.url().endsWith("/favicon.ico")) errors.push(`${r.status()} ${r.url()}`); });
  const check = () => page.getByRole("button", { name: "בדיקה", exact: true }).click();
  const reset = () => page.getByRole("button", { name: "איפוס", exact: true }).click();
  const passed = async () => {
    assert.equal(await page.locator(".g-debrief").isVisible(), true);
    assert.equal(await page.locator(".g-feedback.g-good").count(), 1);
  };
  const notPassed = async () => assert.equal(await page.locator(".g-debrief").isVisible(), false);
  async function open(level) {
    await page.goto(`${base}/games/circuit/index.html?level=${level.id}&embed=1`);
    await page.locator(".c-lever").first().waitFor();
  }
  async function setSwitches(row) {
    const buttons = page.locator(".c-lever");
    for (const [i, value] of Object.values(row).entries()) {
      if ((await buttons.nth(i).getAttribute("aria-checked") === "true") !== value) await buttons.nth(i).click();
    }
  }
  async function setCell(i, j, value) {
    const button = page.locator(".c-table tbody tr").nth(i).locator(".c-cell").nth(j);
    for (let n = 0; n < 3 && (await button.innerText()).trim() !== (value ? "T" : "F"); n++) await button.click();
    assert.equal((await button.innerText()).trim(), value ? "T" : "F");
  }
  async function fill(level, wrongFirst = false) {
    const rows = assignments(Object.keys(level.vars));
    for (const [i, row] of rows.entries()) {
      for (const [j, formula] of [level.formula, level.formula2].filter(Boolean).entries()) {
        const expected = evaluate(formula, row);
        await setCell(i, j, wrongFirst && i === 0 && j === 0 ? !expected : expected);
      }
    }
  }
  const judge = right => page.locator(".c-verdict button").nth(right ? 0 : 1).click();

  for (const level of LEVELS) {
    await open(level);
    const rows = assignments(Object.keys(level.vars));
    if (level.mode === "predict") {
      // A wrong prediction must be retried after the other rounds.
      await page.locator(".c-ans").nth(evaluate(level.formula, level.rounds[0]) ? 1 : 0).click();
      await notPassed();
      await page.locator(".c-predict .g-primary").click();
      for (const row of [...level.rounds.slice(1), level.rounds[0]]) {
        await page.locator(".c-ans").nth(evaluate(level.formula, row) ? 0 : 1).click();
        await page.locator(".c-predict .g-primary").click();
      }
      await passed();
    } else if (level.mode === "play" && !level.impossible) {
      await check(); await notPassed();
      const free = rows.filter(r => Object.keys(level.locked || {}).every(n => r[n] === level.start[n]));
      const row = free.find(r => evaluate(level.formula, r) === (level.target !== false));
      await setSwitches(row); await notPassed();
      if (level.locked) assert.equal(await page.locator(".c-lever").first().isDisabled(), true);
      await check(); await passed();
    } else {
      // Visiting every row must neither answer the worksheet nor complete it.
      for (let i = 0; i < rows.length; i++) await page.locator(".c-trial").nth(i).click();
      await notPassed();
      if (level.mode === "select") {
        assert.equal(await page.locator(".c-answer:checked").count(), 0);
        await check(); await notPassed();
        // Select a superset, then a subset: both must be rejected.
        for (let i = 0; i < rows.length; i++) await page.locator(".c-answer").nth(i).check();
        await check(); await notPassed();
        const desired = rows.map(r => evaluate(level.formula, r) === (level.target !== false));
        for (let i = 0; i < rows.length; i++) await page.locator(".c-answer").nth(i).setChecked(desired[i]);
        const first = desired.indexOf(true);
        await page.locator(".c-answer").nth(first).uncheck();
        await check(); await notPassed();
        await page.locator(".c-answer").nth(first).check();
        await notPassed(); await check(); await passed();
      } else if (level.mode === "compare") {
        assert.ok((await page.locator(".c-cell").allTextContents()).every(x => x === "?"));
        await judge(true); await notPassed();
        if (level.same) {
          await fill(level, true); await judge(true); await notPassed();
          assert.ok(await page.locator(".c-cell.wrong").count());
          await fill(level); await notPassed(); await judge(true); await passed();
        } else {
          const sameRow = rows.find(r => evaluate(level.formula, r) === evaluate(level.formula2, r));
          await setSwitches(sameRow); await judge(false); await notPassed();
          await fill(level); await judge(true); await notPassed();
          // Refuting equivalence needs just one submitted counterexample, not a table.
          await reset();
          const different = rows.find(r => evaluate(level.formula, r) !== evaluate(level.formula2, r));
          await setSwitches(different); await notPassed(); await judge(false); await passed();
        }
      } else {
        assert.ok((await page.locator(".c-cell").allTextContents()).every(x => x === "?"));
        const submit = level.impossible ? () => page.locator(".c-impossible button").click() : check;
        await submit(); await notPassed();
        await fill(level, true); await submit(); await notPassed();
        assert.ok(await page.locator(".c-cell.wrong").count());
        await fill(level); await notPassed(); await submit(); await passed();
      }
    }
    await reset(); await notPassed();
    // The worksheet, keyboard focus, hints and solution must work after reset too.
    if (await page.locator(".c-trial").count()) {
      await page.locator(".c-trial").first().focus(); await page.keyboard.press("Enter");
      assert.equal(await page.locator(".c-trial").first().evaluate(n => n === document.activeElement), true);
    }
    if (await page.locator(".c-cell").count()) {
      await page.locator(".c-cell").first().focus(); await page.keyboard.press("Space");
      assert.equal(await page.locator(".c-cell").first().evaluate(n => n === document.activeElement), true);
    }
    await page.getByRole("button", { name: /^רמז/ }).click();
    await page.getByRole("button", { name: "פתרון", exact: true }).click();
    assert.equal(await page.locator(".g-debrief").isVisible(), true);
    await reset(); await notPassed();
    console.log(`Interaction checks: ${level.id}`);
  }

  for (const width of [1100, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const level of LEVELS) {
      await open(level);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.equal(overflow, false, `${level.id}: overflow at ${width}px`);
    }
    await open(LEVELS.find(l => l.id === "dm-and"));
    await page.screenshot({ path: `/tmp/circuit-compare-${width}.png`, fullPage: true });
    await open(LEVELS.find(l => l.id === "xor-stairs"));
    await page.screenshot({ path: `/tmp/circuit-select-${width}.png`, fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log(`Passed: ${LEVELS.length} activities, submissions, incorrect answers, retries, reset, keyboard controls and three viewport sizes.`);
} finally {
  await browser.close();
}
