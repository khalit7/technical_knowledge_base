// Click every control on every tab at 390 dark and 920 light; fail on page errors, NaN, undefined or Infinity in visible text;
// screenshot each card. Usage (from html_utils, so puppeteer resolves):
//   node ../technical_knowledge_base/engineering_foundations/topic_math/variational_inference_and_generative_models/src/test_page.mjs <index.html> <outdir>
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const require = createRequire(path.join(process.cwd(), 'package.json'));
const puppeteer = require('puppeteer');
const [file, outdir] = process.argv.slice(2); fs.mkdirSync(outdir, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, protocolTimeout: 240000 });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let problems = 0, clicks = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve(file)); await sleep(700);
  const bad = async where => { const t = await p.evaluate(() => { const v = document.querySelector('.tab:not([hidden])'); return v ? v.innerText : '' });
    const hits = (t.match(/NaN|undefined|Infinity/g) || []); if (hits.length) { problems++; console.log('BAD TEXT', scheme, where, hits.slice(0, 3)) } };
  const shot = async (sel, name) => { const el = await p.$(sel); if (!el) { problems++; console.log('missing', sel); return } await el.evaluate(e => e.scrollIntoView()); await sleep(150); await el.screenshot({ path: path.join(outdir, `${name}-${scheme}-${width}.png`) }) };
  // Reading: animations stepped to the end and back, every toggle
  await p.click('button[data-t=t-read]'); await sleep(300);
  for (const id of ['vi-cavi', 'vi-fr']) {
    await p.$eval('#' + id + '-card', e => e.scrollIntoView()); await sleep(id === 'vi-fr' ? 9000 : 300);
    const n = await p.$eval('#' + id + '-ctl-s', e => +e.max);
    for (let i = 0; i < n; i++) { await p.click('#' + id + '-ctl-f'); clicks++ }
    await sleep(200); await bad(id + ' end'); await shot('#' + id + '-card', id + '-end');
    await p.click('#' + id + '-ctl-b'); clicks++;
    await p.$eval('#' + id + '-ctl-s', e => { e.value = 3; e.dispatchEvent(new Event('input')) }); clicks++;
    await p.click('#' + id + '-ctl-p'); clicks++; await sleep(200); await p.click('#' + id + '-ctl-p'); clicks++;
    await p.select('#' + id + '-ctl-v', '2'); clicks++;
  }
  for (const m of ['ddim', 'flow', 'ddpm']) { await p.click(`#vi-fr-seg button[data-m=${m}]`); clicks++; await sleep(m === 'ddpm' ? 300 : 2500);
    if (m !== 'ddpm') { const n = await p.$eval('#vi-fr-ctl-s', e => +e.max); await p.$eval('#vi-fr-ctl-s', (e, n) => { e.value = n; e.dispatchEvent(new Event('input')) }, n); await sleep(300); await bad('fr ' + m); await shot('#vi-fr-card', 'vi-fr-' + m) } }
  for (const m of ['cosine', 'linear']) { await p.click(`#vi-sch-seg button[data-m=${m}]`); clicks++ }
  for (const v of [1, 500, 1000]) { await p.$eval('#vi-sch-t', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); clicks++; await bad('sch ' + v) }
  await p.$eval('#vi-st-card', e => e.scrollIntoView()); await sleep(2500);
  for (const id of ['vi-est-card', 'vi-curve-card', 'vi-beta-card', 'vi-sch-card', 'vi-st-card']) await shot('#' + id, id);
  await bad('read');
  // ELBO lab
  await p.click('button[data-t=t-elbo]'); await sleep(300);
  for (const m of ['B', 'A']) { await p.click(`#el-model button[data-m=${m}]`); clicks++; await sleep(100);
    for (const [id, v] of [['el-x', 3], ['el-m', -1], ['el-q', 0.05], ['el-s', 1.5], ['el-x', -1]]) { await p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); clicks++ }
    await p.click('#el-best'); clicks++; await sleep(m === 'B' ? 1500 : 100); await bad('elbo best ' + m);
    for (const e of ['sf', 'rep']) { await p.click(`#el-est button[data-m=${e}]`); clicks++; await p.click('#el-run'); clicks++; await sleep(1800); await bad('elbo run ' + m + e) } }
  await p.click(`#el-model button[data-m=A]`); await p.select('#el-ns', '1'); await p.select('#el-lr', '0.03'); await p.click(`#el-est button[data-m=sf]`); await p.click('#el-run'); clicks += 5; await sleep(1800);
  await p.screenshot({ path: path.join(outdir, `elbo-${scheme}-${width}.png`), fullPage: true });
  // Diffusion lab
  await p.click('button[data-t=t-diff]'); await sleep(1500);
  for (const [m, s, n, c, w] of [['ddim', 'cosine', '20', '0', 2], ['flow', 'linear', '5', '1', 4], ['ddpm', 'linear', '1000', '2', 0], ['ddpm', 'cosine', '10', '0', 8]]) {
    await p.click(`#df-m button[data-m=${m}]`); if (m !== 'flow') await p.click(`#df-s button[data-m=${s}]`); await p.select('#df-n', n); await p.click(`#df-c button[data-m="${c}"]`);
    await p.$eval('#df-w', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, w); clicks += 5;
    await p.click('#df-go'); clicks++; await p.waitForFunction(() => !document.getElementById('df-go').disabled, { timeout: 120000 }); await sleep(200); await bad('diff ' + m + n);
    const t = await p.$eval('#df-out', e => e.innerText.replace(/\s+/g, ' ')); console.log(scheme, m, s, n, c, w, '|', t.slice(0, 160)) }
  await p.select('#df-p', '800'); await p.select('#df-seed', '3'); clicks += 2;
  await p.screenshot({ path: path.join(outdir, `diff-${scheme}-${width}.png`), fullPage: true });
  // VAE tab
  await p.click('button[data-t=t-vae]'); await sleep(500);
  for (const d of ['3', '7', '-1']) { await p.click(`#va-chips button[data-d="${d}"]`); clicks++ }
  const g = await p.$('#va-grid'); const bb = await g.boundingBox(); await p.mouse.click(bb.x + bb.width * 0.15, bb.y + bb.height * 0.85); clicks++; await sleep(100);
  await bad('vae'); await p.screenshot({ path: path.join(outdir, `vae-${scheme}-${width}.png`), fullPage: true });
  await p.click('button[data-t=t-more]'); await sleep(200); await bad('more');
  await p.click('button[data-t=t-read]'); await sleep(200);
  const links = await p.$$eval('#t-read a[data-tab]', as => as.map(a => a.dataset.tab)); console.log(scheme, width, 'tab links in Reading:', [...new Set(links)].join(', '));
  if (errs.length) { problems++; console.log('ERRORS', scheme, errs) }
  await p.close();
}
await b.close(); console.log('test_page: clicks', clicks, 'problems', problems); process.exit(problems ? 1 : 0);
