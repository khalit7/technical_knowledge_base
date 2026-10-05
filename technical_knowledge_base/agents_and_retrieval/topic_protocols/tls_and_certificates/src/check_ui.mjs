// Click every control of the TLS page at 390 px dark and 920 px light; fail on page errors, NaN, undefined,
// sideways scroll or the error box. Screenshots of each interactive card go to <out dir>.
// Usage (from the repo root): node technical_knowledge_base/agents_and_retrieval/topic_protocols/tls_and_certificates/src/check_ui.mjs <out dir>
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const out = process.argv[2] || '/tmp';
const page_url = 'file://' + path.resolve(here, '../index.html');
const browser = await puppeteer.launch({ headless: 'shell' });
let bad = 0, total = 0;
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
      return { nan: /\bNaN\b/.test(txt), undef: /\bundefined\b|(?<!\/dev\/)\bnull\b/.test(txt), side: document.documentElement.scrollWidth > innerWidth + 1,
               err: !document.getElementById('jsErr').hidden };
    });
    if (r.nan || r.undef || r.side || r.err || errs.length) { bad++; console.log('FAIL', scheme, w, where, JSON.stringify(r), errs.join(' | ')); errs.length = 0; }
  };
  // scrub an animation (controller id) through every step, checking each
  const scrub = async (ctl, where) => {
    const n = await p.evaluate(c => { const r = document.getElementById(c + '-s'); return r ? +r.max : -1 }, ctl);
    for (let v = 0; v <= n; v++) {
      await p.evaluate((c, v) => { const r = document.getElementById(c + '-s'); r.value = v; r.dispatchEvent(new Event('input')); }, ctl, v);
      await check(where + ' step ' + v); total++;
    }
    for (const b of ['-p', '-p', '-f', '-b']) { await p.evaluate((c, b) => document.getElementById(c + b).click(), ctl, b); total++; }
    await p.evaluate(c => { const s = document.getElementById(c + '-v'); s.value = '2'; s.dispatchEvent(new Event('change')); }, ctl);
  };
  const shot = async (id, name) => {
    const el = await p.$('#' + id);
    if (el) { await el.scrollIntoView(); await sleep(60); await el.screenshot({ path: `${out}/${name}-${scheme}-${w}.png` }); }
  };
  // Reading
  await p.click('#tabs button[data-t="t-read"]');
  for (const m of ['tls12', 'tls13']) { await p.evaluate(m => document.querySelector('#obs-mode [data-m="' + m + '"]').click(), m); await scrub('obs-ctl', 'observer ' + m);
    await p.evaluate(() => { const r = document.getElementById('obs-ctl-s'); r.value = 1; r.dispatchEvent(new Event('input')); }); await shot('obs-card', 'obs-' + m); }
  for (const m of ['tls13', 'rsa', 'mldsa44', 'mldsa65']) { await p.evaluate(m => document.querySelector('#fl-mode [data-m="' + m + '"]').click(), m); await scrub('fl-ctl', 'flight ' + m); await shot('fl-card', 'flight-' + m); }
  for (const m of ['0', '1', '2', '3']) { await p.evaluate(m => document.querySelector('#acme-pick [data-m="' + m + '"]').click(), m); await scrub('acme-ctl', 'acme ' + m); }
  await p.evaluate(() => { document.querySelector('#acme-pick [data-m="0"]').click(); const r = document.getElementById('acme-ctl-s'); r.value = 2; r.dispatchEvent(new Event('input')); });
  await shot('acme-card', 'acme');
  for (const pp of ['23', '47', '101']) for (const a of ['2', '20']) {
    await p.evaluate((pp, a) => { const s = document.getElementById('dh-p'); s.value = pp; s.dispatchEvent(new Event('input')); const r = document.getElementById('dh-a'); r.value = a; r.dispatchEvent(new Event('input')); }, pp, a);
    await check('dh ' + pp + ' ' + a); total++;
  }
  await p.evaluate(() => document.querySelectorAll('#t-read details summary').forEach(s => s.click()));
  await check('reading details');
  for (const id of ['one-fig', 'dh-card', 'hrr-tab', 'cost-bars', 'zr-card', 'x509-tab', 'pub-tab', 'life-card', 'rot-card', 'speed-bars', 'tm-tab']) await shot(id, id);
  // Handshake tab
  await p.click('#tabs button[data-t="t-hs"]');
  for (const r of ['tls13', 'mtls', 'tls12']) for (const v of ['obs', 'end']) {
    await p.evaluate((r, v) => { document.querySelector('#hs-rec [data-m="' + r + '"]').click(); document.querySelector('#hs-view [data-m="' + v + '"]').click(); }, r, v);
    await scrub('hs-ctl', 'hs ' + r + ' ' + v);
    await p.evaluate(() => { const r = document.getElementById('hs-ctl-s'); r.value = 4; r.dispatchEvent(new Event('input')); });
    await shot('hs-card', 'hs-' + r + '-' + v);
  }
  await p.evaluate(() => document.querySelector('#hs-list tr[data-i="2"]').click()); await check('hs row click');
  // Certificate dissector: every host, every certificate, every name, date ends, both faults
  await p.click('#tabs button[data-t="t-cert"]');
  const nh = await p.$$eval('#ce-host option', o => o.length);
  for (let h = 0; h < nh; h++) {
    await p.evaluate(h => { const s = document.getElementById('ce-host'); s.value = String(h); s.dispatchEvent(new Event('change')); }, h);
    const nc = await p.$$eval('#ce-chain button', b => b.length);
    for (let c = 0; c < nc; c++) { await p.evaluate(c => document.querySelectorAll('#ce-chain button')[c].click(), c); await check('cert ' + h + ' ' + c); total++; }
    const nn = await p.$$eval('#ce-name option', o => o.length);
    for (let n = 0; n < nn; n++) { await p.evaluate(n => { const s = document.getElementById('ce-name'); s.selectedIndex = n; s.dispatchEvent(new Event('change')); }, n); await check('name ' + h + ' ' + n); total++; }
    for (const d of ['0', '600']) for (const f of ['ce-drop', 'ce-store']) {
      await p.evaluate((d, f) => { const r = document.getElementById('ce-date'); r.value = d; r.dispatchEvent(new Event('input')); const c = document.getElementById(f); c.click(); }, d, f);
      await check('fault ' + h + ' ' + d + ' ' + f); total++;
      await p.evaluate(f => document.getElementById(f).click(), f);
    }
  }
  await p.evaluate(() => { const s = document.getElementById('ce-host'); s.value = '0'; s.dispatchEvent(new Event('change')); const r = document.getElementById('ce-date'); r.value = '90'; r.dispatchEvent(new Event('input')); });
  await shot('ce-card', 'cert');
  // Further reading: tab links
  await p.click('#tabs button[data-t="t-more"]'); await check('more');
  await p.evaluate(() => document.querySelector('#t-more a[data-tab="t-hs"]').click()); await check('more link');
  await p.close();
}
await browser.close();
console.log('controls exercised', total, 'failures', bad);
process.exit(bad ? 1 : 0);
