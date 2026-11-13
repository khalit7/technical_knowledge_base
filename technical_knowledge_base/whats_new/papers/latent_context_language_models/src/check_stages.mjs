// The 2026-11-06 layout and motion checks for the LCLM page (after InstructGPT's), at 1400 px light, 920 px light and 390 px dark:
// the 3D stage (#stg-hero, Fig. 1: one 64K prompt at 4x through no compression, FastKVzip and the LCLM) plays by itself once scrolled
// into view, steps to its last step, has exactly one step-list item per step, and stops drawing off screen; the Simulate animation
// (#cap, makeAnim) plays once in view, has one list item per step in each of its three modes (one list visible at a time), replays
// on a mode switch and stops for good on a reader control; at 1400 px every split shows two columns; no errors, NaN, undefined or
// sideways scroll; under prefers-reduced-motion nothing moves by itself; and every number the hero's step list states is the one the
// stage draws (Figure 4 as decoded, rc.fig4; KV bytes per position from the config; Table 6). Writes mid-step and last-step screenshots.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/latent_context_language_models/src/check_stages.mjs [shots dir]
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
const LISTS = { lclm: 'sx-capL', kv: 'sx-capK', full: 'sx-capF' };
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await wait(300);
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  for (const t of await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t))) {
    await clk(`#tabs button[data-t=${t}]`); await wait(300);
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      if (!(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      // flows stop drawing off screen
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step through the forward button, with a middle screenshot
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(2000);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
      await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
    }
    // the Simulate animation: plays once in view, one list item per step in each mode, replays on a mode switch, stops on a control
    if (t === 't-run') {
      checked++;
      await p.$eval('#cap', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (!(await p.$eval('#cap', e => +e.dataset.frames || 0)) || !(await p.$eval('#cap', e => e.dataset.playing === '1'))) problems.push(`${tag}: cap did not play when scrolled into view`);
      for (const m of ['lclm', 'kv', 'full']) {
        await clk(`#capM button[data-m=${m}]`); await wait(1200);
        if (!(await p.$eval('#cap', e => e.dataset.playing === '1'))) problems.push(`${tag}: cap did not replay after switching to ${m}`);
        const n = await p.$eval('#capScrub', e => +e.max / 100);
        const vis = await p.$$eval('#s-sim ol.sx:not([hidden])', ls => ls.map(l => [l.id, l.children.length]));
        if (vis.length !== 1 || vis[0][0] !== LISTS[m] || vis[0][1] !== n) problems.push(`${tag}: cap ${m}: visible lists ${JSON.stringify(vis)} for ${n} steps`);
        await clk('#capFwd'); await wait(100);
        if (await p.$eval('#cap', e => e.dataset.playing === '1')) problems.push(`${tag}: cap ${m} still playing after a reader control`);
        for (let k = 1; k < n; k++) { await clk('#capFwd'); if (k === Math.floor(n / 2)) await (await p.$('#cap')).screenshot({ path: `${shots}/anim-cap-${m}-mid-${scheme}-${width}.png` }) }
        const on = await p.$eval('#' + LISTS[m], l => [...l.children].findIndex(x => x.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: cap ${m} list marks item ${on + 1} at the last step`);
        await wait(1500); if (await p.$eval('#cap', e => +e.dataset.playing === 1)) problems.push(`${tag}: cap ${m} restarted by itself after a control`);
      }
    }
    const r = await p.evaluate(t => { const txt = document.getElementById(t).innerText;
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
  await p.$eval('#tabs button[data-t=t-read]', e => e.click()); await wait(300);
  await p.$eval('#stg-hero', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const d0 = await p.$eval('#stg-hero', e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#stg-hero', e => +e.dataset.draws || 0);
  const f = await p.$eval('#stg-hero', e => +e.dataset.frames || 0), pl = await p.$eval('#stg-hero-p', e => /Pause/.test(e.textContent));
  if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: stg-hero moved by itself (frames ${f}, redraws ${d1 - d0})`);
  await p.$eval('#tabs button[data-t=t-run]', e => e.click()); await wait(300);
  await p.$eval('#cap', e => e.scrollIntoView({ block: 'center' })); await wait(2500);
  const fc = await p.$eval('#cap', e => +e.dataset.frames || 0), pc = await p.$eval('#cap', e => e.dataset.playing === '1');
  if (fc > 0 || pc) problems.push(`reduced motion: cap moved by itself (frames ${fc})`);
  await p.close() }
{ // every number the hero's step list states is the one the stage draws
  const p = await b.newPage(); await p.goto(file); await wait(500);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const items = id => [...document.getElementById(id).children].map(li => li.textContent.replace(/\s+/g, ' '));
    const has = (L, i, s) => { n++; if (!L[i].includes(s)) bad.push('step ' + (i + 1) + ': expected "' + s + '"') };
    const RC = window.PAPER.rc, F = RC.fig4, KVB = RC.models.kv_bytes_per_token, T = 65536, g = v => v.toLocaleString('en-GB'), gb = b => (b / 1e9).toFixed(2) + ' GB';
    const t = k => F.ttft[k]['64k'].toFixed(2) + ' s', m = k => F.mem[k]['64k'].toFixed(1) + ' GB';
    const L = items('sx-hero'), T6 = window.PAPER.tables['A7.T6'].rows, row = (gr, lab) => T6.find(r => r.group === gr && r.label === lab).v[0];
    has(L, 0, g(T) + '-token'); has(L, 0, (T / 4096) + ' blocks of ' + g(4096));
    has(L, 1, g(T) + ' positions'); has(L, 1, gb(T * KVB)); has(L, 1, g(KVB) + ' bytes'); has(L, 1, t('NoCompression')); has(L, 1, m('NoCompression'));
    has(L, 2, gb(T * KVB)); has(L, 2, t('KVzipFast')); has(L, 2, m('KVzipFast')); n++; if (!(F.ttft.KVzipFast['64k'] > F.ttft.NoCompression['64k'])) bad.push('step 3 says FastKVzip is slower than not compressing; the data disagree');
    has(L, 3, g(T / 4) + ' latents'); has(L, 3, (T / 1024) + ' windows'); n++; if (T / 1024 > RC.models.enc_batch) bad.push('step 4 says one batched pass; 64K needs more than one');
    has(L, 4, g(T / 4) + ' positions'); has(L, 4, gb(T / 4 * KVB)); has(L, 4, t('LCLM 4x')); has(L, 4, m('LCLM 4x'));
    has(L, 4, g(RC.models.enc_window) + ' to 2,560');
    has(L, 5, t('NoCompression') + ' and ' + m('NoCompression') + ', ' + t('KVzipFast') + ' and ' + m('KVzipFast') + ', ' + t('LCLM 4x') + ' and ' + m('LCLM 4x'));
    has(L, 5, row('4x compression', 'LCLM 0.6b-4b (Mean)')); has(L, 5, row('4x compression', 'KVzipFast')); has(L, 5, row('', 'Qwen 4B Instruct (full KV)'));
    n++; const prov = document.getElementById('sx-hero').nextElementSibling.textContent; if (!prov.includes(RC.models.weights_GB_bf16.toFixed(2) + ' GB')) bad.push('provenance line: weights not ' + RC.models.weights_GB_bf16);
    return { bad, n } });
  r.bad.forEach(x => problems.push('hero step list: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
