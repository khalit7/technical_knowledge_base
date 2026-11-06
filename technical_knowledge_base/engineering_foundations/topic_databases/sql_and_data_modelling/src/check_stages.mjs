// The 2026-11-06 rollout checks: every 3D stage and every 2D animation plays by itself once scrolled into view, steps to its last step,
// has one step-list item per step, never moves under reduced motion; no errors, NaN, undefined or sideways scroll; split layout at 1400 px.
// usage (from the repo root or src/): node src/check_stages.mjs [shots dir]   (needs html_utils' node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
// (SQL and data modelling: adapted from Query planning and performance; six stages and two 2D animations; the scenes' numbers are checked against the page's data and the step lists)
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
const STAGES = ['stg-hero', 'stg-join', 'stg-grp', 'stg-win', 'stg-norm', 'stg-ec'];
// [card, controls, {mode: step list}, mode buttons, data attribute]
const ANIMS = [['rd-rec-card', 'rd-rec-ctl', { walk: 'sx-rec' }, null, null], ['rd-q-card', 'rd-q-ctl', { long: 'sx-q-long', timeout: 'sx-q-timeout', quick: 'sx-q-quick' }, 'rd-q-mode', 'm']];
const MODES = {};
const WIDGETS = [];
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
    const r = await p.evaluate(() => ({ bad: (document.getElementById('t-read').innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }));
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) { // two columns where a section has a visual
    const cols = await p.$$eval('.s3sp', xs => xs.map(x => getComputedStyle(x).display));
    if (cols.some(c => c !== 'grid')) problems.push(`${tag}: a split is not two columns`);
  }
  // autoplay on view
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  // widgets never play by itself
  for (const [card, ctl, tab] of WIDGETS) {
    await p.click(`#tabs button[data-t="${tab}"]`); await wait(300);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(t)) problems.push(`${tag}: widget ${card} played by itself`);
    if (width === 1400) { const c = await p.$$eval(`#${tab} .s3sp`, xs => xs.map(x => getComputedStyle(x).display)); if (c.some(d => d !== 'grid')) problems.push(`${tag}: ${tab} split not two columns`); }
    await p.screenshot({ path: `${shots}/x-tab-${tab}-${scheme}-${width}.png` });
  }
  await p.click('#tabs button[data-t="t-read"]'); await wait(300);
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-s13').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its last step, in every mode; list length; screenshot mid-way
  for (const id of STAGES) {
    const md = MODES[id], modes = md ? md[2] : [null];
    for (const m of modes) {
      if (m) await p.$eval(`#${md[0]} button[data-${md[1]}="${m}"]`, e => e.click());
      await p.$eval(`#${id}-b`, e => e.click()); // a control: stops autoplay
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
      for (let k = 1; k < n; k++) {
        await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
        if (k === Math.floor(n / 2) && (!m || m === modes[modes.length - 1])) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2800); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` }) }
      }
      await wait(2800);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m || ''} ended on ${sh}`);
      await audit(`${id} ${m || ''} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, k);
    }
  }
  for (const [card, ctl, lists, seg, at] of ANIMS) {
    for (const [m, lid] of Object.entries(lists)) {
      if (seg) { await p.$eval(`#${seg} button[data-${at}="${m}"]`, e => e.click()); await wait(100); }
      await p.$eval(`#${ctl}-b`, e => e.click());
      await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
      const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${card} ${m} has ${n} steps but list ${lid} shows ${lis}`);
      for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
        if (k === Math.floor(n / 2)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}-${m}-${scheme}-${width}.png` }) } }
      const on = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} ${m} list marks ${on}, not the last step`);
      await audit(`${card} ${m}`);
    }
  }
  { const r = await p.evaluate(() => { const out = [], C = window.CHK; if (!C || !C.hero || !C.join || !C.grp || !C.norm || !C.ec || !C.rec || !C.queue) return ['no CHK'];
      const eq = (n, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) out.push(n + ' ' + JSON.stringify(a) + ' expected ' + JSON.stringify(b)) };
      const H = C.hero; eq('hero users', H.users, 50); eq('hero chats', H.chats, 200); eq('hero pairs', H.pairs, 10000); eq('hero on', H.on, 200); eq('hero kept', H.kept, 90); eq('hero groups', H.groups, [['free', 47], ['pro', 37], ['team', 6]]);
      eq('join counts', C.join.count, [15, 3, 5, 4, 6, 3, 2, 1, 0]); eq('anti with a NULL market', C.join.anti_null, 2);
      eq('group sums', C.grp.groups, [{ role: 'user', n: 8, sum: 477 }, { role: 'assistant', n: 8, sum: 3826 }]); eq('user running', C.grp.run[0], [103, 204, 223, 239, 283, 310, 400, 477]);
      eq('norm', [C.norm.N, C.norm.K, C.norm.BUG, C.norm.chats, C.norm.lonely], [59, 5, 22, 7, 6]); eq('ec steps', C.ec.steps, 7);
      eq('rec', [C.rec.n, C.rec.ids[0], C.rec.ids[1], C.rec.ids[2], C.rec.ids[14], C.rec.ids[15], C.rec.stretches], [16, 1682, 1681, 1680, 1667, 1665, 5]); eq('queue stretches', C.queue, { long: 4, timeout: 5, quick: 3 });
      eq('window sum', [RD_WIN.vals.sum[0], RD_WIN.vals.sum[1], RD_WIN.vals.sum[2], RD_WIN.vals.sum[15]], [103, 548, 649, 4303]); eq('window avg3', [RD_WIN.vals.avg3[1], RD_WIN.vals.avg3[2], RD_WIN.vals.avg3[15]], [274, 216.3, 261]);
      // the step lists quote the scenes' and the animations' numbers
      const txt = id => document.getElementById(id).textContent, has = (id, s) => { if (!txt(id).includes(s)) out.push(id + ' lacks ' + s) };
      [['sx-hero', '10,000'], ['sx-hero', '200 dots'], ['sx-hero', 'keeps 90'], ['sx-hero', '110'], ['sx-hero', 'free 47, pro 37, team 6'], ['sx-hero', 'user 999'],
       ['sx-join', '15 rows'], ['sx-join', '3 rows'], ['sx-join', '5 rows'], ['sx-join', '4 rows'], ['sx-join', '6 rows'], ['sx-join', '2 rows'], ['sx-join', '1 row'], ['sx-join', '0 rows'],
       ['sx-grp', '477'], ['sx-grp', '3,826'], ['sx-grp', '103, 204, 223'], ['sx-win', '103, 548, 649'], ['sx-win', '4,303'], ['sx-win', '274.0, 216.3'], ['sx-win', '261.0'], ['sx-win', '338'],
       ['sx-norm', '59'], ['sx-norm', '54'], ['sx-norm', 'chat 22'], ['sx-norm', 'Six of the 50'], ['sx-rec', '1682'], ['sx-rec', '1681'], ['sx-rec', '1667'], ['sx-rec', '1665'], ['sx-rec', '16 rows'],
       ['sx-q-long', '3.26 s'], ['sx-q-timeout', '0.27 s'], ['sx-q-timeout', '0.26 s']].forEach(([i, s]) => has(i, s));
      const Q = SM_DATA.queue.scenarios; eq('queue max long', Q.long.summary.max_read_wait.toFixed(2), '3.26'); eq('queue max timeout', Q.timeout.summary.max_read_wait.toFixed(2), '0.27');
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
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || r[1] !== 'step 1 of ' + r[1].split(' of ')[1]) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(r)) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
