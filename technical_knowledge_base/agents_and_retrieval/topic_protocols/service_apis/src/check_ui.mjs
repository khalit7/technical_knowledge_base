// Click every control of the Service APIs page at 390 px dark and 920 px light; fail on page errors, NaN, undefined,
// "(missing)" values, sideways scroll or the error box. Screenshots of each interactive card go to <out dir>.
// Usage (from the repo root): node technical_knowledge_base/agents_and_retrieval/topic_protocols/service_apis/src/check_ui.mjs <out dir>
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const out = process.argv[2] || '/tmp';
const page_url = 'file://' + path.resolve(here, '../index.html');
const browser = await puppeteer.launch({ headless: 'shell' });
let bad = 0, clicks = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
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
      return { nan: /\bNaN\b/.test(txt), undef: /\bundefined\b/.test(txt), missing: /\(missing\)/.test(txt), side: document.documentElement.scrollWidth > innerWidth + 1,
               err: !document.getElementById('jsErr').hidden };
    });
    if (r.nan || r.undef || r.missing || r.side || r.err) { bad++; console.log('FAIL', scheme, w, where, JSON.stringify(r)); }
  };
  const clickAll = async (sel) => {
    const n = await p.$$eval(sel, els => els.length);
    for (let i = 0; i < n; i++) {
      await p.evaluate((s, i) => { const e = document.querySelectorAll(s)[i]; if (e && e.offsetParent !== null) e.click(); }, sel, i);
      await sleep(20);
    }
    clicks += n; return n;
  };
  const scrub = async (ctl) => p.evaluate(c => { const r = document.querySelector(c + ' input[type=range]'); for (let v = 0; v <= +r.max; v++) { r.value = v; r.dispatchEvent(new Event('input')); } }, ctl);
  const shot = async (id, name) => {
    const el = await p.$('#' + id);
    if (el) { await el.scrollIntoView(); await el.screenshot({ path: `${out}/${name}-${scheme}-${w}.png` }); }
  };
  // Reading
  await p.click('#tabs button[data-t="t-read"]');
  for (const m of ['0', '1', '2', '3']) {
    await p.evaluate(m => document.querySelector('#rd-dlseg [data-m="' + m + '"]').click(), m);
    await scrub('#rd-dlctl'); await check('deadline ' + m);
    if (m === '3') await shot('rd-dl', 'rd-dl-D');
  }
  for (const sel of ['#rd-pbstrip span', '#t-read .an-ctl button', '#t-read .drill .opts button', '#t-read details summary', '#rd-dlseg button']) await clickAll(sel);
  for (const v of ['0', '1', '127', '128', '300', '4294967295', '-5', '']) {
    await p.evaluate(v => { const e = document.getElementById('rd-vval'); e.value = v; e.dispatchEvent(new Event('input')); }, v);
    await check('varint ' + v);
  }
  await check('reading');
  for (const id of ['rd-path', 'rd-vcard', 'rd-pbcard', 'rd-evo', 'rd-tensor', 'rd-grpcwire', 'rd-vsrest', 'rd-fails', 'rd-pings', 'rd-lbcounts', 'rd-lbscale', 'rd-n1', 'rd-fan', 'rd-partial', 'rd-gl']) await shot(id, id);
  // One gRPC call
  await p.click('#tabs button[data-t="t-call"]'); await sleep(100);
  for (const m of ['0', '1', '2']) {
    await p.evaluate(m => document.querySelector('#cl-seg [data-m="' + m + '"]').click(), m);
    await scrub('#cl-ctl'); await clickAll('#cl-list .fr'); await check('call ' + m);
    await shot('cl-det', 'cl-det-' + m);
  }
  await clickAll('#cl-ctl button');
  // Balancer lab
  await p.click('#tabs button[data-t="t-lb"]'); await sleep(100);
  await scrub('#lb-ctl'); await clickAll('#lb-ctl button'); await check('lb');
  await shot('lb-panels', 'lb-panels');
  // Further reading and tab links
  await p.click('#tabs button[data-t="t-more"]'); await sleep(50); await check('more');
  await clickAll('#t-more a[data-tab]'); await check('more links');
  await p.click('#tabs button[data-t="t-read"]');
  await clickAll('#t-read a[data-tab]'); await check('reading tab links');
  if (errs.length) { bad++; console.log('ERRORS', scheme, w, errs.slice(0, 5)); }
  await p.close();
}
await browser.close();
console.log(bad ? 'check_ui: FAIL ' + bad : 'check_ui: ok, ' + clicks + ' clicks, 0 errors, no NaN/undefined/missing, no sideways scroll');
process.exit(bad ? 1 : 0);
