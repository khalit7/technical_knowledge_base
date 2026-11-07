// The 2026-11-06 rollout checks for Distributed systems fundamentals: every 3D stage and 2D animation plays by itself once scrolled into view,
// steps to its last step (in every mode) with one step-list item per step, stops redrawing off screen and never moves under reduced motion;
// no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px. The numbers written into the step
// lists are checked against the data the scenes draw: the Raft trace (DSF_RTRACE.facts), the quorum settings (DSF_QSTEPS), the fencing
// amounts and tokens (DSF_FENCE) and the measured replication table. Screenshots of every step at 1400 light and 390 dark, plus one frame in
// the middle of each transition at 1400 (named -tr-), go to the shots folder.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/distributed_systems_fundamentals/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// stage id, mode chips (selector or null), modes, list id per mode, transition time in ms
const STAGES = [['stg-hero', null, [null], () => 'sx-hero', 1500], ['stg-q', null, [null], () => 'sx-q', 1500], ['stg-raft', null, [null], () => 'sx-raft', 3600],
  ['stg-fence', '#fc-seg', ['0', '1'], m => 'sx-fence-' + m, 1500]];
// 2D animations (RD.anim): card, control prefix, mode chips, modes, list id per mode
const ANIMS = [['rd-repl-card', 'rd-repl-ctl', '#rd-repl-seg', ['0', '1', '2', '3'], m => 'sx-repl-' + m], ['rd-idem-card', 'rd-idem-ctl', '#rd-idem-seg', ['0', '1', '2'], m => 'sx-idem-' + m]];
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
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // autoplay on view: a stage's data-frames rises; an RD.anim's play button reads Pause
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if (!/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-real').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every stage, in every mode, to its last step; list length; screenshots
  for (const [id, sel, modes, lidOf, dur] of STAGES) for (const m of modes) {
    if (sel) { await p.$eval(`${sel} [data-m="${m}"]`, e => e.click()); await wait(150); }
    const lid = lidOf(m), sfx = m == null ? '' : '-m' + m;
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id}${sfx} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(dur + 300);
    for (let k = 0; k < n; k++) {
      if (k) { await p.$eval(`#${id}-f`, e => e.click());
        if (width === 1400) { await wait(Math.round(dur * .45)); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}-tr-${scheme}-${width}.png` }); } }
      if (width === 1400 || width === 390) { await wait(dur + 300); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}${k === Math.floor(n / 2) ? '-mid' : ''}-${scheme}-${width}.png` }) }
    }
    await wait(dur + 200);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${sfx} ended on ${sh}`);
    await audit(`${id}${sfx} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id}${sfx} list does not mark the last step`);
  }
  for (const [card, ctl, sel, modes, lidOf] of ANIMS) for (const m of modes) {
    await p.$eval(`${sel} [data-m="${m}"]`, e => e.click()); await wait(100);
    const lid = lidOf(m), sfx = '-m' + m;
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card}${sfx} has ${n} steps but list ${lid} shows ${lis}`);
    const others = await p.$$eval(`ol.sx[id^="${lid.replace(/\d+$/, '')}"]`, (xs, lid) => xs.filter(x => x.id !== lid && !x.hidden).length, lid);
    if (others) problems.push(`${tag}: ${card}${sfx}: another mode's list is still shown`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    if (await p.$eval(`#${ctl}-s`, e => +e.value) !== n - 1) problems.push(`${tag}: ${card}${sfx} did not reach its last step from the list`);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${card}${sfx} list does not mark the last step`);
    if (width === 1400 || width === 390) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(300); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}${sfx}-last-${scheme}-${width}.png` }) }
    await audit(`${card}${sfx} last step`);
  }
  if (width === 1400) { // the step lists' numbers are the scenes' data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const F = DSF_RTRACE.facts, S = i => 'S' + (i + 1);
      need('sx-raft', [[0, S(F.firstServer) + "'s, at " + F.firstTimeout + ' ms'],
        [1, F.cands1.map(S).slice(0, -1).join(', ') + ' and ' + S(F.cands1[F.cands1.length - 1]) + ' all time out within ' + F.cands1span + ' ms'], [1, 'In term ' + F.l1term + ', ' + S(F.l1)], [1, 'at ' + F.l1won + ' ms'],
        [2, F.c1], [3, S(F.old) + ' crashes'], [3, S(F.l2) + ', starts an election for term ' + F.l2term + ' and wins it ' + F.l2ms + ' ms after the crash'],
        [4, F.c5 + ' commits'], [4, 'Then ' + S(F.old) + ' restarts'],
        [5, S(F.ml) + ' (the leader) and ' + S(F.mf)], [5, F.c6a + ' and ' + F.c6b + ' to ' + S(F.ml)], [5, 'entries ' + (F.minLen - 1) + ' and ' + F.minLen], [5, 'commit index stays at ' + F.mlCommit], [5, S(F.nl) + ' times out and wins term ' + F.nlterm],
        [6, S(F.nl) + ' commits ' + F.c7], [6, 'term ' + F.nlterm + ' and steps down'], [6, 'on ' + S(F.ml) + ' and ' + S(F.mf)],
        [7, F.down.map(S).slice(0, -1).join(', ') + ' and ' + S(F.down[F.down.length - 1]) + ' go down'], [7, 'from ' + F.termBefore + ' to ' + F.termAfter]]);
      if (F.lostKept) out.push('the split-off writes survived somewhere'); if (F.leaderAtEnd) out.push('a leader exists at the end of stretch 8'); if (!F.refused) out.push('the last write was not refused');
      if (F.mlCommit !== F.len5) out.push('the old leader committed past the split');
      const Q = DSF_QSTEPS;
      need('sx-q', [[0, 'N = ' + Q[0].N], [1, 'W = ' + Q[1].W], [2, 'R = ' + Q[2].R], [2, 'R + W = ' + (Q[2].R + Q[2].W) + ' > ' + Q[2].N], [3, 'R + W = ' + (Q[3].R + Q[3].W) + ' ≤ ' + Q[3].N], [4, '(' + Q[4].N + ', ' + Q[4].W + ', ' + Q[4].R + ')'], [4, 'N − W = ' + (Q[4].N - Q[4].W)], [4, 'N − R = ' + (Q[4].N - Q[4].R)]]);
      if (Q[3].ov !== 0 || Q[2].ov !== 1 || Q[4].ov !== 1) out.push('quorum overlaps changed');
      const D = DSF_FENCE;
      ['sx-fence-0', 'sx-fence-1'].forEach(id => need(id, [[0, 'charge Ana ' + D.c1 + ' credits'], [0, 'token ' + D.t1], [0, 'balance: ' + D.start], [2, D.c2 + ' credits'], [2, 'token ' + D.t2], [3, D.start + ' − ' + D.c2 + ' = ' + (D.start - D.c2)]]));
      need('sx-fence-0', [[4, D.start + ' − ' + D.c1 + ' = ' + (D.start - D.c1)], [4, 'end at ' + (D.start - D.c2 - D.c1)]]);
      need('sx-fence-1', [[4, 'rejects token ' + D.t1], [4, 'stays ' + (D.start - D.c2)]]);
      const tb = document.getElementById('rd-meas-t').innerText;
      if (!/99\.65%/.test(tb) || !li('sx-repl-0', 5).includes('99.65%')) out.push('the stale-read share in the list is not the table\'s');
      if (!document.getElementById('rd-meas').innerText.includes('median extra wait 0.105 ms') || !li('sx-repl-1', 5).includes('0.105 ms')) out.push('the LSN wait in the list is not the measured one');
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
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { const v0 = await p.$eval(`#${ctl}-s`, e => e.value);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const v1 = await p.$eval(`#${ctl}-s`, e => e.value); if (v1 !== v0 || /Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`reduced motion: ${card} moved by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  // the Raft widget never plays by itself
  await p.close();
}
{ const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 }); await p.goto(file);
  await p.$eval('#rf-card', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const t = await p.$eval('#rf-stats', e => e.innerText); if (!/\b0 ms\b/.test(t)) problems.push('the Raft widget moved by itself: ' + t.replace(/\s+/g, ' '));
  await p.close(); }
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
