// Click every control of the page at 390 px dark and 920 px light; check the page's JavaScript against recompute_out.json;
// report errors, NaN/undefined/'?' values and sideways scroll; screenshot each visual card into ../.shots/.
// Run from this folder: node check_page.mjs   (needs `npm ci` in html_utils; python3 recompute.py first)
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.join(here, '..', 'index.html'), shots = path.join(here, '..', '.shots'); fs.mkdirSync(shots, { recursive: true });
const RC = fs.existsSync(path.join(here, 'recompute_out.json')) ? JSON.parse(fs.readFileSync(path.join(here, 'recompute_out.json'), 'utf8')) : null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0; const say = (ok, m) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + m) };
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const CARDS = ['rd-arch', 'rd-pitr-card', 'rd-lag-card', 'rd-slot', 'rd-sync', 'rd-thr-card', 'rd-vac-card', 'rd-full', 'rd-conn', 'rd-eol', 'rd-up-out', 'rd-mcost'];
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page); await sleep(400);
  const H = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < H; y += 800) { await p.evaluate(y => scrollTo(0, y), y); await sleep(40) }
  const n = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); let k = 0; const click = el => { el.click(); k++ };
    for (const el of document.querySelectorAll('#t-read .seg button')) { click(el); await sleep(40) }
    for (const c of document.querySelectorAll('#t-read .an-ctl')) { for (const s of ['f', 'f', 'b', 'p', 'p']) { const e = document.getElementById(c.id + '-' + s); if (e) { click(e); await sleep(30) } }
      const r = document.getElementById(c.id + '-s'); if (r) { r.value = r.max; r.dispatchEvent(new Event('input')); await sleep(30); r.value = 0; r.dispatchEvent(new Event('input')); await sleep(30); r.value = r.max; r.dispatchEvent(new Event('input')) }
      const v = document.getElementById(c.id + '-v'); if (v) { v.value = '2'; v.dispatchEvent(new Event('change')) } }
    for (const id of ['rd-thr-n', 'rd-thr-s']) { const r = document.getElementById(id); for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input')); k++ } }
    for (const el of document.querySelectorAll('details')) el.open = true;
    return k });
  say(n > 15, `${scheme} ${width}: clicked ${n} Reading controls`);
  // PITR animation in both modes: final step numbers
  const pitr = await p.evaluate(async () => { const out = {}; const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (const m of ['dump', 'pitr']) { document.querySelector('#rd-pitr-mode button[data-m=' + m + ']').click(); await sleep(30);
      const r = document.getElementById('rd-pitr-ctl-s'); r.value = r.max; r.dispatchEvent(new Event('input')); await sleep(30);
      out[m] = document.getElementById('rd-pitr-cnt').innerText.replace(/\s+/g, ' ') }
    return out });
  console.log('     pitr final:', JSON.stringify(pitr));
  for (const id of CARDS) { const el = await p.$('#' + id); if (el) { await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await sleep(60); await el.screenshot({ path: path.join(shots, `my-${id}-${scheme}-${width}.png`) }) } else say(false, 'missing #' + id) }
  // incident lab: every alert, every step
  await p.click('button[data-t=t-lab]'); await sleep(100);
  const lab = await p.evaluate(async () => { let steps = 0, missing = 0; const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (const b of document.querySelectorAll('#lab-alerts button')) { b.click(); await sleep(10);
      for (let i = 0; i < 8; i++) { const t = document.getElementById('lab-body').innerText; if (/no recorded output/.test(t)) missing++; steps++; const nx = document.getElementById('lab-next'); if (nx.disabled) break; nx.click(); await sleep(5) }
      document.getElementById('lab-prev').click() }
    document.querySelectorAll('#lab-steps button')[0].click(); return { steps, missing } });
  say(lab.missing === 0 && lab.steps > 35, `${scheme}: incident lab ${lab.steps} steps shown, ${lab.missing} with missing output`);
  await p.evaluate(() => LAB.pick('delete')); await sleep(50);
  await p.screenshot({ path: path.join(shots, `my-lab-${scheme}-${width}.png`) });
  await p.click('button[data-t=t-runs]'); await sleep(100);
  const runs = await p.evaluate(async () => { let k = 0, miss = 0; for (const b of document.querySelectorAll('#runs-pick button')) { b.click(); k += document.querySelectorAll('#runs-body .tr').length; if (/no recorded output/.test(document.getElementById('runs-body').innerText)) miss++ } return { k, miss } });
  say(runs.k > 50 && runs.miss === 0, `${scheme}: lab notebook ${runs.k} transcripts, ${runs.miss} runs with missing output`);
  await p.click('button[data-t=t-check]'); await sleep(100);
  const chk = await p.evaluate(() => { const cs = [...document.querySelectorAll('#chk-list input')]; cs.slice(0, 5).forEach(c => c.click()); const t = document.getElementById('chk-count').textContent; document.getElementById('chk-reset').click(); return [cs.length, t, document.getElementById('chk-count').textContent] });
  say(chk[0] === 30 && chk[1].startsWith('5 of 30') && chk[2].startsWith('0 of 30'), `${scheme}: checklist ${JSON.stringify(chk)}`);
  await p.screenshot({ path: path.join(shots, `my-check-${scheme}-${width}.png`) });
  await p.click('button[data-t=t-more]'); await sleep(50);
  // tab links inside the page
  await p.click('button[data-t=t-read]'); await sleep(100);
  // text sanity in every tab
  const txt = await p.evaluate(() => { let s = ''; for (const t of document.querySelectorAll('.tab')) { t.hidden = false; s += t.innerText + '\n' } return s });
  const badTxt = (txt.match(/.{0,40}(NaN|undefined|\[object|Infinity).{0,40}/g) || []);
  say(badTxt.length === 0, `${scheme}: no NaN/undefined in text` + (badTxt.length ? ' ' + JSON.stringify(badTxt.slice(0, 4)) : ''));
  const q = await p.evaluate(() => [...document.querySelectorAll('[data-v]')].filter(e => e.textContent === '?').map(e => e.dataset.v));
  say(q.length === 0, `${scheme}: every data-bound number resolved` + (q.length ? ' ' + q : ''));
  const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  say(sw <= 0, `${scheme} ${width}: no sideways scroll (${sw})`);
  if (RC && width === 920) {
    const js = await p.evaluate(() => ({ thr: [RPG_thr(1e9, 0.2), RPG_thr(1e7, 0.01), RPG_thr(1e5, 0.2)], cost: RPG_COST }));
    const close = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
    say(close(js.thr[0].raw, RC.thr_1e9_02.raw) && close(js.thr[0].pg18, RC.thr_1e9_02.pg18) && close(js.thr[1].raw, RC.thr_1e7_001.raw) && close(js.thr[2].raw, RC.thr_1e5_02.raw), 'autovacuum thresholds match recompute.py');
    say(Object.keys(RC.cost).every(k => close(js.cost[k], RC.cost[k])), 'managed costs match recompute.py');
  }
  say(errs.length === 0, `${scheme}: no page errors` + (errs.length ? ' ' + errs.slice(0, 3).join(' | ') : ''));
  const jsErr = await p.evaluate(() => document.getElementById('jsErr').hidden);
  say(jsErr, `${scheme}: error box hidden`);
  await p.close();
}
await b.close();
console.log(bad ? `${bad} FAILED` : 'all ok'); process.exit(bad ? 1 : 0);
