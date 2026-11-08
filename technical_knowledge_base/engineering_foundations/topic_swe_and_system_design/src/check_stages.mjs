// The 2026-11-06 rollout checks (Topic: swe-and-system-design): the map stage (Fig. 1) and every step animation play by themselves once scrolled
// into view, step to their last step, have one step-list item per step (per stretch for the Case files replay and the Numbers to know time budget,
// in every mode), and never move under reduced motion; the stage's flows stop off screen; splits are two columns at 1400 px in Reading, Numbers
// to know and Case files; no errors, NaN, undefined or sideways scroll in any tab.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-map'];
// [tab, card id, ctl id, step list id (or a function of the mode), modes, details to open first]
const ANIMS = [
  ['t-read', 'rd-est-card', 'rd-est-ctl', () => 'sx-est', ['avg', 'peak'], null]];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
const tab = async (p, t) => { await p.click(`#tabs button[data-t="${t}"]`); await wait(500) };
const bad = /.{0,30}\b(NaN|Infinity)\b.{0,30}|.{0,30}\bundefined\b.{0,30}/g;
const segOf = ctl => ctl.replace(/-ctl$/, '-seg');
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async (where, t) => {
    const r = await p.evaluate((t, src) => { const c = document.getElementById(t).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText || c.textContent).match(new RegExp(src, 'g')) || [], side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, t, bad.source);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const splits = async t => { const c = await p.$$eval(`#${t} .s3sp`, xs => xs.filter(x => x.offsetParent !== null).map(x => getComputedStyle(x).display)); if (!c.length || c.some(d => d !== 'grid')) problems.push(`${tag}: ${t} splits not two columns (${c})`) };
  if (width === 1400) await splits('t-read');
  // the hero stage: autoplay on view
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  // flows stop off screen
  await p.$eval('#rd-senior', e => e.scrollIntoView({ block: 'start' })); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step the stage to its last step; list length; screenshot mid-way
  for (const id of STAGES) {
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
    const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx'); return l ? l.children.length : 0 });
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(60);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` }) }
    }
    await wait(2000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    const on = await p.$eval('#' + id, h => [...h.closest('.s3sp').querySelector('ol.sx').children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${id} list marks ${on}`);
  }
  // the 2D step animations, every mode
  for (const [t, card, ctl, sxf, modes, det] of ANIMS) {
    await tab(p, t); if (width === 1400) await splits(t);
    if (det) await p.$eval('#' + det, e => { const d = e.closest('details'); if (d) d.open = true }); await wait(200);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1800);
    if (!/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`${tag}: ${card} did not play when scrolled into view`);
    for (const m of modes) {
      if (m) { await p.$eval(`#${segOf(ctl)} button[data-m="${m}"]`, e => e.click()); await wait(100) }
      await p.$eval(`#${ctl}-b`, e => e.click());
      await p.evaluate(c => { const e = document.getElementById(c + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
      const sx = sxf(m), n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval(`#${sx}`, e => e.children.length);
      if (lis !== n) problems.push(`${tag}: ${card} ${m} has ${n} steps but ${lis} items`);
      if (await p.$eval(`#${sx}`, e => e.hidden || e.offsetParent === null)) problems.push(`${tag}: ${card} ${m} list ${sx} not shown`);
      for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(40);
        if (k === Math.floor(n / 2) && m === modes[0]) { await wait(200); await (await p.evaluateHandle(c => document.getElementById(c).closest('.s3sp'), card)).screenshot({ path: `${shots}/x-${card}-${scheme}-${width}.png` }) } }
      const on = await p.$eval(`#${sx}`, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} ${m} list marks ${on}`);
    }
  }
  await tab(p, 't-read'); await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true)); await audit('reading', 't-read');
  // the two grouped replays (rollout rule 3a): each plays once in view, every frame marks its stretch's item, a click on an item jumps
  // [tab, card, ctl, list id per mode, modes and the button that picks each, frame-to-item map per mode]
  const GROUPED = [
    ['t-cases', 'cf-an', 'cf-an-ctl', m => 'sx-cf-' + m, [['before', '#cf-an-mode button[data-m="before"]'], ['after', '#cf-an-mode button[data-m="after"]']],
      m => p.evaluate(m => window.CF_GROUPS[m], m)],
    ['t-num', 'nm-bud-card', 'nm-bud-ctl', () => 'sx-bud', [['conn', '#nm-bud-sc button[data-m="conn"]'], ['offpath', '#nm-bud-sc button[data-m="offpath"]'], ['cache', '#nm-bud-sc button[data-m="cache"]']],
      async () => { const n = await p.$eval('#nm-bud-ctl-s', e => +e.max + 1), nb = await p.evaluate(() => { const b = document.querySelectorAll('#sx-bud>li')[1]; return +(b.textContent.match(/Before: (\d+) pieces/) || [])[1] });
        return [...Array(n).keys()].map(i => i === 0 ? 0 : i <= nb ? 1 : i < n - 1 ? 2 : 3) }]];
  for (const [t, card, ctl, sxf, modes, groups] of GROUPED) {
    await tab(p, t); if (width === 1400) await splits(t);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1800);
    if (!/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`${tag}: ${card} did not play when scrolled into view`);
    for (const [m, btn] of modes) {
      await p.$eval(btn, e => e.click()); await wait(150);
      const G = await groups(m), n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), sx = sxf(m), lis = await p.$eval('#' + sx, e => e.hidden || e.offsetParent === null ? -1 : e.children.length);
      if (G.length !== n || Math.max(...G) + 1 !== lis) problems.push(`${tag}: ${card} ${m}: ${n} frames, ${G.length} mapped, ${lis} items shown`);
      for (let k = 0; k < n; k++) { await p.evaluate((c, k) => { const e = document.getElementById(c + '-s'); e.value = k; e.dispatchEvent(new Event('input')) }, ctl, k); await wait(20);
        const on = await p.$eval('#' + sx, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== G[k]) problems.push(`${tag}: ${card} ${m} frame ${k} marks ${on}, want ${G[k]}`);
        if (k === Math.floor(n / 2) && m === modes[0][0]) await (await p.evaluateHandle(c => document.getElementById(c).closest('.s3sp'), card)).screenshot({ path: `${shots}/x-${card}-${scheme}-${width}.png` }) }
      await p.$eval(`#${sx}>li:nth-child(3)`, e => e.click()); await wait(50);
      if ((await p.$eval(`#${ctl}-s`, e => +e.value)) !== G.indexOf(2)) problems.push(`${tag}: ${card} ${m} list click did not jump`);
    }
    await audit(t, t);
  }
  for (const t of ['t-sim', 't-more']) { await tab(p, t); await audit(t, t) }
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(300);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, +e.dataset.draws || 0, e.querySelector('.stg-st').textContent]);
    await wait(1000); const d = await p.$eval('#' + id, e => +e.dataset.draws || 0);
    if (r[0] > 0 || !r[2].startsWith('step 1 of') || d !== r[1]) problems.push(`reduced motion: ${id} moved by itself (${r}, draws ${d})`) }
  for (const [t, card, ctl, , , det] of ANIMS.concat([['t-cases', 'cf-an', 'cf-an-ctl'], ['t-num', 'nm-bud-card', 'nm-bud-ctl']])) { await tab(p, t);
    if (det) await p.$eval('#' + det, e => { const d = e.closest('details'); if (d) d.open = true });
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if (/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent)) || (await p.$eval(`#${ctl}-s`, e => +e.value)) !== 0) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
