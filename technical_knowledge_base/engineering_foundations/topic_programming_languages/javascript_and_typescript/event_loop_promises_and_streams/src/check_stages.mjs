// The 2026-11-06 rollout checks (adapted 2026-11-07 from Concurrency on the OS topic): every 3D stage and every 2D animation plays by itself once
// scrolled into view, stops redrawing off screen, steps to its last step in every mode with one step-list item per step, never moves under
// reduced motion; no errors, NaN, undefined or sideways scroll; the split layout is two columns at 1400 px; the numbers written in the step lists
// are the recorded data's (window.EL). Screenshots of each stage and animation at a mid step go to the shots folder.
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
const STAGES = ['stg-hero', 'stg-loop', 'stg-bp'];
const MODES = { 'stg-loop': ['el-lp-mode', ['l1_basic.mjs', 'l2_await.mjs', 'l3_chain.mjs', 'l4_node.mjs', 'l5_top.cjs', 'l5_top.mjs']], 'stg-bp': ['el-bp-mode', ['pipeline', 'ignore']] };
// [card, controls, {mode: step list id}, mode chips]
const ANIMS = [['el-tl-card', 'el-tl-ctl', { sequential: 'sx-tl-sequential', all: 'sx-tl-all', all_blocking: 'sx-tl-all_blocking', all_worker: 'sx-tl-all_worker' }, 'el-tl-mode'],
  ['el-sse-card', 'el-sse-ctl', { naive: 'sx-sse-naive', good: 'sx-sse-good' }, 'el-sse-mode']];
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
  // autoplay on view
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  // flows stop off screen: no stage redraws while all are out of view (section 4 has none)
  await p.evaluate(() => window.scrollTo(0, document.getElementById('s4').getBoundingClientRect().top + scrollY)); await wait(900);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every stage to its last step in every mode; list length; a screenshot at a mid step
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
        if (k === Math.floor(n / 2) && (!m || m === modes[0] || m === 'l4_node.mjs' || m === 'ignore')) {
          await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(3000);
          const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${m ? '-' + m.replace(/\W+/g, '_') : ''}-${scheme}-${width}.png` });
        }
      }
      await wait(3000);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m || ''} ended on ${sh}`);
      await audit(`${id} ${m || ''} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, k);
    }
  }
  for (const [card, ctl, lists, seg] of ANIMS) {
    for (const [m, lid] of Object.entries(lists)) {
      await p.$eval(`#${seg} button[data-m="${m}"]`, e => e.click()); await wait(100);
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
  { // the numbers written into the step lists are the recorded data's
    const r = await p.evaluate(() => { const out = [], E = window.EL;
      const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(x => { if (!txt(id).includes(String(x))) out.push(id + ' lacks "' + x + '"') });
      // timeline: each item's time is the time of the last event it reaches (or of the first event of its stretch), and the total is the recording's
      for (const [m, D] of Object.entries(E.tl)) { const ol = document.getElementById('sx-tl-' + m), items = [...ol.children];
        items.forEach((li, k) => { const e = +li.dataset.e, s = k ? +items[k - 1].dataset.e + 1 : 0, t = li.textContent;
          const ok = [D.events[e][2], D.events[s][2]].some(v => t.includes(v.toFixed(1) + ' ms') || t.includes(v.toFixed(0) + ' ms') || (v === 0 && t.includes('0 ms')));
          if (!ok) out.push(`sx-tl-${m} item ${k + 1} has neither ${D.events[s][2]} nor ${D.events[e][2]} ms`) });
        if (items.at(-1).dataset.e != D.events.length - 1) out.push(`sx-tl-${m} does not end on the last event`);
        if (!ol.textContent.includes(D.total_ms.toFixed(1))) out.push(`sx-tl-${m} lacks the total ${D.total_ms}`) }
      // backpressure: the stretch ends, the totals, the peaks and the number of false returns
      const B = E.bp, KB = 1024;
      for (const m of ['pipeline', 'ignore']) { const ev = B[m].events, items = [...document.getElementById('sx-bp-' + m).children];
        if (+items.at(-1).dataset.e !== ev.length - 1) out.push(`sx-bp-${m} does not end on the last event`) }
      const lastDone = m => B[m].events.filter(e => e[0] === 'done').at(-1)[2];
      need('sx-bp-pipeline', [lastDone('pipeline') + ' ms', B.pipeline.peak_kib + ' KiB', B.hwm_kib + ' KiB', B.slow_ms + ' ms']);
      need('sx-bp-ignore', [lastDone('ignore') + ' ms', lastDone('pipeline') + ' ms', B.ignore.peak_kib + ' KiB', B.pipeline.peak_kib + ' KiB', B.ignore.events.filter(e => e[0] === 'push' && e[7] === false).length + ' times', B.n + ' chunks']);
      const pe = B.pipeline.events; [[1, true], [2, false]].forEach(([i, ok]) => { if (pe[i][0] !== 'push' || pe[i][7] !== ok) out.push('pipeline push ' + i + ' is not ' + ok) });
      if (Math.max(...pe.map(e => e[3] + e[4] + e[5] + e[6])) / KB !== B.pipeline.peak_kib) out.push('pipeline peak');
      // SSE: 9 chunks, 158 bytes, the recorded tokens and the number of errors
      need('sx-sse-naive', [new TextEncoder().encode(E.sse.body).length + ' bytes', E.sse.naiveErrors.length + ' parse errors', E.sse.good.length + ' tokens']);
      need('sx-sse-good', [E.sse.good.join('')]);
      if (E.sse.lens.length !== document.getElementById('sx-sse-naive').children.length) out.push('SSE: not one item per chunk');
      // hero: program 1's recorded order
      need('sx-hero', [E.loops['l1_basic.mjs'].out.join(' ')]);
      if (!/: yes/.test(document.getElementById('el-lp-check').textContent)) out.push('stepped output differs from the recording');
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
