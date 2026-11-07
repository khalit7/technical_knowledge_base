// The 2026-11-06 rollout checks for the Service APIs page: every 3D stage and 2D animation plays by itself once scrolled into view, steps to
// its last step in every mode with one step-list item per step, stops redrawing off screen and never moves under reduced motion; the two
// widgets (the frame viewer and the balancer runs) never play by themselves; no errors, NaN, undefined or sideways scroll; the splits are two
// columns at 1400 px and one below 1100 px. The recorded values written into the step lists are checked against window.SA.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_protocols/service_apis/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// stage id, its mode chips (selector), modes, the step-list id for each mode
const STAGES = [['stg-hero', null, [null], () => 'sx-hero'], ['stg-idem', '#idem-mode', ['nokey', 'key', 'early', 'mismatch'], m => 'sx-idem-' + m],
  ['stg-dl', '#dl-mode', ['0', '3', '1', '2'], m => 'sx-dl-' + m], ['stg-lb', null, [null], () => 'sx-lb']];
// 2D animations (RD.anim): card, control prefix, mode buttons, modes, list for each mode
const ANIMS = [['rd-pg', 'rd-pgctl', '#rd-pgseg', ['0', '1'], m => 'sx-pg-' + m], ['rd-hook', 'rd-hookctl', null, [null], () => 'sx-hook']];
const WIDGETS = [['rd-call', 'cl-ctl'], ['rd-lb', 'lb-ctl']];
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
  // autoplay on view: a stage's data-frames rises; an RD.anim's play button reads Pause; a widget stays still
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if (!/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  for (const [card, ctl] of WIDGETS) {
    const v0 = await p.$eval(`#${ctl}-s`, e => e.value);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2500);
    const [lab, v1] = await p.$eval(`#${ctl}-p`, e => [e.textContent, document.getElementById(e.id.slice(0, -1) + 's').value]);
    if (/Pause/.test(lab) || v1 !== v0) problems.push(`${tag}: widget ${card} moved by itself (${v0} -> ${v1})`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-s14').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every mode of every stage to its last step; list length; screenshots mid-way and at the end
  for (const [id, sel, modes, lidOf] of STAGES) for (const m of modes) {
    if (sel) { await p.$eval(`${sel} [data-m="${m}"]`, e => e.click()); await wait(100); }
    const lid = lidOf(m), sfx = m == null ? '' : '-' + m;
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id}${sfx} has ${n} steps but list ${lid} shows ${lis}`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-mid-${scheme}-${width}.png` }) }
    }
    await wait(2600);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${sfx} ended on ${sh}`);
    if (width === 1400 || width === 390) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-last-${scheme}-${width}.png` }) }
    await audit(`${id}${sfx} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
  }
  for (const [card, ctl, sel, modes, lidOf] of ANIMS) for (const m of modes) {
    if (sel) { await p.$eval(`${sel} [data-m="${m}"]`, e => e.click()); await wait(100); }
    const lid = lidOf(m), n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card}${m == null ? '' : '-' + m} has ${n} steps but list ${lid} shows ${lis}`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    if (await p.$eval(`#${ctl}-s`, e => +e.value) !== n - 1) problems.push(`${tag}: ${card} did not reach its last step from the list`);
    if (width === 1400 || width === 390) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(300); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}${m == null ? '' : '-' + m}-last-${scheme}-${width}.png` }) }
    await audit(`${card} last step`);
  }
  if (width === 1400) { // the step lists' recorded values are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const T = v => v.toFixed(3) + ' s', H = SA_HERO, I = SA.idem.runs, D = SA.deadline, L = SA_LB.STEPS;
      need('sx-hero', [[1, H.jsonB + ' bytes of JSON'], [2, H.pbB + ' bytes of protobuf'], [2, (H.frameB - H.pbB) + '-byte prefix'], [3, H.L7C.join(' / ')]]);
      const w = m => I[m].log.filter(x => x.ev === 'work committed'), a = (m, i) => I[m].attempts[i], f = m => I[m].log.filter(x => x.ev === 'request').map(x => x.fp.slice(0, 8));
      need('sx-idem-nokey', [[0, T(a('nokey', 0).sent)], [1, T(w('nokey')[0].t)], [1, w('nokey')[0].msg], [1, SA.idem.price + ' credits'], [2, T(a('nokey', 0).got)], [3, T(a('nokey', 1).sent)], [3, a('nokey', 1).msg], [3, T(a('nokey', 1).got)], [4, I.nokey.credits + ' credits']]);
      if (I.nokey.messages !== 2 || a('nokey', 0).status !== null || a('nokey', 1).status !== 201) out.push('nokey run is not the one described');
      need('sx-idem-key', [[0, T(I.key.log.find(x => x.ev === 'key claimed').t)], [1, T(w('key')[0].t)], [2, T(a('key', 0).got)], [3, T(a('key', 1).sent)], [3, a('key', 1).msg], [3, 'Idempotent-Replayed: ' + a('key', 1).replayed], [4, I.key.credits + ' credits']]);
      if (I.key.messages !== 1 || a('key', 1).status !== 201 || a('key', 1).got - a('key', 1).sent > .001) out.push('key run is not the one described');
      need('sx-idem-early', [[1, T(a('early', 1).sent)], [1, String(a('early', 1).status)], [2, T(w('early')[0].t)], [2, T(a('early', 0).got)], [3, T(a('early', 2).sent)], [3, I.early.credits + ' credits']]);
      if (I.early.messages !== 1 || a('early', 1).status !== 409 || a('early', 2).replayed !== 'true') out.push('early run is not the one described');
      need('sx-idem-mismatch', [[0, T(a('mismatch', 0).got)], [1, String(a('mismatch', 1).status)], [1, f('mismatch')[0]], [1, f('mismatch')[1]], [2, I.mismatch.credits + ' credits']]);
      if (I.mismatch.messages !== 1 || f('mismatch')[0] === f('mismatch')[1]) out.push('mismatch run is not the one described');
      D.forEach((r, m) => { const id = 'sx-dl-' + m, inf = r.inference, rec = r.client.tokens_received;
        if (r.deadline) need(id, [[0, r.deadline + ' s deadline'], [0, r.gateway.time_remaining_s + ' s left'], [2, r.client.gave_up_s + ' s'], [2, rec + ' tokens']]);
        else need(id, [[0, r.cancel_at + ' s'], [2, rec + ' tokens'], [2, r.client.gave_up_s + ' s']]);
        if (r.hop2_timeout) need(id, [[0, r.hop2_timeout], [0, inf.time_remaining_s + ' s']]);
        if (r.hop2_end[0].type === 'RSTSTREAM') need(id, [[3, r.hop2_end[0].ms.toFixed(1) + ' ms']]);
        need(id, [[3, inf.tokens_made + ' tokens'], [4, String(inf.tokens_made)], [4, String(rec)]]);
        if (inf.tokens_made - rec > 1) need(id, [[3, inf.dur_s + ' s'], [4, (inf.tokens_made - rec) + ' of them for nobody']]); });
      L.slice(0, 4).forEach((s, k) => need('sx-lb', [[k, s.n.join(' / ')]]));
      const tot = s => s.n.reduce((x, y) => x + y, 0), first3 = t => (t.calls.find(c => c[1] === 'backend-3') || [null])[0];
      need('sx-lb', [[4, 'of the ' + tot(L[4]) + ' calls'], [5, first3(L[5].join).toFixed(2) + ' s'], [5, L[5].n[2] + ' of the ' + tot(L[5])], [6, (first3(L[6].join) - L[6].join.backend3_joined_s).toFixed(2) + ' s'],
        [6, L[6].n[2] + ' of the ' + tot(L[6])], [7, L[7].n[0] + ' / ' + L[7].n[1]]]);
      if (L[4].n[2] !== 0 || L[7].n[2] !== 0) out.push('balancer runs are not the ones described');
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
  for (const [card, ctl] of ANIMS.concat(WIDGETS.map(([c, k]) => [c, k]))) { const v0 = await p.$eval(`#${ctl}-s`, e => e.value);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const v1 = await p.$eval(`#${ctl}-s`, e => e.value); if (v1 !== v0 || /Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`reduced motion: ${card} moved by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
