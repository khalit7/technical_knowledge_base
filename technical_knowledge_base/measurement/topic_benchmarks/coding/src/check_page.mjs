// Exercise every control on every tab at 390 dark and 920 light; report errors, NaN/undefined, sideways scroll and
// elements wider than the viewport; check the page's JS numbers against recompute_out.json; save screenshots.
// usage (from src/): python3 recompute.py && node check_page.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = path.resolve(here, '../index.html');
const shots = path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const ref = JSON.parse(fs.readFileSync(path.join(here, 'recompute_out.json'), 'utf8'));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0; const near = (a, c, t = 1e-6) => Math.abs(a - c) <= t;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file); await p.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p.reload();
  const probs = [];
  const tab = async t => { await p.click(`button[data-t=${t}]`); await new Promise(r => setTimeout(r, 200)) };
  const scan = async (t, label) => {
    const r = await p.evaluate(t => {
      const el = document.getElementById(t); const txt = el.innerText;
      const wide = [...el.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && e.offsetParent && !e.closest('.nav') && !e.closest('.tw') && !e.closest('pre')).slice(0, 4).map(e => e.tagName + '.' + e.className + ' ' + (e.textContent || '').slice(0, 30));
      return { nan: (txt.match(/.{0,30}(NaN|undefined|Infinity).{0,30}/) || [''])[0], side: document.documentElement.scrollWidth > innerWidth, wide };
    }, t);
    if (r.nan || r.side || r.wide.length) probs.push(label + ' ' + JSON.stringify(r));
  };
  const slide = async (id, v) => p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input')) }, id, v);
  const sel = async (id, v) => p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('change')) }, id, v);
  // ---- numbers against recompute.py ----
  if (scheme === 'dark') {
    const js = await p.evaluate(() => {
      const ex = {}; for (const k of ['10,3,1', '10,3,5', '10,1,10', '200,4,100', '20,2,5', '10,2,5']) { const [n, c, kk] = k.split(',').map(Number); ex[k] = [CM.passk(n, c, kk), CM.plug(n, c, kk)] }
      const bi = {}; for (const k of ['10,0.1,5', '20,0.05,10', '200,0.01,100', '10,0.3,5']) { const [n, pp, kk] = k.split(',').map(Number); bi[k] = [CM.expect(n, pp, kk, CM.passk), CM.expect(n, pp, kk, CM.plug)] }
      const w = LCBX.mean('O4-Mini (High)', q => q[1] >= '2024-08-01' && q[1] < '2025-04-08');
      const sp = LCBX.mean('DeepSeek-V3', q => q[2] === 'm' && q[1] < '2024-07-01'), sp2 = LCBX.mean('DeepSeek-V3', q => q[2] === 'm' && q[1] >= '2024-07-01' && q[1] < '2025-01-01');
      const M = CD.lcb.models.find(m => m.m === 'GPT-4O-2024-08-06'); let u = 0, pl = 0; for (const ch of M.c) { const c = CM.dig(ch); u += CM.passk(10, c, 10); pl += CM.plug(10, c, 10) }
      const rs = CD.rs.models.map((_, j) => CD.rs.grid.reduce((a, g) => a + g[1][j], 0) / 80 * 100);
      return { ex, bi, w, sp, sp2, g10: [100 * u / M.c.length, 100 * pl / M.c.length], rs, rb: document.getElementById('rd-rb-sum').textContent };
    });
    const chk = (lab, a, c, t) => { if (!near(a, c, t)) { bad++; console.log('MISMATCH', lab, a, c) } };
    for (const k in js.ex) { chk('passk ' + k, js.ex[k][0], ref.pk_examples[k][0]); chk('plug ' + k, js.ex[k][1], ref.pk_examples[k][1]) }
    for (const k in js.bi) { chk('E passk ' + k, js.bi[k][0], ref.pk_bias[k][0], 1e-9); chk('E plug ' + k, js.bi[k][1], ref.pk_bias[k][1], 1e-9); chk('unbiased ' + k, js.bi[k][0], ref.pk_bias[k][2], 1e-9) }
    chk('o4-mini window', js.w[0], ref['lcb_window_2024-08-01']['O4-Mini (High)'][0], 1e-9); chk('o4-mini n', js.w[1], 454, 0);
    chk('dsv3 pre', js.sp[0], ref.lcb_split['DeepSeek-V3'][0], 1e-9); chk('dsv3 post', js.sp2[0], ref.lcb_split['DeepSeek-V3'][2], 1e-9);
    chk('gpt4o pass@10', js.g10[0], ref.lcb_passk['GPT-4O-2024-08-06'].unb[9], 1e-9); chk('gpt4o plug@10', js.g10[1], ref.lcb_passk['GPT-4O-2024-08-06'].plug[9], 1e-9);
    js.rs.forEach((v, j) => chk('realswe ' + j, v, ref.realswe.rate[j], 1e-9));
    const want = `${ref.rebench.models} models: ${ref.rebench.higher_before} score higher`;
    if (!js.rb.includes(want) || !js.rb.includes(`${ref.rebench.beyond_2se_tasks} beyond`)) { bad++; console.log('MISMATCH rebench summary', js.rb, ref.rebench) }
    console.log('numbers checked: pass@k, bias, LCB window and split, pass@10, Real-SWE, SWE-rebench');
  }
  // ---- Reading ----
  await tab('t-read'); await scan('t-read', 'read initial');
  for (const m of ['unb', 'plug']) { await p.click(`#rd-pk-mode button[data-m=${m}]`); for (const i of [0, 3, 8, 20, 21]) { await slide('rd-pk-ctl-s', i); await scan('t-read', `pk ${m} ${i}`) } }
  await (await p.$('#rd-pk-card')).screenshot({ path: `${shots}/rd-pk-${scheme}-${width}.png` });
  for (const m of ['c6', 'c4', 'c1']) { await p.click(`#rd-he-mode button[data-m=${m}]`); const n = await p.evaluate(() => +document.getElementById('rd-he-ctl-s').max); for (let i = 0; i <= n; i++) { await slide('rd-he-ctl-s', i); await scan('t-read', `he ${m} ${i}`) }
    const cap = await p.evaluate(() => document.getElementById('rd-he-cap').innerText); if (m === 'c6' && !/45 wrong answers/.test(cap)) { bad++; console.log('he c6 verdict', cap) }
    await (await p.$('#rd-he-card')).screenshot({ path: `${shots}/rd-he-${m}-${scheme}-${width}.png` }) }
  // Real-SWE: drop each task in turn
  for (let i = 0; i < 10; i++) { await p.click(`#rd-rs tr[data-i="${i}"]`); await scan('t-read', 'rs drop ' + i); await p.click(`#rd-rs tr[data-i="${i}"]`) }
  await p.click('#rd-rs tr[data-i="5"]'); const lead = await p.evaluate(() => document.getElementById('rd-rs-cnt').innerText); if (!/Fable 5\.1/.test(lead)) { bad++; console.log('loo leader', lead) } await p.click('#rd-rs tr[data-i="5"]');
  await (await p.$('#rd-rs-card')).screenshot({ path: `${shots}/rd-rs-${scheme}-${width}.png` });
  await (await p.$('#rd-rb-card')).screenshot({ path: `${shots}/rd-rb-${scheme}-${width}.png` });
  await p.evaluate(() => document.querySelectorAll('#t-read details').forEach(d => d.open = true)); await scan('t-read', 'details open');
  // ---- pass@k lab ----
  await tab('t-pk'); await scan('t-pk', 'pk initial');
  for (const [n, c, k] of [[1, 0, 1], [1, 1, 1], [10, 1, 10], [200, 4, 100], [200, 200, 200], [50, 0, 7]]) { await slide('pk-n', n); await slide('pk-c', c); await slide('pk-k', k); await scan('t-pk', `pk ${n},${c},${k}`) }
  for (const [pp, n] of [[1, 2], [60, 100], [10, 10], [33, 57]]) { await slide('pk-p', pp); await slide('pk-n2', n); await scan('t-pk', `bias ${pp},${n}`) }
  const nm = await p.evaluate(() => document.getElementById('pk-m').options.length);
  for (let i = 0; i < nm; i++) for (const f of ['all', 'e', 'm', 'h']) { await sel('pk-m', i); await sel('pk-f', f); await scan('t-pk', `real ${i} ${f}`) }
  await p.screenshot({ path: `${shots}/x-t-pk-${scheme}-${width}.png`, fullPage: true });
  // ---- LiveCodeBench by date ----
  await tab('t-lcb'); await scan('t-lcb', 'lcb initial');
  for (let s = 0; s <= 22; s += 3) for (const d of ['', 'e', 'm', 'h']) { await p.evaluate(d => { document.getElementById('lc-d').value = d }, d); await slide('lc-s', s); await scan('t-lcb', `win ${s} ${d}`) }
  for (const pl of ['l', 'a', 'c']) { await p.evaluate(v => { document.getElementById('lc-p').value = v }, pl); await slide('lc-s', 22); await scan('t-lcb', 'plat ' + pl) }
  await p.evaluate(() => { document.getElementById('lc-p').value = ''; document.getElementById('lc-d').value = '' }); await slide('lc-s', 0);
  for (let a = 0; a < 28; a += 3) for (const d of ['m', '', 'e', 'h']) { await sel('lc-a', a); await sel('lc-md', d); await scan('t-lcb', `mon ${a} ${d}`) }
  await sel('lc-a', await p.evaluate(() => CD.lcb.models.findIndex(m => m.m === 'DeepSeek-V3'))); await sel('lc-md', 'm');
  await p.screenshot({ path: `${shots}/x-t-lcb-${scheme}-${width}.png`, fullPage: true });
  // ---- One SWE-bench task ----
  await tab('t-task'); await scan('t-task', 'task initial');
  const verdicts = {};
  for (const m of ['gold', 'issue', 'half', 'none']) { await p.click(`#tk-mode button[data-m=${m}]`); for (let i = 0; i < 6; i++) { await slide('tk-ctl-s', i); await scan('t-task', `task ${m} ${i}`) } verdicts[m] = await p.evaluate(() => document.getElementById('tk-cap').innerText.split('\n')[0]) }
  const exp = { gold: 'RESOLVED', issue: 'RESOLVED', half: 'NOT RESOLVED', none: 'NOT RESOLVED' };
  for (const m in exp) if (!verdicts[m].endsWith(': ' + exp[m])) { bad++; console.log('verdict', m, verdicts[m]) }
  await p.evaluate(() => document.querySelectorAll('#t-task details').forEach(d => d.open = true)); await scan('t-task', 'task details');
  await p.screenshot({ path: `${shots}/x-t-task-${scheme}-${width}.png`, fullPage: true });
  // ---- Further reading: every tab link ----
  await tab('t-more'); await scan('t-more', 'more');
  const links = await p.evaluate(() => [...document.querySelectorAll('#t-more a[data-tab]')].map(a => a.dataset.tab));
  for (const l of links) { await tab('t-more'); await p.click(`#t-more a[data-tab=${l}]`); const vis = await p.evaluate(l => !document.getElementById(l).hidden, l); if (!vis) { bad++; console.log('tab link', l) } }
  const ext = await p.evaluate(() => [...document.querySelectorAll('a[href^="http"]')].filter(a => a.target !== '_blank' || !/noopener/.test(a.rel)).length); if (ext) { bad++; console.log('external links without target/rel', ext) }
  if (errs.length) { bad += errs.length; console.log(scheme, width, 'ERRORS', errs.slice(0, 5)) }
  if (probs.length) { bad += probs.length; console.log(scheme, width, 'PROBLEMS', probs.length, probs.slice(0, 8)) }
  console.log(scheme, width, 'done');
  await p.close();
}
await b.close(); console.log('problems', bad);
