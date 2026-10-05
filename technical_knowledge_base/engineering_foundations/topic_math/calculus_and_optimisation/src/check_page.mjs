// Exercise every control of the page at 390 px dark and 920 px light (reduced motion), compare the page's numbers with numbers.json,
// and take element screenshots into ../.shots/check/.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_math/calculus_and_optimisation/src/check_page.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const url = 'file://' + path.join(here, '../index.html');
const shots = path.join(here, '../.shots/check'); fs.mkdirSync(shots, { recursive: true });
const N = JSON.parse(fs.readFileSync(path.join(here, 'numbers.json'), 'utf8'));
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.log('FAIL', msg) } };
const num = s => parseFloat(String(s).replace('−', '-'));
const near = (a, b, tol, msg) => ok(Math.abs(num(a) - b) <= tol, msg + ': page ' + a + ' expected ' + b);
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await browser.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(url); await p.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p.reload(); await sleep(400);
  const tag = scheme + width;
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { try { await el.scrollIntoView(); await sleep(120); await el.screenshot({ path: path.join(shots, tag + '-' + name + '.png') }) } catch (e) { ok(false, tag + ' screenshot ' + name + ': ' + e.message) } } else ok(false, 'missing ' + sel) };
  const clk = sel => p.$eval(sel, b => b.click());
  const txt = sel => p.$eval(sel, e => e.textContent);
  const setRange = (sel, v) => p.$eval(sel, (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })) }, v);
  const bad = async where => { const t = await p.evaluate(() => [...document.querySelectorAll('.tab:not([hidden])')].map(e => e.innerText).join(' ')); ok(!/NaN|undefined|Infinity/.test(t), where + ': NaN/undefined/Infinity in text') };
  // ---- Reading ----
  await bad(tag + ' reading');
  const rt = await p.$eval('#t-read', e => e.innerText);
  for (const s of ['11.213', '0.974', '10.02', '1,790', '2,411', '0.519', '34.4', '0.493', '0.857', '1001.313', '6.0025', '1.768', '0.283', '0.471', '85.9', '1,855', '3.551', '2.539'])
    ok(rt.includes(s), tag + ' reading text has ' + s);
  // secant
  const H = [1, 0.1, 0.01, 0.001];
  for (let i = 0; i < 4; i++) { await setRange('#rd-sec-h', i); near(await txt('#rd-sec-slope'), N['sec_' + H[i]], 1e-6, 'secant ' + H[i]); near(await txt('#rd-sec-err'), N['linerr_' + H[i]], 1e-9, 'line error ' + H[i]) }
  await shot('#rd-sec-card', 'sec');
  await setRange('#rd-dir-a', 0); near(await txt('#rd-dir-d'), N.bowl_dir_x, 1e-3, 'dir east');
  await setRange('#rd-dir-a', 45); near(await txt('#rd-dir-d'), N.bowl_dir_45, 1e-3, 'dir 45'); await shot('#rd-dir-card', 'dir');
  await setRange('#rd-tay-a', 0); near(await txt('#rd-tay-o1'), N.exp_first, 1e-4, 'taylor 1'); near(await txt('#rd-tay-o2'), N.exp_second, 1e-4, 'taylor 2'); near(await txt('#rd-tay-true'), N.exp_true, 1e-4, 'taylor true');
  await setRange('#rd-tay-a', 1.2); await shot('#rd-tay-card', 'tay');
  await shot('#rd-hg-card', 'hess');
  await setRange('#rd-rate-k', 10); near(await txt('#rd-rate-b'), N.q_best_eta, 1e-4, 'best eta'); near(await txt('#rd-rate-r'), N.q_rate, 1e-3, 'rate at best'); ok((await txt('#rd-rate-n')) === '35', 'steps 35');
  await setRange('#rd-rate-e', 1050); ok((await txt('#rd-rate-out')).includes('diverges'), 'rate diverges above limit');
  await setRange('#rd-rate-e', 500); near(await txt('#rd-rate-r'), N.q_rate_1overL, 1e-3, 'rate at 1/L');
  await setRange('#rd-rate-k', 100); near(await txt('#rd-rate-br'), N.gd_kappa100, 1e-4, 'kappa 100 rate'); await shot('#rd-rate-card', 'rate');
  for (const m of ['sq', 'abs', 'lse', 'sin']) { await clk('#rd-chord-f button[data-m=' + m + ']'); for (const t of [0, 0.3, 0.5, 0.8, 1]) { await setRange('#rd-chord-t', t); await bad('chord ' + m) } }
  await clk('#rd-chord-f button[data-m=sq]'); await setRange('#rd-chord-t', 0.5); near(await txt('#rd-chord-fv'), N.chord_lhs, 1e-3, 'chord f'); near(await txt('#rd-chord-c'), N.chord_rhs, 1e-3, 'chord c');
  await clk('#rd-chord-f button[data-m=sin]'); await setRange('#rd-chord-t', 0.35); await shot('#rd-chord-card', 'chord-sin');
  await setRange('#rd-lag-a', 45); near(await txt('#rd-lag-f'), N.lag_f, 1e-3, 'lagrange f*'); await shot('#rd-lagfig-card', 'lag');
  near(await txt('#rd-xgb-w'), N.xgb_w, 1e-3, 'xgb w'); near(await txt('#rd-xgb-gain'), N.xgb_gain, 1e-3, 'xgb gain'); near(await txt('#rd-xgb-wl'), N.xgb_wL, 1e-3, 'xgb wL'); near(await txt('#rd-xgb-wr'), N.xgb_wR, 1e-3, 'xgb wR');
  await clk('#rd-xgb-ui button[data-i="3"]'); await bad('xgb flip'); await clk('#rd-xgb-ui button[data-s="1"]'); await bad('xgb split'); await shot('#rd-xgb-card', 'xgb');
  // GD vs Newton animation: sequences against recompute, then step through every frame
  for (const [m, s0] of [['gd', 0], ['nt', 0], ['gd', 8], ['nt', 8]]) {
    const seq = await p.evaluate((m, s0) => { CO_NW.set(m, s0); return CO_NW.seq() }, m, s0);
    const ref = N[(m === 'gd' ? 'od_gd_' : 'od_newton_') + s0];
    for (let i = 0; i < Math.min(seq.length, ref.length, 7); i++) near(seq[i], ref[i], 2e-3, 'anim ' + m + ' start ' + s0 + ' iterate ' + i);
    await clk('#rd-nw-seg button[data-m=' + m + ']'); await clk('#rd-nw-start button[data-m="' + s0 + '"]'); await sleep(50);
    await clk('#rd-nw-ctl-p'); await clk('#rd-nw-ctl-p'); // play then pause (reduced motion: play is allowed by click)
    const n = await p.$eval('#rd-nw-ctl-s', e => +e.max + 1);
    for (let i = 0; i < n; i++) { await setRange('#rd-nw-ctl-s', i); if (i % 4 === 0) await bad('anim ' + m + s0 + ' frame ' + i); if (width === 390 && m === 'nt' && i < 6) await shot('#rd-nw-card', 'nw-' + m + s0 + '-' + i) }
    if (m === 'nt' && s0 === 0) near(await txt('#rd-nw-w'), N.od_wstar, 2e-3, 'newton lands on w*');
    if (width === 920) await shot('#rd-nw-card', 'nw-' + m + s0 + '-end');
  }
  // real runs
  for (const x of ['it', 'fe']) { await clk('#rd-lrc-x button[data-m=' + x + ']'); await shot('#rd-lrc-card', 'lrc-' + x) }
  const tab = await p.$$eval('#rd-lrc-tab td[data-k]', t => t.map(e => [e.dataset.k, e.textContent]));
  for (const [k, v] of tab) { const exp = N.lr_iters[k]; ok(exp == null ? /not within/.test(v) : parseInt(v) === exp, 'race ' + k + ': ' + v + ' vs ' + exp) }
  for (const e of ['0.02', '0.05', '0.1', '0.2', '0.3']) { await p.$eval('#rd-eos-seg button[data-m="' + e + '"]', b => b.click()); near(await txt('#rd-eos-mean'), N['eos_' + e].late_mean, 0.006, 'eos mean ' + e); if (e === '0.2' || width === 390) await shot('#rd-eos-card', 'eos-' + e) }
  await shot('#rd-noise-card', 'noise'); await shot('#rd-sgdfig-card', 'sgd');
  // formulas render as MathML and none is wider than the page
  const wide = await p.evaluate(() => [...document.querySelectorAll('#t-read .dm')].filter(d => d.getBoundingClientRect().width > document.documentElement.clientWidth).length);
  ok(wide === 0, tag + ' display formulas wider than the page: ' + wide);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), tag + ' no sideways page scroll (reading)');
  // ---- Lab ----
  await clk('#tabs button[data-t=t-lab]'); await sleep(200);
  for (const fn of ['quad', 'rosen', 'saddle', 'logit']) {
    await clk('#lab-fn button[data-m=' + fn + ']');
    for (const me of ['gd', 'hb', 'nag', 'adam', 'newton', 'dnewton', 'sfn', 'bfgs']) {
      await clk('#lab-me button[data-m=' + me + ']'); await sleep(20);
      const mx = await p.$eval('#lab-k', e => +e.max); await setRange('#lab-k', Math.min(3, mx)); await bad('lab ' + fn + ' ' + me);
      if (width === 390 || ['newton', 'gd', 'sfn'].includes(me)) await shot('#t-lab .labgrid', 'lab-' + fn + '-' + me);
    }
  }
  // Newton on the quadratic: one step to the origin
  await clk('#lab-fn button[data-m=quad]'); await clk('#lab-me button[data-m=newton]'); await setRange('#lab-k', 1);
  const pt = (await txt('#lab-p')).replace(/[()]/g, '').split(',').map(num); ok(Math.abs(pt[0]) < 1e-9 && Math.abs(pt[1]) < 1e-9, 'lab newton quadratic one step: ' + pt);
  await setRange('#lab-kap', 50); await setRange('#lab-rot', 45); await setRange('#lab-k', 1);
  const pt2 = (await txt('#lab-p')).replace(/[()]/g, '').split(',').map(num); ok(Math.abs(pt2[0]) < 1e-9 && Math.abs(pt2[1]) < 1e-9, 'lab newton rotated kappa 50 one step');
  const ws = await p.evaluate(() => LAB.wstar); near(ws[0], N.lab_logit_wstar[0], 1e-3, 'lab logit w1*'); near(ws[1], N.lab_logit_wstar[1], 1e-3, 'lab logit w2*');
  // saddle: Newton from near the ridge converges to the saddle, saddle-free Newton to a minimum
  await clk('#lab-fn button[data-m=saddle]'); await clk('#lab-me button[data-m=newton]');
  let fin = await p.evaluate(() => { const r = LAB.st.run.P; return r[r.length - 1] }); ok(Math.hypot(fin[0], fin[1]) < 1e-6, 'newton goes to the saddle: ' + fin);
  await clk('#lab-me button[data-m=sfn]'); fin = await p.evaluate(() => { const r = LAB.st.run.P; return r[r.length - 1] }); ok(Math.abs(Math.abs(fin[1]) - 1) < 1e-4, 'saddle-free newton to a minimum: ' + fin);
  // gradient descent above the limit on the quadratic diverges in the inspector's words
  await clk('#lab-fn button[data-m=quad]'); await setRange('#lab-kap', 10); await setRange('#lab-rot', 0); await clk('#lab-me button[data-m=gd]'); await setRange('#lab-eta', Math.log10(0.25)); await setRange('#lab-k', 2);
  ok((await txt('#lab-insp')).includes('above it'), 'lab warns when eta exceeds 2/lambda_max');
  // click on the plot sets a new start
  const box = await (await p.$('#lab-plot svg')).boundingBox(); await p.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.2); await sleep(50); await bad('lab click start');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), tag + ' no sideways page scroll (lab)');
  await clk('#tabs button[data-t=t-more]'); await sleep(100); await bad('more');
  const links = await p.$$eval('#t-more a[href^=http]', a => a.filter(x => x.target !== '_blank' || !/noopener/.test(x.rel)).length); ok(links === 0, 'links open in new tab');
  ok(errs.length === 0, tag + ' console errors: ' + errs.join(' | '));
  ok(await p.$eval('#jsErr', e => e.hidden), tag + ' error box hidden');
  await p.close();
}
await browser.close();
console.log('checks', checks, 'fails', fails);
