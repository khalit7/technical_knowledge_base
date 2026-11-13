// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-pipe, RLHF against DPO on the toy's pairs, and #stg-pair, four training pairs through DPO and through Unlikelihood)
// each play by itself once scrolled into view, step to their last step, and have exactly one step-list item per step (each mode of a mode toggle too:
// each mode has its own list); flows stop drawing off screen; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll;
// under prefers-reduced-motion nothing moves by itself; and the numbers the static step lists state match the data the stages draw
// (RMC, ckRun, TOYRES, FRS: the page's toy, computed in the browser). Writes a mid-step screenshot of each stage in each mode.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/dpo/src/check_stages.mjs [shots dir]
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
const ANIMS = {};
const STAGE_MODES = { 'stg-pipe': 'pipeM', 'stg-pair': 'pairM' }; // each stage's mode toggle swaps its step list and replays it
const COUNTERS = { 'stg-pipe': ['pipeCnt', /models in memory/i], 'stg-pair': ['pairCnt', /exact KL/i] };
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
  for (const t of ['t-read']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the static step lists state are the ones the stages draw
  const p = await b.newPage(); await p.goto(file); await wait(1500);
  const r = await p.evaluate(() => {
    const M = '\u2212', f2 = v => (v < 0 ? M : '+') + Math.abs(v).toFixed(2), n2 = v => (v < 0 ? M : '') + Math.abs(v).toFixed(2), txt = id => document.getElementById(id).innerText;
    const L = { rlhf: txt('sx-rlhf'), dpo: txt('sx-dpo'), pd: txt('sx-pair-dpo'), pu: txt('sx-pair-ul') };
    const [cw, cl] = EXIDS[2], rm = [RMC(cw), RMC(cl)], D1 = ckRun('dpo', 1).snaps, D01 = ckRun('dpo', 0.1).snaps, UL = ckRun('ul', 1).snaps;
    const sp = TOYRES.sweep.find(s => s.m === 'PPO' && s.p === 'target KL 1'), sd = TOYRES.sweep.find(s => s.m === 'DPO' && s.p === 'β = 1'), fin = s => s.trace[s.trace.length - 1];
    const ws = (S, i) => S[i].pairs.map(q => q.w), rng = a => [Math.min(...a).toFixed(2) + ' and ' + Math.max(...a).toFixed(2), Math.min(...a).toFixed(2) + ' to ' + Math.max(...a).toFixed(2)];
    const need = [
      ['rlhf', 'reward model scores pair 3', f2(rm[0]) + ' and ' + f2(rm[1])],
      ['rlhf', 'held-out accuracy', (100 * TOYRES.rm.valAcc).toFixed(1) + '%'],
      ['rlhf', 'pairs', TOYRES.data.pairs.toLocaleString('en-GB') + ' labelled pairs'],
      ['rlhf', 'PPO samples', sp.samples.toLocaleString('en-GB') + ' answers generated, KL ' + fin(sp).kl.toFixed(2) + ', true reward ' + fin(sp).r.toFixed(3)],
      ['rlhf', 'PPO shortfall', (FRS(sp.final.kl) - sp.final.r).toFixed(3) + ' below'],
      ['dpo', 'DPO final', 'KL ' + fin(sd).kl.toFixed(2) + ', true reward ' + fin(sd).r.toFixed(3) + ', ' + (FRS(sd.final.kl) - sd.final.r).toFixed(3) + ' below'],
      ['dpo', 'implicit rewards of pair 3', f2(D1[8].pairs[2].lw) + ' and ' + f2(D1[8].pairs[2].ll)],
      ['dpo', 'margins', 'margin of ' + (D1[8].pairs[2].lw - D1[8].pairs[2].ll).toFixed(2) + " against the reward model's " + (rm[0] - rm[1]).toFixed(2)],
      ['pd', 'weights after 10 steps', rng(ws(D1, 2))],
      ['pd', 'pairs 2 and 3 at 50', '(to ' + f2(D1[4].pairs[1].lw) + ' and ' + f2(D1[4].pairs[2].lw) + ')'],
      ['pd', 'weights after 50 steps', rng(ws(D1, 4))],
      ['pd', 'weights after 200 steps', rng(ws(D1, 6))],
      ['pd', 'KL and reward at 200', 'KL ' + D1[6].kl.toFixed(2) + ', true reward ' + D1[6].rw.toFixed(3) + ' (from ' + D1[0].rw.toFixed(3)],
      ['pd', 'pair 4 at 600', 'ends at ' + n2(D1[8].pairs[3].lw) + ' for the chosen answer and ' + n2(D1[8].pairs[3].ll) + ' for the rejected one, weight ' + D1[8].pairs[3].w.toFixed(2)],
      ['pd', 'pair 1 weight at 600', "pair 1's weight is down to " + D1[8].pairs[0].w.toFixed(2)],
      ['pd', 'KL and reward at 600', 'KL ' + D1[8].kl.toFixed(2) + ', true reward ' + D1[8].rw.toFixed(3)],
      ['pd', 'beta 0.1 weights at 600', rng(ws(D01, 8))],
      ['pu', 'rejected at 50', "pair 1's rejected answer is at " + n2(UL[4].pairs[0].ll) + " and pair 4's at " + n2(UL[4].pairs[3].ll)],
      ['pu', 'KL at 50', 'KL ' + UL[4].kl.toFixed(2)],
      ['pu', 'rejected at 200', 'reach ' + n2(UL[6].pairs[0].ll) + ' and ' + n2(UL[6].pairs[3].ll)],
      ['pu', 'KL and reward at 200', 'KL ' + UL[6].kl.toFixed(2) + ', true reward ' + UL[6].rw.toFixed(3) + ", below DPO's " + D1[6].rw.toFixed(3)],
      ['pu', 'pair 1 rejected at 600', 'falls to ' + n2(UL[8].pairs[0].ll) + ' nats'],
      ['pu', 'grammatical mass', (100 * UL[6].gram).toFixed(1) + '% at 200 steps, ' + (100 * UL[8].gram).toFixed(1) + '% at 600']];
    const bad = need.filter(([l, what, s]) => ![].concat(s).some(x => L[l].toLowerCase().includes(x.toLowerCase()))).map(([l, what, s]) => l + ': ' + what + ' (expected "' + [].concat(s).join('" or "') + '")');
    const big = Math.exp(-UL[8].pairs[0].ll); if (!(big > 6e9 && big < 8e9)) bad.push('pu: "about 7 billion" is ' + big.toExponential(2));
    const lo = Math.max(...D1[2].pairs.map(q => Math.max(Math.abs(q.lw), Math.abs(q.ll)))); if (lo >= 0.2) bad.push('pd: bars after 10 steps exceed 0.2 nats: ' + lo);
    return { bad, n: need.length + 2 } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
