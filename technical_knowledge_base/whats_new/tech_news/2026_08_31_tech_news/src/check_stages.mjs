// The 2026-11-06 layout and motion checks for the 2026-08-31 issue, at 1400 px light, 920 px light and 390 px dark:
// the 3D stage (#stg-mc, MCP with and without sessions, Talk of the town) and the 2D step animation (#v-dflash, DFlash 2 against plain decoding
// and two other drafters, Models) each play by themselves once scrolled into view, step to their last step, and have exactly one step-list item
// per step in every mode; the stage's flows stop drawing off screen; a reader control stops autoplay; a mode toggle replays; at 1400 px every
// split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; and the MCP
// scenario's numbers (steps, round trips per step, the 9 and 6 totals, 4 handshake) match src/recompute.py and the step lists' Result items.
// Writes a mid-step screenshot of each stage and animation in each mode, and each split at 1400 light and 390 dark.
// usage (from the repo root): node technical_knowledge_base/whats_new/tech_news/2026_08_31_tech_news/src/check_stages.mjs [shots dir]
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
const ANIMS = { 'v-dflash': ['t-models', 'df'] };        // 2D step animations (stepAnim in 10b_js_anim.js): card id -> [tab, control prefix]
const STAGE_MODES = { 'stg-mc': 'mcM' };                  // each stage's mode toggle swaps its step list and replays it
const COUNTERS = { 'stg-mc': ['mcCnt', /Round trips/i] };
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
    if (width !== 920) for (let i = 0; i < splits.length; i++) {
      const el = (await p.$$(`#${t} .s3sp`))[i]; await el.evaluate(e => e.scrollIntoView({ block: 'start' })); await wait(700);
      const bb = await el.boundingBox(); await p.screenshot({ path: `${shots}/split-${t}-${i + 1}-${scheme}-${width}.png`, clip: { x: 0, y: Math.max(0, bb.y), width, height: Math.min(1800, bb.height) }, captureBeyondViewport: true });
    }
    // 3D stages
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(200);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      const playing = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (!playing) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      // flows stop drawing off screen (scrolled to whichever end of the page is farther from the stage)
      await p.$eval('#' + id, e => { const y = e.getBoundingClientRect().top + scrollY; scrollTo(0, y > document.documentElement.scrollHeight / 2 ? 0 : document.documentElement.scrollHeight) }); await wait(400);
      if (await p.$eval('#' + id, e => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight })) problems.push(`${tag}: ${id} could not be scrolled off screen`);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step through the forward button, with a mid-step screenshot
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(1700); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-old-mid-${scheme}-${width}.png` }) } }
      await wait(1700);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      const cnt0 = await p.$eval('#' + COUNTERS[id][0], e => e.innerText); if (!COUNTERS[id][1].test(cnt0)) problems.push(`${tag}: ${id}: counters missing`);
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
        // the counters at the last step match the scenario's totals (recompute.py: 9 and 6 round trips; 4 handshake with sessions)
        const want = m === 'old' ? ['9', '4', '9', '1', '1'] : ['6', '0', '0', '0', '0'];
        const got = await p.$eval('#' + COUNTERS[id][0], e => [...e.querySelectorAll('.stat .v')].map(v => v.textContent));
        if (got.join() !== want.join()) problems.push(`${tag}: ${id} ${m}: counters at the last step ${got.join()} (expected ${want.join()})`);
      }
    }
    // 2D step animations (stepAnim): each mode
    for (const [id, [tab, pre]] of Object.entries(ANIMS)) {
      if (tab !== t || !(await p.$('#' + id))) continue;
      checked++;
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(200);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (!(fr > 0) || !pl) problems.push(`${tag}: ${id} did not play when scrolled into view (frames ${fr}, playing ${pl})`);
      // off screen it pauses
      await p.$eval('#' + id, e => { const y = e.getBoundingClientRect().top + scrollY; scrollTo(0, y > document.documentElement.scrollHeight / 2 ? 0 : document.documentElement.scrollHeight) }); await wait(300);
      const g0 = await p.$eval('#' + id, e => +e.dataset.frames || 0); await wait(600); const g1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (g1 !== g0) problems.push(`${tag}: ${id} kept animating off screen`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300);
      const modes = await p.$$eval(`#${pre}M button`, bs => bs.map(b => b.dataset.m));
      for (const m of modes) {
        await clk(`#${pre}M button[data-m=${m}]`); await wait(1200);
        if (!(await p.$eval('#' + id, e => e.hasAttribute('data-playing')))) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const n = await p.$eval(`#${pre}Scrub`, e => +e.max / 100);
        const lis = await p.$eval(`#${pre}M`, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
        if (lis !== n) problems.push(`${tag}: ${id} ${m} has ${n} steps but ${lis} list items`);
        if (n > 12) problems.push(`${tag}: ${id} ${m} has ${n} steps (a replay over about 12 steps must be grouped into stretches)`);
        await p.evaluate(pre => { const e = document.getElementById(pre + 'Scrub'); e.value = 0; e.dispatchEvent(new Event('input')) }, pre);
        for (let k = 0; k < 2 * n; k++) { await clk(`#${pre}Fwd`); if (k === n - 1) await (await p.$('#' + id)).screenshot({ path: `${shots}/anim-${id}-${m}-mid-${scheme}-${width}.png` }) }
        if (await p.$eval('#' + id, e => e.hasAttribute('data-playing'))) problems.push(`${tag}: ${id} still playing after the forward button`);
        const st = await p.$eval(`#${pre}Step`, e => e.textContent); if (!st.includes(`step ${n} of ${n}`)) problems.push(`${tag}: ${id} ${m} ended on "${st}"`);
        const on = await p.$eval(`#${pre}M`, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
        if (on !== n - 1) problems.push(`${tag}: ${id} ${m} list marks item ${on + 1} at the last step`);
        // a click on a list item plays that step once and stops on it
        await p.$eval(`#${pre}M`, h => h.closest('.s3sp').querySelector('ol.sx:not([hidden])').children[1].click());
        const pl2 = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
        await p.waitForFunction(id => !document.getElementById(id).hasAttribute('data-playing'), { timeout: 15000 }, id).catch(() => problems.push(`${tag}: ${id} ${m} list click did not stop`));
        if (!pl2) problems.push(`${tag}: ${id} ${m} list click did not play its step`);
        const on2 = await p.$eval(`#${pre}M`, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
        if (on2 !== 1) problems.push(`${tag}: ${id} ${m} list click stopped on item ${on2 + 1}, not 2`);
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
  for (const t of ['t-models', 't-talk']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
    for (const id of Object.keys(ANIMS).filter(a => ANIMS[a][0] === t)) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl) problems.push(`reduced motion: ${id} moved by itself (frames ${f})`) } }
  await p.close() }
{ // the MCP scenario's numbers: the scene's steps against recompute.py's round trips per step and the step lists' Result items
  const p = await b.newPage(); await p.goto(file); await wait(500);
  const r = await p.evaluate(() => { const bad = [], S = window.MCP_STEPS, RT = { old: [1, 1, 1, 1, 0, 1, 2, 1, 1, 0], new: [1, 1, 1, 0, 1, 1, 1, 0] };
    for (const m of ['old', 'new']) { const rt = S[m].map(s => s.rt); if (rt.join() !== RT[m].join()) bad.push(m + ': round trips per step ' + rt.join() + ' against recompute.py ' + RT[m].join());
      const L = [...document.getElementById('sx-mc-' + m).children]; if (L.length !== S[m].length) bad.push(m + ': ' + L.length + ' list items for ' + S[m].length + ' steps');
      const tot = rt.reduce((a, b) => a + b, 0), hs = S[m].reduce((a, s) => a + s.hs * (s.rt > 1 ? 2 : 1), 0), last = L[L.length - 1].textContent;
      if (!last.includes(tot + ' round trips')) bad.push(m + ': the Result item does not state ' + tot + ' round trips');
      if (m === 'old' && !last.includes(hs + ' of them handshake')) bad.push('old: the Result item does not state ' + hs + ' handshake round trips') }
    return bad });
  r.forEach(x => problems.push('MCP numbers: ' + x)); await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
