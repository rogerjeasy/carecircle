import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:3100";
const OUT = "C:/Users/User/AppData/Local/Temp/i18n-verify";
fs.mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log(...a);
const has = (txt, s) => txt.includes(s);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

try {
  // 1. Demo sign-in as coordinator (Maria)
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
  const demoVisible = await page.getByText("Maria", { exact: false }).first().isVisible().catch(() => false);
  log("STEP signin: demo panel Maria visible =", demoVisible);
  await page.getByRole("button", { name: /Maria/ }).click();
  await page.waitForURL((u) => !u.pathname.includes("/sign-in"), { timeout: 20000 });
  log("STEP signin: landed at", new URL(page.url()).pathname);

  // 2. Medications page, English
  await page.goto(`${BASE}/medications`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  let lang = await page.evaluate(() => document.documentElement.lang);
  let dir = await page.evaluate(() => document.documentElement.dir);
  let body = await page.evaluate(() => document.body.innerText);
  await page.screenshot({ path: `${OUT}/01-en.png`, fullPage: true });
  log(`STEP en: <html lang=${lang} dir=${dir}>`);
  log("  EN has 'Medications':", has(body, "Medications"), "| 'Today':", has(body, "Today"), "| 'All medications':", has(body, "All medications"));

  // helper: switch locale via the header language Select
  async function switchTo(optionName, expectLang) {
    await page.locator('header [role="combobox"]').first().click();
    await page.getByRole("option", { name: optionName, exact: true }).click();
    await page.waitForFunction((l) => document.documentElement.lang === l, expectLang, { timeout: 15000 });
    await page.waitForTimeout(600);
  }

  // 3. French
  await switchTo("Français", "fr");
  body = await page.evaluate(() => document.body.innerText);
  dir = await page.evaluate(() => document.documentElement.dir);
  await page.screenshot({ path: `${OUT}/02-fr.png`, fullPage: true });
  log(`STEP fr: <html lang=fr dir=${dir}>`);
  log("  FR has 'Médicaments':", has(body, "Médicaments"), "| 'Aujourd':", has(body, "Aujourd"), "| 'Tous les médicaments':", has(body, "Tous les médicaments"));

  // 4. German
  await switchTo("Deutsch", "de");
  body = await page.evaluate(() => document.body.innerText);
  await page.screenshot({ path: `${OUT}/03-de.png`, fullPage: true });
  log("STEP de:");
  log("  DE has 'Medikamente':", has(body, "Medikamente"), "| 'Heute':", has(body, "Heute"), "| 'Alle Medikamente':", has(body, "Alle Medikamente"));

  // 5. German — open Add medication form
  await page.getByRole("button", { name: "Medikament hinzufügen" }).first().click();
  await page.waitForTimeout(800);
  const modal = page.getByRole("dialog");
  const modalText = await modal.innerText().catch(() => "");
  await page.screenshot({ path: `${OUT}/04-de-form.png`, fullPage: true });
  log("STEP de-form: dialog opened");
  for (const s of ["Medikamentenname", "Stärke", "Form", "Bei Bedarf (PRN)", "Sicherheitscheck bestanden", "Medikament speichern", "Pflichtfelder"]) {
    log(`  DE form has '${s}':`, has(modalText, s));
  }
  // close modal
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(400);

  // 6. Arabic (RTL)
  await switchTo("العربية", "ar");
  body = await page.evaluate(() => document.body.innerText);
  dir = await page.evaluate(() => document.documentElement.dir);
  await page.screenshot({ path: `${OUT}/05-ar.png`, fullPage: true });
  log(`STEP ar: <html lang=ar dir=${dir}>  (expect dir=rtl)`);
  log("  AR has 'الأدوية':", has(body, "الأدوية"), "| 'اليوم':", has(body, "اليوم"));

  log("CONSOLE_ERRORS:", errors.length ? JSON.stringify(errors.slice(0, 5)) : "none");
  log("DONE OK");
} catch (e) {
  await page.screenshot({ path: `${OUT}/error.png`, fullPage: true }).catch(() => {});
  log("SCRIPT ERROR:", e.message);
  log("URL at error:", page.url());
} finally {
  await browser.close();
}
