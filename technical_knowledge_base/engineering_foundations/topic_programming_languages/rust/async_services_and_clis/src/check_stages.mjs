// The 2026-11-06 rollout checks (adapted 2026-11-07 from the Python concurrency page's check): the three 3D stages and the 2D under-load animation
// play by themselves once scrolled into view, stop redrawing off screen, step to their last step in every mode with one step-list item
// per step, never move under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px;
// the numbers written in the step lists are the recorded data's (window.PA, window.PB). Mid-step screenshots go to the shots folder.
// usage: node src/check_stages.mjs [shots dir]   (needs html_utils' node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = execSync('git rev-parse --show-toplevel', { cwd: here }).toString().trim();
const puppeteer = createRequire(path.join(ROOT, 'html_utils/package.json'))('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-hero', 'stg-trace', 'stg-axum'];
const MODES = { 'stg-trace': ['rs-tr-mode', ['sequential', 'join', 'join_blocking', 'join_offload', 'spawn_blocking_multi']] };
const ANIMS = [['rs-life', 'rs-life-ctl', 'sx-life-', ['rs-life-mode', ['inline', 'offload']]]];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
const problems = [];
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code').forEach(e => e.remove());
      return { bad: (c.textContent.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) {
    const cols = await p.$$eval('.s3sp', xs => xs.map(x => getComputedStyle(x).display));
    if (cols.some(c => c !== 'grid')) problems.push(`${tag}: a split is not two columns`);
  }
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  // flows stop off screen: section 5 has no stage
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rs-s-pkg').getBoundingClientRect().top + scrollY)); await wait(900);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const id of STAGES) {
    const md = MODES[id], modes = md ? md[1] : [null];
    for (const m of modes) {
      if (m) await p.$eval(`#${md[0]} button[data-m="${m}"]`, e => e.click());
      await p.$eval(`#${id}-b`, e => e.click());
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} ${m || ''} has ${n} steps but ${lis} items`);
      for (let k = 1; k < n; k++) {
        await p.$eval(`#${id}-f`, e => e.click()); await wait(60);
        if (k === Math.floor(n / 2) && (!m || m === 'join_blocking')) {
          await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
          const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${m ? '-' + m : ''}-${scheme}-${width}.png` });
        }
      }
      await wait(2000);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m || ''} ended on ${sh}`);
      await audit(`${id} ${m || ''} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, k);
    }
  }
  for (const [card, ctl, lpre, [seg, ms]] of ANIMS) for (const m of ms) {
    await p.$eval(`#${seg} button[data-m="${m}"]`, e => e.click()); const lid = lpre + m;
    await p.$eval(`#${ctl}-b`, e => e.click());
    await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card} ${m} has ${n} steps but list ${lid} has ${lis}`);
    for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1800); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}-${m}-${scheme}-${width}.png` }) } }
    const on = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} ${m} list marks ${on}, not the last step`);
    await audit(card + ' ' + m);
  }
  { // the numbers written into the step lists are the recorded data's
    const r = await p.evaluate(() => { const out = [];
      const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(x => { if (!txt(id).includes(String(x))) out.push(id + ' lacks "' + x + '"') });
      const TR = RS_DATA.trace_rs;
      // the trace: each item names the time of its stretch's last event; the last item is the last event and carries the total
      for (const [m, D] of Object.entries(TR)) { const ol = document.getElementById('sx-tr-' + m), items = [...ol.children];
        items.forEach((li, k) => { const e = +li.dataset.e; if (!li.textContent.includes(D.events[e][2].toFixed(1) + ' ms')) out.push(`sx-tr-${m} item ${k + 1} lacks ${D.events[e][2].toFixed(1)} ms`) });
        if (+items.at(-1).dataset.e !== D.events.length - 1) out.push(`sx-tr-${m} does not end on the last event`);
        if (!ol.textContent.includes('total ' + D.total_ms.toFixed(1) + ' ms')) out.push(`sx-tr-${m} lacks the total ${D.total_ms}`) }
      { const ev = TR.join_blocking.events, a = ev.find(e => e[0] === 'A' && e[1] === 'await'), r = ev.find(e => e[0] === 'A' && e[1] === 'resume');
        need('sx-tr-join_blocking', [Math.round(r[2] - a[2] - 100) + ' ms late']) }
      // the hero: A's move between threads in the 4-worker run, and Experiment B's medians
      { const ev = TR.spawn_blocking_multi.events, s = ev.find(e => e[0] === 'A' && e[1] === 'start'), r = ev.find(e => e[0] === 'A' && e[1] === 'resume');
        need('sx-hero', ['started on ' + s[4], 'resumed on ' + r[4] + ' at ' + r[2].toFixed(1) + ' ms']);
        need('sx-tr-spawn_blocking_multi', ['resumed on ' + r[4], r[2].toFixed(1) + ' ms']) }
      const B = RS_DATA.benchB.runs, med = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 };
      const p50 = m => med(B.filter(r => r.mode === m).map(r => r.p50_ms));
      need('sx-hero', [p50('spawn_blocking').toFixed(2) + ' ms to ' + p50('inline').toFixed(1) + ' ms']);
      // the life figure: one count C = 2 / the inline throughput
      need('sx-life-inline', [(2000 / med(B.filter(r => r.mode === 'inline').map(r => r.bg_rps))).toFixed(1) + ' ms late']);
      // the axum stage: every recorded status
      Object.entries(RS_DATA.svc).forEach(([n, v]) => need('sx-axum', [v.status]));
      // the fan-out caption: the three measured totals
      const F = RS_DATA.fanout; need('rs-fan-card', [(F.seq / 1000).toFixed(3) + ' s', (F.all / 1000).toFixed(3) + ' s', (F.five / 1000).toFixed(3) + ' s']);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`)); }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(r)) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
