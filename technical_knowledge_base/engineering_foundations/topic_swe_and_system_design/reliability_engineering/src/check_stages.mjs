// The 2026-11-06 rollout checks for Reliability engineering: the six 3D stages and the before/after animation play by themselves once scrolled
// into view, step to their last step (the animation in both modes) with one step-list item per step, stop redrawing off screen and never move
// under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px.
// Every number written into the step lists is checked against what the scenes compute (window.RSN) from the page's engine (window.RE, itself
// checked against recompute.py by check_engine.mjs) and the measured runs (window.MEAS).
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/reliability_engineering/src/check_stages.mjs [shots dir] [--all]
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
const STAGES = { 'stg-hero': 'sx-hero', 'stg-dl': 'sx-dl', 'stg-amp': 'sx-amp', 'stg-storm': 'sx-storm', 'stg-brk': 'sx-brk', 'stg-bulk': 'sx-bulk' };
const SLOW = { 'stg-storm': 1 };
const BA = ['rd-ba-card', 'rd-ba-ctl'];
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
  // autoplay on view: a stage's data-frames rises; the 2D animation's play button reads Pause
  for (const id of Object.keys(STAGES)) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  { await p.$eval('#' + BA[0], e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${BA[1]}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${BA[0]} did not play when scrolled into view (${t})`); }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => { const d = document.getElementById('s-depth'); window.scrollTo(0, d.getBoundingClientRect().top + scrollY) }); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every stage to its last step; list length; screenshots mid-way (during a transition and settled) and at the end
  const runStage = async (id, lid) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300);
    const tw = SLOW[id] ? 1500 : 700, st = SLOW[id] ? 2600 : 1500;
    if (ALL && (width === 1400 || width === 390)) { await wait(1500); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-s1-${scheme}-${width}.png` }); }
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click());
      if (ALL && (width === 1400 || width === 390)) { await wait(tw); let el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-s${k + 1}tw-${scheme}-${width}.png` });
        await wait(st); el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` }) }
      else if (k === Math.floor(n / 2)) { await wait(tw); let el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-tween${k}-${scheme}-${width}.png` });
        await wait(st); el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-mid${k}-${scheme}-${width}.png` }) } else await wait(120);
    }
    await wait(SLOW[id] ? 3600 : 2400);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    if (width === 1400 || width === 390) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-last-${scheme}-${width}.png` }) }
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
  };
  for (const [id, lid] of Object.entries(STAGES)) await runStage(id, lid);
  // the before/after animation in both modes: the mode swaps the list, one item per stretch, stepping reaches the last stretch
  for (const m of ['before', 'after']) {
    await p.$eval(`#rd-ba-seg [data-m="${m}"]`, e => e.click()); await wait(150);
    const shown = await p.$$eval('ol.sx[id^="sx-ba-"]:not([hidden])', xs => xs.map(x => x.id)); if (shown.length !== 1 || shown[0] !== 'sx-ba-' + m) problems.push(`${tag}: before/after mode ${m} shows lists ${shown}`);
    await p.$eval(`#${BA[1]}-b`, e => e.click());
    const n = await p.$eval(`#${BA[1]}-s`, e => +e.max + 1), lis = await p.$eval('#sx-ba-' + m, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${BA[0]} ${m} has ${n} steps but its list shows ${lis}`);
    await p.$eval('#' + BA[0], e => e.scrollIntoView({ block: 'center' }));
    for (let k = 1; k < n; k++) { await p.$eval(`#${BA[1]}-f`, e => e.click()); await wait(k === 2 ? 700 : 150);
      if (k === 2 && (width === 1400 || width === 390)) { const el = await p.$('#' + BA[0]); await el.screenshot({ path: `${shots}/x-ba-${m}-mid-${scheme}-${width}.png` }) } }
    await wait(900);
    const at = await p.$eval(`#${BA[1]}-s`, e => +e.value); if (at !== n - 1) problems.push(`${tag}: ${BA[0]} ${m} ended on step ${at + 1}`);
    const on = await p.$eval('#sx-ba-' + m, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${BA[0]} ${m} list marks item ${on + 1}`);
    const sec = await p.$eval('#rd-ba-cnt', e => e.textContent); if (!/Second\s*22/.test(sec)) problems.push(`${tag}: ${BA[0]} ${m} last stretch does not show second 22 (${sec.slice(0, 40)})`);
    if (width === 1400 || width === 390) { const el = await p.$('#' + BA[0]); await el.screenshot({ path: `${shots}/x-ba-${m}-last-${scheme}-${width}.png` }) }
    await audit(`before/after ${m} last step`);
  }
  if (width === 1400) { // the step lists' numbers are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
      const H = RSN.hero, D = RSN.dl, A = RSN.amp, S = RSN.storm, B = RSN.brk, K = RSN.bulk;
      need('sx-hero', [[0, H.rate + ' requests a second'], [0, H.W + ' workers'], [0, 'At most ' + H.wNorm + ' workers'], [1, H.slowX + ' times longer'], [1, H.wSlow + ' of ' + H.W],
        [2, H.qMax + ' waiting'], [2, H.fail + ' requests failed'], [2, H.failB + ' of them history'], [4, fmt(H.attNaive, 1) + ' attempts per request'], [4, 'to ' + fmt(H.attBudget, 1)],
        [5, 'After ' + H.brkN + ' calls'], [5, 'bounded at ' + H.maxQ], [5, H.aFail + ' requests failed'], [5, H.aDeg + ' answered by the fallback']]);
      need('sx-dl', [[0, 'now + ' + D.budget + ' s'], [1, 'spends ' + D.spent + ' s'], [1, 'from ' + D.budget + ' s to ' + D.left + ' s'], [2, 'leaves the provider call ' + D.left + ' s'], [3, fmt(D.uNaive, 1) + '% to ' + fmt(D.uDead, 1) + '%']]);
      need('sx-amp', [[2, 'up to ' + A.calls + ' model calls'], [2, '= ' + A.five]]);
      const sn = S.none, sv = S.naive, sb = S.backoff, sd = S.deadline, sg = S.budget, ss = S.shed, pc = v => fmt(100 * v, 1) + '%';
      need('sx-storm', [[0, 'about ' + S.cap + ' requests a second'], [0, S.ok10 + ' of ' + S.arr10], [1, 'drops to ' + S.capSlow + ' a second'], [1, 'reaches ' + sn.qmax], [1, sn.rec + ' s after'],
        [2, 'about ' + Math.round(sv.meanAtt / 100) * 100 + ' attempts a second'], [2, fmt(sv.maxq) + ' waiting'], [2, 'Success ' + pc(sv.success)], [3, sb.att.toFixed(3) + ' attempts per request'], [3, fmt(sb.maxq)],
        [4, sd.qmax + ' at most'], [4, sd.att.toFixed(3) + ' per request'], [4, 'success ' + pc(sd.success)], [5, sg.att.toFixed(3) + ' attempts per request'], [5, sg.rec + ' s after'],
        [6, 'success ' + pc(ss.success)], [6, ss.rec + ' s after']]);
      if (sv.att !== sb.att) out.push('immediate retries and backoff no longer send the same attempts per request (the storm step says "exactly")');
      if (sv.rec !== null || sb.rec !== null || sd.rec !== null) out.push('a policy the storm steps call "never recovers" recovered');
      need('sx-brk', [[0, 'last ' + B.win + ' calls'], [1, 'each call fails at its ' + B.Td + ' ms timeout'], [1, 'last ' + B.win + ' calls failed'], [2, B.open + ' s here'], [2, 'refused ' + B.refused + ' calls'], [2, B.deg + ' requests in all'],
        [3, B.half + ' trial calls'], [3, 'open for ' + fmt(B.openS, 1) + ' s'], [4, 'against ' + B.before], [4, B.fail === 0 ? 'Not one request failed' : '?']]);
      need('sx-bulk', [[0, K.W + ' workers'], [0, K.rate + ' a second send'], [1, K.wSlow + ' of ' + K.W], [1, K.failB + ' of them fail'], [2, K.Wp + ' only for'], [2, K.rate + ' requests a second each'],
        [3, K.mW + ' of ' + K.Wp], [3, K.mFail + ' message requests fail'], [3, K.hFail + ' of ' + fmt(K.hReq) + ' history loads'], [4, K.hBusy === .25 ? 'a quarter of one worker' : '?']]);
      // the before/after totals
      const Bf = RE.sim(RE.P.before).tot, Af = RE.sim(RE.P.after).tot, one = v => fmt(Math.round(v * 1000) / 10, 1) + '%';
      need('sx-ba-before', [[5, one(Bf.success) + ' of all requests'], [5, Bf.fail + ' failed'], [5, H.failB + ' of them history']]);
      need('sx-ba-after', [[5, (Af.success === 1 ? '100%' : one(Af.success)) + ' of all requests'], [5, one(Af.full) + ' with the full model'], [5, Af.fail + ' failed']]);
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
  { await p.$eval('#' + BA[0], e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${BA[1]}-s`, e => +e.value), t = await p.$eval(`#${BA[1]}-p`, e => e.textContent); if (r !== 0 || /Pause/.test(t)) problems.push(`reduced motion: ${BA[0]} moved by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
