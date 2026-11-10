// Exercise every control of the Pretraining page in 390 px dark and 920 px light, then check the motion rules (2026-11-06): each Reading
// step animation plays by itself once in view and never under reduced motion; the speedrun replay is a widget that never plays by itself.
// The 3D stages have their own checks in check_stages.mjs.
// usage (from the repository root): node technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/pretraining/src/check_controls.mjs
// Fails on page or console errors, a visible #jsErr, sideways scroll, or NaN / undefined / Infinity in a tab's text.
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const R = createRequire(path.resolve(here, '../../../../../html_utils/package.json')); const puppeteer = R('puppeteer');
const file = 'file://' + path.join(here, '..', 'index.html');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const wait = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await wait(300); await p.click('#tabs button[data-t="t-read"]'); await wait(100);
  const clickAll = async (sel, after) => { const n = await p.$$eval(sel, x => x.length); for (let i = 0; i < n; i++) { await p.$$eval(sel, (x, i) => x[i].click(), i); if (after) await after(i); } return n; };
  const steps = async ctl => { for (let i = 0; i < 9; i++) await p.$eval('#' + ctl + '-f', e => e.click()); for (let i = 0; i < 9; i++) await p.$eval('#' + ctl + '-b', e => e.click());
    await p.$eval('#' + ctl + '-s', s => { s.value = s.max; s.dispatchEvent(new Event('input')) }); await p.select('#' + ctl + '-v', '2'); };
  const range = async (id, vals) => { for (const v of vals) await p.$eval('#' + id, (s, v) => { s.value = v; s.dispatchEvent(new Event('input')) }, String(v)); };
  const check = async t => {
    const txt = await p.$eval('#' + t, el => el.innerText);
    if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(txt)) errs.push(`${t}: NaN/undefined/Infinity in text`);
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push(`${t}: sideways scroll`);
  };
  // Reading
  await clickAll('#ob-mode button', () => steps('ob-ctl'));
  await clickAll('#rn-mode button', () => steps('rn-ctl'));
  await clickAll('#sl-iso-pre button'); await range('sl-iso-c', [20, 21.5, 23, 24.2, 25.5798, 26]);
  await range('sl-over-k', [1, 1.301, 2, 2.5, 3.2715, 3.5614, 3.7]);
  await clickAll('#sa-mode button', async () => { for (const q of ['7e9', '13e9', '30e9', '70e9']) for (const f of ['hoff', 'besi']) { await p.select('#sa-q', q); await p.select('#sa-fit', f); await steps('sa-ctl'); await wait(800); } });
  await p.select('#sa-q', '13e9'); await p.select('#sa-fit', 'hoff');
  await clickAll('#sl-q1 button'); await clickAll('#sl-q2 button');
  await clickAll('#as-mode button'); await clickAll('#as-q button');
  await clickAll('#ty-met button', async () => { await clickAll('#ty-view button'); await clickAll('#ty-seed button'); });
  for (const id of ['stg-ls', 'stg-sc']) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); for (let i = 0; i < 8; i++) await p.$eval('#' + id + '-f', e => e.click()); await wait(300); }
  await p.$$eval('details', ds => ds.forEach(d => d.open = true));
  await check('t-read');
  // Speedrun records
  await p.click('#tabs button[data-t="t-speed"]'); await wait(200);
  await steps('sp-ctl'); await clickAll('#sp-chips button'); await clickAll('#sp-chips button');
  await p.$$eval('#sp-plot circle', x => x[3] && x[3].dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await check('t-speed');
  await p.click('#tabs button[data-t="t-more"]'); await wait(100); await check('t-more');
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push('errbox: ' + box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
// motion: every Reading step animation plays once in view (normal motion) and stays on step 1 under reduced motion; the speedrun replay never plays by itself
for (const rm of ['no-preference', 'reduce']) {
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: rm }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(300);
  const bad = [];
  for (const [card, ctl] of [['ob-card', 'ob-ctl'], ['rn-card', 'rn-ctl'], ['sa-card', 'sa-ctl']]) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(6000);
    const v = await p.$eval('#' + ctl + '-s', s => +s.value);
    if (rm === 'reduce' ? v !== 0 : v < 1) bad.push(card + (rm === 'reduce' ? ' moved to step ' + (v + 1) : ' did not play'));
    await p.evaluate(() => window.scrollTo(0, 0)); await wait(200);
  }
  await p.click('#tabs button[data-t="t-speed"]'); await wait(300); await p.$eval('#sp-card', e => e.scrollIntoView({ block: 'center' })); await wait(2500);
  if ((await p.$eval('#sp-ctl-p', e => e.getAttribute('aria-label'))) !== 'Play') bad.push('the speedrun replay played by itself');
  console.log('motion', rm, bad.length ? bad : 'as specified'); bad.length && (bad.forEach(x => 0), 0); globalThis.__bad = (globalThis.__bad || 0) + bad.length; await p.close();
}
bad += globalThis.__bad || 0;
await b.close();
process.exit(bad ? 1 : 0);
