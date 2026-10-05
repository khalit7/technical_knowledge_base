// Exercise every control of the Numerical computing page at 390 px dark and 920 px light (reduced motion),
// compare the page's emulator and numbers with recompute.py's numbers.json and inputs/fp_vectors.json (NumPy and ml_dtypes),
// and take element screenshots into ../.shots/check/.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_math/numerical_computing/src/check_page.mjs
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
const TV = JSON.parse(fs.readFileSync(path.join(here, 'inputs/fp_vectors.json'), 'utf8'));
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let fails = 0, checks = 0;
const ok = (c, msg) => { checks++; if (!c) { fails++; console.log('FAIL', msg) } };
const same = (a, b) => (a === b) || (Number.isNaN(a) && Number.isNaN(b)) || (a === null && Number.isNaN(b));
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await browser.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(url); await p.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p.reload(); await sleep(300);
  const tag = scheme + width;
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { try { await el.scrollIntoView(); await sleep(100); await el.screenshot({ path: path.join(shots, tag + '-' + name + '.png') }) } catch (e) { ok(false, tag + ' screenshot ' + name + ': ' + e.message) } } else ok(false, 'missing ' + sel) };
  const undef = async where => { const t = await p.evaluate(() => [...document.querySelectorAll('.tab:not([hidden])')].map(e => e.innerText).join(' ')); ok(!/undefined|\[object/.test(t), where + ': undefined in text') };
  const tab = async t => { await p.click('#tabs button[data-t=' + t + ']'); await sleep(250) };
  // ---- emulator against NumPy / ml_dtypes ----
  if (width === 390) {
    const bad = await p.evaluate(TV => { let bad = []; for (const f of ['fp32', 'fp16', 'bf16', 'e4m3', 'e5m2']) TV.x.forEach((x, i) => {
      const v = FP.rnd(x, f); let e = TV[f][i]; e = e === null ? NaN : (e === 'inf' ? Infinity : (e === '-inf' ? -Infinity : e));
      const okv = (Number.isNaN(v) && Number.isNaN(e)) || v === e; const okb = Number.isNaN(v) || FP.enc(v, f).bits === TV[f + '_bits'][i];
      const back = FP.dec(FP.enc(v, f).bits, f); const okd = (Number.isNaN(back) && Number.isNaN(v)) || back === v;
      if (!okv || !okb || !okd) bad.push(f + ' ' + x) }); return bad }, TV);
    ok(bad.length === 0, 'emulator mismatches: ' + bad.slice(0, 5).join('; ')); console.log('emulator checked on', TV.x.length * 5, 'values');
    const C = await p.evaluate(() => Object.fromEntries(['fp32', 'fp16', 'bf16', 'e4m3', 'e5m2'].map(k => [k, [FP.F[k].max, FP.F[k].minNormal, FP.F[k].minSub, FP.F[k].eps]])));
    for (const k in C) { ok(C[k][0] === N[k + '_max'], k + ' max'); ok(C[k][1] === N[k + '_minnorm'], k + ' min normal'); ok(C[k][2] === N[k + '_minsub'], k + ' min sub'); ok(C[k][3] === N[k + '_eps'], k + ' eps') }
    const LB = await p.evaluate(() => Object.fromEntries(['fp32', 'bf16', 'fp16', 'e4m3', 'e5m2'].map(k => [k, FP.enc(FP.rnd(Math.log(Math.exp(2) + Math.exp(1) + 1), k), k).bits])));
    for (const k in LB) ok(LB[k] === N['loss_' + k + '_bits'], 'loss bits ' + k);
    // softmax animation traces against NumPy
    for (const f of ['fp32', 'fp16', 'bf16']) for (const m of ['naive', 'stable']) {
      const st = await p.evaluate((m, f) => { NC_ANIM.setSm(m, f); return NC_ANIM.smTrace().map(s => s.rows.map(r => Number.isFinite(r[1]) ? r[1] : String(r[1]))) }, m, f);
      if (m === 'naive') { const pr = st[5]; N['sm_' + f + '_naive_p'].forEach((v, i) => ok(pr[i] === (v === null ? 'NaN' : v), 'naive p ' + f + ' ' + i + ' ' + pr[i] + ' vs ' + v)); ok(st[4][0] === 'Infinity', 'naive sum inf ' + f) }
      else { N['sm_' + f + '_p'].forEach((v, i) => ok(st[4][i] === v, 'stable p ' + f + ' ' + i + ': ' + st[4][i] + ' vs ' + v)); N['sm_' + f + '_logp'].forEach((v, i) => ok(st[5][i] === v, 'logp ' + f + ' ' + i + ': ' + st[5][i] + ' vs ' + v)); ok(st[3][0] === N['sm_' + f + '_sum'], 'stable sum ' + f) }
    }
    // Kahan trace
    const K = await p.evaluate(() => [NC_ANIM.kahan('naive').map(r => r.s), NC_ANIM.kahan('kahan').map(r => [r.y, r.t, r.c])]);
    ok(JSON.stringify(K[0].slice(1)) === JSON.stringify(N.kahan_naive_trace), 'naive Kahan trace');
    ok(JSON.stringify(K[1].slice(1)) === JSON.stringify(N.kahan_trace), 'Kahan trace ' + JSON.stringify(K[1].slice(-1)));
    // summation lab against NumPy (uniform, seed 1)
    for (const key in N.lab) { const [f, n] = key.split('_'); const r = await p.evaluate((f, n) => SL.run('u', +n, 1, f), f, n);
      for (const k of ['exact', 'naive', 'pairwise', 'kahan', 'acc32']) if (!(f === 'fp32' && k === 'acc32')) ok(Math.abs(r[k] - N.lab[key][k]) <= (k === 'exact' ? 1e-9 : 0), 'lab ' + key + ' ' + k + ': ' + r[k] + ' vs ' + N.lab[key][k]) }
    // numbers quoted in the Reading text
    const T = await p.evaluate(() => document.getElementById('t-read').innerText.replace(/−/g, '-'));
    const must = ['2.4076058864593506', '401a1637', '0.30000000000000004', '0.6000000000000001', '2,048', '16,777,216', '1000.3133', '1.000000082690371', '0.0066799', '0.0066309', '9.99999993922529',
      '83.8%', '15.2%', '97.9%', '8.2%', '96.5 million', '258', '102', '-4320.4336', '-4320.4326', '-4320.4331', '0.0043', '29.3288', '1.2038029432296753', '134,515,008', '3.5607', '68%', '7.2%', '5.0%', '4.8%', '0.55%', '0.9994', '1001.313', '316', '2.1269', '0.1269'];
    const Tn = T.replace(/\s+/g, ''); for (const s of must) ok(Tn.includes(s.replace(/\s+/g, '')), 'Reading text contains ' + s);
    ok(Math.abs(N.smol_below14 - 0.68) < 0.005 && Math.abs(N.smol_below24 - 0.072) < 0.0005 && Math.abs(N.smol_below25 - 0.050) < 0.0005, 'SmolLM2 fractions as quoted');
    ok(Math.abs(N.lost_0_0001_bf16 ?? N['lost_0.0001_bf16'] - 0.838) < 0.0005 || Math.abs(N['lost_0.0001_bf16'] - 0.838) < 0.0005, 'lost updates bf16 1e-4');
    ok(Math.abs(N['run_fp16_1_zero'] - 0.0825) < 0.0005 && N['run_fp16_1048576_nonfinite'] === 96541441, 'fp16 runs as quoted');
    ok(Math.abs(N.var_twopass - 0.0066799) < 5e-8 && Math.abs(N.var_welford - 0.0066309) < 5e-8 && N.var_onepass === -8, 'variance numbers');
  }
  // ---- Reading controls ----
  await shot('#rd-one', 'one');
  for (const v of ['loss', '0.1', '-2.5', '1', 'sub', '-0', 'inf', 'nan']) for (const f of ['fp32', 'bf16', 'fp16', 'e4m3']) {
    await p.click('#rd-decVal button[data-m="' + v + '"]'); await p.click('#rd-decFmt button[data-m="' + f + '"]'); await sleep(20);
    if ((v === 'loss' || v === 'sub' || v === 'nan') && f !== 'e4m3') await shot('#rd-decCard', 'dec-' + v + '-' + f) }
  const dtext = await p.$eval('#rd-decOut', e => e.innerText); ok(/NaN/.test(dtext), 'decode NaN in E4M3');
  await p.click('#rd-decVal button[data-m="loss"]'); await p.click('#rd-decFmt button[data-m="fp32"]'); await sleep(20);
  ok((await p.$eval('#rd-decOut', e => e.innerText)).includes('2.4076058864593506'), 'decode loss fp32 value');
  for (const m of ['lin', 'log']) { await p.click('#rd-gridScale button[data-m=' + m + ']'); await sleep(30); await shot('#rd-gridCard', 'grid-' + m) }
  await shot('#rd-stairCard', 'stair'); for (const k of ['tf32', 'e5m2', 'fp32']) { await p.click('#rd-stairPick button[data-k=' + k + ']'); await sleep(20) } await shot('#rd-stairCard', 'stair2');
  for (const m of ['naive', 'kahan']) { await p.click('#rd-kahMode button[data-m=' + m + ']'); await sleep(40); const n = await p.$eval('#rd-kahCtl-s', e => +e.max + 1);
    for (let i = 1; i < n; i++) { await p.click('#rd-kahCtl-f'); await sleep(15) } await shot('#rd-kahCard', 'kahan-' + m + '-end');
    const fin = await p.$eval('#rd-kahCnt .stat:last-child .v', e => e.textContent); ok(fin === (m === 'naive' ? '2048' : '2052'), 'Kahan final ' + m + ' ' + fin) }
  for (const f of ['fp32', 'fp16', 'bf16']) for (const m of ['naive', 'stable']) {
    await p.click('#rd-smFmt button[data-m=' + f + ']'); await p.click('#rd-smMode button[data-m=' + m + ']'); await sleep(40);
    const n = await p.$eval('#rd-smCtl-s', e => +e.max + 1);
    for (let i = 1; i < n; i++) { await p.click('#rd-smCtl-f'); await sleep(15); if (f === 'fp32' && (i === 4 || i === 1)) await shot('#rd-smCard', 'sm-' + m + '-' + f + '-' + i) }
    await shot('#rd-smCard', 'sm-' + m + '-' + f + '-end');
    const nan = await p.$eval('#rd-smCnt', e => e.innerText); if (m === 'stable') ok(/NaNs\s*0/.test(nan), 'stable has no NaN ' + f) }
  for (const k of [0, 4, 8, 16, 20, 24]) { await p.$eval('#rd-lsR', (e, k) => { e.value = k; e.dispatchEvent(new Event('input')) }, k); await sleep(30); if (k % 8 === 0) await shot('#rd-lsCard', 'ls-' + k) }
  await shot('#rd-sumTbl', 'sumtbl'); await shot('#rd-lsTbl', 'lstbl');
  await undef('reading');
  // ---- Float explorer ----
  await tab('t-float'); await shot('#t-float', 'float-top');
  const card = async (k, sel) => p.$eval('#fx-cards .fx-card[data-k=' + k + '] ' + sel, e => e.innerText);
  const setx = async v => { await p.$eval('#fx-x', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await sleep(30) };
  await setx('999'); ok((await card('bf16', 'dd')).startsWith('1000'), 'bf16 999 -> 1000');
  await setx('1e-8'); ok((await card('fp16', 'dd')).startsWith('0'), 'fp16 1e-8 -> 0'); ok(!(await card('bf16', 'dd')).startsWith('0'), 'bf16 keeps 1e-8'); await shot('#fx-cards', 'float-1e-8');
  await setx('500'); ok((await card('e4m3', 'dd')).startsWith('448'), 'e4m3 500 saturates');
  await p.select('#fx-sat', '0'); await sleep(30); ok((await card('e4m3', 'dd')).startsWith('NaN'), 'e4m3 500 NaN non-saturating'); await p.select('#fx-sat', '1');
  await setx('70000'); ok((await card('fp16', 'dd')).startsWith('inf'), 'fp16 70000 inf');
  await setx('1+2^-8'); ok((await card('bf16', 'dd')).trim() === '1', 'bf16 1+2^-8 -> 1');
  for (const b of await p.$$('#fx-pre button')) { await b.click(); await sleep(15) }
  await setx('1'); await p.click('#fx-cards .fx-card[data-k=fp16] .bits .b[data-i="5"]'); await sleep(30);
  ok((await p.$eval('#fx-x', e => e.value)) === '0.5', 'flip fp16 last exponent bit of 1: ' + await p.$eval('#fx-x', e => e.value));
  await setx('1'); await p.click('#fx-cards .fx-card[data-k=fp16] .bits .b[data-i="1"]'); await sleep(30);
  ok((await p.$eval('#fx-x', e => e.value)) === 'Infinity', 'flip fp16 first exponent bit of 1: ' + await p.$eval('#fx-x', e => e.value));
  await setx('1'); await p.click('#fx-cards .fx-card[data-k=fp16] .fx-nb button:last-child'); await sleep(30); ok((await p.$eval('#fx-x', e => e.value)) === '1.0009765625', 'fp16 next after 1');
  await setx('0.1'); await p.$eval('#fx-y', e => { e.value = '1e-9'; e.dispatchEvent(new Event('input')) }); await sleep(30); ok(/absorbed/.test(await card('fp32', '.fx-add')), 'fp32 absorbs 1e-9 at 0.1');
  for (const t of [-30, -20, -5, 0, 10, 20]) { await p.$eval('#fx-t', (e, t) => { e.value = t; e.dispatchEvent(new Event('input')) }, t); await sleep(20) }
  for (const v of ['nan', 'inf', '-0', 'abc', '2^-149', '(1+2)*3']) await setx(v);
  await setx('2.40760596444438'); await shot('#fx-cards', 'float-loss');
  await undef('float');
  // ---- Summation lab ----
  await tab('t-sum');
  for (const f of ['fp16', 'bf16', 'fp32']) for (const d of ['u', 'n', 'm', 'b', 'h']) {
    await p.select('#sl-fmt', f); await p.select('#sl-data', d); await p.$eval('#sl-n', e => { e.value = 3; e.dispatchEvent(new Event('input')) }); await sleep(200);
    const t = await p.$eval('#sl-res', e => e.innerText); ok(!/NaN|undefined/.test(t), 'lab text ' + f + ' ' + d);
    if (d === 'u' || d === 'b') await shot('#t-sum .card', 'lab-' + f + '-' + d) }
  await p.select('#sl-fmt', 'fp16'); await p.select('#sl-data', 'u'); await p.$eval('#sl-n', e => { e.value = 4; e.dispatchEvent(new Event('input')) }); await sleep(400);
  const nv = await p.$eval('#sl-res', e => e.innerText); ok(nv.includes('2048'), 'lab fp16 naive stalls at 2048');
  await p.click('#sl-shuf'); await sleep(300); ok(/distinct results/.test(await p.$eval('#sl-shufOut', e => e.innerText)), 'shuffle output'); await shot('#t-sum .card', 'lab-shuffle');
  await p.$eval('#sl-n', e => { e.value = 5; e.dispatchEvent(new Event('input')) }); await sleep(2500); await shot('#t-sum .card', 'lab-1e5');
  await undef('sum');
  await tab('t-more'); await undef('more');
  ok(errs.length === 0, tag + ' page errors: ' + errs.join(' | '));
  ok(!(await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), tag + ' sideways scroll');
  ok(await p.$eval('#jsErr', e => e.hidden), tag + ' error box hidden');
  await p.close();
}
await browser.close();
console.log('checks', checks, 'fails', fails);
process.exit(fails ? 1 : 0);
