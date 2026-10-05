// Whole-page check: every tab and control at 390 px dark and 920 px light (page errors, NaN, undefined, sideways scroll);
// the checkpoint simulator's JavaScript against src/recompute.py (the default day's totals, the exact optimum, the swing trace);
// screenshots per tab and per Reading section to ../../.shots/own/ (gitignored).
// usage: node <page>/src/check/check_page.mjs   (puppeteer from html_utils/node_modules)
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../../..');
const require = createRequire(path.join(repo, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const pageFile = path.resolve(here, '../../index.html');
const exp = JSON.parse(fs.readFileSync(path.resolve(here, '../out/expected.json'), 'utf8'));
const shots = process.argv[2] || path.resolve(here, '../../.shots/own');
fs.mkdirSync(shots, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let bad = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const close = (a, b, tol) => Math.abs(a - b) <= tol;
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.setViewport({ width: w, height: 900 });
  await p.goto('file://' + pageFile);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  // JS engine against the Python reference (before any control is touched)
  const js = await p.evaluate(() => {
    const E = window.PWE, S = window.PW.sim_defaults;
    const f = E.arrivals(S.seed, S.mu, S.horizon);
    const lane = T => { const r = E.simulate(f, T, S.C, S.D, S.R, S.horizon); return r };
    return { nf: f.length, f, bad: lane(S.bad), young: lane(E.tYoung(S.mu, S.C)), topt: E.tOpt(S.mu, S.C, S.D, S.R) * 60,
      effY: E.effExact(E.tYoung(S.mu, S.C), S.mu, S.C, S.D, S.R) };
  });
  for (const k of ['committed', 'lost', 'ck', 'down', 'fails'])
    for (const ln of ['bad', 'young'])
      if (!close(js[ln][k], exp['day_' + ln][k], 1e-3)) { console.log('FAIL engine', ln, k, js[ln][k], exp['day_' + ln][k]); bad++; }
  if (js.f.some((x, i) => !close(x, exp.day_fails_h[i], 1e-3)) || js.nf !== exp.day_fails_h.length) { console.log('FAIL arrivals'); bad++; }
  if (!close(js.topt, exp.sim_T_opt_min, 0.01)) { console.log('FAIL t_opt', js.topt); bad++; }
  if (!close(js.effY, exp.sim_eff_exact_young, 1e-3)) { console.log('FAIL eff young', js.effY); bad++; }
  for (const tab of ['t-read', 't-ckpt', 't-gw', 't-more']) {
    await p.evaluate(t => document.querySelector('#tabs button[data-t="' + t + '"]').click(), tab);
    await sleep(300);
    if (tab === 't-read') {
      // let the swing animation finish in both modes, and screenshot each section
      await p.evaluate(async () => {
        const go = async () => { const s = document.getElementById('pw-swing-ctl-s'); s.value = s.max; s.dispatchEvent(new Event('input', { bubbles: true })); };
        document.getElementById('pw-swing-card').scrollIntoView(); await new Promise(r => setTimeout(r, 200)); await go();
      });
      const sw = await p.evaluate(() => [...document.querySelectorAll('#pw-swing-out .v')].map(e => e.textContent));
      if (!sw[1] || !sw[1].startsWith(String(exp.swing_raw_pp_mw.toFixed(1)))) { console.log('FAIL swing raw', sw, exp.swing_raw_pp_mw); bad++; }
      await p.evaluate(() => document.querySelector('#pw-swing-seg button[data-m="smooth"]').click());
      const sw2 = await p.evaluate(() => [...document.querySelectorAll('#pw-swing-out .v')].map(e => e.textContent));
      if (!sw2[1].startsWith(String(exp.swing_smooth_pp_mw.toFixed(1))) || !sw2[2].includes(String(exp.swing_energy_overhead_pct.toFixed(1)))) { console.log('FAIL swing smooth', sw2, exp.swing_smooth_pp_mw, exp.swing_energy_overhead_pct); bad++; }
      const ids = await p.evaluate(() => [...document.querySelectorAll('#t-read section')].map(s => s.id));
      for (const id of ids) {
        const el = await p.$('#' + id);
        await p.evaluate(i => document.getElementById(i).scrollIntoView(), id); await sleep(150);
        await el.screenshot({ path: path.join(shots, `${id}-${scheme}-${w}.png`) });
      }
    }
    if (tab === 't-ckpt') {
      // the animation at its last step must show the Python day totals
      await p.evaluate(() => { const s = document.getElementById('ck-ctl-s'); s.value = s.max; s.dispatchEvent(new Event('input', { bubbles: true })); });
      const v = await p.evaluate(() => [...document.querySelectorAll('#ck-out .v')].map(e => e.textContent));
      const want = [exp.day_bad.committed, exp.day_young.committed].map(x => x.toFixed(1) + ' h saved');
      if (v[0] !== want[0] || v[1] !== want[1]) { console.log('FAIL day totals', v, want); bad++; }
      await p.screenshot({ path: path.join(shots, `t-ckpt-end-${scheme}-${w}.png`), fullPage: true });
    }
    if (tab === 't-gw') {
      const n = await p.evaluate(() => document.querySelector('#gw-tab tr:nth-child(3) td:nth-child(2)').textContent);
      if (n.replace(/,/g, '') !== String(exp.root_check_b200_per_gw)) { console.log('FAIL gw B200', n); bad++; }
    }
    const n = await p.evaluate(async (t) => {
      const root = document.getElementById(t); let c = 0;
      for (const b of [...root.querySelectorAll('button')]) { if (b.offsetParent === null) continue; b.click(); c++; await new Promise(r => setTimeout(r, 30)); }
      for (const r of root.querySelectorAll('input[type=range]')) { for (const v of [r.min, r.max, Math.round((+r.min + +r.max) / 2)]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); c++; await new Promise(r => setTimeout(r, 20)); } }
      for (const r of root.querySelectorAll('input[type=number]')) { for (const v of [r.min, r.max, r.defaultValue]) { r.value = v; r.dispatchEvent(new Event('change', { bubbles: true })); c++; await new Promise(r => setTimeout(r, 30)); } }
      for (const s of root.querySelectorAll('select')) { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); c++; } }
      return c;
    }, tab);
    await sleep(300);
    const txt = await p.evaluate(t => document.getElementById(t).innerText, tab);
    const nan = /\bNaN\b|undefined|Infinity/.test(txt);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    console.log(`${scheme} ${w} ${tab}: controls ${n}, NaN/undefined ${nan}, sideways ${side}`);
    if (nan || side) bad++;
    await p.screenshot({ path: path.join(shots, `${tab}-${scheme}-${w}.png`), fullPage: true });
  }
  const box = await p.evaluate(() => { const e = document.getElementById('jsErr'); return e && !e.hidden ? e.textContent : '' });
  if (errs.length || box) { console.log('ERRORS', scheme, errs, box); bad++; }
  await p.close();
}
await browser.close();
console.log(bad ? `FAIL ${bad}` : 'ALL OK');
process.exit(bad ? 1 : 0);
