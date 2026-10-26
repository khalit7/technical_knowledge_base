// Every control of the page at 390 px dark (reduced motion) and 920 px light: lifetime toggle, Rc stepper to the end and back.
// Fails on page errors, a visible #jsErr, NaN/undefined/Infinity in the text, or sideways scroll. Nothing may change before a click.
// usage (from the repo root): node <page>/src/check_controls.mjs [shots dir]
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = execSync('git rev-parse --show-toplevel', { cwd: here }).toString().trim();
const R = createRequire(path.join(repo, 'html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(here, '../index.html'); const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: scheme === 'dark' ? 'reduce' : 'no-preference' }]);
  await p.goto('file://' + page);
  await p.evaluate(() => { try { localStorage.removeItem('lsp-tab') } catch (e) {} }); await p.reload();
  const s0 = await p.$eval('#lsp-rc-n', e => e.textContent);
  await new Promise(r => setTimeout(r, 1500));
  if (await p.$eval('#lsp-rc-n', e => e.textContent) !== s0 || s0 !== 'Step 1 of 5') errs.push('stepper moved without a click');
  for (const m of ['ok', 'err']) {
    await p.click(`#lsp-lt-seg button[data-m=${m}]`);
    const vis = await p.$$eval('[data-lsp-lt]', els => els.filter(e => !e.hidden).map(e => e.dataset.lspLt));
    if (vis.join() !== m) errs.push('toggle ' + m + ' shows ' + vis);
  }
  for (let i = 0; i < 4; i++) await p.click('#lsp-rc-next');
  if (await p.$eval('#lsp-rc-n', e => e.textContent) !== 'Step 5 of 5') errs.push('stepper did not reach 5');
  if (!(await p.$eval('#lsp-rc-svg', e => e.textContent.includes('freed')))) errs.push('last step does not show freed');
  if (shots) { const el = await p.$('#lsp-rc'); await el.screenshot({ path: path.join(shots, `rc-${scheme}.png`) }); }
  for (let i = 0; i < 4; i++) await p.click('#lsp-rc-prev');
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t))) {
    await p.click(`button[data-t=${t}]`);
    if (await p.$eval('#' + t, el => /\bNaN\b|\bundefined\b(?! behaviou?r|\.html)|\bInfinity\b/i.test(el.innerText.replace(/considered-undefined/g, "")))) errs.push(t + ' NaN/undefined');
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push(t + ' sideways');
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  if (shots) { await p.click('button[data-t=t-read]'); let k = 0; for (const el of await p.$$('#t-read .hero, #t-read .lsp-vis')) await el.screenshot({ path: path.join(shots, `vis${k++}-${scheme}.png`) }); }
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
