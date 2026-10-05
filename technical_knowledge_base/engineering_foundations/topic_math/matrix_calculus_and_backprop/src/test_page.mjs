// Click every control at 390 dark and 920 light; report page errors and any NaN/undefined/Infinity in visible text; save screenshots of the visuals.
// usage (from html_utils, where puppeteer is installed): node ../technical_knowledge_base/engineering_foundations/topic_math/matrix_calculus_and_backprop/src/test_page.mjs
import puppeteer from 'puppeteer'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import fs from 'node:fs';
const H = path.dirname(fileURLToPath(import.meta.url)), page = path.join(H, '../index.html'), shots = path.join(H, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' }); let problems = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width: w, height: 1000 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page); await sleep(500);
  const bad = async tag => { const t = await p.evaluate(() => [...document.querySelectorAll('.tab:not([hidden])')].map(e => e.innerText).join(' ').replace(/debugging a NaN|and a NaN/g, ''));
    const m = t.match(/NaN|undefined|Infinity/g); if (m) { problems++; console.log(w, tag, 'BAD TEXT', m.slice(0, 3)); } };
  const tab = async t => { await p.evaluate(t => document.querySelector('#tabs button[data-t="' + t + '"]').click(), t); await sleep(300); };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.scrollIntoView(); await sleep(200); await el.screenshot({ path: path.join(shots, name + '-' + w + '-' + scheme + '.png') }); } };
  await tab('t-read');
  for (const m of ['fwd', 'rev']) { await p.click('#mc-fr-mode button[data-m="' + m + '"]'); await sleep(100);
    for (let i = 0; i < 25; i++) await p.click('#mc-fr-ctl-f'); await bad('fr ' + m); await shot('#mc-fr-card', 'fr-' + m); }
  for (const m of ['infer', 'all', 'ckpt', 'none']) { await p.click('#mc-mem-mode button[data-m="' + m + '"]'); await sleep(100);
    for (let i = 0; i < 12; i++) await p.click('#mc-mem-ctl-f'); await bad('mem ' + m); await shot('#mc-mem-card', 'mem-' + m); }
  for (const [n, s] of [[16, 4], [4, 1], [12, 8], [9, 3]]) { await p.evaluate((n, s) => { const a = document.getElementById('mc-mem-n'); a.value = n; a.dispatchEvent(new Event('input')); const c = document.getElementById('mc-mem-s'); c.value = s; c.dispatchEvent(new Event('input')); }, n, s);
    await p.evaluate(() => { const sc = document.getElementById('mc-mem-ctl-s'); sc.value = sc.max; sc.dispatchEvent(new Event('input')); }); await bad('mem n' + n); }
  await shot('#mc-mem-card', 'mem-end');
  for (let i = 0; i < 6; i++) { await p.select('#mc-ein-sel', String(i)); await bad('einsum ' + i); }
  await p.evaluate(() => { const e = document.getElementById('mc-ein-sz'); e.value = 'b=4 h=2'; e.dispatchEvent(new Event('input')); }); await bad('einsum missing');
  for (const id of ['#mc-jac-card', '#mc-cost-card', '#mc-tl-card', '#mc-hvp-card', '#mc-ein-card']) await shot(id, id.slice(4, -5));
  await tab('t-bench');
  for (const l of ['linear', 'act', 'softmax', 'sce', 'layernorm', 'attn']) { await p.click('#wb-layer button[data-m="' + l + '"]'); await sleep(80);
    const acts = l === 'act' ? ['relu', 'tanh', 'sigmoid', 'gelu'] : [null];
    for (const a of acts) { if (a) { await p.select('#wb-act', a); }
      const worst = await p.evaluate(() => document.querySelector('#wb-sum .stat .v').textContent); console.log(w, 'bench', l, a || '', 'default worst', worst);
      for (let r = 0; r < 4; r++) { await p.click('#wb-rand'); const wv = await p.evaluate(() => [document.querySelector('#wb-sum .stat .v').textContent, document.querySelector('#wb-sum .stat .d').textContent]); if (!/agree/.test(wv[1])) { problems++; console.log(w, 'bench random disagree', l, a, wv); } }
      await bad('bench ' + l + a); }
    await p.click('#wb-reset'); await shot('#t-bench', 'bench-' + l); }
  for (const h of ['1e-3', '1e-7', '1e-9']) { await p.select('#wb-h', h); await bad('h ' + h); }
  await tab('t-graph'); await p.click('#gr-hide'); await sleep(50); await p.click('#gr-hide');
  const nli = (await p.$$('#gr-list li')).length; for (const k of [0, 4, 8, 20, 45, nli - 1]) { const li = (await p.$$('#gr-list li'))[k]; await li.click(); await sleep(30); } await bad('graph');
  await p.click('#gr-play'); await sleep(1500); await shot('#t-graph', 'graph'); await p.click('#gr-stop');
  await tab('t-more'); await bad('more');
  if (errs.length) { problems++; console.log(w, 'ERRORS', errs); }
  const sideways = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); if (sideways) { problems++; console.log(w, 'sideways scroll'); }
  await p.close();
}
await b.close(); console.log('test_page problems:', problems); process.exit(problems ? 1 : 0);
