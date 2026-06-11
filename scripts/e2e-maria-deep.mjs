/**
 * Deep-dive E2E as Maria (coordinator): all screens + live "Ask CareCircle" RAG question
 * + Daily Digest state. Run: node scripts/e2e-maria-deep.mjs [baseUrl]
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
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));

// Sign in (generous timeout — dev-mode compiles can be slow on first hit)
await page.goto(BASE + "/sign-in", { waitUntil: "load", timeout: 90000 });
await page.fill("#email", "maria@carecircle.demo");
await page.fill("#password", "CareCircle123");
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 90000 }),
  page.click('button[type="submit"]'),
]);
console.log("signed in, landed on " + page.url().replace(BASE, ""));

const PAGES = [
  "/dashboard", "/timeline", "/medications", "/appointments", "/tasks", "/rota",
  "/health", "/health/alerts", "/documents", "/people", "/digest",
  "/emergency-card", "/incidents", "/notifications", "/settings", "/profile",
];
for (const url of PAGES) {
  try {
    const resp = await page.goto(BASE + url, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(2200);
    const body = await page.locator("body").innerText().catch(() => "");
    const bad = ["Application error", "Internal Server Error", "Something went wrong", "Unhandled Runtime Error"].filter((m) => body.includes(m));
    await page.screenshot({ path: path.join(OUT, `maria${url.replace(/\//g, "_")}.png`) });
    console.log(`${bad.length ? "⚠" : "✓"} [maria] ${url} -> ${resp?.status()} ${bad.join("; ")}`);
  } catch (e) {
    console.log(`✗ [maria] ${url} NAV FAIL ${String(e).slice(0, 150)}`);
  }
}

// ---- Documents count check (coordinator should see ALL 6 incl. restricted) ----
await page.goto(BASE + "/documents", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(2500);
const docText = await page.locator("body").innerText().catch(() => "");
const seesRestricted = docText.includes("Power of attorney") && docText.includes("Bank authorization");
console.log(seesRestricted ? "✓ maria sees restricted docs (RBAC contrast with Grace proven)" : "⚠ maria does NOT see restricted docs — check seed/RLS");

// ---- Live Ask CareCircle (RAG round-trip through Bedrock + pgvector) ----
try {
  await page.goto(BASE + "/ask", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2000);
  const input = page.locator("textarea, input[type='text']").first();
  await input.fill("When did Antonio last see a doctor, and what changed in his medications recently?");
  await input.press("Enter");
  console.log("ask: question submitted, waiting for grounded answer…");
  // wait for an assistant message / source cards to appear
  await page.waitForTimeout(30000);
  await page.screenshot({ path: path.join(OUT, "maria_ask_answer.png"), fullPage: true });
  const askText = await page.locator("body").innerText().catch(() => "");
  const failed = /isn’t available|not configured|Something went wrong/i.test(askText);
  console.log(failed ? "⚠ ask: answer FAILED or Bedrock unconfigured" : "✓ ask: answer rendered (see maria_ask_answer.png)");
} catch (e) {
  console.log("✗ ask flow failed: " + String(e).slice(0, 200));
}

// ---- Digest: check today's state & generate button ----
try {
  await page.goto(BASE + "/digest", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2500);
  const t = await page.locator("body").innerText().catch(() => "");
  const hasDigest = !/no digest yet/i.test(t);
  console.log(hasDigest ? "✓ digest: content present for selected day" : "⚠ digest: 'no digest yet' state shown");
  const genBtn = page.getByRole("button", { name: /generate/i }).first();
  if (await genBtn.isVisible().catch(() => false)) {
    await genBtn.click();
    console.log("digest: clicked Generate, waiting for Bedrock…");
    await page.waitForTimeout(35000);
    await page.screenshot({ path: path.join(OUT, "maria_digest_generated.png"), fullPage: true });
    const t2 = await page.locator("body").innerText().catch(() => "");
    console.log(!/no digest yet/i.test(t2) ? "✓ digest: generated successfully" : "⚠ digest: still empty after generate");
  } else {
    console.log("digest: no Generate button visible");
  }
} catch (e) {
  console.log("✗ digest flow failed: " + String(e).slice(0, 200));
}

console.log("\npage errors collected: " + (errors.length ? errors.join(" | ") : "none"));
await browser.close();
