// Click every control at 390 dark and 920 light; report page errors, any NaN/undefined/Infinity in visible text and sideways scroll;
// confirm nothing animates before the reader acts (normal and reduced motion). Screenshots of the visuals go to ../.shots/.
// usage (from the repository root): node technical_knowledge_base/engineering_foundations/topic_math/matrix_calculus_and_backprop/src/test_page.mjs
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import fs from 'node:fs';
const H = path.dirname(fileURLToPath(import.meta.url)), page = path.join(H, '../index.html'), shots = path.join(H, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const R = createRequire(path.resolve(H, '../../../../../html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined }); let problems = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
// no autoplay: the step readouts must not move on their own
for (const motion of ['no-preference', 'reduce']) {
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 1000 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: motion }]); await p.goto('file://' + page); await sleep(300);
  const steps = async () => p.$$eval('.an-ctl input[type=range]', rs => rs.map(r => r.value).join(','));
  const before = await steps();
  for (const id of ['mc-two-card', 'mc-fr-card', 'mc-mem-card']) { await p.$eval('#' + id, e => e.scrollIntoView()); await sleep(1500); }
  await p.click('#mc-fr-mode button[data-m="fwd"]'); await p.click('#mc-mem-mode button[data-m="all"]'); await sleep(2500);
  const after = await steps(); if (before !== after) { problems++; console.log('AUTOPLAY', motion, before, after); } else console.log('no autoplay', motion);
  await p.close();
}
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width: w, height: 1000 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page); await sleep(500);
  const bad = async tag => { const t = await p.evaluate(() => [...document.querySelectorAll('.tab:not([hidden])')].map(e => e.innerText).join(' ').replace(/debugging a NaN|and a NaN|-\\infty/g, ''));
    const m = t.match(/\bNaN\b|\bundefined\b|\bInfinity\b/g); if (m) { problems++; console.log(w, tag, 'BAD TEXT', m.slice(0, 3)); } };
  const tab = async t => { await p.evaluate(t => document.querySelector('#tabs button[data-t="' + t + '"]').click(), t); await sleep(300); };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.scrollIntoView(); await sleep(150); await el.screenshot({ path: path.join(shots, name + '-' + w + '-' + scheme + '.png') }); } };
  await tab('t-read');
  await p.evaluate(() => document.querySelectorAll('#t-read details').forEach(d => d.open = true)); await sleep(200);
  for (let i = 0; i < 14; i++) await p.click('#mc-two-ctl-f'); await bad('two'); await shot('#mc-two-card', 'two');
  for (let i = 0; i < 14; i++) await p.click('#mc-two-ctl-b');
  for (const m of ['fwd', 'rev']) { await p.click('#mc-fr-mode button[data-m="' + m + '"]'); await sleep(100);
    for (let i = 0; i < 25; i++) await p.click('#mc-fr-ctl-f'); await bad('fr ' + m); await shot('#mc-fr-card', 'fr-' + m); }
  for (const l of ['linear', 'act', 'softmax', 'sce', 'layernorm', 'attn']) { await p.click('#wb-layer button[data-m="' + l + '"]'); await sleep(80);
    const acts = l === 'act' ? ['relu', 'tanh', 'sigmoid', 'gelu'] : [null];
    for (const a of acts) { if (a) await p.select('#wb-act', a);
      for (let r = 0; r < 4; r++) { await p.click('#wb-rand'); const wv = await p.evaluate(() => document.querySelector('#wb-sum .stat .d').textContent); if (!/agree/.test(wv)) { problems++; console.log(w, 'bench random disagree', l, a, wv); } }
      await bad('bench ' + l + (a || '')); }
    await p.click('#wb-reset'); }
  for (const h of ['1e-3', '1e-7', '1e-9', '1e-5']) { await p.select('#wb-h', h); await bad('h ' + h); }
  await shot('#mc-wb', 'bench');
  for (const m of ['infer', 'all', 'ckpt', 'none']) { await p.click('#mc-mem-mode button[data-m="' + m + '"]'); await sleep(100);
    for (let i = 0; i < 12; i++) await p.click('#mc-mem-ctl-f'); await bad('mem ' + m); }
  for (const [n, s] of [[16, 4], [4, 1], [12, 8], [9, 3]]) { await p.evaluate((n, s) => { const a = document.getElementById('mc-mem-n'); a.value = n; a.dispatchEvent(new Event('input')); const c = document.getElementById('mc-mem-s'); c.value = s; c.dispatchEvent(new Event('input')); }, n, s);
    await p.evaluate(() => { const sc = document.getElementById('mc-mem-ctl-s'); sc.value = sc.max; sc.dispatchEvent(new Event('input')); }); await bad('mem n' + n); }
  await shot('#mc-mem-card', 'mem');
  for (const g of [0.5, 0.9, 1.25, 2]) { await p.evaluate(g => { const r = document.getElementById('mc-van-g'); r.value = g; r.dispatchEvent(new Event('input')); }, g); await bad('van ' + g); }
  await shot('#mc-van-card', 'van');
  for (let i = 0; i < 6; i++) { await p.select('#mc-ein-sel', String(i)); await bad('einsum ' + i); }
  await p.evaluate(() => { const e = document.getElementById('mc-ein-sz'); e.value = 'b=4 h=2'; e.dispatchEvent(new Event('input')); }); await bad('einsum missing');
  await p.click('#gr-hide'); await sleep(50); await p.click('#gr-hide');
  const nli = (await p.$$('#gr-list li')).length; for (const k of [0, 4, 8, 20, 45, nli - 1]) { await p.evaluate(k => document.querySelectorAll('#gr-list li')[k].click(), k); await sleep(30); } await bad('graph');
  await p.click('#gr-play'); await sleep(1500); await p.click('#gr-stop');
  for (const id of ['#mc-hero-card', '#mc-jac-card', '#mc-cost-card', '#mc-tl-card', '#mc-hvp-card', '#mc-ein-card', '#mc-graph']) await shot(id, id.slice(4));
  await tab('t-more'); await bad('more');
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  if (errs.length) { problems++; console.log(w, 'ERRORS', errs); }
  const sideways = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); if (sideways) { problems++; console.log(w, 'sideways scroll'); }
  console.log(w, scheme, 'done'); await p.close();
}
await b.close(); console.log('test_page problems:', problems); process.exit(problems ? 1 : 0);
