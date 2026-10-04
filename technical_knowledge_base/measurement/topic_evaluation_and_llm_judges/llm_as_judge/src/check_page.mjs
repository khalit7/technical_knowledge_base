// Exercise every control of the page at 390 dark and 920 light; check no errors, no NaN/undefined/Infinity in visible text,
// no sideways scroll, SVG text at least 11 px on screen; and compare the page's computed numbers with src/recompute.json.
// usage (from the repo root): node technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/llm_as_judge/src/check_page.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html');
const shots = path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const R = JSON.parse(fs.readFileSync(path.resolve(here, 'recompute.json'), 'utf8'));
const b = await puppeteer.launch({ headless: 'shell' });
const problems = []; let actions = 0;
const near = (a, b, tol, what) => { if (!(Math.abs(a - b) <= tol)) problems.push(`MISMATCH ${what}: page ${a} recompute ${b}`) };
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(file, { waitUntil: 'load' });
  const audit = async (where) => {
    const r = await p.evaluate(() => {
      const small = [];
      document.querySelectorAll('.tab:not([hidden]) svg text').forEach(t => {
        const m = t.ownerSVGElement && t.ownerSVGElement.getScreenCTM(); if (!m) return;
        const fs = parseFloat(getComputedStyle(t).fontSize) * m.a;
        if (fs < 10.95 && t.getBoundingClientRect().width > 0) small.push(t.textContent.slice(0, 20) + ' ' + fs.toFixed(1));
      });
      const vis = [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join(' ');
      const bad = (vis.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []);
      const err = document.getElementById('jsErr');
      return { small, bad, side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, err: err && !err.hidden ? err.textContent : '' };
    });
    if (r.small.length) problems.push(`${scheme}${width} ${where}: small svg text ${r.small.slice(0, 3).join(' | ')}`);
    if (r.bad.length) problems.push(`${scheme}${width} ${where}: ${r.bad.slice(0, 3).join(' | ')}`);
    if (r.side) problems.push(`${scheme}${width} ${where}: sideways scroll`);
    if (r.err) problems.push(`${scheme}${width} ${where}: errbox ${r.err}`);
  };
  const click = async (sel) => { const n = (await p.$$(sel)).length; for (let i = 0; i < n; i++) { const e = (await p.$$(sel))[i]; if (!e) break; await e.evaluate(x => x.scrollIntoView({ block: 'center' })); await e.click(); actions++; } return n };
  const tab = async (t) => { await p.click(`#tabs button[data-t="${t}"]`); actions++; await new Promise(r => setTimeout(r, 150)) };
  const selectAll = async (sel, after) => { const vals = await p.$$eval(sel + ' option:not([disabled])', os => os.map(o => o.value)); for (const v of vals) { await p.select(sel, v); actions++; if (after) await after(v) } return vals };
  // Reading
  await tab('t-read'); await audit('read');
  await click('#calm-seg button'); await click('#calm-seg button[data-m="rr"]');
  for (const i of [0, 3, 6]) { await click(`#calm-tbl th[data-k="${i}"]`); }
  for (let i = 0; i < 54; i += 5) { const c = (await p.$$('#calm-tbl td.v'))[i]; await c.evaluate(x => x.scrollIntoView({ block: 'center' })); await c.click(); actions++ }
  await audit('read calm');
  for (const m of ['naive', 'corr']) {
    await click(`#an-mode button[data-m="${m}"]`);
    await selectAll('#an-target', async () => {
      await selectAll('#an-m', async () => {
        for (let k = 0; k < 8; k++) await click('#an-ctl-f');
        await audit('anim ' + m);
      });
    });
  }
  await p.select('#an-target', '2'); await p.select('#an-m', '100'); await click('#an-mode button[data-m="corr"]');
  for (let k = 0; k < 8; k++) await click('#an-ctl-f');
  await click('#an-ctl-b'); await click('#an-ctl-b');
  await p.$eval('#an-ctl-s', s => { s.value = s.max; s.dispatchEvent(new Event('input')) }); actions++;
  await p.select('#an-ctl-v', '2'); await click('#an-ctl-p'); await new Promise(r => setTimeout(r, 300)); await click('#an-ctl-p');
  await p.$eval('#an-ctl-s', s => { s.value = s.max; s.dispatchEvent(new Event('input')) });
  const animTxt = await p.$eval('#an-cnt', e => e.innerText);
  await p.$eval('#an-card', e => e.scrollIntoView()); await p.screenshot({ path: `${shots}/chk-anim-${scheme}-${width}.png` });
  await audit('anim end');
  // numbers in the animation against recompute (GPT-3.5-turbo, 100 labels, seed 1)
  const c35 = R.calibration['gpt-3.5-turbo_P'];
  const est = await p.evaluate(() => { const L = window.LJ; const I = L.items(2, 'P'); const C = L.calib(I, 100, 1); return { p: C.p, th: C.th, est: C.c.est, lo: C.c.lo, hi: C.c.hi, tp: C.tp, fn: C.fn, fp: C.fp, tn: C.tn } });
  near(est.est, c35.seed1_m100.est, 1e-4, 'anim est'); near(est.lo, c35.seed1_m100.lo, 1e-4, 'anim lo'); near(est.hi, c35.seed1_m100.hi, 1e-4, 'anim hi');
  near(est.tp, c35.seed1_m100.tp, 0, 'anim tp'); near(est.fp, c35.seed1_m100.fp, 0, 'anim fp');
  if (!animTxt.includes((100 * c35.seed1_m100.est).toFixed(1) + '%')) problems.push('anim counter does not show the corrected estimate: ' + animTxt.replace(/\n/g, ' '));
  // Protocol lab
  await tab('t-proto'); await audit('proto');
  for (const sc of ['all', 'nov', 'g35']) {
    await p.select('#pl-scope', sc); actions++;
    for (const v of ['all', 'e']) { await p.select('#pl-vot', v); actions++;
      for (const t of ['0', '1', '2']) { await p.select('#pl-turn', t); actions++;
        for (const ti of ['0', '1']) { await p.select('#pl-ties', ti); actions++; await click('#pl-tbl tr[data-p]'); }
      } }
    await click('#pl-g4'); await audit('proto ' + sc + ' noG4'); await click('#pl-g4');
  }
  await click('#pl-t5'); await audit('proto t5');
  await p.select('#pl-scope', 'g35'); await p.select('#pl-vot', 'all'); await p.select('#pl-turn', '0'); await p.select('#pl-ties', '0');
  const lab = await p.evaluate(() => { const L = window.LJ, o = { scope: 'g35' }; return ['F', 'B', 'FB', 'P', 'S'].map(x => { const r = L.agree(x, o); return [x, r.n, r.agree, r.kappa, r.ties] }) });
  for (const [x, n, a, k, t] of lab) { const r = R.lab.g35_S1_all[x]; near(n, r.n, 0, 'lab n ' + x); near(100 * a, r.agree, 0.006, 'lab agree ' + x); near(k, r.kappa, 6e-5, 'lab kappa ' + x); near(100 * t, r.ties, 0.006, 'lab ties ' + x) }
  const t5 = await p.evaluate(() => { const L = window.LJ; return [1, 2].flatMap(t => [false, true].map(s => { const o = { scope: 'all', experts: true, turn: t, noties: s }; const a = L.agree('P', o), h = L.humans(o); return [t, s, a.n, a.agree, h.n, h.agree] })) });
  for (const [t, s, n, a, hn, ha] of t5) { const r = R.table5_repro[`t${t}_${s ? 'S2' : 'S1'}`]; near(n, r.g4pair_vs_human.n, 0, 't5 n'); near(100 * a, r.g4pair_vs_human.agree, 0.006, 't5 agree'); near(hn, r.human_vs_human.n, 0, 't5 hn'); near(100 * ha, r.human_vs_human.agree, 0.006, 't5 hh') }
  const rho = await p.evaluate(() => { const L = window.LJ, W = L.winRates('P', { scope: 'all' }); return L.spearman(W.map(w => w.h), W.map(w => w.j)) });
  near(rho, R.list_P_all.spearman, 1e-4, 'spearman');
  await p.screenshot({ path: `${shots}/chk-proto-${scheme}-${width}.png`, fullPage: true });
  // Calibration lab
  await tab('t-cal'); await audit('cal');
  for (const j of ['P', 'S']) { await p.select('#cl-j', j); actions++;
    await selectAll('#cl-t', async () => { await click('#cl-new'); await audit('cal ' + j) }); }
  await p.select('#cl-j', 'P'); await p.select('#cl-t', '2'); await click('#cl-reset');
  for (const m of ['20', '200', '400', '100']) { await p.$eval('#cl-m', (s, v) => { s.value = v; s.dispatchEvent(new Event('input')) }, m); actions++; await audit('cal m ' + m) }
  await click('#cl-run'); await click('#cl-curve'); await audit('cal runs');
  const rep = await p.$eval('#cl-repn', e => e.innerText);
  const d = R.calibration['gpt-3.5-turbo_P'].draws200;
  if (!rep.includes(`${d.covered} of ${d.usable}`)) problems.push(`200 draws coverage: page "${rep.slice(0, 160)}" recompute ${d.covered} of ${d.usable}`);
  for (const [t, key] of [[0, 'gpt-4_P'], [5, 'llama-13b_P'], [4, 'alpaca-13b_P']]) {
    await p.select('#cl-t', String(t)); await click('#cl-run');
    const txt = await p.$eval('#cl-repn', e => e.innerText); const dd = R.calibration[key].draws200;
    if (!txt.includes(`${dd.covered} of ${dd.usable}`)) problems.push(`200 draws ${key}: page "${txt.slice(0, 120)}" recompute ${dd.covered} of ${dd.usable}`);
    await audit('cal run ' + key);
  }
  await p.select('#cl-t', '2'); await click('#cl-run'); await click('#cl-curve');
  await p.screenshot({ path: `${shots}/chk-cal-${scheme}-${width}.png`, fullPage: true });
  await tab('t-more'); await audit('more');
  // tab links from the Reading tab
  await tab('t-read'); const n = await p.$$eval('#t-read a[data-tab]', as => as.length);
  for (let i = 0; i < n; i++) { await tab('t-read'); const as = await p.$$('#t-read a[data-tab]'); await as[i].evaluate(a => a.scrollIntoView({ block: 'center' })); await as[i].click(); actions++; }
  await audit('links');
  if (errs.length) problems.push(`${scheme}${width}: console ${errs.slice(0, 3).join(' | ')}`);
  await p.close();
}
await b.close();
console.log(`actions ${actions}, problems ${problems.length}`);
for (const x of [...new Set(problems)].slice(0, 40)) console.log(x);
