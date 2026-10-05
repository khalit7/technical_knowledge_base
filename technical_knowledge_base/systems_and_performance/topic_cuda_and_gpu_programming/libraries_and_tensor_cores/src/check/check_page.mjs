// Puppeteer check of ../../index.html at 390 px dark and 920 px light: every control exercised, no page
// errors, no NaN/undefined in visible text, no sideways scroll; the scheduler's JS against recompute.py;
// every Layout-lab preset "matches CuTe"; element screenshots into ../../.shots/el-*.png.
// Run from the repo root: node technical_knowledge_base/.../libraries_and_tensor_cores/src/check/check_page.mjs
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../../');
const require = createRequire(path.join(root, 'html_utils/package.json'));
const puppeteer = require('puppeteer');
const page_file = 'file://' + path.resolve(here, '../../index.html');
const shots = path.resolve(here, '../../.shots'); fs.mkdirSync(shots, { recursive: true });
const data = JSON.parse(fs.readFileSync(path.resolve(here, '../out/data.json'), 'utf8'));
let fails = 0; const log = (ok, msg) => { if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await browser.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setViewport({ width: w, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(page_file, { waitUntil: 'load' });
  const tag = `${w} ${scheme}`;
  const bad = async (where) => { const t = await p.evaluate(() => document.querySelector('.tab:not([hidden])').innerText);
    const m = t.match(/\bNaN\b(?! constant)|\bundefined\b|Infinity/); log(!m, `${tag} ${where}: no NaN/undefined${m ? ' (found ' + m[0] + ')' : ''}`); };
  const sideways = async (where) => { const sw = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); log(sw <= 1, `${tag} ${where}: no sideways scroll (${sw})`); };
  const tab = async (id) => { await p.click(`#tabs button[data-t="${id}"]`); await new Promise(r => setTimeout(r, 150)); };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.scrollIntoView(); await el.screenshot({ path: path.join(shots, `el-${name}-${scheme}-${w}.png`) }); } };
  // --- Reading ---
  await tab('t-read');
  for (const pr of ['lt-pr1', 'lt-pr2']) { await p.click(`#${pr} .opts button`); log(await p.$eval(`#${pr} .ans`, e => !e.hidden), `${tag} ${pr} reveals`); }
  for (const m of ['sm80_m16n8k16_A', 'sm80_m16n8k16_B', 'sm80_m16n8k16_C']) {
    await p.click(`#lt-tvsel button[data-m="${m}"]`); await p.click('#lt-tv div[data-t="5"]');
    const n = await p.$eval('#lt-tvx', e => e.textContent); const want = m.endsWith('A') ? 8 : 4;
    log(n.includes(`lane 5 holds ${want} values`), `${tag} fragment ${m}: lane 5 holds ${want}`); }
  // lane 0 of C must own (0,0) (0,1) (8,0) (8,1): the PTX ISA's documented fragment
  await p.click('#lt-tv div[data-t="0"]'); const c0 = await p.$eval('#lt-tvx', e => e.textContent);
  log(c0.includes('(0,0) (0,1) (8,0) (8,1)'), `${tag} lane 0 of C = (0,0) (0,1) (8,0) (8,1)`);
  for (const i of [0, 4, 8, 11]) await p.click(`#lt-nm span[data-i="${i}"]`);
  for (const m of ['(4,8):(8,1)', '(4,8):(1,5)', '((2,2),(2,4)):((1,8),(2,16))', '(4,8):(1,4)']) await p.click(`#lt-mini-sel button[data-m="${m}"]`);
  for (const g of ['ampere', 'hopper', 'blackwell']) {
    await p.click(`#lt-gen-sel button[data-m="${g}"]`); const n = data.tile[g];
    for (let i = 0; i < 7; i++) await p.click('#lt-gen-ctl-f');
    const t = await p.$eval('#lt-gen-cnt', e => e.innerText);
    log(t.includes(String(n.mma)), `${tag} ${g} animation ends with ${n.mma} MMA per slice`);
    await p.click('#lt-gen-ctl-b'); await p.click('#lt-gen-ctl-b'); await p.click('#lt-gen-ctl-b');
    await shot('#lt-gen-card', 'gen-' + g); }
  await p.click('#lt-gen-ctl-p'); await new Promise(r => setTimeout(r, 300)); await p.click('#lt-gen-ctl-p');
  await shot('#lt-epi', 'epi'); await shot('#lt-inv', 'inv'); await shot('#lt-tv', 'tv'); await shot('#lt-mmatab', 'mmatab'); await shot('#lt-cutab', 'cutab');
  await bad('Reading'); await sideways('Reading');
  // --- Layout lab ---
  await tab('t-layout');
  const npre = await p.$$eval('#ll-pre option', o => o.length - 1);
  for (let i = 0; i < npre; i++) { await p.select('#ll-pre', String(i)); const r = await p.$eval('#ll-res', e => e.textContent);
    log(r.includes('matches CuTe'), `${tag} layout preset ${i}: ${r.slice(0, 70)}`); }
  for (const op of ['eval', 'coalesce', 'compose', 'complement', 'divide', 'zipped', 'blocked', 'raked', 'swizzle']) { await p.select('#ll-op', op); }
  await p.$eval('#ll-a', e => { e.value = '(4,8):(1,'; e.dispatchEvent(new Event('input')); });
  log((await p.$eval('#ll-res', e => e.textContent)).length > 0, `${tag} bad input reports an error`);
  await p.select('#ll-pre', '8');
  for (const m of ['1', '2', '3', '0']) { await p.click(`#ll-swsel button[data-m="${m}"]`); const t = await p.$eval('#ll-bankx', e => e.textContent);
    log(m === '3' ? t.includes('conflict-free') : (m === '0' ? t.includes('8-way') : true), `${tag} swizzle ${m}: ${t.slice(0, 60)}`); }
  await p.click('#ll-swsel button[data-m="3"]'); await shot('#ll-bank', 'bank');
  for (const m of ['sm80_m16n8k16_A', 'sm80_m16n8k8_tf32_A', 'sm90_m64n64k16_C', 'sm80_m16n8k16_C']) { await p.click(`#ll-tvsel button[data-m="${m}"]`); await p.click('#ll-tv rect[data-t="3"]'); }
  await p.select('#ll-pre', '10'); await shot('#ll-grid', 'grid'); await bad('Layout lab'); await sideways('Layout lab');
  // --- Instruction atlas ---
  await tab('t-atlas');
  const cells = await p.$$('#at-tab td.c'); log(cells.length === 160, `${tag} atlas has 160 cells (${cells.length})`);
  for (const sel of ['td[data-k="i18_tcgen05_nvf4"][data-t="sm_100f"]', 'td[data-k="i20_tma"][data-t="sm_120"]', 'td[data-k="i05_mma_e4m3"][data-t="sm_90a"]']) {
    await p.click('#at-tab ' + sel); const d = await p.$eval('#at-d', e => e.innerText); log(d.length > 50, `${tag} atlas detail ${sel.slice(0, 40)}`); }
  const ok = await p.$$eval('#at-tab td.ok', e => e.length); log(ok === 81, `${tag} atlas: 81 cells assembled (${ok})`);
  await shot('#at-d', 'atlas-detail'); await bad('Atlas'); await sideways('Atlas');
  // --- GEMM scheduler: the page's model against recompute.py ---
  await tab('t-sched');
  const js = await p.evaluate((cases) => cases.map(c => { const r = GS.plan(...c.args); return { T: r.T, I: r.I, time: r.time, util: Math.round(r.util * 1e6) / 1e6, extra: r.extra }; }), data.sched_check);
  data.sched_check.forEach((c, i) => { const r = js[i]; const same = r.T === c.T && r.time === c.time && r.extra === c.extra && Math.abs(r.util - c.util) < 2e-6;
    log(same, `${tag} scheduler ${c.args.join(' ')}: JS ${r.time}/${r.util} py ${c.time}/${c.util}`); });
  const npr = await p.$$eval('#gs-pre option', o => o.length - 1);
  for (let i = 0; i < npr; i++) { await p.select('#gs-pre', String(i)); }
  await p.select('#gs-pre', '0'); const o0 = await p.$eval('#gs-out', e => e.innerText); log(o0.includes('108') && o0.includes('100.0%'), `${tag} preset 0: 108 tiles, 100%`);
  await p.select('#gs-pre', '1'); const o1 = await p.$eval('#gs-out', e => e.innerText); log(o1.includes('117') && o1.includes('54.2%'), `${tag} preset 1: 117 tiles, 54.2%`);
  for (const s of ['sk2', 'sk8', 'stream', 'hybrid', 'dp']) await p.select('#gs-sch', s);
  await p.select('#gs-pre', '5'); await p.click('#gs-play'); await new Promise(r => setTimeout(r, 400)); await p.click('#gs-play');
  await p.$eval('#gs-t', e => { e.value = 500; e.dispatchEvent(new Event('input')); });
  await p.$eval('#gs-m', e => { e.value = 3000; e.dispatchEvent(new Event('input')); });
  await shot('#gs-gantt', 'gantt'); await shot('#gs-cmp', 'cmp'); await bad('Scheduler'); await sideways('Scheduler');
  await tab('t-more'); await bad('Further reading'); await sideways('Further reading');
  const jsErr = await p.$eval('#jsErr', e => e.hidden); log(jsErr, `${tag} error box hidden`);
  log(errs.length === 0, `${tag} no page errors ${errs.slice(0, 3).join(' | ')}`);
  await p.close();
}
await browser.close();
console.log(fails ? `check_page: ${fails} failures` : 'check_page: all passed');
process.exit(fails ? 1 : 0);
