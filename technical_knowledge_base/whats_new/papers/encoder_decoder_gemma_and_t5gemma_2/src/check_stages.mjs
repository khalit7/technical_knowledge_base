// The 2026-11-06 layout and motion checks for the Encoder-Decoder Gemma and T5Gemma 2 page, at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-ad, a decoder-only checkpoint copied into an encoder-decoder, three modes with their own step lists; #stg-mg, merged
// attention against separate self- and cross-attention) and the 2D step animation (#cdx, the generation cost, four models, two step lists)
// each play by themselves once scrolled into view, step to their last step, and have exactly one step-list item per step in every mode;
// flows stop drawing off screen; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under
// prefers-reduced-motion nothing moves by itself; the merged stage redraws when the widget's row changes; and the numbers the step lists
// state match the data the stages draw (PAPER.rc.parts through window.ADS, and MG.compute for the merged attention).
// Writes a mid-step screenshot of each stage and animation in each mode.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/encoder_decoder_gemma_and_t5gemma_2/src/check_stages.mjs [shots dir]
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
const ANIMS = { cdx: 't-read' };
const STAGE_MODES = { 'stg-ad': 'adM' }; // the mode toggle swaps the stage's step list and replays it
const COUNTERS = { 'stg-ad': ['adCnt', /Encoder-decoder so far/i] };
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
      // a reader control stops autoplay for good; step to the last step through the forward button, with a middle screenshot
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(1700); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(1700);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      if (COUNTERS[id]) { const cnt = await p.$eval('#' + COUNTERS[id][0], e => e.innerText); if (!COUNTERS[id][1].test(cnt)) problems.push(`${tag}: ${id}: counters missing`) }
      if (STAGE_MODES[id]) for (const m of await p.$$eval(`#${STAGE_MODES[id]} button`, bs => bs.map(b => b.dataset.m))) {
        const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
        await clk(`#${STAGE_MODES[id]} button[data-m=${m}]`); await wait(2600);
        const f1m = await p.$eval('#' + id, e => +e.dataset.frames || 0), plm = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
        if (!(f1m > f0) || !plm) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const nm = await p.$eval(`#${id}-r`, e => +e.max + 1), lm = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : ''] });
        if (lm[0] !== 1 || lm[1] !== nm) problems.push(`${tag}: ${id} ${m}: ${lm[0]} visible lists, ${lm[1]} items for ${nm} steps (${lm[2]})`);
        for (let k = 1; k < nm; k++) { await clk(`#${id}-f`); await wait(60); if (k === Math.floor(nm / 2)) { await wait(2100); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-mid-${scheme}-${width}.png` }) } }
        await wait(2100); const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${nm} of ${nm}`) problems.push(`${tag}: ${id} ${m} ended on "${sh}"`);
        if (COUNTERS[id]) { const cnt = await p.$eval('#' + COUNTERS[id][0], e => e.innerText); if (!COUNTERS[id][1].test(cnt)) problems.push(`${tag}: ${id} ${m}: counters missing`) }
      }
    }
    // the merged stage follows the widget: opening the predict reveal and moving the row redraws it
    if (t === 't-read') {
      await p.evaluate(() => { const s = document.querySelector('#pr-merge .skip'); if (s) s.click() }); await wait(200);
      const d0 = await p.$eval('#stg-mg', e => +e.dataset.draws || 0);
      await p.evaluate(() => { const r = document.getElementById('mgR'); r.value = 4; r.dispatchEvent(new Event('input', { bubbles: true })) }); await wait(200);
      const d1 = await p.$eval('#stg-mg', e => +e.dataset.draws || 0);
      if (!(d1 > d0) && width >= 1100) problems.push(`${tag}: the merged stage did not redraw when the widget's row changed`);
      await p.evaluate(() => { const r = document.getElementById('mgR'); r.value = 3; r.dispatchEvent(new Event('input', { bubbles: true })) });
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
        // a click on a list item plays that step once and stops on it
        await p.evaluate(id => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[1].click(), id);
        const pl2 = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
        await p.waitForFunction(id => !document.getElementById(id).hasAttribute('data-playing'), { timeout: 15000 }, id).catch(() => problems.push(`${tag}: ${id} ${m} list click did not stop`));
        if (!pl2) problems.push(`${tag}: ${id} ${m} list click did not play its step`);
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
  for (const t of ['t-read', 't-run']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
    for (const id of Object.keys(ANIMS).filter(a => ANIMS[a] === t)) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl) problems.push(`reduced motion: ${id} moved by itself (frames ${f})`) } }
  await p.close() }
{ // the numbers the step lists state are the ones the stages draw
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const items = id => [...document.getElementById(id).children].map(li => li.textContent);
    const want = (id, i, s) => { n++; const L = items(id); if (!L[i] || !L[i].includes(s)) bad.push(id + ' item ' + (i + 1) + ': expected "' + s + '"') };
    const { MODES, counts, F } = window.ADS, RC = PAPER.rc.parts, tot = p => p.emb + p.attn + p.norm + p.ffn, g2 = RC['gemma-2-2b'], g9 = RC['gemma-2-9b'], g3 = RC['gemma-3-270m'];
    const B = v => (v / 1e9).toFixed(2) + 'B', M = v => (v / 1e6).toFixed(1) + 'M', M0 = v => Math.round(v / 1e6) + 'M';
    // 2B-2B
    want('sx-ad-bal', 0, 'of 26 blocks'); want('sx-ad-bal', 0, B(tot(g2)) + ' parameters'); want('sx-ad-bal', 0, '(' + B(tot(g2) - g2.emb) + ' outside the embedding)');
    want('sx-ad-bal', 3, M0(g2.cross_self) + ' parameters, 26 × ' + M(g2.cross_self / 26));
    const balEnd = 2 * tot(g2) + g2.cross_self; want('sx-ad-bal', 4, 'All ' + B(balEnd)); want('sx-ad-bal', 4, 'the recount gives ' + (balEnd / 1e6).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M');
    n++; if (!counts('bal', 4).includes(F(balEnd))) bad.push('stg-ad bal: last counter does not show ' + F(balEnd));
    // 9B-2B
    want('sx-ad-unb', 0, 'Gemma 2 9B (' + B(tot(g9)) + ' parameters, ' + g9.L + ' layers)'); want('sx-ad-unb', 0, 'Gemma 2 2B (' + B(tot(g2)) + ', ' + g2.L + ' layers)');
    want('sx-ad-unb', 3, 'in ' + g2.d.toLocaleString('en-GB') + ' dimensions, the 9B encoder in ' + g9.d.toLocaleString('en-GB'));
    want('sx-ad-unb', 3, '(' + M0(RC.cross_9b_into_2b) + ' parameters: 26 layers × ' + M(RC.cross_9b_into_2b / 26) + ')');
    const unbEnd = tot(g9) + tot(g2) + RC.cross_9b_into_2b; want('sx-ad-unb', 5, 'All ' + B(unbEnd) + ' parameters (' + B(unbEnd - g9.emb - g2.emb) + ' outside the embeddings');
    n++; if (!counts('unb', 5).includes(F(unbEnd))) bad.push('stg-ad unb: last counter does not show ' + F(unbEnd));
    // T5Gemma 2 270M-270M
    want('sx-ad-t2', 0, M0(tot(g3)) + ' parameters, most of them (' + M0(g3.emb) + ')'); want('sx-ad-t2', 3, M(g3.cross_self) + ' here');
    want('sx-ad-t2', 4, M0(g3.emb) + ' saved here'); want('sx-ad-t2', 4, '(' + M0(2 * tot(g3)) + ')');
    want('sx-ad-t2', 5, '(' + M0(RC.vision) + ' vision, ' + M0(g3.emb) + ' embedding, ' + M0(tot(g3) - g3.emb) + ' encoder, ' + M0(tot(g3) - g3.emb) + ' decoder)');
    const t2End = RC.vision + 2 * tot(g3) - g3.emb; n++; if (Math.abs(t2End / 1e6 - 786) > 1) bad.push('t2 total ' + (t2End / 1e6).toFixed(1) + 'M is not about 786M');
    n++; if (!counts('t2', 5).includes(F(t2End))) bad.push('stg-ad t2: last counter does not show ' + F(t2End));
    // each mode's step count matches its list
    for (const m of ['bal', 'unb', 't2']) { n++; if (items('sx-ad-' + m).length !== MODES[m].n) bad.push(m + ': ' + MODES[m].n + ' steps, ' + items('sx-ad-' + m).length + ' items') }
    // merged attention: the default row 3, relevance 0 and seed 7 give the encoder share the list states
    n++; if (MG.seed() !== 7) bad.push('merged: seed is ' + MG.seed() + ', not 7');
    const mr = MG.compute(3, 0), pct = v => (100 * v).toFixed(v < .095 ? 1 : 0) + '%';
    want('sx-mg', 4, 'it is ' + pct(mr.enc)); want('sx-mg', 4, 'all ' + (3 + MG.n) + ' visible keys'); want('sx-mg', 2, 'all ' + MG.n + ' encoder keys');
    n++; if (Math.abs(mr.ps.reduce((a, b) => a + b, 0) - 1) > 1e-9 || Math.abs(mr.pc.reduce((a, b) => a + b, 0) - 1) > 1e-9 || Math.abs(mr.pm.reduce((a, b) => a + b, 0) - 1) > 1e-9) bad.push('merged: a softmax does not sum to 1');
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
