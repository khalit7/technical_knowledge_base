// The 2026-11-06 layout and motion checks for the 2026-09-14 tech-news issue, at 1400 px light, 920 px light and 390 px dark:
// - the 3D stage #stg-ced (Top stories: one agent turn through DeepSeek V4-Flash and V4.1-Flash) plays by itself once scrolled into view,
//   steps to its last step, has one step-list item per step, stops drawing flows off screen and stops for good after a reader control;
// - the 2D RLT animation #v-rlt (Research, the page's own controller with the RD.anim motion rules) plays once in view (the Play button
//   reads Pause), has one list item per step in each of its two modes, shows exactly one list per mode, replays after a mode switch and
//   reaches its last step;
// - every split is two columns at 1400 px; no errors, NaN, undefined or sideways scroll in any tab;
// - under prefers-reduced-motion nothing moves by itself;
// - the stage's counters at the last step match the configs' arithmetic (3,514 and 890 bytes per token, N x 43 and N x 20 + 128 x 20 passes)
//   at every prompt length, and choosing a prompt length stops the stage and rewrites the token count in the step list.
// Writes mid-step screenshots of both animations.
// usage (from the repo root): node technical_knowledge_base/whats_new/tech_news/2026_09_14_tech_news/src/check_stages.mjs [shots dir]
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
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === 2 || k === 4 || k === 6) { await wait(3200); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-step${k + 1}-${scheme}-${width}.png` }) } }
      await wait(3200);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
      await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
    }
    // the 2D RLT animation and its two modes
    if (await p.$(`#${t} #v-rlt`)) {
      checked++;
      await p.$eval('#v-rlt', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
      if (!await p.$eval('#rltPlay', e => /Pause/.test(e.textContent))) problems.push(`${tag}: the RLT animation is not playing after scrolling into view`);
      if (!await p.$eval('#v-rlt', e => e.dataset.playing === '1')) problems.push(`${tag}: the RLT card lacks data-playing while it plays`);
      for (const m of await p.$$eval('#rltM button', bs => bs.map(b => b.dataset.m))) {
        await clk(`#rltM button[data-m=${m}]`); await wait(1500);
        if (!await p.$eval('#rltPlay', e => /Pause/.test(e.textContent))) problems.push(`${tag}: the RLT animation did not replay after switching to ${m}`);
        const n = await p.$eval('#rltScrub', e => +e.max / 100);
        const vis = await p.$$eval('ol[id^="sx-rlt-"]', os => os.filter(o => !o.hidden).map(o => [o.id, o.children.length]));
        if (vis.length !== 1 || vis[0][0] !== 'sx-rlt-' + m || vis[0][1] !== n) problems.push(`${tag}: RLT ${m}: visible lists ${JSON.stringify(vis)} for ${n} steps`);
        const f0 = await p.$eval('#v-rlt', e => +e.dataset.frames || 0);
        if (!(f0 > 0)) problems.push(`${tag}: RLT ${m}: no frames drawn while playing`);
        for (let k = 1; k < n; k++) { await clk('#rltFwd'); await wait(60); if (k === Math.floor(n / 2)) { await wait(300); await (await p.$('#sp-rlt')).screenshot({ path: `${shots}/anim-rlt-${m}-mid-${scheme}-${width}.png` }) } }
        await clk('#rltFwd'); await wait(300);
        const at = await p.$eval('#rltScrub', e => +e.value); if (at !== n * 100) problems.push(`${tag}: RLT ${m}: ended at scrub ${at} of ${n * 100}`);
        const on = await p.$eval('#sx-rlt-' + m, l => [...l.children].findIndex(x => x.classList.contains('on')));
        if (on !== n - 1) problems.push(`${tag}: RLT ${m}: list marks item ${on + 1} at the last step`);
        if (await p.$eval('#rltPlay', e => /Pause/.test(e.textContent))) problems.push(`${tag}: RLT ${m} still playing after a reader control`);
        // a click on a list item jumps there
        await p.$eval('#sx-rlt-' + m, l => l.children[1].click()); await wait(100);
        const sc = await p.$eval('#rltScrub', e => +e.value); if (sc !== 200) problems.push(`${tag}: RLT ${m}: list item 2 jumped to scrub ${sc}`);
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
  await p.$eval('#tabs button[data-t=t-top]', e => e.click()); await wait(300);
  await p.$eval('#stg-ced', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const d0 = await p.$eval('#stg-ced', e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#stg-ced', e => +e.dataset.draws || 0);
  const f = await p.$eval('#stg-ced', e => +e.dataset.frames || 0), pl = await p.$eval('#stg-ced-p', e => /Pause/.test(e.textContent));
  if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: stg-ced moved by itself (frames ${f}, redraws ${d1 - d0})`);
  await p.$eval('#tabs button[data-t=t-research]', e => e.click()); await wait(300);
  await p.$eval('#v-rlt', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const hf = await p.$eval('#v-rlt', e => +e.dataset.frames || 0), hp = await p.$eval('#rltPlay', e => /Pause/.test(e.textContent));
  await p.$eval('#rltM button[data-m=rlt]', e => e.click()); await wait(1200);
  const hf2 = await p.$eval('#v-rlt', e => +e.dataset.frames || 0), hp2 = await p.$eval('#rltPlay', e => /Pause/.test(e.textContent));
  if (hf > 0 || hp || hf2 > 0 || hp2) problems.push(`reduced motion: the RLT animation moved by itself (frames ${hf}, ${hf2})`);
  await p.close() }
{ // the stage's counters at the last step are the configs' arithmetic, at every prompt length; choosing a length stops the stage
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 }); await p.goto(file); await wait(500);
  await p.$eval('#tabs button[data-t=t-top]', e => e.click()); await wait(300);
  await p.$eval('#stg-ced', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  for (const N of [8192, 32768, 131072, 1048576]) {
    await p.evaluate(N => { const e = document.getElementById('cedN'); e.value = String(N); e.dispatchEvent(new Event('change')) }, N); await wait(150);
    if (await p.$eval('#stg-ced-p', e => /Pause/.test(e.textContent))) problems.push(`N ${N}: the stage kept playing after the prompt length changed`);
    const bad = await p.evaluate(N => { const D = window.TN_CED, bad = [], n = D.api.st.n, a = D.snap(0, n - 1), b = D.snap(1, n - 1), rep = Math.min(N, 128);
      const near = (x, y) => Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(y));
      if (!near(a.hbm, N * 3514.25)) bad.push('V4-Flash cache ' + a.hbm); if (!near(b.hbm, N * 890)) bad.push('V4.1-Flash cache ' + b.hbm);
      if (a.passes !== N * 43) bad.push('V4-Flash passes ' + a.passes); if (b.passes !== N * 20 + rep * 20) bad.push('V4.1-Flash passes ' + b.passes);
      let s4 = 0, s41 = 0; for (let r = 0; r < 43; r++) s4 += D.v4b(r); for (let r = 0; r < 40; r++) s41 += D.v41b(r);
      if (Math.round(s4) !== 3514 || s41 !== 890) bad.push('per-layer bytes sum to ' + s4 + ' and ' + s41);
      if (Math.abs(a.flops - 2 * 13e9 * N) > 1e3 || Math.abs(b.flops - 2 * 8e9 * (N + rep)) > 1e3) bad.push('compute ' + a.flops + ' ' + b.flops);
      const txt = document.getElementById('sx-ced').children[0].textContent; if (!txt.includes(N.toLocaleString('en-GB') + ' new tokens')) bad.push('step 1 lacks ' + N.toLocaleString('en-GB'));
      const L = [...document.getElementById('sx-ced').children].map(li => li.textContent).join(' ');
      for (const x of ['3,514 bytes', '890 bytes', 'N x 43', 'N x 20 + 128 x 20', '41 separate caches', '4 cache copies']) if (!L.includes(x)) bad.push('list lacks ' + x);
      return bad }, N);
    bad.forEach(x => problems.push(`N ${N}: ${x}`));
  }
  console.log('stage counter checks: 4 prompt lengths');
  await p.close() }
await b.close();
console.log('animations and stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
