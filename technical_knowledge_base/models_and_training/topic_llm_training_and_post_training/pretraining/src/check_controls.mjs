// Exercise every control of the Pretraining page in 390 px dark and 920 px light, then check nothing autoplays.
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
  await steps('ty-ctl'); await clickAll('#ty-br button');
  await clickAll('#sl-iso-pre button'); await range('sl-iso-c', [20, 21.5, 23, 24.2, 25.5798, 26]);
  await range('sl-over-k', [1, 1.301, 2, 2.5, 3.2715, 3.5614, 3.7]);
  await clickAll('#sa-mode button', async () => { for (const q of ['7e9', '13e9', '30e9', '70e9']) for (const f of ['hoff', 'besi']) { await p.select('#sa-q', q); await p.select('#sa-fit', f); await steps('sa-ctl'); await wait(800); } });
  await p.select('#sa-q', '13e9'); await p.select('#sa-fit', 'hoff');
  await clickAll('#sl-q1 button'); await clickAll('#sl-q2 button');
  await clickAll('#as-mode button'); await clickAll('#as-q button');
  await clickAll('#ty-met button', async () => { await clickAll('#ty-view button'); await clickAll('#ty-seed button'); });
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
// nothing moves before the reader acts: scroll every stepper into view, wait, and read its position (normal and reduced motion)
for (const rm of ['no-preference', 'reduce']) {
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: rm }]);
  await p.goto(file); await wait(300); await p.click('#tabs button[data-t="t-read"]'); await wait(100);
  const moved = [];
  for (const [card, ctl] of [['ob-card', 'ob-ctl'], ['ty-card', 'ty-ctl'], ['rn-card', 'rn-ctl'], ['sa-card', 'sa-ctl']]) {
    await p.$eval('#' + card, e => e.scrollIntoView()); await wait(3200);
    const v = await p.$eval('#' + ctl + '-s', s => +s.value); if (v !== 0) moved.push(card + ' at step ' + v);
    if (card === 'sa-card') { await p.click('#sa-mode button[data-m="sard"]'); await wait(2600); const v2 = await p.$eval('#sa-ctl-s', s => +s.value); if (v2 !== 0) moved.push('sa-card after a mode switch at step ' + v2); }
  }
  console.log('autoplay', rm, moved.length ? moved : 'none'); bad += moved.length; await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
