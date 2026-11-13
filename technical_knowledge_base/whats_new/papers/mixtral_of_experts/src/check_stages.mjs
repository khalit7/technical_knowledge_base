// The 2026-11-06 layout and motion checks for the Mixtral of Experts page (after Mamba's), at 1400 px light, 920 px light and 390 px dark:
// the 3D stage (#stg-route: 20 held-out code tokens through the toy's 4 layers, then the toy's and Mixtral's Table 5) and the 2D decode
// animation (#dec: one decoding step at growing batch, three models, a step list each) play by themselves once scrolled into view, step to
// their last step, and have exactly one step-list item per step in every mode; the stage's flows stop drawing off screen; a reader control
// stops autoplay; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion
// nothing moves by itself; and the numbers the step lists state match the page's data (ROUTES from analyse.py, PAPER.tables.t5,
// PAPER.rc from recompute.py). Writes a mid-step and a last-step screenshot of the stage and of the animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/mixtral_of_experts/src/check_stages.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = []; let checked = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
const TWEEN = { 'stg-route': 1600 };
const ANIMS = { dec: ['t-read', { mx: 'sx-dec-mx', l70: 'sx-dec-l70', l13: 'sx-dec-l13' }] };
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await wait(300);
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  const visList = id => p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : '', l[0] ? [...l[0].children].findIndex(x => x.classList.contains('on')) : -1] });
  for (const t of await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t))) {
    await clk(`#tabs button[data-t=${t}]`); await wait(300);
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      if (!(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const [nl, lis] = await visList(id);
      if (nl !== 1 || lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${nl} visible lists with ${lis} items`);
      // flows stop drawing off screen
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step through the forward button
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === 3) { await wait(TWEEN[id] / 2); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(TWEEN[id]);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const [, , , on] = await visList(id); if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      if (width === 1400 || width === 390) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
      if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
    }
    for (const [id, [tab, lists]] of Object.entries(ANIMS)) {
      if (tab !== t) continue; checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
      if (!(await p.$eval('#' + id, e => +e.dataset.frames || 0)) || !(await p.$eval(`#${id}Play`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      if (!(await p.$eval('#' + id, e => e.dataset.playing === '1'))) problems.push(`${tag}: ${id} does not mark data-playing while it plays`);
      for (const m of Object.keys(lists)) {
        await clk(`#${id}M button[data-m=${m}]`); await wait(200);
        const n = await p.$eval(`#${id}Scrub`, e => e.max / 100);
        const L = await p.$$eval('ol.sx:not([hidden])', (ls, want) => ls.filter(l => l.id === want).map(l => l.children.length), lists[m]);
        if (L.length !== 1 || L[0] !== n) problems.push(`${tag}: ${id} ${m}: ${n} steps, list ${lists[m]} visible ${L.length} with ${L[0]} items`);
        const others = await p.$$eval('ol.sx:not([hidden])', (ls, ids) => ls.filter(l => ids.includes(l.id)).length, Object.values(lists));
        if (others !== 1) problems.push(`${tag}: ${id} ${m}: ${others} of its lists visible`);
        await p.evaluate(id => { const e = document.getElementById(id + 'Scrub'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
        for (let k = 1; k < n; k++) { await clk(`#${id}Fwd`); if (k === Math.floor(n / 2) && (width === 1400 || width === 390)) await (await p.$('#' + id)).screenshot({ path: `${shots}/anim-${id}-${m}-mid-${scheme}-${width}.png` }) }
        const on = await p.$eval('#' + lists[m], l => [...l.children].findIndex(x => x.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${id} ${m} list marks item ${on + 1} at the last step`);
        if (await p.$eval(`#${id}Play`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
      }
      await clk(`#${id}M button[data-m=mx]`); await wait(100); await clk(`#${id}Fwd`);
    }
    const r = await p.evaluate(t => { const txt = document.getElementById(t).innerText;
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
  await p.$eval('#tabs button[data-t=t-read]', e => e.click()); await wait(300);
  for (const id of ['stg-route', 'dec']) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const stg = await p.$eval('#' + id, e => e.classList.contains('stg'));
    const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
    const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(stg ? `#${id}-p` : `#${id}Play`, e => /Pause/.test(e.textContent));
    if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
  await p.close() }
{ // the numbers the step lists state are the page's data
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0;
    const has = (list, k, s) => { n++; const li = document.getElementById(list).children[k]; if (!li || !li.textContent.includes(s)) bad.push(`${list} item ${k + 1} lacks "${s}"`) };
    const pc = v => (100 * v).toFixed(1) + '%', p0 = v => String(Math.round(100 * v));
    // the stage: the toy's routing (ROUTES.main) and Mixtral's Table 5
    const RT = window.ROUTES.main, X = window.__routeScene, N = X.n;
    const cnt = l => { const c = {}; for (let i = 0; i < N; i++) { const e = X.e1(l, i); c[e] = (c[e] || 0) + 1 } return c };
    const c0 = cnt(0), top0 = Object.keys(c0).reduce((a, k) => c0[k] > c0[a] ? k : a); has('sx-route', 0, `Expert ${top0} takes ${c0[top0]} of the 20`);
    has('sx-route', 1, 'experts ' + [0, 1, 2].map(l => X.e1(l, 3)).join(', ') + ' and ' + X.e1(3, 3));
    n++; if (X.tokens[3] !== 'loop' || X.tokens[17] !== 'loop' || X.tokens[19] !== 'loop' || X.tokens[2] !== '_' || X.tokens[13] !== '_' || X.tokens[16] !== '_') bad.push('the linked tokens are not loop and _');
    n++; if (![0, 1, 2, 3].every(l => X.e1(l, 3) === X.e1(l, 17) && X.e1(l, 17) === X.e1(l, 19))) bad.push('loop does not keep its expert at every layer');
    n++; if (![0, 1, 3].every(l => X.e1(l, 2) === X.e1(l, 13) && X.e1(l, 13) === X.e1(l, 16)) || X.e1(2, 2) === X.e1(2, 13)) bad.push('_ agreement is not layers 0, 1 and 3');
    has('sx-route', 2, `split ${X.e1(2, 2)}, ${X.e1(2, 13)}, ${X.e1(2, 16)}`);
    const P = RT.pred; has('sx-route', 2, P.slice(0, 3).map(x => p0(x.token)).join(', ') + ' and ' + p0(P[3].token) + '%'); has('sx-route', 2, P.slice(0, 3).map(x => p0(x.domain)).join(', ') + ' and ' + p0(P[3].domain) + '%');
    has('sx-route', 3, `${X.pairs} of the ${N - 1} consecutive pairs`); has('sx-route', 3, pc(RT.rep.github[2].first)); has('sx-route', 3, `takes ${cnt(2)[2]} of these 20`);
    let dp = 0, dx = 0, m = 0; for (const d of ['github', 'gutenberg', 'wikipedia']) for (const l of [1, 2, 3]) { const q = RT.rep[d][l]; dp += q.first - q.first_shuf; dx += q.first - .125; m++ }
    has('sx-route', 4, (100 * dx / m).toFixed(1) + ' points above 12.5%'); has('sx-route', 4, 'only ' + (100 * dp / m).toFixed(1) + ' points above shuffled');
    has('sx-route', 4, pc(RT.rep.dm_math[0].first) + ', shuffled ' + pc(RT.rep.dm_math[0].first_shuf));
    const T5 = PAPER.tables.t5.rows, col = i => T5.map(r => parseFloat(r[i])), rg = a => Math.min(...a).toFixed(1) + ' to ' + Math.max(...a).toFixed(1) + '%';
    has('sx-route', 5, rg(col(1))); has('sx-route', 5, rg(col(2)));
    const dm = T5.find(r => r[0] === 'DM Mathematics'); has('sx-route', 5, dm[3] + ' against ' + pc(PAPER.rc.t5_first_usage_baseline['31']['DM Mathematics']));
    // the decode animation: recompute.py's roofline
    const RC = PAPER.rc, at = (m, B) => RC.decode[m].find(r => r.B === B), gb = v => (v / 1e9).toFixed(1) + ' GB', ms = t => t >= 0.1 ? (t * 1e3).toFixed(0) + ' ms' : (t * 1e3).toFixed(1) + ' ms';
    const xf = v => (v >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(/\.0+$/, '') + 'x', f = v => Math.round(v).toLocaleString('en-GB');
    const BS = [1, 2, 4, 8, 16, 64, 1024, 2048], M = 'mixtral_8x7b', L70 = 'llama2_70b', L13 = 'llama2_13b';
    has('sx-dec-mx', 0, gb(at(M, 1).bytes) + ', ' + ms(at(M, 1).t)); has('sx-dec-mx', 0, xf(RC.speedup_vs_70b[1]) + ' faster');
    has('sx-dec-mx', 1, at(M, 2).experts.toFixed(1) + ' experts'); has('sx-dec-mx', 1, gb(at(M, 2).bytes));
    [[2, 4], [3, 8], [4, 16]].forEach(([k, B]) => has('sx-dec-mx', k, at(M, B).experts.toFixed(2)));
    has('sx-dec-mx', 2, gb(at(M, 4).bytes)); has('sx-dec-mx', 3, gb(at(M, 8).bytes)); has('sx-dec-mx', 4, gb(at(M, 64).bytes));
    has('sx-dec-mx', 5, ms(at(M, 64).t)); has('sx-dec-mx', 5, xf(RC.ratio_vs_13b[64]) + ' slower'); has('sx-dec-mx', 5, xf(RC.speedup_vs_70b[64]) + ' faster');
    has('sx-dec-mx', 6, f(RC.crossover[M]) + ' sequences'); has('sx-dec-mx', 6, 'against ' + RC.crossover[L70]); has('sx-dec-mx', 6, xf(RC.speedup_vs_70b[1024]));
    has('sx-dec-mx', 7, xf(RC.speedup_vs_70b[2048]) + ' cheaper');
    has('sx-dec-l70', 0, gb(at(L70, 1).bytes) + ', ' + ms(at(L70, 1).t)); [[1, 2], [2, 4], [3, 8], [4, 16], [5, 64]].forEach(([k, B]) => has('sx-dec-l70', k, f(at(L70, B).tok_s)));
    has('sx-dec-l70', 3, gb(at(M, 8).bytes)); has('sx-dec-l70', 3, xf(RC.speedup_vs_70b[8])); has('sx-dec-l70', 6, String(RC.crossover[L70])); has('sx-dec-l70', 6, ms(at(L70, 1024).t)); has('sx-dec-l70', 7, ms(at(L70, 2048).t));
    has('sx-dec-l13', 0, gb(at(L13, 1).bytes) + ', ' + ms(at(L13, 1).t)); [[1, 2], [2, 4], [3, 8], [4, 16], [5, 64]].forEach(([k, B]) => has('sx-dec-l13', k, f(at(L13, B).tok_s)));
    has('sx-dec-l13', 3, xf(RC.ratio_vs_13b[8])); has('sx-dec-l13', 5, xf(RC.ratio_vs_13b[64])); has('sx-dec-l13', 6, ms(at(L13, 1024).t)); has('sx-dec-l13', 7, ms(at(L13, 2048).t));
    ['sx-dec-mx', 'sx-dec-l70', 'sx-dec-l13'].forEach(id => BS.forEach((B, k) => has(id, k, 'Batch ' + B.toLocaleString('en-GB') + '.')));
    return { bad, n } });
  r.bad.forEach(x => problems.push('numbers: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
