// The 2026-11-06 rollout checks for Queues, streams and async work: the six 3D stages and the batch-job animation play by themselves once
// scrolled into view, step to their last step (the outbox stage in all three modes) with one step-list item per step, stop redrawing off screen
// and never move under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px.
// Every number written into the step lists is checked against what the scenes compute from the measured lab (window.LABDATA), the Queue lab's
// simulator (window.QSIM, via window.QSN) and Kafka's partitioner (window.KMURMUR); the simulator itself is checked against Python by check_sim.mjs.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/queues_streams_and_async_work/src/check_stages.mjs [shots dir] [--all]
//   --all also screenshots every step of every stage (for looking at labels).
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const args = process.argv.slice(2), ALL = args.includes('--all');
const file = 'file://' + path.resolve(here, '../index.html'), shots = args.find(a => !a.startsWith('--')) || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = { 'stg-hero': 'sx-hero', 'stg-ql': 'sx-ql', 'stg-kafka': 'sx-kafka', 'stg-sem': 'sx-sem', 'stg-vt': 'sx-vt', 'stg-ob': 'sx-ob-naive' };
const OB_MODES = ['naive', 'first', 'outbox'];
const ANIMS = [['rd-bj-card', 'rd-bj-ctl', 'sx-bj']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code,.code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // autoplay on view: a stage's data-frames rises; a 2D animation's play button reads Pause
  for (const id of Object.keys(STAGES)) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => { const d = document.getElementById('s-ref'); window.scrollTo(0, d.getBoundingClientRect().top + scrollY) }); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every stage to its last step; list length; screenshots mid-way (during a transition and settled) and at the end
  const runStage = async (id, lid, sfx) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id}${sfx} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300);
    if (ALL && (width === 1400 || width === 390)) { await wait(1500); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-s1-${scheme}-${width}.png` }); }
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click());
      if (ALL && (width === 1400 || width === 390)) { await wait(id === 'stg-vt' ? 1300 : 700); let el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}tw-${scheme}-${width}.png` });
        await wait(id === 'stg-vt' ? 2400 : 1500); el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}-${scheme}-${width}.png` }) }
      else if (k === Math.floor(n / 2)) { await wait(650); let el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-tween${k}-${scheme}-${width}.png` });
        await wait(id === 'stg-vt' ? 2800 : 1400); el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-mid${k}-${scheme}-${width}.png` }) } else await wait(120);
    }
    await wait(id === 'stg-vt' ? 3200 : 2000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${sfx} ended on ${sh}`);
    if (width === 1400 || width === 390) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-last-${scheme}-${width}.png` }) }
    await audit(`${id}${sfx} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
  };
  for (const [id, lid] of Object.entries(STAGES)) if (id !== 'stg-ob') await runStage(id, lid, '');
  for (const m of OB_MODES) {
    await p.$eval(`#rd-ob-seg [data-m="${m}"]`, e => e.click()); await wait(150);
    const shown = await p.$$eval('ol.sx[id^="sx-ob-"]:not([hidden])', xs => xs.map(x => x.id)); if (shown.length !== 1 || shown[0] !== 'sx-ob-' + m) problems.push(`${tag}: outbox mode ${m} shows lists ${shown}`);
    const want = await p.evaluate(m => window.QS_OB.n[m], m); const lis = await p.$eval('#sx-ob-' + m, e => e.children.length);
    if (want !== lis) problems.push(`${tag}: outbox mode ${m} has ${want} snapshots but ${lis} list items`);
    await runStage('stg-ob', 'sx-ob-' + m, '-' + m);
  }
  for (const [card, ctl, lid] of ANIMS) {
    await p.$eval(`#${ctl}-b`, e => e.click());
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card} has ${n} steps but list ${lid} shows ${lis}`);
    for (let k = 1; k < n; k++) await p.$eval(`#${ctl}-f`, e => e.click());
    const at = await p.$eval(`#${ctl}-s`, e => +e.value); if (at !== n - 1) problems.push(`${tag}: ${card} ended on step ${at + 1}`);
    const on = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} list marks item ${on + 1}`);
    if (width === 1400 || width === 390) { const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}-last-${scheme}-${width}.png` }) }
    await audit(`${card} last step`);
  }
  if (width === 1400) { // the step lists' numbers are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
      const H = QSN.hero, K = QSN.kafka, M = QSN.sem, V = QSN.vt, D = LABDATA;
      need('sx-hero', [[1, H.lostMin + ' to ' + H.lostMax + ' events per 500'], [4, fmt(H.effMin) + ' to ' + fmt(H.effMax)], [4, 'exactly ' + fmt(H.idem[0])], [5, fmt(H.cap, 1) + ' a second'], [5, fmt(H.healthyAge, 1) + ' s'],
        [5, H.overDepth + ' messages'], [5, 'oldest ' + fmt(H.overAge) + ' s'], [5, '&rho; = '.replace('&rho;', 'ρ') + H.rho]]);
      if (H.idem.some(v => v !== 1000)) out.push('the idempotent receiver no longer gives exactly 1,000 effects');
      need('sx-kafka', [[0, 'user-8 to P' + K.part['user-8']], [0, 'user-4 to P' + K.part['user-4']], [0, 'user-1 and user-6 both to P' + K.part['user-1']], [1, 'holds ' + K.lens[2] + ' of the 12']]);
      if (K.part['user-1'] !== K.part['user-6']) out.push('user-1 and user-6 no longer share a partition');
      const j = a => a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
      need('sx-sem', [[5, 'lost ' + j(M.lost) + ' receipts'], [5, j(M.dup) + ' customers got two'], [5, M.idup.every(v => v === 0) ? '0 duplicates' : '?'], [5, 'the ' + j(M.hit) + ' repeats caught'], [5, M.sim.toFixed(1) + ' duplicates over 20 seeds']]);
      const pg = [...document.querySelectorAll('#s-sem ~ * p, #t-read p')].map(x => x.textContent).join(' ');
      if (!pg.includes(M.sim.toFixed(1) + ' duplicates (range ' + M.simMin + ' to ' + M.simMax + ')')) out.push('the expected-count paragraph no longer matches the simulator over 20 seeds');
      need('sx-vt', [[4, fmt(V.poisonRedel) + ' redeliveries'], [4, fmt(V.poisonAge) + ' s old'], [5, V.dlq + ' messages dead-lettered'], [5, 'down to ' + V.dlqRedel], [5, fmt(V.dlqAge, 1) + ' s old']]);
      const ob = D.outbox, by = m => ob.filter(r => r.mode === m), mm = a => Math.min(...a) + ' to ' + Math.max(...a);
      need('sx-ob-naive', [[4, j(by('naive').map(r => r.lost_events)) + ' events']]);
      need('sx-ob-first', [[4, j(by('naive_publish_first').map(r => r.phantom_events)) + ' phantom']]);
      const dups = m => by(m).map(r => r.duplicate_events);
      need('sx-ob-outbox', [[6, mm(dups('outbox_batch1')) + ' duplicates per 500 orders with one event'], [6, mm(dups('outbox')) + ' with batches of 10'],
        [6, by('outbox').concat(by('outbox_batch1')).every(r => r.lost_events === 0) ? '0 events lost' : '?']]);
      QS_BJ.forEach((s, k) => { const n = t => t.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, x => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>' })[x] || x).replace(/\s+/g, ' ').trim();
        if (n(li('sx-bj', k)) !== n(s.t + '. ' + s.c)) out.push(`sx-bj item ${k + 1} differs from the stepper's data`) });
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const id of Object.keys(STAGES)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-s`, e => +e.value), t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (r !== 0 || /Pause/.test(t)) problems.push(`reduced motion: ${card} moved by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
