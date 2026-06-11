/**
 * E2E audit for hackathon review — signs in as each demo persona, walks the app's
 * screens, records HTTP/console errors, and saves screenshots for visual review.
 * Run: node scripts/e2e-audit.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = path.join(process.cwd(), ".e2e-audit");
fs.mkdirSync(OUT, { recursive: true });

// Demo-persona password (public, documented in README); override for non-seed environments.
const PASSWORD = process.env.E2E_PASSWORD || "Kintwadi123";

const APP_PAGES = [
  "/dashboard", "/timeline", "/medications", "/appointments", "/tasks", "/rota",
  "/health", "/health/alerts", "/documents", "/people", "/digest", "/ask",
  "/emergency-card", "/incidents", "/notifications", "/settings", "/profile",
];
const ADMIN_PAGES = ["/admin", "/admin/overview", "/admin/tenants", "/admin/audit", "/admin/system"];
const PUBLIC_PAGES = ["/", "/pricing", "/how-it-works", "/about", "/security", "/sign-up"];

const PERSONAS = [
  { email: "maria@kintwadi.demo", name: "maria-coordinator", pages: APP_PAGES },
  { email: "grace@kintwadi.demo", name: "grace-aide", pages: ["/dashboard", "/medications", "/timeline", "/documents", "/tasks", "/people", "/settings"] },
  { email: "antonio@kintwadi.demo", name: "antonio-recipient", pages: ["/dashboard", "/timeline", "/medications"] },
  { email: "rosa@kintwadi.demo", name: "rosa-readonly", pages: ["/dashboard", "/timeline", "/medications", "/documents", "/ask"] },
  { email: "chen@kintwadi.demo", name: "chen-clinician", pages: ["/dashboard", "/health", "/medications"] },
  { email: "paolo@kintwadi.demo", name: "paolo-remote", pages: ["/dashboard", "/digest", "/tasks"] },
  { email: "admin@kintwadi.demo", name: "platform-admin", pages: ADMIN_PAGES },
];

const results = [];

async function visit(page, persona, url) {
  const entry = { persona, url, status: null, consoleErrors: [], pageErrors: [], notes: [] };
  const onConsole = (msg) => { if (msg.type() === "error") entry.consoleErrors.push(msg.text().slice(0, 300)); };
  const onPageError = (err) => entry.pageErrors.push(String(err).slice(0, 300));
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  try {
    const resp = await page.goto(BASE + url, { waitUntil: "load", timeout: 45000 });
    entry.status = resp ? resp.status() : "no-response";
    await page.waitForTimeout(2500); // let client hydration / data fetches settle
    const finalUrl = page.url();
    if (!finalUrl.includes(url) && url !== "/") entry.notes.push(`redirected -> ${finalUrl.replace(BASE, "")}`);
    const body = await page.locator("body").innerText().catch(() => "");
    for (const marker of ["Application error", "Internal Server Error", "Something went wrong", "Unhandled Runtime Error", "404", "could not be found"]) {
      if (body.includes(marker)) entry.notes.push(`body contains "${marker}"`);
    }
    const shot = path.join(OUT, `${persona}${url.replace(/\//g, "_") || "_home"}.png`);
    await page.screenshot({ path: shot, fullPage: false });
  } catch (e) {
    entry.notes.push(`NAV FAIL: ${String(e).slice(0, 200)}`);
  }
  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  results.push(entry);
  const flag = entry.notes.length || entry.consoleErrors.length || entry.pageErrors.length ? "  ⚠" : "  ✓";
  console.log(`${flag} [${persona}] ${url} -> ${entry.status} ${entry.notes.join("; ")}`);
}

async function signIn(context, email) {
  const page = await context.newPage();
  await page.goto(BASE + "/sign-in", { waitUntil: "load", timeout: 45000 });
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 45000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1500);
  return page;
}

const browser = await chromium.launch();

// 1. Public pages, signed out
{
  const context = await browser.newContext({ viewport: { width: 1380, height: 900 } });
  const page = await context.newPage();
  for (const url of PUBLIC_PAGES) await visit(page, "public", url);
  // auth-gate check: hitting a protected page signed-out must bounce to /sign-in
  await page.goto(BASE + "/dashboard", { waitUntil: "load", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const gated = page.url().includes("/sign-in");
  console.log(gated ? "  ✓ auth-gate: /dashboard redirects to /sign-in when signed out" : "  ✗ AUTH-GATE FAILURE: /dashboard reachable signed out");
  results.push({ persona: "public", url: "auth-gate", status: gated ? "PASS" : "FAIL", consoleErrors: [], pageErrors: [], notes: [] });
  await context.close();
}

// 2. Each persona
for (const p of PERSONAS) {
  const context = await browser.newContext({ viewport: { width: 1380, height: 900 } });
  try {
    const page = await signIn(context, p.email);
    console.log(`-- signed in as ${p.email} (landed on ${page.url().replace(BASE, "")})`);
    for (const url of p.pages) await visit(page, p.name, url);
  } catch (e) {
    console.log(`  ✗ SIGN-IN FAILED for ${p.email}: ${String(e).slice(0, 200)}`);
    results.push({ persona: p.name, url: "sign-in", status: "FAIL", consoleErrors: [], pageErrors: [], notes: [String(e).slice(0, 200)] });
  }
  await context.close();
}

// 3. Mobile viewport spot-check (coordinator)
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const page = await signIn(context, "maria@kintwadi.demo");
    for (const url of ["/dashboard", "/timeline", "/medications"]) await visit(page, "mobile-maria", url);
  } catch (e) {
    console.log(`  ✗ mobile sign-in failed: ${String(e).slice(0, 200)}`);
  }
  await context.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
const flagged = results.filter((r) => r.notes.length || r.consoleErrors.length || r.pageErrors.length);
console.log(`\nDONE. ${results.length} checks, ${flagged.length} flagged. Details: .e2e-audit/results.json`);
