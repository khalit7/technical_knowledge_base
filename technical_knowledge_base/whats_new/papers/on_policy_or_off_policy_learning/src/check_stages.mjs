// The 2026-11-06 layout and motion checks for this page (after GRAFT's), at 1400 px light, 920 px light and 390 px dark:
// the 3D stage #stg-kn (Fig. 1 on The paper tab: both knobs on one prompt of the toy) plays by itself once scrolled into view,
// steps to its last step and has exactly one step-list item per step; its flows stop drawing off screen; at 1400 px every split
// shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; the
// lambda slider and the sweep on Move the rollout policy are widgets that draw nothing by themselves; and every number the
// step list states matches what the stage draws (window.OPD_KN, computed by the toy engine in the page).
// Writes a mid-step and a last-step screenshot of the stage.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/on_policy_or_off_policy_learning/src/check_stages.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const problems = []; let checked = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
const STAGE_MODES = {};
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await wait(300);
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  for (const t of await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t))) {
    await clk(`#tabs button[data-t=${t}]`); await wait(300);
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      const playing = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (!playing) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      // flows stop drawing off screen
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step through the forward button, with a middle screenshot
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(3600); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(3600);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      if (width === 1400) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
      if (STAGE_MODES[id]) for (const m of await p.$$eval(`#${STAGE_MODES[id]} button`, bs => bs.map(b => b.dataset.m))) {
        const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
        await clk(`#${STAGE_MODES[id]} button[data-m=${m}]`); await wait(2600);
        const f1m = await p.$eval('#' + id, e => +e.dataset.frames || 0), plm = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
        if (!(f1m > f0) || !plm) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const nm = await p.$eval(`#${id}-r`, e => +e.max + 1), lm = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : ''] });
        if (lm[0] !== 1 || lm[1] !== nm) problems.push(`${tag}: ${id} ${m}: ${lm[0]} visible lists, ${lm[1]} items for ${nm} steps (${lm[2]})`);
        for (let k = 1; k < nm; k++) { await clk(`#${id}-f`); await wait(60); if (k === Math.floor(nm / 2)) { await wait(2100); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-mid-${scheme}-${width}.png` }) } }
        await wait(2100); const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${nm} of ${nm}`) problems.push(`${tag}: ${id} ${m} ended on "${sh}"`);
        if (width === 1400) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-last-${scheme}-${width}.png` });
      }
    }
    // the run tab's slider and sweep are widgets: nothing redraws by itself
    if (t === 't-run') { const v0 = await p.$eval('#slL', e => e.value), h0 = await p.$eval('#trSvg', e => e.innerHTML.length); await p.$eval('#tr', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if ((await p.$eval('#slL', e => e.value)) !== v0 || (await p.$eval('#trSvg', e => e.innerHTML.length)) !== h0) problems.push(`${tag}: a run-tab widget changed by itself`) }
    const r = await p.evaluate(t => { const el = document.getElementById(t); const txt = el.innerText;
      return { bad: (txt.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth } }, t);
    if (r.bad.length) problems.push(`${tag} ${t}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) problems.push(`${tag}: error box: ${box}`);
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const t of ['t-read', 't-run']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // every number the step list states is the one the stage draws
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 }); await p.goto(file); await wait(800);
  await p.$eval('#tabs button[data-t=t-read]', e => e.click()); await wait(300);
  await p.$eval('#stg-kn', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const L = [...document.getElementById('sx-kn').children].map(li => li.textContent.replace(/\s+/g, ' '));
    const has = (i, s) => { n++; if (!L[i].includes(s)) bad.push('step ' + (i + 1) + ': expected "' + s + '"') };
    const K = window.OPD_KN; if (!K) return { bad: ['window.OPD_KN missing: the stage did not compute'], n: 1 };
    const D = K.D, f = v => (100 * v).toFixed(1) + '%', sg = v => (v >= 0 ? '+' : '\u2212') + Math.abs(v).toFixed(2), rt = K.routes, hb = K.habit;
    const [a, c] = rt[0] < rt[1] ? rt : [rt[1], rt[0]];   // the teacher's two routes, lower number first as the text names them
    has(0, 'prompt ' + (K.prompt + 1)); has(0, f(D.pT[a]) + ' and ' + f(D.pT[c]).replace(/%$/, '') ); has(0, 'routes ' + (a + 1) + ' and ' + (c + 1));
    has(0, f(D.pT0) + ' of the time'); has(0, 'route ' + (hb + 1) + ' (' + f(D.pS[hb]) + ')'); has(0, 'right ' + f(D.pS0));
    has(1, f(D.off[a]) + ' route ' + (a + 1)); has(1, f(D.off[c]) + ' route ' + (c + 1)); has(1, f(D.off[hb]) + ' of the rollouts');
    has(2, f(D.on[hb]) + ' of rollouts take its habit route ' + (hb + 1)); has(2, f(D.on[a]) + ' and ' + f(D.on[c]));
    has(3, sg(D.push.f[a]) + ' for route ' + (a + 1)); has(3, sg(D.push.f[c]) + ' for route ' + (c + 1)); has(3, sg(D.push.f[hb]) + ' for the habit route ' + (hb + 1));
    has(4, f(D.pS[c]) + ', gets ' + sg(D.push.r[c]) + ' instead of ' + sg(D.push.f[c])); has(4, 'gets ' + sg(D.push.r[hb]) + ' instead of ' + sg(D.push.f[hb]));
    n++; if (!(D.push.r[c] < D.push.f[c] && D.push.r[hb] < D.push.f[hb])) bad.push('step 5: reverse KL no longer pushes the ignored route less and the habit harder');
    const R = D.runs, at = (run, s) => run.routes[s / 10], pp = run => K.passP(run.snaps[15]);
    const ix = (k, l) => R.findIndex(x => x.kind === k && x.lam === l), onR = R[ix('r', 1)];
    has(5, '(' + f(at(onR, 50)[a]) + ', route ' + (c + 1) + ' ' + f(at(onR, 50)[c]) + ')'); has(5, 'right ' + f(K.passP(onR.snaps[5])) + ' of the time'); has(5, "teacher's " + f(D.pT0));
    n++; if (R.filter(x => x !== onR).some(x => Math.min(at(x, 50)[a], at(x, 50)[c]) < .3)) bad.push('step 6: another student is not split between the two routes at step 50');
    [['f', -1], ['f', 1], ['r', -1], ['r', 1]].forEach(([k, l]) => { const e = at(R[ix(k, l)], 150); has(6, f(e[a]) + ' and ' + f(e[c])) });
    has(7, 'forward KL ' + f(pp(R[ix('f', -1)])) + ' and ' + f(pp(R[ix('f', 1)]))); has(7, 'reverse KL ' + f(pp(R[ix('r', -1)])) + ' and ' + f(pp(R[ix('r', 1)])));
    has(7, 'forward KL ' + f(R[ix('f', -1)].all) + ' and ' + f(R[ix('f', 1)].all)); has(7, 'reverse KL ' + f(R[ix('r', -1)].all) + ' and ' + f(R[ix('r', 1)].all)); has(7, 'teacher ' + f(D.teacherAll));
    has(7, '(' + R[ix('f', -1)].distinct.toFixed(2) + ' and ' + R[ix('f', 1)].distinct.toFixed(2) + ' against ' + R[ix('r', -1)].distinct.toFixed(2) + ' and ' + R[ix('r', 1)].distinct.toFixed(2) + ')');
    // the prompt rule: the teacher's smaller route share is the largest over all prompts
    const W = OPD.world(TOYD.world_seed); let best = -1, bp = -1; for (let q = 0; q < W.P; q++) { const t = OPD.logT1(W, q).map(Math.exp), m = Math.min(t[W.troutes[q][0]], t[W.troutes[q][1]]); if (m > best) { best = m; bp = q } }
    n++; if (bp !== K.prompt) bad.push('the prompt rule picks prompt ' + (bp + 1));
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
