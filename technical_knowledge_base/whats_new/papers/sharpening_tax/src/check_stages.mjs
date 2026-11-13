// The 2026-11-06 layout and motion checks for the Sharpening Tax page (after Learn What's Left's), at 1400 px light, 920 px light and 390 px dark:
// the 3D stage (#stg-bm, Stage 1: every task of one cell as a bar, base then post-trained, three cells with three step lists) plays by itself once
// scrolled into view, steps to its last step, has exactly one step-list item per step, replays after each cell switch and stops drawing off screen;
// the 2D two-sampler animation on Train with PTGS (#pt, makeAnim with the same motion rules) plays once in view, has one list item per step in both
// modes and steps to its end; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion
// nothing moves by itself; the live toy trainer does not run by itself; and every number the step lists state matches the data the page draws
// (Stage 1: the released counts through CX, recomputed in the page; the two-sampler lists: TOYD.snap).
// Writes a mid-step and a last-step screenshot of each stage mode and of the 2D animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/sharpening_tax/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const R = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = []; let checked = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
const STAGE_MODES = { 'stg-bm': 'bmM' };
const slug = m => m.replace(/[^a-z0-9]/gi, '');
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
      const playing = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (!playing) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      // flows stop drawing off screen
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step through the forward button, with a middle screenshot
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(2600); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(2600);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      if (width === 1400 || width === 390) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
      if (STAGE_MODES[id]) for (const m of await p.$$eval(`#${STAGE_MODES[id]} button`, bs => bs.map(b => b.dataset.m))) {
        const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
        await p.$eval(`#${STAGE_MODES[id]} button[data-m="${m}"]`, e => e.click()); await wait(2600);
        const f1m = await p.$eval('#' + id, e => +e.dataset.frames || 0), plm = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
        if (!(f1m > f0) || !plm) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const nm = await p.$eval(`#${id}-r`, e => +e.max + 1), lm = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : ''] });
        if (lm[0] !== 1 || lm[1] !== nm) problems.push(`${tag}: ${id} ${m}: ${lm[0]} visible lists, ${lm[1]} items for ${nm} steps (${lm[2]})`);
        for (let k = 1; k < nm; k++) { await clk(`#${id}-f`); await wait(60); if (k === Math.floor(nm / 2)) { await wait(2600); if (width !== 920) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${slug(m)}-mid-${scheme}-${width}.png` }) } }
        await wait(2600); const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${nm} of ${nm}`) problems.push(`${tag}: ${id} ${m} ended on "${sh}"`);
        if (width === 1400) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${slug(m)}-last-${scheme}-${width}.png` });
      }
    }
    // 2D animations (makeAnim): play once in view, one list item per step in every mode, step to the end
    for (const id of await p.$$eval(`#${t} .an-svg`, xs => xs.map(x => x.id.replace(/Svg$/, '')))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}Play`, e => /Pause/.test(e.textContent));
      if (!(f1 > 0) || !pl) problems.push(`${tag}: ${id} did not play when scrolled into view (frames ${f1})`);
      for (const m of await p.$$eval(`#${id}M button`, bs => bs.map(b => b.dataset.m))) {
        await p.$eval(`#${id}M button[data-m="${m}"]`, e => e.click()); await wait(1200);
        const pm = await p.$eval(`#${id}Play`, e => /Pause/.test(e.textContent)); if (!pm) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const n = await p.$eval(`#${id}Scrub`, e => +e.max / 100);
        const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0] });
        if (lis[0] !== 1 || lis[1] !== n) problems.push(`${tag}: ${id} ${m}: ${lis[0]} visible lists with ${lis[1]} items for ${n} steps`);
        for (let k = 0; k < n; k++) { await clk(`#${id}Fwd`); if (k === Math.floor(n / 2) && width !== 920) { await wait(100); await (await p.$('#' + id)).screenshot({ path: `${shots}/anim-${id}-${m}-mid-${scheme}-${width}.png` }) } }
        const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
        if (on !== n - 1) problems.push(`${tag}: ${id} ${m} list marks item ${on + 1} at the end`);
        const still = await p.$eval(`#${id}Play`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      }
    }
    // the live trainer on Train with PTGS is a widget: it trains only when the reader presses its button
    if (t === 't-toy') { const v0 = await p.$eval('#tyLiveOut', e => e.innerText); await p.$eval('#tyLive', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if ((await p.$eval('#tyLiveOut', e => e.innerText)) !== v0) problems.push(`${tag}: the live trainer ran by itself`) }
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
  for (const t of ['t-read', 't-toy']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
    for (const id of await p.$$eval(`#${t} .an-svg`, xs => xs.map(x => x.id.replace(/Svg$/, '')))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0); if (f > 0) problems.push(`reduced motion: ${id} played ${f} frames`) } }
  await p.close() }
{ // every number the step lists state is the one the stage and the animation draw
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const items = id => [...document.getElementById(id).children].map(li => li.textContent.replace(/\s+/g, ' '));
    const has = (L, i, s, id) => { n++; if (!L[i] || !L[i].includes(s)) bad.push(id + ' step ' + (i + 1) + ': expected "' + s + '"') };
    const pc = v => (100 * v).toFixed(1) + '%', pt = v => (100 * v).toFixed(1);
    // Stage 1: each cell's numbers recomputed from the released counts (the scene's own get(), which calls CX)
    const cells = { 'webshop|gemma-4-31B': 'sx-bm-g31', 'webshop|gemma-4-E4B': 'sx-bm-e4b', 'acebench|Qwen2.5-32B': 'sx-bm-q32' };
    for (const [m, lid] of Object.entries(cells)) {
      const D = SC_BM.get(m), L = items(lid), st = CX.stats(D.cell);
      has(L, 0, String(D.T), lid); has(L, 0, pc(D.b1), lid); has(L, 1, pc(D.bK), lid); has(L, 2, pc(D.p1), lid); has(L, 3, pc(D.pK), lid);
      has(L, 2, pc(D.catP[0]), lid); has(L, 2, pc(D.catP[2]), lid);
      if (m !== 'webshop|gemma-4-E4B') { has(L, 3, pt(D.pK - D.p1) + ' points', lid); has(L, 3, pt(D.bK - D.b1), lid) } else { has(L, 3, pt(D.pK - D.p1) + ' points', lid); has(L, 3, pt(D.bK - D.b1), lid) }
      has(L, 4, String(D.lost), lid); has(L, 4, String(D.gained), lid); has(L, 4, pc(D.lost / D.T).replace('%', ''), lid); has(L, 4, pc(D.gained / D.T).replace('%', ''), lid);
      has(L, 4, pt(Math.abs(D.bK - D.pK)) + ' points', lid); has(L, 4, st.taxS.toFixed(3), lid);
      n++; if (Math.abs((D.bK - D.pK) - (D.lost - D.gained) / D.T) > 1e-12) bad.push(lid + ': the level gap is not lost minus gained');
    }
    { const L = items('sx-bm-g31'), D = SC_BM.get('webshop|gemma-4-31B'); has(L, 0, pc(D.catB[2]), 'g31'); has(L, 2, pc(D.catB[1]) + ' to ' + pc(D.catP[1]), 'g31') }
    { const L = items('sx-bm-e4b'), D = SC_BM.get('webshop|gemma-4-E4B'); has(L, 0, pc(D.catB[2]), 'e4b'); has(L, 2, pc(D.catB[2]) + ' to ' + pc(D.catP[2]), 'e4b'); has(L, 2, pc(D.catB[1]) + ' to ' + pc(D.catP[1]), 'e4b') }
    { const L = items('sx-bm-q32'), D = SC_BM.get('acebench|Qwen2.5-32B'); has(L, 0, pc(D.catB[2]), 'q32'); has(L, 0, pc(D.catB[0]), 'q32'); has(L, 2, pc(D.catB[1]) + ' to ' + pc(D.catP[1]), 'q32') }
    // the two-sampler lists against the snapshot batch the animation draws (TOYD.snap)
    const B = TOYD.snap.batch, F = items('sx-pt-fixed'), S = items('sx-pt-ptgs'), g = TOY.CFG.group, I = q => 1 - Math.pow(1 - q, g);
    const b65 = B.find(x => x.x === 65); has(S, 0, Math.round(100 * b65.p1) + '%', 'ptgs'); has(S, 0, 'near ' + Math.round(100 * b65.a / (b65.a + b65.b)) + '%', 'ptgs');
    has(S, 2, 'from ' + Math.round(100 * b65.p1) + '% to ' + Math.round(100 * b65.pT) + '%', 'ptgs');
    const hot = B.filter(x => x.T > 1.05).map(x => x.T), cold = B.filter(x => x.T < 0.95).map(x => x.T);
    has(S, 1, Math.min(...hot).toFixed(2) + ' to ' + Math.max(...hot).toFixed(2), 'ptgs'); has(S, 1, Math.min(...cold).toFixed(2) + ' to ' + Math.max(...cold).toFixed(2), 'ptgs');
    n++; if (hot.length !== 5 || cold.length !== 3) bad.push('ptgs: expected five heated and three cooled prompts');
    const hard = B.filter(x => x.p1 < 0.05); n++; if (hard.length !== 4) bad.push('ptgs: expected four hard prompts');
    has(S, 3, 'from ' + hard.reduce((a, x) => a + I(x.p1), 0).toFixed(3) + ' to ' + hard.reduce((a, x) => a + I(x.pT), 0).toFixed(3), 'ptgs');
    has(S, 3, B.map(x => x.k).join(', ') + ' successes', 'ptgs'); has(F, 0, 'Four are solved most of the time, four almost never', 'fixed');
    n++; if (B.filter(x => x.p1 > 0.5).length !== 4) bad.push('fixed: expected four prompts solved most of the time');
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
