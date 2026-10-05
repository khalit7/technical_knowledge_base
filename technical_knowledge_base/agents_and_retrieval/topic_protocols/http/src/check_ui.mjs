// Click every control of the HTTP page at 390 px dark and 920 px light; fail on page errors, NaN, undefined,
// sideways scroll or the error box. Screenshots of each interactive card go to <out dir>.
// Usage (from the repo root): node technical_knowledge_base/agents_and_retrieval/topic_protocols/http/src/check_ui.mjs <out dir>
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const out = process.argv[2] || '/tmp';
const page_url = 'file://' + path.resolve(here, '../index.html');
const browser = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(page_url);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await p.reload();
  const check = async (where) => {
    const r = await p.evaluate(() => {
      const vis = [...document.querySelectorAll('.tab')].find(t => !t.hidden);
      const txt = vis ? vis.innerText : '';
      return { nan: /\bNaN\b/.test(txt), undef: /\bundefined\b/.test(txt), side: document.documentElement.scrollWidth > innerWidth + 1,
               err: !document.getElementById('jsErr').hidden };
    });
    if (r.nan || r.undef || r.side || r.err) { bad++; console.log('FAIL', scheme, w, where, JSON.stringify(r)); }
  };
  const clickAll = async (sel) => {
    const n = await p.$$eval(sel, els => els.length);
    for (let i = 0; i < n; i++) {
      await p.evaluate((s, i) => { const e = document.querySelectorAll(s)[i]; if (e && e.offsetParent !== null) e.click(); }, sel, i);
      await new Promise(r => setTimeout(r, 30));
    }
    return n;
  };
  const shot = async (id, name) => {
    const el = await p.$('#' + id);
    if (el) { await el.scrollIntoView(); await el.screenshot({ path: `${out}/${name}-${scheme}-${w}.png` }); }
  };
  // Reading
  await p.click('#tabs button[data-t="t-read"]');
  let total = 0;
  for (const sel of ['#t-read .seg button', '#t-read .an-ctl button', '#t-read .drill .opts button', '#rd-anat-txt [data-p]', '#t-read details summary']) total += await clickAll(sel);
  // step every animation through all its steps with the scrubber
  await p.evaluate(() => document.querySelectorAll('#t-read .an-ctl input[type=range]').forEach(r => { for (let v = 0; v <= +r.max; v++) { r.value = v; r.dispatchEvent(new Event('input')); } }));
  // every header set x mode of the compression animation, every step
  for (const s of ['running', 'bearer', 'sdk']) for (const m of ['h2', 'h1', 'h3']) {
    await p.evaluate((s, m) => { document.querySelector('#rd-hp-set [data-m="' + s + '"]').click(); document.querySelector('#rd-hp-mode [data-m="' + m + '"]').click();
      const r = document.querySelector('#rd-hp-ctl input[type=range]'); for (let v = 0; v <= +r.max; v++) { r.value = v; r.dispatchEvent(new Event('input')); } }, s, m);
    await check('hpack ' + s + ' ' + m);
  }
  for (const k of ['0', '1', '2']) { await p.evaluate(k => { document.querySelector('#rd-fc-seg [data-m="' + k + '"]').click(); const r = document.querySelector('#rd-fc-ctl input[type=range]'); for (let v = 0; v <= +r.max; v++) { r.value = v; r.dispatchEvent(new Event('input')); } }, k); await check('flow ' + k); }
  for (const k of ['h1_pipelined', 'h1_two_conns', 'h2_one_conn']) { await p.evaluate(k => { document.querySelector('#rd-hol-seg [data-m="' + k + '"]').click(); const r = document.querySelector('#rd-hol-ctl input[type=range]'); r.value = r.max; r.dispatchEvent(new Event('input')); }, k); await check('hol ' + k); }
  await check('reading');
  for (const id of ['rd-anat', 'rd-hol', 'rd-hp', 'rd-fc', 'rd-px', 'rd-sm', 'rd-amb', 'rd-tmeas', 'rd-retry', 'rd-pub']) await shot(id, id);
  // Frame by frame
  await p.click('#tabs button[data-t="t-frames"]');
  for (const v of ['h2', 'h3', 'h1']) {
    await p.evaluate(v => document.querySelector('#fr-ver [data-m="' + v + '"]').click(), v);
    await p.evaluate(() => { const r = document.querySelector('#fr-ctl input[type=range]'); for (let x = 0; x <= +r.max; x++) { r.value = x; r.dispatchEvent(new Event('input')); } });
    total += await clickAll('#fr-jump button');
    await check('frames ' + v);
    await p.evaluate(() => { const r = document.querySelector('#fr-ctl input[type=range]'); r.value = 2; r.dispatchEvent(new Event('input')); });
    await shot('fr-card', 'frames-' + v);
  }
  // Timeout chain: every option of every hop, sliders at their ends, presets
  await p.click('#tabs button[data-t="t-chain"]');
  const sels = await p.$$eval('#ch-hops select', s => s.map(x => [x.dataset.k, x.options.length]));
  for (const [k, n] of sels) for (let i = 0; i < n; i++) {
    await p.evaluate((k, i) => { const s = document.querySelector('#ch-hops select[data-k="' + k + '"]'); s.value = String(i); s.dispatchEvent(new Event('change', { bubbles: true })); }, k, i);
    await check('chain ' + k + i);
  }
  for (const id of ['ch-think', 'ch-gap', 'ch-ntok', 'ch-ping']) for (const end of ['min', 'max']) {
    await p.evaluate((id, end) => { const r = document.getElementById(id); r.value = r[end]; r.dispatchEvent(new Event('input')); }, id, end);
    await check('slider ' + id + ' ' + end);
  }
  total += await clickAll('#ch-pre button');
  await p.evaluate(() => { const r = document.querySelector('#ch-ctl input[type=range]'); for (let v = 0; v <= +r.max; v++) { r.value = v; r.dispatchEvent(new Event('input')); } });
  await check('chain');
  const match = await p.$eval('#ch-match', e => e.textContent);
  console.log(scheme, w, 'validation', match);
  await p.evaluate(() => { document.querySelector('#ch-pre [data-m="noping"]').click(); });
  for (const id of ['ch-hops', 'ch-svg', 'ch-val']) await shot(id, id);
  await p.click('#tabs button[data-t="t-more"]'); await check('more');
  if (errs.length) { bad++; console.log('ERRORS', scheme, w, errs.slice(0, 5)); }
  console.log(scheme, w, 'controls clicked', total);
  await p.close();
}
await browser.close();
console.log(bad ? 'FAIL ' + bad : 'OK');
process.exit(bad ? 1 : 0);
