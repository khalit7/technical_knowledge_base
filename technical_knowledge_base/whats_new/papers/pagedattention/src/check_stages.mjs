// The 2026-11-06 layout and motion checks for the PagedAttention page (after Latent Context LMs'), at 1400 px light, 920 px light and 390 px dark:
// the 3D stage (#stg-hero, Fig. 1: the paper's KV cache waste to scale) plays by itself once scrolled into view, steps to its last step, has exactly
// one step-list item per step, and stops drawing off screen; the two 2D animations (#bt, block tables, Reading; #kv, the toy KV cache, Simulate)
// play once in view, have one list item per step in each mode (one list visible at a time), replay on a mode switch and stop for good on a reader
// control; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by
// itself. Numbers: every figure the hero's step list states (Table 1's slots, Figure 2, Figure 13a, the simulator's averages) against PAPER, and
// every event the toy's stretch lists name (who is admitted, finishes, is preempted, at which iteration) against the simulator's own trace.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/pagedattention/src/check_stages.mjs [shots dir]
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
const ANIMS = { bt: { tab: 't-read', lists: { one: 'sx-bt1', two: 'sx-bt2', par: 'sx-bt3', beam: 'sx-bt4' } },
  kv: { tab: 't-run', lists: { max: 'sx-kv1', pow2: 'sx-kv2', oracle: 'sx-kv3', vllm: 'sx-kv4' } } };
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
      if (!(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); await wait(1700); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-s${k + 1}-${scheme}-${width}.png` }) }
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
    }
    for (const [id, A] of Object.entries(ANIMS)) {
      if (A.tab !== t) continue;
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (!(await p.$eval('#' + id, e => +e.dataset.frames || 0)) || !(await p.$eval('#' + id, e => e.dataset.playing === '1'))) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      for (const [m, lid] of Object.entries(A.lists)) {
        await clk(`#${id}M button[data-m=${m}]`); await wait(1200);
        if (!(await p.$eval('#' + id, e => e.dataset.playing === '1'))) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const n = await p.$eval(`#${id}Scrub`, e => +e.max / 100);
        const vis = await p.$$eval(`#${t} ol.sx:not([hidden])`, ls => ls.map(l => [l.id, l.children.length]).filter(x => /^sx-(bt|kv)/.test(x[0])));
        if (vis.length !== 1 || vis[0][0] !== lid || vis[0][1] !== n) problems.push(`${tag}: ${id} ${m}: visible lists ${JSON.stringify(vis)} for ${n} steps`);
        await clk(`#${id}Fwd`); await wait(100);
        if (await p.$eval('#' + id, e => e.dataset.playing === '1')) problems.push(`${tag}: ${id} ${m} still playing after a reader control`);
        for (let k = 1; k < n; k++) { await clk(`#${id}Fwd`); if (k === Math.floor(n / 2)) { await wait(150); await (await p.$('#' + id)).screenshot({ path: `${shots}/anim-${id}-${m}-mid-${scheme}-${width}.png` }) } }
        const on = await p.$eval('#' + lid, l => [...l.children].findIndex(x => x.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${id} ${m} list marks item ${on + 1} at the last step`);
        await wait(1500); if (await p.$eval('#' + id, e => e.dataset.playing === '1')) problems.push(`${tag}: ${id} ${m} restarted by itself after a control`);
      }
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
  await p.$eval('#stg-hero', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const d0 = await p.$eval('#stg-hero', e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#stg-hero', e => +e.dataset.draws || 0);
  const f = await p.$eval('#stg-hero', e => +e.dataset.frames || 0), pl = await p.$eval('#stg-hero-p', e => /Pause/.test(e.textContent));
  if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: stg-hero moved by itself (frames ${f}, redraws ${d1 - d0})`);
  for (const [id, A] of Object.entries(ANIMS)) {
    await p.$eval(`#tabs button[data-t=${A.tab}]`, e => e.click()); await wait(300);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2500);
    const fc = await p.$eval('#' + id, e => +e.dataset.frames || 0), pc = await p.$eval('#' + id, e => e.dataset.playing === '1');
    if (fc > 0 || pc) problems.push(`reduced motion: ${id} moved by itself (frames ${fc})`);
  }
  await p.close() }
{ // numbers: the hero's step list against the paper's figures and the simulator; the toy's stretch lists against the simulator's trace
  const p = await b.newPage(); await p.goto(file); await wait(500);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const items = id => [...document.getElementById(id).children].map(li => li.textContent.replace(/\s+/g, ' '));
    const has = (L, i, s, w) => { n++; if (!L[i].includes(s)) bad.push((w || 'hero') + ' step ' + (i + 1) + ': expected "' + s + '"') };
    const TB = PAPER.tables, SC = PAPER.simchk, F2 = n2 => TB.fig2.rows.find(r => r.sys === n2), F13 = TB.fig13.ShareGPT;
    const g = v => v.toLocaleString('en-GB'), pc = v => v.toFixed(1) + '%';
    const L = items('sx-hero');
    has(L, 0, g(Math.floor(PAPER.rc.slots_13b))); has(L, 0, '800 KiB'); n++; if (PAPER.rc.kv_per_token_bytes['OPT-13B'] !== 800 * 1024) bad.push('800 KiB per token');
    has(L, 1, '⌊15,728 / 2,048⌋ = ' + Math.floor(15728 / 2048));
    const sys = [['Orca (Max)', 'max', 1], ['Orca (Pow2)', 'pow2', 2], ['Orca (Oracle)', 'oracle', 3]];
    for (const [nm, k, i] of sys) { const f = F2(nm), s = SC['sharegpt_' + k];
      ['token', 'resv', 'internal', 'external'].forEach(c => { if (f[c] != null) has(L, i, pc(f[c])) });
      ['token', 'resv', 'external'].forEach(c => has(L, i, pc(s[c])));
      if (k !== 'oracle') has(L, i, pc(s.internal)); else { n++; if (s.internal !== 0) bad.push('Oracle internal not 0') }
      has(L, i, F13[nm].toFixed(2)); if (k !== 'max') has(L, i, s.batch.toFixed(2)); else { n++; if (s.batch.toFixed(2) !== '7.00') bad.push('Max batch') } }
    has(L, 4, pc(F2('vLLM').token)); has(L, 4, pc(SC.sharegpt_vllm.token)); has(L, 4, F13.vLLM.toFixed(2)); has(L, 4, SC.sharegpt_vllm.batch.toFixed(2)); has(L, 4, g(Math.floor(15728 / 16)) + ' blocks');
    ['Orca (Max)', 'Orca (Pow2)', 'Orca (Oracle)', 'vLLM'].forEach(s => has(L, 5, F13[s].toFixed(2)));
    has(L, 5, (F13.vLLM / F13['Orca (Oracle)']).toFixed(2) + '×'); has(L, 5, (F13.vLLM / F13['Orca (Max)']).toFixed(2) + '×');
    n++; const hs = window.__heroSnap && window.__heroSnap(); if (!hs || hs[0].run !== 7) bad.push('hero snapshot: Orca (Max) should run 7 requests, got ' + (hs && hs[0].run));
    // the toy: stretch titles, last iteration, and every named event at its iteration
    const LET = 'ABCDEFGH', ev = (m, it) => { const S = toyRuns[m][it - 1]; return S ? S.ev.map(e => e[0] + LET[e[1] - 1]) : [] };
    const C = { max: [[7, 'finA admC'], [10, 'finB admD'], [11, 'finC admE'], [14, 'finE admF'], [22, 'finF admG'], [24, 'finD admH'], [29, 'finG finH'], [1, 'admA admB']],
      pow2: [[1, 'admA admB admC'], [5, 'finC'], [7, 'finA admD'], [10, 'finB admE admF'], [13, 'finE'], [18, 'finF admG'], [21, 'finD admH'], [25, 'finG'], [26, 'finH']],
      oracle: [[1, 'admA admB admC'], [5, 'finC admD'], [7, 'finA admE'], [10, 'finB finE admF'], [18, 'finF admG'], [19, 'finD admH'], [24, 'finH'], [25, 'finG']],
      vllm: [[1, 'admA admB admC admD admE admF admG'], [2, 'preG blkC blkF'], [3, 'blkA blkB'], [4, 'finE admG'], [5, 'preG finC'], [6, 'admG admH'], [7, 'preH blkA blkB finA'], [8, 'admH'], [9, 'finF'], [10, 'finB'], [13, 'finG finH'], [15, 'finD']] };
    const total = { max: 29, pow2: 26, oracle: 25, vllm: 15 }, lid = { max: 'sx-kv1', pow2: 'sx-kv2', oracle: 'sx-kv3', vllm: 'sx-kv4' };
    for (const m in C) { n++; if (toyRuns[m].length !== total[m]) bad.push(m + ': ' + toyRuns[m].length + ' iterations, lists say ' + total[m]);
      n++; const S = TOYSTR[m]; if (S[S.length - 1][1] !== toyRuns[m].length) bad.push(m + ': stretches end at ' + S[S.length - 1][1]);
      for (let i = 1; i < S.length; i++) { n++; if (S[i][0] !== S[i - 1][1] + 1) bad.push(m + ': stretch ' + (i + 1) + ' does not follow on') }
      const LL = items(lid[m]); n++; if (LL.length !== S.length) bad.push(m + ': ' + LL.length + ' list items for ' + S.length + ' stretches');
      LL.forEach((t, i) => { n++; if (!t.startsWith(toyModes[m][i].t)) bad.push(m + ' item ' + (i + 1) + ' should start "' + toyModes[m][i].t + '"') });
      C[m].forEach(([it, es]) => es.split(' ').forEach(e => { n++; if (!ev(m, it).includes(e)) bad.push(m + ' iteration ' + it + ': no ' + e + ' (has ' + ev(m, it).join(' ') + ')') })) }
    n++; const pre = toyRuns.vllm.reduce((a, S) => a + S.ev.filter(e => e[0] === 'pre').length, 0); if (pre !== 3) bad.push('vLLM toy: ' + pre + ' preemptions, list says three');
    n++; if (Math.max(...toyRuns.vllm.map(S => S.run.length)) !== 7) bad.push('vLLM toy: up to seven at once');
    n++; if (Math.max(...toyRuns.max.map(S => S.run.length)) !== 2) bad.push('Max toy: two at a time');
    return { bad, n } });
  r.bad.forEach(x => problems.push('numbers: ' + x)); console.log('step-list numbers and events checked', r.n);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
