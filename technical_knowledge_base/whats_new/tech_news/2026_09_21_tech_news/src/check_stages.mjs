// The 2026-11-06 layout and motion checks for the 2026-09-21 tech-news issue, at 1400 px light, 920 px light and 390 px dark:
// - the 3D stage #stg-kv (Research: DeepSeek's KV cache by layer, token and entry size) plays by itself once scrolled into view, steps to
//   its last step, has one step-list item per step, stops drawing flows off screen and stops for good after a reader control;
// - the 2D ternary-packing animation #v-tern (Research, RD.anim) plays once in view (the Play button reads Pause), has one list item per
//   step in each of its two modes, shows exactly one list per mode, replays after a mode switch, reaches its last step and stops after a control;
// - every split is two columns at 1400 px; no errors, NaN, undefined or sideways scroll in any tab;
// - under prefers-reduced-motion nothing moves by itself;
// - the numbers the step lists state match the arithmetic: the stage's four totals from the sources' bytes, and the ternary list's
//   sample counts against the drawn sample, at two zero shares (moving z stops the animation).
// Writes mid-step screenshots of both.
// usage (from the repo root): node technical_knowledge_base/whats_new/tech_news/2026_09_21_tech_news/src/check_stages.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const problems = []; let checked = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p.goto(file); await wait(300);
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  for (const t of await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t))) {
    await clk(`#tabs button[data-t=${t}]`); await wait(300);
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    // the 3D stage
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      if (!await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(2600); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(2600);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
      await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
    }
    // the 2D ternary animation (RD.anim) and its two modes
    if (await p.$(`#${t} #v-tern`)) {
      checked++;
      await p.$eval('#v-tern', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
      if (!await p.$eval('#tnCtl-p', e => /Pause/.test(e.textContent))) problems.push(`${tag}: the ternary animation is not playing after scrolling into view`);
      for (const m of await p.$$eval('#tnM button', bs => bs.map(b => b.dataset.m))) {
        await clk(`#tnM button[data-m=${m}]`); await wait(1500);
        if (!await p.$eval('#tnCtl-p', e => /Pause/.test(e.textContent))) problems.push(`${tag}: the ternary animation did not replay after switching to ${m}`);
        const n = await p.$eval('#tnCtl-s', e => +e.max + 1);
        const vis = await p.$$eval('ol[id^="sx-tn-"]', os => os.filter(o => !o.hidden).map(o => [o.id, o.children.length]));
        if (vis.length !== 1 || vis[0][0] !== 'sx-tn-' + m || vis[0][1] !== n) problems.push(`${tag}: ternary ${m}: visible lists ${JSON.stringify(vis)} for ${n} steps`);
        const f0 = await p.$eval('#v-tern', e => +e.dataset.frames || 0);
        for (let k = 1; k < n; k++) { await clk('#tnCtl-f'); await wait(60); if (k === 2) { await wait(1600); await (await p.$('#sp-tern')).screenshot({ path: `${shots}/anim-tern-${m}-mid-${scheme}-${width}.png` }) } }
        await wait(3500); // the last stretch finishes drawing
        const f1 = await p.$eval('#v-tern', e => +e.dataset.frames || 0); if (!(f1 > f0)) problems.push(`${tag}: ternary ${m}: stepping forward drew no frames`);
        const on = await p.$eval('#sx-tn-' + m, l => [...l.children].findIndex(x => x.classList.contains('on')));
        if (on !== n - 1) problems.push(`${tag}: ternary ${m}: list marks item ${on + 1} at the last step`);
        if (await p.$eval('#tnCtl-p', e => /Pause/.test(e.textContent))) problems.push(`${tag}: ternary ${m} still playing after a reader control`);
        const stored = await p.$eval('#tnCnt', e => e.textContent); if (!stored.includes('128 / 128')) problems.push(`${tag}: ternary ${m}: last step has not written the whole block (${stored.slice(0, 60)})`);
      }
    }
    const r = await p.evaluate(t => { const el = document.getElementById(t); const txt = el.innerText;
      return { bad: (txt.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth } }, t);
    if (r.bad.length) problems.push(`${tag} ${t}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) problems.push(`${tag}: error box: ${box}`);
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  await p.$eval('#tabs button[data-t=t-research]', e => e.click()); await wait(300);
  await p.$eval('#stg-kv', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const d0 = await p.$eval('#stg-kv', e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#stg-kv', e => +e.dataset.draws || 0);
  const f = await p.$eval('#stg-kv', e => +e.dataset.frames || 0), pl = await p.$eval('#stg-kv-p', e => /Pause/.test(e.textContent));
  if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: stg-kv moved by itself (frames ${f}, redraws ${d1 - d0})`);
  await p.$eval('#v-tern', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const hf = await p.$eval('#v-tern', e => +e.dataset.frames || 0), hp = await p.$eval('#tnCtl-p', e => /Pause/.test(e.textContent));
  if (hf > 0 || hp) problems.push(`reduced motion: the ternary animation moved by itself (frames ${hf})`);
  await p.close() }
{ // the numbers in the step lists
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 }); await p.goto(file); await wait(500);
  // the stage: the four totals, from the sources' bytes per entry, ratios and layer counts
  const fx = v => Math.round(v).toLocaleString('en-GB');
  const tot = [21 * (584 + 68) / 4 + 20 * 584 / 128, 4 * (584 + 68) / 4, 3 * (584 + 68) / 2 + (584 + 68), 3 * (288 + 68) / 2 + (288 + 68)];
  const L = await p.$$eval('#sx-kv li', ls => ls.map(l => l.textContent));
  tot.forEach((v, i) => { if (!L[i].includes(fx(v) + ' bytes per token')) problems.push(`stage step ${i + 1} lacks ${fx(v)} bytes per token`) });
  if (!L[1].includes((tot[0] / tot[1]).toFixed(1) + ' times smaller')) problems.push('stage step 2 ratio');
  if (!L[2].includes((tot[2] / tot[1]).toFixed(1) + ' times bigger')) problems.push('stage step 3 ratio');
  if (!L[3].includes((tot[0] / tot[3]).toFixed(2) + ' times smaller')) problems.push('stage step 4 ratio');
  const sceneTot = fs.readFileSync(path.resolve(here, 'parts/31_js_sc_kv.js'), 'utf8').match(/const TOT=\[([^\]]*)\]/)[1].match(/'[^']*'/g).map(x => x.slice(1, -1));
  tot.forEach((v, i) => { if (sceneTot[i] !== fx(v)) problems.push(`scene label ${i + 1} is ${sceneTot[i]}, not ${fx(v)}`) });
  // the ternary lists against the drawn sample, at the default and at z = 1/3; moving z stops the animation
  await p.$eval('#tabs button[data-t=t-research]', e => e.click()); await wait(300);
  const run = () => p.evaluate(() => { const bad = [], svg = document.getElementById('tnSvg').textContent, nz = +svg.match(/(\d+) of 128 zero/)[1], nnz = 128 - nz;
    const v = k => [...document.querySelectorAll('[data-tn="' + k + '"]')].map(e => e.textContent);
    const z = +document.getElementById('tnZv').textContent.split(' ')[0]; // the share drawn (the slider snaps to 0.005)
    const want = { nz: String(nz), nnz: String(nnz), bc: String(128 + nnz), bpw: ((128 + nnz) / 128).toFixed(3), rate: (2 - z).toFixed(3) };
    for (const k in want) v(k).forEach(x => { if (x !== want[k]) bad.push(`${k} ${x} against ${want[k]}`) });
    if (!svg.includes((128 + nnz) + ' bits') || !svg.includes('208 bits')) bad.push('scale bar totals');
    return bad });
  (await run()).forEach(x => problems.push('ternary defaults: ' + x));
  await p.$eval('#v-tern', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  await p.$eval('#tnPre button[data-i="0"]', e => e.click()); await wait(300);
  if (await p.$eval('#tnCtl-p', e => /Pause/.test(e.textContent))) problems.push('the ternary animation kept playing after z moved');
  (await run()).forEach(x => problems.push('ternary z = 1/3: ' + x));
  console.log('step-list number checks: stage 4 totals and 3 ratios; ternary at 2 zero shares');
  await p.close() }
await b.close();
console.log('animations and stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
