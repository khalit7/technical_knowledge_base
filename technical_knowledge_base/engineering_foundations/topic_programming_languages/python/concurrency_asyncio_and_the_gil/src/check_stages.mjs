// The 2026-11-06 rollout checks (adapted 2026-11-07 from the JavaScript event-loop page): the two 3D stages and the 2D lanes animation
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
const STAGES = ['stg-hero', 'stg-loop'];
const MODES = { 'stg-loop': ['cg-loop-mode', ['sequential', 'gathered', 'gathered_blocking', 'gathered_thread']] };
const ANIMS = [['cg-ft-card', 'cg-ft-ctl', 'sx-ft']];
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
  await p.evaluate(() => window.scrollTo(0, document.getElementById('s5').getBoundingClientRect().top + scrollY)); await wait(900);
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
        if (k === Math.floor(n / 2) && (!m || m === 'gathered_blocking')) {
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
  for (const [card, ctl, lid] of ANIMS) {
    await p.$eval(`#${ctl}-b`, e => e.click());
    await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card} has ${n} steps but list ${lid} has ${lis}`);
    for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2200); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}-${scheme}-${width}.png` }) } }
    const on = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} list marks ${on}, not the last step`);
    await audit(card);
  }
  { // the numbers written into the step lists are the recorded data's
    const r = await p.evaluate(() => { const out = [];
      const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(x => { if (!txt(id).includes(String(x))) out.push(id + ' lacks "' + x + '"') });
      // the loop: each item names the time of its stretch's last event, the last item is the last event and carries the total
      for (const [m, D] of Object.entries(PA.loop)) { const ol = document.getElementById('sx-loop-' + m), items = [...ol.children];
        items.forEach((li, k) => { const e = +li.dataset.e; if (!li.textContent.includes(D.events[e][2].toFixed(1) + ' ms')) out.push(`sx-loop-${m} item ${k + 1} lacks ${D.events[e][2].toFixed(1)} ms`) });
        if (+items.at(-1).dataset.e !== D.events.length - 1) out.push(`sx-loop-${m} does not end on the last event`);
        if (!ol.textContent.includes('total ' + D.total_ms.toFixed(1) + ' ms')) out.push(`sx-loop-${m} lacks the total ${D.total_ms}`) }
      { const ev = PA.loop.gathered_blocking.events, a = ev.find(e => e[0] === 'A' && e[1] === 'await'), r = ev.find(e => e[0] === 'A' && e[1] === 'resume');
        need('sx-loop-gathered_blocking', [Math.round(r[2] - a[2] - 100) + ' ms late']) }
      // the hero: the k1 and subinterpreter numbers
      const k = (b, kind, how) => PA.k1[b].find(x => x[0] === kind && x[1] === how)[2], I = PB.interp.PY314.startup_ms;
      need('sx-hero', [k('gil', 'CPU', 'serial').toFixed(2) + ' s serially', k('gil', 'CPU', '4 threads').toFixed(2) + ' s on four threads', k('gil', 'I/O', 'serial').toFixed(2) + ' s one after another',
        Math.round(k('gil', 'I/O', '4 threads') * 1000) + ' ms on four threads', 'took ' + k('gil', 'CPU', '4 processes').toFixed(2) + ' s', I.process_spawn.toFixed(1) + ' ms', I.subinterpreter + ' ms', I.thread + ' ms',
        k('ft', 'CPU', 'serial').toFixed(2) + ' s serially to ' + k('ft', 'CPU', '4 threads').toFixed(2) + ' s', (PB.ft.PY314.switch_interval_s * 1000) + ' ms']);
      // the lanes: per build, the finish, one thread's median, the speed-up and the per-block slowdown
      ['PY314', 'PY314T', 'PY315', 'PY315T'].forEach((key, i) => { const f = PB.ft[key], end = Math.max(...f.trace4.map(l => l[l.length - 1][1])), one = f.scale['1'].median_s * 1000;
        let s = 0, n = 0; f.trace4.forEach(l => l.forEach(c => { s += c[1] - c[0]; n++ }));
        const li = document.getElementById('sx-ft').children[i].textContent;
        [end.toFixed(0) + ' ms', one.toFixed(0) + ' ms', (one / end).toFixed(1) + 'x', (s / n / (one / f.lines * 1000)).toFixed(1) + ' times'].forEach(x => { if (!li.includes(x)) out.push(`sx-ft item ${i + 1} lacks ${x}`) }) });
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
