/**
 * Verifies the polish fixes:
 *  1. /sign-in and /sign-up render exactly ONE #email/#password (no duplicate IDs)
 *  2. Mobile sign-in works (used to fail on the duplicate IDs)
 *  3. No coordinator flash: Antonio (recipient) and Rosa (read-only) get their role lens
 *     on first paint — no "Log medication"/"Report incident" coordinator buttons
 *  4. The top-bar on-call chip agrees with the dashboard "On call now" card
 *  5. Dashboard digest card offers "Generate today's digest" when none exists (non-readonly)
 *  6. Digest screen: an empty "today" is never a dead end — read-only viewers get a one-tap
 *     "Read yesterday's digest" that lands on the seeded digest
 * Run: node scripts/e2e-verify-fixes.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = path.join(process.cwd(), ".e2e-audit");
fs.mkdirSync(OUT, { recursive: true });
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
};

const browser = await chromium.launch();

async function signIn(context, email) {
  const page = await context.newPage();
  await page.goto(BASE + "/sign-in", { waitUntil: "load", timeout: 90000 });
  await page.fill("#email", email);
  await page.fill("#password", "Kintwadi123");
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 90000 }),
    page.click('button[type="submit"]'),
  ]);
  return page;
}

// ---- 1. Single form instance on auth pages ----
{
  const context = await browser.newContext({ viewport: { width: 1380, height: 900 } });
  const page = await context.newPage();
  for (const url of ["/sign-in", "/sign-up"]) {
    await page.goto(BASE + url, { waitUntil: "load", timeout: 90000 });
    const emails = await page.locator("#email").count();
    const pws = await page.locator("#password").count();
    check(emails === 1 && pws === 1, `${url}: exactly one #email (${emails}) and #password (${pws})`);
  }
  await context.close();
}

// ---- 2. Mobile sign-in (previously broken) ----
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const page = await signIn(context, "maria@kintwadi.demo");
    check(true, "mobile sign-in completes");
    await page.goto(BASE + "/dashboard", { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, "verify_mobile_dashboard.png") });
  } catch (e) {
    check(false, `mobile sign-in completes (${String(e).slice(0, 120)})`);
  }
  await context.close();
}

// ---- 3. First-paint role lens (no coordinator flash) ----
for (const p of [
  { email: "antonio@kintwadi.demo", label: "antonio (recipient)" },
  { email: "rosa@kintwadi.demo", label: "rosa (read-only)" },
]) {
  const context = await browser.newContext({ viewport: { width: 1380, height: 900 } });
  try {
    const page = await signIn(context, p.email);
    await page.goto(BASE + "/dashboard", { waitUntil: "commit", timeout: 60000 });
    // Sample the page EARLY (before any client identity fetch could land) and check for
    // coordinator-only quick actions leaking through.
    await page.waitForTimeout(700);
    const early = await page.locator("body").innerText().catch(() => "");
    const leakedEarly = /Log medication|Report incident|New task/i.test(early);
    await page.waitForTimeout(4000);
    const settled = await page.locator("body").innerText().catch(() => "");
    const leakedSettled = /Log medication|Report incident|New task/i.test(settled);
    check(!leakedEarly && !leakedSettled, `${p.label}: no coordinator quick-actions at first paint (early=${leakedEarly}, settled=${leakedSettled})`);
    await page.screenshot({ path: path.join(OUT, `verify_${p.email.split("@")[0]}_dashboard.png`) });
  } catch (e) {
    check(false, `${p.label} flow (${String(e).slice(0, 120)})`);
  }
  await context.close();
}

// ---- 4 + 5. On-call chip agrees with card; digest CTA present ----
{
  const context = await browser.newContext({ viewport: { width: 1380, height: 900 } });
  try {
    const page = await signIn(context, "maria@kintwadi.demo");
    await page.goto(BASE + "/dashboard", { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(5000); // let chip fetch + dashboard data settle
    const body = await page.locator("body").innerText().catch(() => "");
    const chipMatch = body.match(/On call: (\w+)/);
    const cardSaysNobody = /No one is on call right now/i.test(body);
    const consistent = (chipMatch && !cardSaysNobody) || (!chipMatch && cardSaysNobody);
    check(consistent, `on-call chip and card agree (chip=${chipMatch ? chipMatch[1] : "hidden"}, cardSaysNobody=${cardSaysNobody})`);

    const hasDigestPara = !/No digest yet for today/i.test(body);
    const hasGenerateCta = /Generate today's digest/i.test(body);
    check(hasDigestPara || hasGenerateCta, `digest card: content present OR generate CTA shown (content=${hasDigestPara}, cta=${hasGenerateCta})`);
    await page.screenshot({ path: path.join(OUT, "verify_maria_dashboard.png") });
  } catch (e) {
    check(false, `maria dashboard checks (${String(e).slice(0, 120)})`);
  }
  await context.close();
}

// ---- 6. Digest screen: empty "today" is never a dead end (read-only viewer) ----
{
  const context = await browser.newContext({ viewport: { width: 1380, height: 900 } });
  try {
    const page = await signIn(context, "rosa@kintwadi.demo");
    await page.goto(BASE + "/digest", { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(4000); // today's load + yesterday prefetch
    const body = await page.locator("body").innerText().catch(() => "");
    if (/No digest yet for today/i.test(body)) {
      // The button appears once the yesterday prefetch lands — wait for it rather than sampling
      // (a fixed sleep races dev-mode compiles).
      const backBtn = page.getByRole("button", { name: /Read yesterday['’]s digest/i });
      const offered = await backBtn
        .waitFor({ state: "visible", timeout: 20000 })
        .then(() => true)
        .catch(() => false);
      check(offered, 'digest screen: empty today offers "Read yesterday\'s digest"');
      if (offered) {
        await backBtn.click();
        await page.waitForTimeout(2500);
        const after = await page.locator("body").innerText().catch(() => "");
        check(/Yesterday/i.test(after) && !/No digest yet/i.test(after), "digest screen: one tap lands on yesterday's saved digest");
      }
    } else {
      check(true, "digest screen: today already has a digest (empty state not shown)");
    }
    await page.screenshot({ path: path.join(OUT, "verify_rosa_digest.png") });
  } catch (e) {
    check(false, `rosa digest screen (${String(e).slice(0, 120)})`);
  }
  await context.close();
}

await browser.close();
console.log(failures === 0 ? "\nALL FIX VERIFICATIONS PASSED" : `\n${failures} verification(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
