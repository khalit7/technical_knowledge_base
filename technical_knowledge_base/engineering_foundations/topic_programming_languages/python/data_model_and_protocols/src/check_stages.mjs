// The 2026-11-06 rollout checks (adapted 2026-11-07 from the concurrency sibling): the four 3D stages and the two 2D steppers
// play by themselves once scrolled into view, stop redrawing off screen, step to their last step in every mode with one step-list item
// per step, never move under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px;
// every logged line, printed line and count the step lists quote is the recorded data's (window.PA). Mid-step screenshots go to the shots folder.
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
const STAGES = ['stg-hero', 'stg-pipe', 'stg-mro', 'stg-look'];
const MODES = { 'stg-pipe': ['dm-pipe-mode', ['eager', 'lazy']] };
// [card, controls, list, mode buttons, modes and their lists]
const ANIMS = [['dm-ex-card', 'dm-ex-ctl', () => 'sx-ex', null, [null]], ['dm-names-card', 'dm-names-ctl', m => 'sx-names-' + m, 'dm-names-mode', ['shallow', 'deep']]];
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
    const narrow = await p.$$eval('.s3sp', xs => xs.filter(x => x.parentElement.closest('.s3sp') || x.querySelector('.s3R').clientWidth < 500).length);
    if (narrow) problems.push(`${tag}: ${narrow} split(s) nested or with a narrow visual column`);
  }
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  // flows stop off screen: section 4 has no stage
  await p.evaluate(() => window.scrollTo(0, document.getElementById('s4').getBoundingClientRect().top + scrollY + 200)); await wait(900);
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
        if (k === Math.floor(n / 2)) {
          await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600);
          const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${m ? '-' + m : ''}-${scheme}-${width}.png` });
        }
      }
      await wait(2400);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m || ''} ended on ${sh}`);
      if (width === 1400) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${m ? '-' + m : ''}-last-${scheme}-${width}.png` }) }
      await audit(`${id} ${m || ''} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, k);
    }
  }
  for (const [card, ctl, lid, modeEl, modes] of ANIMS) {
    for (const m of modes) {
      if (m) await p.$eval(`#${modeEl} button[data-m="${m}"]`, e => e.click());
      await p.$eval(`#${ctl}-b`, e => e.click());
      await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
      const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid(m), e => e.children.length);
      if (lis !== n) problems.push(`${tag}: ${card} ${m || ''} has ${n} steps but list ${lid(m)} has ${lis}`);
      for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
        if (k === Math.floor(n / 2)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(600); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}${m ? '-' + m : ''}-${scheme}-${width}.png` }) } }
      const on = await p.$eval('#' + lid(m), e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} ${m || ''} list marks ${on}, not the last step`);
      await audit(card);
    }
  }
  // every explorer scenario: one list item per step, and it reaches its rule
  { const r = await p.evaluate(() => { const out = [], bs = [...document.querySelectorAll('#dm-ex-pick button[data-k]')];
      bs.forEach(b => { b.click(); const n = +document.getElementById('dm-ex-ctl-s').max + 1, lis = document.getElementById('sx-ex').children.length, logs = document.getElementById('dm-ex-steps').children.length;
        if (n !== lis || n !== logs) out.push(`${b.dataset.k}: ${n} steps, ${lis} items, ${logs} log rows`);
        const s = document.getElementById('dm-ex-ctl-s'); s.value = n - 1; s.dispatchEvent(new Event('input'));
        if (!document.getElementById('dm-ex-rule').textContent.startsWith('Rule')) out.push(`${b.dataset.k}: no rule at the last step`) });
      bs[0].click(); return out });
    r.forEach(x => problems.push(`${tag}: explorer ${x}`)); }
  { // the step lists quote the recorded data
    const r = await p.evaluate(() => { const out = [], D = PA.dm, res = k => D[k][D[k].length - 1].replace(/^result: /, '');
      const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(x => { if (!txt(id).includes(String(x))) out.push(id + ' lacks "' + x + '"') });
      need('sx-hero', [D.add_reflected[0], res('add_reflected'), D.eq_fallback[0], res('eq_fallback'), res('iter_getitem'), D.attr_getattr[0].replace('normal lookup failed: ', ''), res('attr_getattr'), res('with_swallow'),
        D.iter_getitem.filter(l => /^call/.test(l)).map(l => l.match(/\((\d+)\)/)[1]).join(', ').replace(/, (\d+)$/, ' and $1')]);
      need('sx-look', [D.attr_data[0], res('attr_data'), res('attr_instance'), res('attr_class'), D.attr_getattr[0].replace('normal lookup failed: ', ''), res('attr_getattr')]);
      const c4 = PA.out.c4_descriptor.split('\n');
      need('sx-look', [c4[0].match(/\{.*\}/)[0], c4[1].replace('ValueError: ', ''), c4[2], c4[3]]);
      const c1 = PA.out.c1_mro.split('\n');
      need('sx-mro', [c1[0], c1[5], c1[8], ...c1.slice(1, 5), ...c1.slice(6, 8)]);
      // the pipeline: each item quotes the printed lines of its stretch (data-n), and the eager "held" counts follow from them
      for (const m of ['eager', 'lazy']) { const ev = PA.lazy[m], items = [...document.getElementById('sx-pipe-' + m).children];
        if (+items.at(-1).dataset.n !== ev.length) out.push(`sx-pipe-${m} does not end on the last printed line`);
        items.forEach((li, k) => { const n0 = k ? +items[k - 1].dataset.n : 0, n1 = +li.dataset.n, t = li.textContent.replace(/\s+/g, ' ');
          ev.slice(n0, n1).forEach(([s, v]) => { if (!t.includes(s + ' ' + v)) out.push(`sx-pipe-${m} item ${k + 1} lacks "${s} ${v}"`) });
          if (m === 'eager' && n1 > n0) { const upto = ev.slice(0, n1), c = s => upto.filter(x => x[0] === s && x[1] !== 'skip').length, counting = c('count') > 0;
            const held = (counting ? 0 : c('read')) + c('parse') + (counting ? c('count') : 0); if (!t.includes('Held: ' + held + ' items')) out.push(`sx-pipe-eager item ${k + 1} lacks Held: ${held}`) } });
        const total = ev.filter(x => x[0] === 'count').reduce((a, x) => a + +x[1].split(' ')[1], 0); if (!items.at(-1).textContent.includes('total ' + total)) out.push(`sx-pipe-${m} lacks total ${total}`) }
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
    const r = await p.$eval(`#${ctl}-p`, e => e.textContent), s = await p.$eval(`#${ctl}-s`, e => +e.value); if (/Pause/.test(r) || s !== 0) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
