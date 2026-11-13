// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-meth, the four stages of Eq. 8 in both forms of distillation, a mode toggle swapping its step list;
// #stg-rt, the released session's 16 library reads through the router, on the Follow the router tab) play by themselves once scrolled
// into view, step to their last step, have exactly one step-list item per step, stop drawing off screen and stop for good on a reader
// control; the mode toggle replays the method stage with the other list; at 1400 px every split shows two columns; no errors, NaN,
// undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; and every number the static step lists state
// matches the page's data (window.R2S_METH from LIB.hub, window.R2S_RT from LIB.reads, LIB.areas and LIB.detail, window.R2S_CMP).
// Writes a mid-step screenshot of each stage (and of each mode of the method stage).
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/repo_to_skill/src/check_stages.mjs [shots dir]
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
const listOf = (p, id) => p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
const MODES = { 'stg-meth': ['mtM', ['ag', 'to']] };
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
    // the split: two columns side by side at 1100 px and wider
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      if (!(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      // flows stop drawing off screen
      await p.evaluate(id => { const e = document.getElementById(id), y = e.getBoundingClientRect().top + scrollY; window.scrollTo(0, y > 3000 ? 0 : document.body.scrollHeight) }, id); await wait(500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      const [seg, modes] = MODES[id] || [null, [null]];
      for (const m of modes) {
        await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
        if (m) { await clk(`#${seg} button[data-m=${m}]`); await wait(600);
          if (!(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} did not replay after switching to ${m}`) }
        const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await listOf(p, id);
        if (lis !== n) problems.push(`${tag}: ${id} ${m || ''} has ${n} steps but ${lis} list items`);
        // a reader control stops autoplay for good; step to the last step with the forward button, a screenshot in the middle
        await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
        for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}${m ? '-' + m : ''}-mid-${scheme}-${width}.png` }) } }
        await wait(2000);
        const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m || ''} ended on "${shown}"`);
        const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
        if (on !== n - 1) problems.push(`${tag}: ${id} ${m || ''} list marks item ${on + 1} at the last step`);
        if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
        // a list item click jumps to its step and does not start playing
        await p.evaluate(id => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[1].click(), id); await wait(300);
        if ((await p.$eval(`#${id} .stg-st`, e => e.textContent)) !== `step 2 of ${n}`) problems.push(`${tag}: ${id} ${m || ''} list click did not go to step 2`);
      }
      if (seg) await clk(`#${seg} button[data-m=${modes[0]}]`);
    }
    const r = await p.evaluate(t => { const el = document.getElementById(t); const txt = el.innerText;
      return { bad: (txt.match(/.{0,30}(?<![-\w])(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth } }, t);
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
{ // the numbers the static step lists state are the ones the page's data holds
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => ({ M: window.R2S_METH, T: window.R2S_RT, C: window.R2S_CMP,
    LA: [...document.getElementById('sx-meth-ag').children].map(li => li.innerText), LT: [...document.getElementById('sx-meth-to').children].map(li => li.innerText),
    LR: [...document.getElementById('sx-rt').children].map(li => li.innerText), out: document.getElementById('rpOut').innerText }));
  const say = (cond, msg) => { if (!cond) problems.push('step list: ' + msg) }, g = v => v.toLocaleString('en-GB');
  if (!r.M || !r.T || !r.C) problems.push('R2S_METH, R2S_RT or R2S_CMP missing'); else {
    const M = r.M, cnt = s => M.checks.filter(c => c === s).length, sel = s => M.sel.filter(x => x[1] === s).length;
    say(r.LA.length === 6 && r.LT.length === 6, `method lists ${r.LA.length} and ${r.LT.length} items`);
    say(M.checks.length === 12 && cnt('PASS') === 10 && cnt('WARN') === 1 && cnt('NOT_REQUESTED') === 1 && r.LA[4].includes('12 checks: 10 pass') && r.LA[4].includes('1 warning, 1 not requested'), `checks ${M.checks}`);
    say(sel('PASS') === M.native.PASS && sel('NATIVE_FAIL') === M.native.NATIVE_FAIL && sel('SKIP_UNSAFE') === M.native.SKIP_UNSAFE
      && r.LA[4].includes(`${sel('PASS')} pass, ${sel('NATIVE_FAIL')} native failures, ${sel('SKIP_UNSAFE')} excluded as unsafe`), `native selections ${JSON.stringify(M.native)}`);
    say(M.overall === 'verified-with-warnings' && r.LA[5].includes('"verified with warnings"'), `overall ${M.overall}`);
    say(r.LT[4].includes('up to 24 GPU-hours') && r.LT[5].includes('up to 24 GPU-hours'), 'MLE-bench budgets');
    const T = r.T, G = T.groups, L = r.LR, sec = x => String(x.t) + ' s';
    say(G.length === 6 && L.length === 7, `router steps ${G.length} groups, ${L.length} items`);
    G.forEach((x, i) => say(L[i] && L[i].includes('at ' + sec(x)), `router step ${i + 1} time ${x.t}`));
    say(L[0].includes(`(${g(G[0].b)} bytes)`) && L[1].includes(`(${g(G[1].b)} bytes)`) && L[2].includes(`At ${g(G[2].b)} bytes`) && L[3].includes(`(${g(G[3].b)} bytes together)`)
      && L[4].includes(`${G[4].n} files, ${g(G[4].b)} bytes`) && L[5].includes(`(${g(G[5].b)} bytes)`), `router step bytes ${G.map(x => x.b)}`);
    say(L[5].includes(`${G.reduce((a, x) => a + x.n, 0)} files and ${g(G[5].cum)} bytes in all, ${(100 * G[5].cum / T.lib).toFixed(3)}% of the library`), `router totals ${G[5].cum}`);
    say(L[2].includes(`its ${T.fam} repositories`) && L[3].includes(`vLLM's is ${g(T.graphs.vllm)} bytes, SGLang's ${g(T.graphs.sglang)}`), `family ${T.fam}, graphs ${JSON.stringify(T.graphs)}`);
    say(L[6].includes(`to ${T.hours.toFixed(1)} hours`) && L[6].includes(`${T.calls} tool calls`), `session ${T.hours} h, ${T.calls} calls`);
    say(r.out.includes(`router ${g(r.C[0])} bytes`) && r.out.includes(`up front ${g(r.C[1])}`) && r.out.includes(`whole ${g(r.C[2])}`) && r.C[0] === G[5].cum, `comparison ${r.C}`);
  }
  await p.close() }
await b.close();
console.log('stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
