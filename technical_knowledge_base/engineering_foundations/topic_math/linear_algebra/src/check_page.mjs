// Exercise every control of the page at 390 px dark and 920 px light, compare the page's numbers with numbers.json,
// and take element screenshots of every figure and animation step into ../.shots/check/.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_math/linear_algebra/src/check_page.mjs
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
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, msg + ': page ' + a + ' expected ' + b);
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await browser.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(url); await p.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p.reload(); await sleep(300);
  const tag = scheme + width;
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { try { await el.scrollIntoView(); await sleep(120); await el.screenshot({ path: path.join(shots, tag + '-' + name + '.png') }) } catch (e) { ok(false, tag + ' screenshot ' + name + ': ' + e.message) } } };
  const txt = sel => p.$eval(sel, e => e.textContent);
  const bad = async where => { const t = await p.evaluate(() => [...document.querySelectorAll('.tab:not([hidden])')].map(e => e.innerText).join(' ')); ok(!/NaN|undefined|Infinity(?!\))/.test(t.replace(/∞/g, '')), where + ': NaN/undefined in text') };
  // ---- Reading ----
  for (const id of ['rd-vec-svg', 'rd-map-svg', 'rd-sub-svg', 'rd-ball-svg', 'rd-lora-svg', 'rd-embcos', 'rd-low-tab']) await shot('#' + id, id);
  // map presets
  for (const m of ['A', 'rot', 'shear', 'proj', 'refl', 'W']) { await p.click('#rd-map-seg button[data-m=' + m + ']'); await sleep(60); if (m === 'proj' || m === 'W') await shot('#rd-map-svg', 'map-' + m) }
  // matmul animation: every mode, every step
  for (const m of ['rc', 'col', 'outer', 'comp']) {
    await p.click('#rd-mm-seg button[data-m=' + m + ']'); await sleep(80);
    const n = await p.$eval('#rd-mm-ctl-s', e => +e.max + 1);
    for (let i = 1; i < n; i++) { await p.click('#rd-mm-ctl-f'); await sleep(40) }
    const res = await p.$$eval('#rd-mm-mats .mmgrid:last-child span', s => s.map(x => x.textContent));
    ok(res.join(',') === '19,22,43,50', 'matmul ' + m + ' final ' + res);
    const mult = await txt('#rd-mm-cnt .stat .v'); ok(mult === '8', 'matmul ' + m + ' multiplications ' + mult);
    if (m === 'outer') await shot('#rd-mm-card', 'mm-outer-end');
    for (let i = 1; i < n; i++) await p.click('#rd-mm-ctl-b');
  }
  // SVD animation: each matrix and mode, step to the end, read counters
  for (const mk of ['A', 'S']) for (const m of ['one', 'svd', 'eig']) {
    await p.click('#rd-svd-mat button[data-m=' + mk + ']'); await p.click('#rd-svd-seg button[data-m=' + m + ']'); await sleep(80);
    const n = await p.$eval('#rd-svd-ctl-s', e => +e.max + 1);
    for (let i = 1; i < n; i++) { await p.click('#rd-svd-ctl-f'); await sleep(60); if (mk === 'A' && m === 'svd' && width === 390) await shot('#rd-svd-card', 'svd-A-step' + i) }
    const v = await p.$$eval('#rd-svd-cnt .stat .v', s => s.map(x => x.textContent));
    near(+v[0], mk === 'A' ? 15 : 6, 1e-3, 'svd ' + mk + ' ' + m + ' area');
    if (m !== 'eig') { near(+v[1], mk === 'A' ? N.A_sv[0] : 6, 2e-3, 'svd ' + mk + ' ' + m + ' |A v1|'); near(+v[2], mk === 'A' ? N.A_sv[1] : 1, 2e-3, 'svd ' + mk + ' |A v2|'); near(parseFloat(v[3]), 90, 0.05, 'svd angle') }
    else { const L = [+v[1], +v[2]].sort((a, b) => b - a); const ev = mk === 'A' ? [5, 3] : N.S_eig.slice().reverse(); near(L[0], ev[0], 2e-3, 'eig ' + mk + ' l1'); near(L[1], ev[1], 2e-3, 'eig ' + mk + ' l2') }
    if (m === 'eig' && mk === 'A') await shot('#rd-svd-card', 'eig-A-end');
  }
  await bad('reading');
  // real-data fills against numbers.json
  near(+(await txt('#rd-svd-k90')), N.gpt2.W_Q.k90, 0, 'W_Q k90');
  near(+(await txt('#rd-svd-rk90')), N.gpt2.W_Q.rand_k90, 0, 'W_Q random k90');
  const rows = await p.$$eval('#rd-low-tab tbody tr', r => r.map(x => [...x.children].map(c => c.textContent)));
  const names = ['W_Q', 'W_K', 'W_V', 'W_O', 'W_in', 'W_out'];
  rows.forEach((r, i) => { const g = N.gpt2[names[i]]; near(+r[1], g.k90, 0, names[i] + ' k90'); near(+r[2], g.rand_k90, 0, names[i] + ' rand k90'); near(+r[3].replace('%', ''), Math.round(100 * g.out_err_k64), 0, names[i] + ' out err'); near(parseFloat(r[4]), g.loss_k.find(x => x[0] === 64)[1], 6e-4, names[i] + ' loss k64') });
  near(parseInt(await txt('#rd-lora-top1a')), N.gpt2.lora[0].median_top1_pct, 0, 'lora a top1'); near(parseInt(await txt('#rd-lora-top1b')), N.gpt2.lora[1].median_top1_pct, 0, 'lora b top1');
  near(+(await txt('#rd-attn-qkrank')), N.gpt2.head0_qk_rank, 0, 'qk rank');
  // ---- Matrix playground ----
  await p.click('button[data-t=t-play]'); await sleep(200);
  const ro = async () => p.$$eval('#pl-ro dd', d => d.map(x => x.textContent));
  let r = await ro(); near(parseFloat(r[0]), 15, 1e-9, 'play A det'); ok(r[4].startsWith(N.A_sv.map(v => v.toFixed(4)).join(', ')), 'play A sv ' + r[4]); near(parseFloat(r[7]), 3, 1e-9, 'play A kappa');
  await shot('#t-play', 'play-A');
  const pres2 = await p.$$eval('#pl-pres button', b => b.map(x => x.dataset.k));
  for (const k of pres2) { await p.evaluate(k => [...document.querySelectorAll('#pl-pres button')].find(b => b.dataset.k === k).click(), k); await sleep(40);
    for (const t of ['0', '0.5', '1.5', '2.5', '3']) { await p.$eval('#pl-t', (e, t) => { e.value = t; e.dispatchEvent(new Event('input')) }, t) }
    await bad('play ' + k);
    if (k.startsWith('Near')) { r = await ro(); near(parseFloat(r[7]), N.B_kappa, 1, 'play B kappa') }
    if (k.startsWith('S =')) { r = await ro(); ok(/^6(\.0+)?, 1(\.0+)?/.test(r[3]), 'play S eig ' + r[3]) }
    if (k.startsWith('Rotation')) await shot('#t-play', 'play-rot') }
  // Newton-Schulz from A
  await p.evaluate(() => [...document.querySelectorAll('#pl-pres button')][0].click());
  for (let i = 0; i < 7; i++) { await p.click('#pl-ns'); await sleep(30) }
  r = await ro(); const sv = r[4].split(',').map(parseFloat); near(sv[0], N.ns_sv[6][0], 1e-3, 'NS sv1'); near(sv[1], N.ns_sv[6][1], 1e-3, 'NS sv2');
  await p.click('#pl-tr'); await p.click('#pl-reset');
  // edit an input
  await p.$eval('#pl-in input', e => { e.value = '-2'; e.dispatchEvent(new Event('input', { bubbles: true })) }); await bad('play edited');
  await p.click('#pl-size button[data-m="3"]'); await sleep(60);
  r = await ro(); ok(r[2].startsWith('2 of 3'), 'play M rank ' + r[2]);
  for (const k of await p.$$eval('#pl-pres button', b => b.map(x => x.dataset.k))) { await p.evaluate(k => [...document.querySelectorAll('#pl-pres button')].find(b => b.dataset.k === k).click(), k); await sleep(30); await bad('play3 ' + k) }
  await shot('#t-play', 'play-3x3');
  // ---- Low-rank lab ----
  await p.click('button[data-t=t-lowrank]'); await sleep(250);
  let st = await p.$$eval('#lr-stats .stat .v', s => s.map(x => x.textContent));
  near(parseFloat(st[3]), +(100 * N.gpt2.W_Q.out_err_k64).toFixed(1), 0.05, 'lab W_Q out err k64'); near(parseFloat(st[4]), N.gpt2.W_Q.loss_k.find(x => x[0] === 64)[1], 6e-4, 'lab W_Q loss');
  near(parseFloat(st[1]), +(100 * N.gpt2.W_Q.w_err_k64).toFixed(1), 0.06, 'lab W_Q weight err');
  await shot('#t-lowrank', 'lab');
  for (const m of names) { await p.click('#lr-mat button[data-m=' + m + ']'); for (const k of [1, 2, 300, 767, 768]) await p.$eval('#lr-k', (e, k) => { e.value = k; e.dispatchEvent(new Event('input')) }, k); await bad('lab ' + m) }
  for (const a of ['0', '1']) { await p.click('#lr-ad button[data-m="' + a + '"]'); for (let l = 0; l < 12; l++) await p.$eval('#lr-l', (e, l) => { e.value = l; e.dispatchEvent(new Event('input')) }, l); await bad('lab lora ' + a) }
  await shot('#lr-lbars', 'lab-lora');
  await p.click('button[data-t=t-more]'); await sleep(150); await bad('more');
  ok(errs.length === 0, tag + ' errors ' + errs.join(' | '));
  const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth); ok(!sw, tag + ' sideways scroll');
  await p.close();
}
await browser.close();
console.log('checks', checks, 'fails', fails);
process.exit(fails ? 1 : 0);
