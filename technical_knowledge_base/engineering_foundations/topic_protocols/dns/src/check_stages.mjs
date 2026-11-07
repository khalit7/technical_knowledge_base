// The 2026-11-06 rollout checks for the DNS page: every 3D stage plays by itself once scrolled into view, steps to its last step in every mode with
// one step-list item per step, stops redrawing off screen and never moves under reduced motion; the rebinding animation (RD.anim) plays on view and
// has one list item per step; the two widgets (the resolver lab, the change planner) never play by themselves; no errors, NaN, undefined or sideways
// scroll; the splits are two columns at 1400 px and one below 1100. The recorded values written into the step lists are checked against window.DNSD.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_protocols/dns/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// [stage, mode chips or null, {mode: step list}]
const STAGES = [['stg-hero', null, { all: 'sx-hero' }],
  ['stg-walk', 'wk-mode', { qmin: 'sx-walk-qmin', full: 'sx-walk-full', warm: 'sx-walk-warm' }],
  ['stg-cache', 'ch-mode', { change: 'sx-cache-change', neg: 'sx-cache-neg', stale: 'sx-cache-stale' }],
  ['stg-sec', 'ds-mode', { valid: 'sx-sec-valid', expired: 'sx-sec-expired', rolled: 'sx-sec-rolled', nx: 'sx-sec-nx' }]];
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
  if (width >= 1100 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // autoplay on view: the stages, then the rebinding animation; the widgets must stay still
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  await p.$eval('#rb-card', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
  if (!/Pause/.test(await p.$eval('#rb-ctl', e => e.textContent))) problems.push(`${tag}: the rebinding animation did not play when scrolled into view`);
  for (const w of ['pd', 'cc']) { await p.$eval(`#${w}-card`, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if (/Pause/.test(await p.$eval(`#${w}-ctl`, e => e.textContent))) problems.push(`${tag}: the widget ${w}-card played by itself`); }
  // flows stop off screen
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-dbg').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every stage to its last step in every mode; list length; screenshots mid-way
  for (const [id, chips, lists] of STAGES) {
    for (const [m, lid] of Object.entries(lists)) {
      if (chips) { await p.$eval(`#${chips} button[data-m="${m}"]`, e => e.click()); await wait(100) }
      await p.$eval(`#${id}-b`, e => e.click());
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${id} ${m} has ${n} steps but list ${lid} shows ${lis}`);
      for (let k = 1; k < n; k++) {
        await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
        if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2800); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${m}-mid-${scheme}-${width}.png` }) }
      }
      await wait(2800);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m} ended on ${sh}`);
      if (width === 1400) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${m}-last-${scheme}-${width}.png` }) }
      await audit(`${id} ${m} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    }
  }
  // the rebinding animation: both modes, list length, last step
  for (const m of ['naive', 'pinned']) {
    await p.$eval(`#rb-mode button[data-m="${m}"]`, e => e.click()); await wait(100);
    const n = await p.$eval('#rb-ctl-s', s => +s.max + 1), lis = await p.$eval('#sx-rb-' + m, e => e.hidden ? -1 : e.children.length);
    if (n !== lis) problems.push(`${tag}: rebinding ${m} has ${n} steps, list ${lis}`);
    for (let k = 1; k < n; k++) { await p.click('#rb-ctl-f'); await wait(30) }
    const last = await p.$eval('#sx-rb-' + m, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (last !== n - 1) problems.push(`${tag}: rebinding ${m} list marks item ${last + 1}, not the last`);
    await audit('rebinding ' + m);
  }
  if (width === 1400) { // the step lists' recorded values are the page's data
    const r = await p.evaluate(() => { const out = [], D = DNSD, W = D.walk.runs, C = D.cache;
      const li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const fmt = n => n.toLocaleString('en-GB');
      need('sx-hero', [[1, W[0].up.length + ' upstream queries'], [2, W[0].cold_ms + ' ms'], [3, W[0].warm_up + ' queries'], [3, W[0].warm_ttl + ' of its 60'], [3, W[0].warm_ms + ' ms'],
        [4, fmt(PODX.by.glibc_drop_aaaa.calls[0].ms) + ' ms'], [4, 'api.llm.test ' + PODX.perCall(PODX.by.glibc_ndots5)[0].q + ' (']]);
      ['qmin', 'full'].forEach((m, j) => { const u = W[j].up; need('sx-walk-' + m, [[1, u[0].size + ' bytes'], [2, u[1].size + ' bytes'], [3, u[2].size + ' bytes'], [4, u[3].size + ' bytes'], [5, W[j].cold_ms + ' ms'], [5, u.length + ' upstream']]);
        if (m === 'qmin' && !(u[1].name === 'test.' && u[2].name === 'llm.test.')) out.push('qmin: the root and test. did not see the minimised names');
        if (m === 'full' && !(u[1].name === 'api.llm.test.' && u[2].name === 'api.llm.test.')) out.push('full: the root and test. did not see the full name'); });
      need('sx-walk-warm', [[1, W[0].warm_up + ' queries'], [2, W[0].warm_ttl + ' of its 60'], [2, W[0].warm_ms + ' ms']]);
      const f1 = x => x.toFixed(1), K = DNS_CACHE_MARKS, ch = K.MK.change, ng = K.MK.neg, SS = K.SS;
      const auNew = (M, neg) => M.A.find(r => r.st === 'NOERROR' && (neg || r.v !== M.R[0].v));
      need('sx-cache-change', [[0, ch.R[0].ms + ' ms'], [0, ch.R[0].v], [1, f1(ch.e0.t) + ' s'], [1, f1(auNew(ch).t) + ' s'], [1, last(ch.R, ch.e0.t).ttl + ' s left'], [3, f1(ch.flip.t) + ' s'], [3, ch.flip.v]]);
      const mids = M => M.R.filter(r => r.t > M.e0.t + .01 && r.t < M.flip.t), ttls = M => mids(M).map(r => r.ttl);
      if (ttls(ch).join(',') !== '21,18,16,14,11,9,7,4,2') out.push('change: the countdown is not 21 ... 2: ' + ttls(ch));
      need('sx-cache-neg', [[0, 'min(300, ' + ng.R[0].ttl + ')'], [1, f1(ng.e0.t) + ' s'], [1, f1(auNew(ng, 1).t) + ' s'], [2, mids(ng)[0].ttl + ' ... ' + mids(ng).slice(-1)[0].ttl], [3, f1(ng.flip.t) + ' s'], [3, ng.flip.ttl + ' s'], [3, ng.flip.v]]);
      need('sx-cache-stale', [[1, f1(SS.stop.t) + ' s'], [3, f1(SS.def[1].t) + ' s'], [4, f1(SS.exp[1].t) + ' s'], [4, fmt(SS.exp[1].ms) + ' ms'], [4, fmt(SS.exp[2].ms) + ' ms'], [4, f1(SS.exp[2].t) + ' s']]);
      if (SS.def[1].st !== 'no reply') out.push('stale: the default resolver did answer');
      function last(R, t) { let x = null; R.forEach(r => { if (r.t <= t + 1e-6) x = r }); return x }
      const T = DNS_SEC.TAG;
      need('sx-sec-valid', [[0, T.anc], [1, T.rK], [1, T.rZ], [2, T.tDS], [3, T.tK], [3, T.tZ], [4, T.lDS], [5, T.lK], [5, T.lZ]]);
      need('sx-sec-rolled', [[0, T.anc], [1, T.ancNew], [2, T.ancNew]]);
      if (T.anc !== T.rK || T.tDS !== T.tK || T.lDS !== T.lK) out.push('the recorded chain does not link: ' + JSON.stringify(T));
      if (!DNS_SEC.nsec || DNS_SEC.nsec[4] !== 'ns1.llm.test.') out.push('the NSEC record is not api.llm.test -> ns1.llm.test');
      for (const [m, lid] of [['qmin', 'sx-walk-qmin'], ['full', 'sx-walk-full'], ['warm', 'sx-walk-warm']]) if (DNS_WALK_STEPS[m].length !== document.getElementById(lid).children.length) out.push(`walk ${m}: scene and list differ in length`);
      for (const m of ['valid', 'expired', 'rolled', 'nx']) if (DNS_SEC.M[m].length !== document.getElementById('sx-sec-' + m).children.length) out.push(`sec ${m}: scene and list differ in length`);
      if (DNS_RB_STEPS('naive') !== 7 || DNS_RB_STEPS('pinned') !== 5) out.push('rebinding step counts changed');
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
  await p.$eval('#rb-card', e => e.scrollIntoView({ block: 'center' })); await wait(2500);
  if (await p.$eval('#rb-ctl-s', s => +s.value) !== 0 || /Pause/.test(await p.$eval('#rb-ctl', e => e.textContent))) problems.push('reduced motion: the rebinding animation moved by itself');
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
