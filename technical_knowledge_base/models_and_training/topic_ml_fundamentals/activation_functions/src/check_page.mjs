// Exercise every control on the built page (the three 3D stages are stepped by check_stages.mjs): the gate menu, the Shazeer
// toggles, the atlas (every function on and off, shading, thresholds, ranges, hover), the real-model tab (every model,
// measure, threshold and layer). Fails on script errors, NaN, undefined or Infinity in visible text; saves close-up
// screenshots of the main visuals to ../.shots/ (light 920 px and dark 390 px).
// usage: node src/check_page.mjs (needs html_utils/node_modules)
import { createRequire } from 'module';import path from 'path';import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(HERE, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = path.resolve(HERE, '../index.html'), shots = process.argv[2] || path.resolve(HERE, '../.shots');
(await import('fs')).mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const out = {};
for (const [scheme, w] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.setViewport({ width: w, height: 900 });
  await p.goto('file://' + file);
  const bad = async (where) => { const t = await p.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll('script,style,.tab[hidden]').forEach(e => e.remove()); c.querySelectorAll('#dsSvg text').forEach(e => { if (e.textContent === 'NaN') e.remove() }); return c.textContent.split('not-a-number (NaN)').join('') }); for (const x of ['NaN', 'undefined', 'Infinity']) { const i = t.indexOf(x); if (i >= 0) errs.push(where + ': ' + x + ' near "' + t.slice(Math.max(0, i - 40), i + 20).replace(/\n/g, ' ') + '"') } };
  const badDead = async where => { const t = await p.evaluate(() => ['drN', 'drP'].map(i => document.getElementById(i).textContent).join(' ')); if (/undefined|Infinity|null/.test(t)) errs.push(where + ': ' + t.slice(0, 80)) };
  const click = s => p.evaluate(s => document.querySelector(s).click(), s);
  const slide = async (sel, vals) => { for (const v of vals) await p.evaluate((s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input')) }, sel, v) };
  const shot = async (sel, name) => { try { const e = await p.$(sel); await e.scrollIntoView(); await e.screenshot({ path: shots + '/x-' + name + '-' + scheme + '-' + w + '.png' }) } catch (x) { errs.push('shot ' + sel + ': ' + x.message + ' tab ' + await p.evaluate(() => [...document.querySelectorAll('.tab')].filter(t => !t.hidden).map(t => t.id).join())) } };
  await p.evaluate(() => document.querySelector('button[data-t="t-read"]').click());
  const caps = [];
  await shot('#ds', 'sweep');
  // the gate function menu of Fig. 3 (the stage itself is stepped by check_stages.mjs)
  await click('#gfM [data-m="glu"]');
  for (const g of ['silu', 'sigmoid', 'relu', 'gelu', 'id', 'silu']) { await p.evaluate(g => { const e = document.getElementById('gfG'); e.value = g; e.dispatchEvent(new Event('change')) }, g); await bad('gate ' + g); caps.push(await p.evaluate(() => document.getElementById('gfN').innerText)) }
  await click('#gfM [data-m="plain"]');
  for (const k of ['p65', 'p524', 'glue', 'sglue']) { await click('#szM [data-k="' + k + '"]'); await bad('sz ' + k) }
  // slope figure: every activation at both input scales
  for (const k of ['1', '3']) { await click('#slK [data-m="' + k + '"]'); for (const f of ['sigmoid', 'tanh', 'relu', 'gelut', 'silu']) { await click('#slF [data-m="' + f + '"]'); await bad('slope ' + f + ' x' + k) } }
  await click('#slK [data-m="1"]'); await click('#slF [data-m="gelut"]'); await shot('#sl', 'slope'); await shot('#hr', 'hero');
  await click('#szM [data-k="p65"]'); await shot('#sz', 'shazeer'); await shot('#fw', 'widths');
  const inside = await p.evaluate(() => ['in-opt', 'in-gpt', 'in-smol', 'in-mir', 'dr-opt'].map(i => document.getElementById(i).innerText));
  // atlas
  await click('button[data-t="t-atlas"]');
  const ids = await p.$$eval('#atB input', a => a.map(x => x.dataset.k));
  for (const k of ids) { await p.evaluate(k => document.querySelector('#atB input[data-k="' + k + '"]').click(), k) }
  for (const r of ['2', '4', '10', '6']) { await p.evaluate(r => { const e = document.getElementById('atR'); e.value = r; e.dispatchEvent(new Event('change')) }, r); await bad('atlas range ' + r) }
  for (const k of ids) { await p.evaluate(k => { const e = document.getElementById('atS'); e.value = k; e.dispatchEvent(new Event('change')) }, k); await slide('#atE', [0, 40, 20]); await bad('atlas shade ' + k) }
  const svg = await p.$('#atF svg'); const bb = await svg.boundingBox(); await p.mouse.move(bb.x + bb.width * 0.3, bb.y + bb.height / 2); await bad('atlas hover');
  for (const k of ids) { await p.evaluate(k => document.querySelector('#atB input[data-k="' + k + '"]').click(), k) } // all off
  await bad('atlas none'); for (const k of ['sigmoid', 'relu', 'gelu', 'silu']) await p.evaluate(k => document.querySelector('#atB input[data-k="' + k + '"]').click(), k);
  await p.evaluate(() => { const e = document.getElementById('atS'); e.value = 'relu'; e.dispatchEvent(new Event('change')) });
  await shot('#at', 'atlas'); const tbl = await p.evaluate(() => document.getElementById('atT').innerText); await shot('#atT', 'atlas-table');
  // real models
  await click('button[data-t="t-real"]');
  for (const m of ['opt', 'gpt2', 'smol']) { await click('#rlM [data-m="' + m + '"]');
    for (const k of ['near', 'neg', 'dead']) { await click('#rlK [data-k="' + k + '"]');
      if (k === 'near') await slide('#rlT', [0, 40, 13, 30]); if (k === 'dead') await slide('#rlP', [0, 31, 10, 0]);
      await p.evaluate(() => { const r = document.querySelectorAll('#rlSvg rect[data-i]'); r[2].dispatchEvent(new Event('click')) });
      await bad('real ' + m + ' ' + k) } }
  await click('#rlM [data-m="opt"]'); await click('#rlK [data-k="dead"]'); await p.evaluate(() => document.querySelectorAll('#rlSvg rect[data-i]')[3].dispatchEvent(new Event('click')));
  await shot('#rl', 'real');
  await click('button[data-t="t-more"]'); await bad('more');
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' }); if (box) errs.push('errbox: ' + box);
  out[scheme] = { errs, caps, inside, tbl: tbl.split('\n').slice(0, 6) };
  await p.close();
}
// autoplay, stillness under reduced motion and every stage step: check_stages.mjs (2026-11-06 motion rules)
console.log(JSON.stringify(out, null, 1));
await b.close();
