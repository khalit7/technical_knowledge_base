// The 2026-11-06 rollout checks for the scheduling page: every 3D stage and every 2D animation plays by itself once scrolled into view,
// steps to its last step, has one step-list item per step, never moves under reduced motion; flows stop off screen; no errors, NaN,
// undefined or sideways scroll; split layout at 1400 px; the numbers written into the step lists are the data's (window.SC_DATA)
// and the simulator's (window.SC_EE); the Fair-share stepper is a widget and never plays by itself.
// usage: node src/check_stages.mjs [shots dir]   (from the page folder or the repo root; needs html_utils' node_modules)
// (adapted from the Containers and isolation page's check_stages.mjs)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
const STAGES = ['stg-hero', 'stg-sw', 'stg-vr', 'stg-aff', 'stg-thr'];
// [card, controls, {mode: step list}, mode buttons, data attribute]
const ANIMS = [['sc-ee-card', 'sc-ee-ctl', { cfs: 'sx-ee-cfs', eevdf: 'sx-ee-eevdf', short: 'sx-ee-short' }, 'sc-ee-mode', 'm']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const fs = await import('node:fs'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const problems = [];
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => ({ bad: (document.getElementById('t-read').innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }));
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) { const cols = await p.$$eval('.s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (cols.some(c => c !== 'grid')) problems.push(`${tag}: a split is not two columns`); }
  // autoplay on view
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-depth').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its last step; list length; screenshot mid-way
  for (const id of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
    const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` }) }
    }
    await wait(2600);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, k);
  }
  for (const [card, ctl, lists, seg, at] of ANIMS) {
    for (const [m, lid] of Object.entries(lists)) {
      if (seg) { await p.$eval(`#${seg} button[data-${at}="${m}"]`, e => e.click()); await wait(100); }
      await p.$eval(`#${ctl}-b`, e => e.click());
      await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
      const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${card} ${m} has ${n} steps but list ${lid} shows ${lis}`);
      for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
        if (k === Math.floor(n / 2)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(700); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}-${m}-${scheme}-${width}.png` }) } }
      const on = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} ${m} list marks ${on}, not the last step`);
      await audit(`${card} ${m}`);
    }
  }
  { // the numbers written into the step lists are the data's and the simulator's
    const r = await p.evaluate(() => { const out = [], D = window.SC_DATA, E = window.SC_EE, T = window.SC_THR;
      const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(x => { if (!txt(id).includes(String(x))) out.push(id + ' lacks "' + x + '"') });
      const f = (x, d) => Number(x).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
      // EEVDF stretches: every wake-up time and its wait, served counts, means, CPU and switches
      const wk = r => { const o = []; let w = null; r.snaps.forEach(s => { if (s.kind === 'wake' && s.task === 2) w = s.t; if (s.kind === 'pick' && s.task === 2 && w != null) { o.push([w / 1000, (s.t - w) / 1000]); w = null } }); return o };
      for (const m of ['cfs', 'eevdf', 'short']) { const R = E.runs[m], ws = R.waits.loader, mean = ws.reduce((a, b) => a + b, 0) / ws.length / 1000, id = 'sx-ee-' + m;
        need(id, [ws.length + ' wake-ups', R.switches + ' involuntary', f(R.cpu.loader / 1000, 1) + ' ms']);
        if (m !== 'cfs') need(id, ['mean wait ' + f(mean, 2) + ' ms']); else need(id, ['mean wait of 0', f(R.cpu.trainer / 1000, 1) + ' ms']);
        const W = wk(R), T2 = txt(id);
        if (!T2.includes(W.length >= 4 ? String(W[1][0]) : '')) out.push(id + ' does not name the second wake-up, at ' + W[1][0] + ' ms');
        if (m === 'cfs' && W.some(x => x[1] > 0)) out.push('cfs: a wait is not zero');
        if (m === 'eevdf') { const want = { 1.5: 1.5, 7: 2, 13: 2, 19: 0, 23: 0, 27: 0, 31: 2, 37: 2 }; W.forEach(([t, w]) => { if (want[t] !== w) out.push('eevdf wake ' + t + ' waited ' + w) }) }
        if (m === 'short') { const nz = W.filter(x => x[1] > 0); if (nz.length !== 1 || nz[0][0] !== 9.5 || nz[0][1] !== .5) out.push('short: non-zero waits ' + JSON.stringify(nz)) } }
      if (Math.round(T.refill) !== 66) out.push('first refill at ' + T.refill); need('sx-thr', ['about 66 ms', f(Math.min(...T.burst)) + ' to ' + f(Math.max(...T.burst))]);
      const t5 = D.throttle.find(r => r.n === 5 && r.period === 100000), t1 = D.throttle.find(r => r.n === 1), t10 = D.throttle.find(r => r.period === 10000);
      need('sx-thr', [f(Math.min(...t5.threads.map(t => t.max_gap))) + ' to ' + f(Math.max(...t5.threads.map(t => t.max_gap))), 'all ' + t5.stat.nr_periods + ' periods', t1.stat.nr_throttled + ' of ' + t1.stat.nr_periods, t10.stat.nr_throttled + ' of ' + t10.stat.nr_periods, f(Math.max(...t10.threads.map(t => t.max_gap)), 1), f(Math.max(...t1.threads.map(t => t.max_gap)), 1)]);
      const C = D.cpus; if (C.map(c => c.torch).join() !== '5,5,2,4' || C.map(c => c.cpu_count).join() !== '5,5,5,5') out.push('cpus data differs from the affinity steps');
      need('sx-aff', ['all say 5', 'still says 5', 'say 2 and PyTorch starts 2 threads', 'starts 4 threads', "machine's 5"]);
      const pv = D.ctx.pipe; need('sx-sw', [Math.min(...pv).toFixed(2) + ' to ' + Math.max(...pv).toFixed(2)]);
      const V = D.vrun, L = V[V.length - 1], F0 = V[0]; need('sx-vr', [f((L.nice0[1] - F0.nice0[1]) / (L.nice5[1] - F0.nice5[1]), 2)]);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`)); }
  { // the Fair-share stepper is a widget: it never plays by itself
    await p.click('button[data-t=t-fair]'); await wait(300); await p.$eval('#sc-f-card', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
    const t = await p.$eval('#sc-f-ctl-p', e => e.textContent); if (/Pause/.test(t)) problems.push(`${tag}: the Fair-share stepper played by itself`);
    if (width === 1400) { const c = await p.$$eval('#t-fair .s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (c.some(d => d !== 'grid')) problems.push(`${tag}: the stepper tab is not split`) }
    await p.click('button[data-t=t-read]'); await wait(300); }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !r[1].startsWith('step 1 of ')) problems.push(`reduced motion: ${id} moved by itself (${r})`);
    const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`reduced motion: ${id} kept redrawing (flows)`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(r)) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
