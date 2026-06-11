/**
 * Follow-up checks: live Ask Kintwadi (fixed selector), /incidents + /settings load
 * timing as Maria. Run: node scripts/e2e-followup.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = path.join(process.cwd(), ".e2e-audit");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1380, height: 900 } });
const page = await context.newPage();

await page.goto(BASE + "/sign-in", { waitUntil: "load", timeout: 90000 });
await page.fill("#email", "maria@kintwadi.demo");
await page.fill("#password", "Kintwadi123");
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 90000 }),
  page.click('button[type="submit"]'),
]);
console.log("signed in as maria");

// ---- /incidents and /settings with timing ----
for (const url of ["/incidents", "/settings"]) {
  const t0 = Date.now();
  try {
    const resp = await page.goto(BASE + url, { waitUntil: "load", timeout: 120000 });
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, `maria${url.replace(/\//g, "_")}_retry.png`) });
    console.log(`✓ [maria] ${url} -> ${resp?.status()} in ${secs}s`);
  } catch (e) {
    console.log(`✗ [maria] ${url} failed after ${((Date.now() - t0) / 1000).toFixed(0)}s: ${String(e).slice(0, 150)}`);
  }
}

// ---- Live Ask Kintwadi ----
try {
  await page.goto(BASE + "/ask", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(3000);
  const input = page.getByPlaceholder(/ask about/i).last();
  await input.fill("When did Antonio last see a doctor, and what changed in his medications recently?");
  await input.press("Enter");
  console.log("ask: submitted, waiting up to 45s for grounded answer…");
  await page.waitForTimeout(45000);
  await page.screenshot({ path: path.join(OUT, "maria_ask_answer.png"), fullPage: true });
  const t = await page.locator("body").innerText().catch(() => "");
  const failed = /isn’t available|not configured|Something went wrong/i.test(t);
  const hasSources = /source|cited|\[V\d|\[S\d/i.test(t);
  console.log(failed ? "⚠ ask FAILED (see screenshot)" : `✓ ask answered (sources visible: ${hasSources})`);
} catch (e) {
  console.log("✗ ask flow error: " + String(e).slice(0, 200));
}

await browser.close();
console.log("done");
