/**
 * Read-only gating check — as Rosa (readonly), wait for the client role to resolve,
 * then verify mutation affordances are hidden/blocked on Medications.
 * Run: node scripts/e2e-rosa-gating.mjs [baseUrl]
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

await page.goto(BASE + "/sign-in", { waitUntil: "load", timeout: 60000 });
await page.fill("#email", "rosa@carecircle.demo");
await page.fill("#password", "CareCircle123");
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 60000 }),
  page.click('button[type="submit"]'),
]);

await page.goto(BASE + "/medications", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(8000); // generous: let the client role fetch resolve

const addBtn = page.getByRole("button", { name: /add medication/i }).first();
const addVisible = await addBtn.isVisible().catch(() => false);
console.log(`Add medication button visible for read-only: ${addVisible}`);
if (addVisible) {
  await addBtn.click().catch(() => {});
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText().catch(() => "");
  const blocked = /permission|read.?only|can.?t|not allowed|coordinator/i.test(body);
  const dialogOpen = await page.locator("[role=dialog]").isVisible().catch(() => false);
  console.log(`after click: dialogOpen=${dialogOpen} blockedMessage=${blocked}`);
  await page.screenshot({ path: path.join(OUT, "rosa_gating_after_click.png") });
}

const markGiven = page.getByRole("button", { name: /mark given/i }).first();
const mgVisible = await markGiven.isVisible().catch(() => false);
console.log(`Mark-given visible for read-only: ${mgVisible}`);
if (mgVisible) {
  await markGiven.click().catch(() => {});
  await page.waitForTimeout(2500);
  const body2 = await page.locator("body").innerText().catch(() => "");
  console.log(`after mark-given click, toast/permission text present: ${/permission|read.?only|not allowed/i.test(body2)}`);
  await page.screenshot({ path: path.join(OUT, "rosa_gating_markgiven.png") });
}

await page.screenshot({ path: path.join(OUT, "rosa_medications_settled.png") });
await browser.close();
console.log("done");
