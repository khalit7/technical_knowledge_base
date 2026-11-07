// The 2026-11-06 rollout checks (adapted 2026-11-07 from the concurrency sibling's check_stages.mjs): the four 3D stages and the 2D lazy-import
// animation play by themselves once scrolled into view, stop redrawing off screen, step to their last step (the animation in each of its three
// modes) with one step-list item per step, never move under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two
// columns at 1400 px; the numbers written in the step lists are the recorded data's (window.PA, window.PB). Mid-step screenshots go to the shots folder.
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
const STAGES = ['stg-hero', 'stg-eval', 'stg-obj', 'stg-rc'];
const ANIMS = [['ci-lz-card', 'ci-lz-ctl', 'ci-lz-seg', ['cli_eager', 'cli_lazy', 'cli_all']]];
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
    const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
    if (!cols.length || cols.some(c => c !== 'grid')) problems.push(`${tag}: a split is not two columns (${cols})`);
  }
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  // flows stop off screen: the JIT section has no stage
  await p.evaluate(() => window.scrollTo(0, document.getElementById('s5').getBoundingClientRect().top + scrollY)); await wait(900);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const id of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
    const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(60);
      if (k === Math.floor(n / 2)) {
        await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2800);
        const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` });
      }
    }
    await wait(2600);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, k);
  }
  for (const [card, ctl, seg, modes] of ANIMS) {
    for (const m of modes) {
      await p.$eval(`#${seg} button[data-m="${m}"]`, e => e.click()); await wait(80);
      await p.$eval(`#${ctl}-b`, e => e.click());
      await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
      const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lid = 'sx-lz-' + m;
      const lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${card} ${m} has ${n} steps but list ${lid} has ${lis} (or is hidden)`);
      for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
        if (k === Math.floor(n / 2) && m === 'cli_eager') { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(800); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}-${scheme}-${width}.png` }) } }
      const on = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} ${m} list marks ${on}, not the last step`);
      await audit(`${card} ${m}`);
    }
  }
  { // the numbers written into the step lists are the recorded data's
    const r = await p.evaluate(() => { const out = [];
      const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(x => { if (!txt(id).includes(String(x))) out.push(id + ' lacks "' + x + '"') });
      const big = PA.np[PA.np.length - 1], fl = PA.sizes.rows.find(r => r[1] === 'float')[2], sz = r => PA.sizes.rows.find(x => x[0] === r)[2];
      need('sx-hero', [(big[1] / 1000).toFixed(1) + ' ms', (big[3] / 1000).toFixed(1) + ' ms', (big[1] / big[3]).toFixed(1) + ' times faster', fl + ' bytes', (fl + 8) + ' bytes per number']);
      const i0 = PA.dis[0].ins.findIndex(r => r[1] === 'L1:'), loop = PA.dis.map(b => b.ins.slice(i0, i0 + 6).map(r => r[2]));
      if (loop[0].length !== 6 || loop[0][5] !== 'JUMP_BACKWARD') out.push('the loop body is not six instructions ending in JUMP_BACKWARD: ' + loop[0]);
      need('sx-eval', loop[0].filter(x => !x.startsWith('LOAD')).concat(loop[1].filter((x, i) => x !== loop[0][i]), loop[2].filter((x, i) => x !== loop[1][i]), [PA.dis[1].ins[0][2]]));
      need('sx-obj', [sz('1.5') + ' bytes', sz('1') + ' bytes', '(' + sz('1073741824') + ' bytes)', '(' + sz('1152921504606846976') + ')', '(' + sz('1267650600228229401496703205376') + ')']);
      need('sx-rc', PA.rc.filter(l => !l.startsWith('thresholds') && !l.startsWith('gc.collect')).map(l => l.trim()).concat(['found ' + PA.rc.find(l => l.startsWith('gc.collect')).match(/found (\d+)/)[1] + ' unreachable objects']));
      // the lazy-import stretches: each item's time and module count, the totals and the wall times
      const L = PB.lazy, IT = L.importtime, MACH = ['_frozen_importlib_external', 'zipimport', 'encodings', 'encodings.utf_8', '_signal'];
      const G = { cli_eager: [MACH, ['site'], ['argparse'], ['httpx'], ['pydantic', 'rich.console']], cli_lazy: [MACH, ['site'], ['argparse'], ['locale', 'shutil']], cli_all: [MACH, ['site'], ['argparse'], ['re', 'gettext', 'locale', 'shutil']] };
      const wall = { cli_eager: L.hyperfine[0], cli_lazy: L.hyperfine[1], cli_all: L.hyperfine[2] };
      for (const [m, gs] of Object.entries(G)) { const items = [...document.getElementById('sx-lz-' + m).children];
        const named = IT[m].top.map(r => r.name).sort().join(), grouped = gs.flat().sort().join(); if (named !== grouped) out.push(`sx-lz-${m}: the groups do not cover the recorded imports (${named})`);
        gs.forEach((g, i) => { const rs = IT[m].top.filter(r => g.includes(r.name)), ms = rs.reduce((a, r) => a + r.cum_us, 0) / 1000, n = rs.reduce((a, r) => a + r.n_mods, 0);
          const want = ms.toFixed(1) + ' ms, ' + n + ' module' + (n === 1 ? '' : 's'); if (!items[i].textContent.includes(want)) out.push(`sx-lz-${m} item ${i + 1} lacks "${want}"`) });
        const tot = IT[m].top.reduce((a, r) => a + r.cum_us, 0) / 1000, last = items[items.length - 1].textContent;
        [tot.toFixed(1) + ' ms of import time, ' + IT[m].modules + ' modules', Math.round(wall[m].median_ms) + ' ms (median of 30)'].forEach(x => { if (!last.includes(x)) out.push(`sx-lz-${m} last item lacks "${x}"`) });
        if (items.length !== gs.length + 1) out.push(`sx-lz-${m} has ${items.length} items for ${gs.length + 1} steps`) }
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
    const r = await p.$eval(`#${ctl}-p`, e => e.textContent), v = await p.$eval(`#${ctl}-s`, e => +e.value); if (/Pause/.test(r) || v !== 0) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
