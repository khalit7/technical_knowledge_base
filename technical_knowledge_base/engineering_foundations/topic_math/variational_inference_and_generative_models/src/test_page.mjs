// Click every control on the page at 390 dark and 920 light, with every closed block opened; fail on page errors,
// NaN, undefined or Infinity in visible text, sideways scroll, or an animation that moves before the reader acts.
// (The two-moons, sampler-lab and MNIST VAE checks moved with those blocks to Diffusion from zero and Autoencoders and VAEs, 2026-10-26.)
// Screenshots each card into <outdir>. Usage (from html_utils, so puppeteer resolves):
//   node ../technical_knowledge_base/engineering_foundations/topic_math/variational_inference_and_generative_models/src/test_page.mjs <index.html> <outdir>
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const require = createRequire(path.join(process.cwd(), 'package.json'));
const puppeteer = require('puppeteer');
const [file, outdir] = process.argv.slice(2); fs.mkdirSync(outdir, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, protocolTimeout: 240000 });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let problems = 0, clicks = 0;
const setv = (p, id, v) => p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v);
for (const [scheme, width, motion] of [['dark', 390, 'reduce'], ['light', 920, 'no-preference']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: motion }]);
  await p.goto('file://' + path.resolve(file)); await sleep(700);
  await p.click('button[data-t=t-read]'); await sleep(300);
  const bad = async where => { const t = await p.evaluate(() => { const v = document.querySelector('.tab:not([hidden])'); return v ? v.innerText : '' });
    const hits = (t.match(/NaN|undefined|Infinity/g) || []); if (hits.length) { problems++; console.log('BAD TEXT', scheme, where, hits.slice(0, 3)) }
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); if (side) { problems++; console.log('SIDEWAYS', scheme, where) } };
  const shot = async (sel, name) => { const el = await p.$(sel); if (!el) { problems++; console.log('missing', sel); return } await el.evaluate(e => e.scrollIntoView()); await sleep(150); await el.screenshot({ path: path.join(outdir, `${name}-${scheme}-${width}.png`) }) };
  // nothing moves before the reader acts: scroll each animation into view, wait, check it is still on step 0
  for (const id of ['vi-cavi']) { await p.$eval('#' + id + '-card', e => e.scrollIntoView()); await sleep(3000);
    const v = await p.$eval('#' + id + '-ctl-s', e => +e.value); if (v !== 0) { problems++; console.log('AUTOPLAY', scheme, id, v) } }
  for (const id of ['vi-hero-card', 'el-card', 'vi-iw-card', 'vi-cavi-card', 'vi-gap-card', 'vi-est-card', 'vi-two-card']) await shot('#' + id, id);
  // open every closed block
  await p.$$eval('#t-read details', ds => ds.forEach(d => { d.open = true })); await sleep(600);
  await bad('all open');
  for (const id of ['vi-cavi']) {
    await p.$eval('#' + id + '-card', e => e.scrollIntoView()); await sleep(300);
    const n = await p.$eval('#' + id + '-ctl-s', e => +e.max);
    for (let i = 0; i < n; i++) { await p.click('#' + id + '-ctl-f'); clicks++ }
    await sleep(200); await bad(id + ' end'); await shot('#' + id + '-card', id + '-end');
    await p.click('#' + id + '-ctl-b'); clicks++;
    await setv(p, id + '-ctl-s', 3); clicks++;
    await p.click('#' + id + '-ctl-p'); clicks++; await sleep(200); await p.click('#' + id + '-ctl-p'); clicks++;
    await p.select('#' + id + '-ctl-v', '2'); clicks++;
  }
  for (const m of ['cosine', 'linear']) { await p.click(`#vi-sch-seg button[data-m=${m}]`); clicks++ }
  for (const v of [1, 500, 1000]) { await setv(p, 'vi-sch-t', v); clicks++; await bad('sch ' + v) }
  for (const id of ['vi-sch-card', 'vi-two-card']) await shot('#' + id, id);
  // the ELBO widget (section 3) and the optimiser (section 5)
  for (const m of ['B', 'A']) { await p.click(`#el-model button[data-m=${m}]`); clicks++; await sleep(100);
    for (const [id, v] of [['el-x', 3], ['el-m', -1], ['el-q', 0.05], ['el-s', 1.5], ['el-x', -1]]) { await setv(p, id, v); clicks++ }
    await p.click('#el-best'); clicks++; await sleep(m === 'B' ? 1500 : 100); await bad('elbo best ' + m);
    for (const e of ['sf', 'rep']) { await p.click(`#el-est button[data-m=${e}]`); clicks++; await p.click('#el-run'); clicks++; await sleep(1800); await bad('elbo run ' + m + e) } }
  await p.click(`#el-model button[data-m=A]`); await p.select('#el-ns', '1'); await p.select('#el-lr', '0.03'); await p.click(`#el-est button[data-m=sf]`); await p.click('#el-run'); clicks += 5; await sleep(1800);
  await shot('#el-card', 'el-card-after'); await shot('#el-opt-card', 'el-opt-card');
  // links that open a closed block
  await p.$$eval('#t-read details', ds => ds.forEach(d => { d.open = false }));
  await p.click('a[href="#vi-d-flow"]'); await sleep(200);
  if (!(await p.$eval('#vi-d-flow', d => d.open))) { problems++; console.log('LINK did not open #vi-d-flow') }
  await p.click('button[data-t=t-more]'); await sleep(200); await bad('more');
  if (errs.length) { problems++; console.log('ERRORS', scheme, errs) }
  await p.close();
}
await b.close(); console.log('test_page: clicks', clicks, 'problems', problems); process.exit(problems ? 1 : 0);
