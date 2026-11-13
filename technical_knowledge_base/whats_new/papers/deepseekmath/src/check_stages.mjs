// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-mine, the corpus pipeline with and without domain discovery, and #stg-ppo, PPO against GRPO on one toy question) and the Then and now animation (#obj)
// each play by itself once scrolled into view, step to their last step, and have exactly one step-list item per step (each mode of a mode toggle too: each mode has its own list);
// flows stop drawing off screen; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself;
// and the numbers the static step lists state match the data the stages draw (MINE, READTOY). Writes a mid-step screenshot of each stage and animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/deepseekmath/src/check_stages.mjs [shots dir]
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
const ANIMS = { obj: 't-then' };
const STAGE_MODES = { 'stg-mine': 'mineM', 'stg-ppo': 'ppoM' }; // each stage's mode toggle swaps its step list and replays it
const COUNTERS = { 'stg-mine': ['mineCnt', /math pages found/i], 'stg-ppo': ['ppoCnt', /networks in memory/i] };
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
    // the split: two columns side by side at 1100 px and wider, stacked below
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    // 3D stages
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      const playing = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (!playing) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      // flows stop drawing off screen
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step through the forward button and a middle screenshot
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(1700); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(1700);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      if (STAGE_MODES[id]) for (const m of await p.$$eval(`#${STAGE_MODES[id]} button`, bs => bs.map(b => b.dataset.m))) {
        const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
        await clk(`#${STAGE_MODES[id]} button[data-m=${m}]`); await wait(2600);
        const f1m = await p.$eval('#' + id, e => +e.dataset.frames || 0), plm = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
        if (!(f1m > f0) || !plm) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const nm = await p.$eval(`#${id}-r`, e => +e.max + 1), lm = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : ''] });
        if (lm[0] !== 1 || lm[1] !== nm) problems.push(`${tag}: ${id} ${m}: ${lm[0]} visible lists, ${lm[1]} items for ${nm} steps (${lm[2]})`);
        for (let k = 1; k < nm; k++) { await clk(`#${id}-f`); await wait(60); if (k === Math.floor(nm / 2)) { await wait(2100); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-mid-${scheme}-${width}.png` }) } }
        await wait(2100); const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${nm} of ${nm}`) problems.push(`${tag}: ${id} ${m} ended on "${sh}"`);
        const cnt = await p.$eval('#' + COUNTERS[id][0], e => e.innerText); if (!COUNTERS[id][1].test(cnt)) problems.push(`${tag}: ${id} ${m}: counters missing`);
      }
    }
    // 2D step animations (makeAnim): each mode
    for (const [id, tab] of Object.entries(ANIMS)) {
      if (tab !== t || !(await p.$('#' + id))) continue;
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (!(fr > 0) || !pl) problems.push(`${tag}: ${id} did not play when scrolled into view (frames ${fr}, playing ${pl})`);
      const modes0 = await p.$$eval(`#${id}M button`, bs => bs.map(b => b.dataset.m)), modes = modes0.length ? modes0 : [null];
      for (const m of modes) {
        if (m) { await clk(`#${id}M button[data-m=${m}]`); await wait(1200);
        if (!(await p.$eval('#' + id, e => e.hasAttribute('data-playing')))) problems.push(`${tag}: ${id} did not replay after switching to ${m}`); }
        const n = await p.$eval(`#${id}Scrub`, e => +e.max / 100);
        const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
        if (lis !== n) problems.push(`${tag}: ${id} ${m} has ${n} steps but ${lis} list items`);
        if (n > 12) problems.push(`${tag}: ${id} ${m} has ${n} steps (a replay over about 12 steps must be grouped into stretches)`);
        for (let k = 0; k < n; k++) { await clk(`#${id}Fwd`); if (k === Math.floor(n / 2) - 1) await (await p.$('#' + id)).screenshot({ path: `${shots}/anim-${id}-${m}-mid-${scheme}-${width}.png` }) }
        if (await p.$eval('#' + id, e => e.hasAttribute('data-playing'))) problems.push(`${tag}: ${id} still playing after the forward button`);
        const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
        if (on !== n - 1) problems.push(`${tag}: ${id} ${m} list marks item ${on + 1} at the last step`);
        // a click on a list item plays that stretch once and stops on it
        await p.evaluate(id => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[1].click(), id);
        const pl2 = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
        await p.waitForFunction(id => !document.getElementById(id).hasAttribute('data-playing'), { timeout: 15000 }, id).catch(() => problems.push(`${tag}: ${id} ${m} list click did not stop`));
        if (!pl2) problems.push(`${tag}: ${id} ${m} list click did not play its stretch`);
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
  for (const t of ['t-read', 't-then']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg, #${t} #obj`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the static step lists state are the ones the stages draw
  const p = await b.newPage(); await p.goto(file); await wait(1500);
  const r = await p.evaluate(() => { const D = READTOY(), V = D.V.reduce((a, b) => a + b, 0) / 3, mine = document.getElementById('sx-mine-dd').innerText, ppo = document.getElementById('sx-ppo').innerText, grpo = document.getElementById('sx-grpo').innerText;
    return { V, R: D.R, rg: D.Rg.reduce((a, b) => a + b, 0), total: MINE.total, pages: MINE.ND * MINE.NPG, seed0: MINE.dd[0].pos[0], nd: MINE.ND, mine, ppo, grpo,
      overlap4: MINE.dd[3].overlap, r4: MINE.dd[3].found } });
  if (!r.mine.includes(r.total + ' of ' + r.pages.toLocaleString('en'))) problems.push(`corpus list does not state ${r.total} of ${r.pages} math pages`);
  if (!r.mine.includes(r.seed0 + ' OpenWebMath-like')) problems.push(`corpus list does not state the seed of ${r.seed0}`);
  if (!r.mine.includes(r.nd + ' domains')) problems.push(`corpus list does not state ${r.nd} domains`);
  if (Math.abs(r.V - 0.8) > 0.06 || r.R !== 0) problems.push(`PPO list says the critic expects about 0.8 and the answer is wrong; data: mean V ${r.V.toFixed(3)}, reward ${r.R}`);
  if (r.rg !== 2) problems.push(`GRPO list and counters assume 2 of 8 right ("about one time in four"); data: ${r.rg}`);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
