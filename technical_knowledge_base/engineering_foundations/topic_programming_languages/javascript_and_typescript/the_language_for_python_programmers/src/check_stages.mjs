// The 2026-11-06 rollout checks (adapted 2026-11-07 from the event-loop sibling's check_stages.mjs): every 3D stage and the V8 stepper play by
// themselves once scrolled into view, stop redrawing off screen, step to their last step with one step-list item per step, and never move under
// reduced motion; no errors, NaN, undefined (outside code, outputs and the step lists' quoted values) or sideways scroll; the splits are two
// columns at 1400 px; and every value the step lists quote (the spans .jl-v) is the one the recorded run printed (window.JL.out).
// Screenshots of each stage at a mid step go to the shots folder.
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
const STAGES = ['stg-hero', 'stg-copy', 'stg-clo', 'stg-proto'];
const ANIMS = [['jl-v8-card', 'jl-v8-ctl', 'sx-v8']];
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
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code,.jl-v,dd').forEach(e => e.remove());
      return { bad: (c.textContent.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) {
    for (const t of ['t-read', 't-play']) {
      await p.click(`button[data-t=${t}]`); await wait(200);
      const cols = await p.$$eval(`#${t} .s3sp`, xs => xs.map(x => getComputedStyle(x).display));
      if (!cols.length || cols.some(c => c !== 'grid')) problems.push(`${tag}: a split in ${t} is not two columns (${cols})`);
    }
    await p.click('button[data-t=t-read]'); await wait(200);
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
  // flows stop off screen: no stage redraws while all are out of view (section 6 has none)
  await p.evaluate(() => window.scrollTo(0, document.getElementById('s6').getBoundingClientRect().top + scrollY)); await wait(900);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every stage to its last step; list length; a screenshot at a mid step (and of every step at 1400 px light, for review)
  for (const id of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
    const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(60);
      if (k === Math.floor(n / 2) || process.env.ALLSTEPS) {
        await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
        const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${process.env.ALLSTEPS ? '-s' + (k + 1) : ''}-${scheme}-${width}.png` });
      }
    }
    await wait(2200);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, k);
  }
  for (const [card, ctl, lid] of ANIMS) {
    await p.$eval(`#${ctl}-b`, e => e.click());
    await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card} has ${n} steps but list ${lid} shows ${lis}`);
    for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(700); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}-${scheme}-${width}.png` }) } }
    const on = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} list marks ${on}, not the last step`);
    await audit(card);
  }
  { // the values quoted in the step lists are the recorded runs' (JL.out)
    const r = await p.evaluate(() => { const out = [], O = window.JL.out, ln = (n, i) => O[n].split('\n')[i];
      const e1 = ln('e1_classes', 0).split(' '), e1b = ln('e1_classes', 1), d2 = ln('d2_closures', 1).match(/\[[^\]]*\]/g), e2 = ln('e2_prototype', 1).split(' ');
      const want = { keys: (e1b.match(/\[([^\]]*)\]/) || ['', ''])[1].replace(/'/g, '').trim(), total: e1[2], miss: e1b.split('] ')[1].split(' ')[0], n: ln('d2_closures', 0).split(' ')[0],
        len: ln('c4_copy', 0), nn: ln('d2_closures', 0), var: d2[0], let: d2[1], l0: ln('e2_prototype', 0), own: e2[0], notown: e2[1], in: e2[2],
        greet: ln('e2_prototype', 2).replace(/ \[\]$/, ''), patch: ln('e2_prototype', 3) };
      const seen = new Set();
      document.querySelectorAll('.jl-v').forEach(s => { const k = s.dataset.v; seen.add(k); if (!(k in want)) out.push('unknown value ' + k); else if (s.textContent !== want[k]) out.push(`${k}: page says "${s.textContent}", the run printed "${want[k]}"`) });
      Object.keys(want).forEach(k => { if (!seen.has(k)) out.push('no step quotes ' + k) });
      if (!/\[\]$/.test(ln('e2_prototype', 2))) out.push('Object.keys(child) was not [] in the run');
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
