// The 2026-11-06 rollout checks: every 3D stage and every 2D animation plays by itself once scrolled into view, steps to its last step,
// has one step-list item per step, never moves under reduced motion; no errors, NaN, undefined or sideways scroll; split layout at 1400 px.
// usage (from the repo root or src/): node src/check_stages.mjs [shots dir]   (needs html_utils' node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
// (Scaling a database: adapted from Caching; six stages, no 2D animations (the toggles and sliders are widgets); the step lists' numbers are checked against window.SC)
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
const STAGES = ['stg-hero', 'stg-ryw', 'stg-fan', 'stg-2pc', 'stg-rebal', 'stg-rg'];
// [card, controls, {mode: step list}, mode buttons, data attribute]
const ANIMS = [];
const MODES = { 'stg-ryw': ['rwM', 'm', ['naive', 'sticky', 'lsn']] };
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
  { // the numbers written into the step lists are the data's
    const r = await p.evaluate(() => { const out = [], S = window.SC, C = S.citus, RB = C.rebalance, D = S.crdb;
      const f = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
      const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(x => { if (!txt(id).includes(x)) out.push(id + ' lacks "' + x + '"') });
      const per = {}; C.shardPort.forEach(p => per[p] = (per[p] || 0) + 1); const cnt = Object.keys(per).sort().map(p => per[p]);
      need('sx-fan', [f(C.point.chat_list.big.p50, 2) + ' ms', f(Math.round(C.heavy.mention.big.ms), 0) + ' ms', f(C.point.chat_list.citus.p50, 2) + ' ms', f(Math.round(C.heavy.mention.citus.ms), 0) + ' ms', C.hits + ' matches', 'final ' + C.hits, cnt[0] + ', ' + cnt[1] + ' and ' + cnt[2] + ' shards', '32 shards on 3 workers']);
      const b = Object.keys(RB.per_node_before).sort().map(p => RB.per_node_before[p]), a = Object.keys(RB.per_node_after).sort().map(p => RB.per_node_after[p]);
      need('sx-rebal', [b[0] + ', ' + b[1] + ' and ' + b[2] + ' shard groups', 'copies ' + RB.moved_shards_messages + ' groups', (b[0] - a[0]) + ' groups from the first worker and ' + (b[1] - a[1]) + ' from each', f(RB.moved_mb_messages, 0) + ' MB', f(RB.total_mb_messages, 0) + ' MB', f(100 * RB.moved_mb_messages / RB.total_mb_messages, 1) + '%', f(RB.seconds, 1) + ' s', f(RB.writes_ok, 0) + ' inserts', RB.writes_err + ' errors', 'median ' + f(RB.write_p50, 2) + ' ms, p99 ' + f(RB.write_p99, 2) + ' ms, worst ' + f(RB.write_max, 0) + ' ms', a[3] + ' groups on every worker']);
      if (b[1] - a[1] !== b[2] - a[2]) out.push('rebalance: the two other workers did not give the same number of groups');
      const T = D.tl, ev = D.events.map(x => Math.round(x.t)), seg = (x, y) => { const s = T.slice(x, y); return s.reduce((q, t) => q + t[0], 0) / Math.max(1, s.length) };
      const ranges = D.ranges.split('\n').slice(1).map(l => +l.split('\t')[0]).sort((x, y) => x - y);
      need('sx-rg', ['about ' + Math.round(seg(1, ev[0])) + ' inserts a second', 'about ' + Math.round(seg(ev[0] + 1, ev[1])) + ' a second', ranges[0] + ' to ' + ranges[ranges.length - 1], 'node 3 at ' + ev[0] + ' s', 'node 2 at ' + ev[1] + ' s', 'node 2 at ' + ev[2] + ' s', 'node 3 at ' + ev[3] + ' s']);
      if (seg(ev[1] + 1, ev[2]) !== 0) out.push('rg: inserts while one node was alive are not zero');
      if (!D.ranges.split('\n').slice(1).every(l => /\{1,2,3\}\t1$/.test(l.trim()))) out.push('rg: not every range on {1,2,3} with its lease on node 1');
      need('rd-s8-tx', ['users ' + C.tx.pair[0] + ' and ' + C.tx.pair[1]]);
      need('sx-2pc', [f(C.tx.one_shard.p50, 2) + ' ms', f(C.tx.two_nodes_2pc.p50, 2) + ' ms', f(C.tx.two_nodes_2pc.p99, 1) + ' ms', f(C.tx.big_two_users.p50, 2) + ' ms']);
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
