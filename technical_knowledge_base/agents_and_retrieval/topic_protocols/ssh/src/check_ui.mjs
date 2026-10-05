// Click every control of the SSH page at 390 px dark and 920 px light; fail on page errors, NaN, undefined,
// sideways scroll or the error box. Screenshots of each interactive card go to <out dir>.
// Usage (from the repo root): node technical_knowledge_base/agents_and_retrieval/topic_protocols/ssh/src/check_ui.mjs <out dir>
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const out = process.argv[2] || '.';
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
    total++;
    const r = await p.evaluate(() => {
      const vis = [...document.querySelectorAll('.tab')].find(t => !t.hidden);
      const txt = vis ? vis.innerText : '';
      return { nan: /\bNaN\b/.test(txt), undef: /\bundefined\b|(?<!\/dev\/)\bnull\b|\(missing\)|\[\[/.test(txt), side: document.documentElement.scrollWidth > innerWidth + 1,
               err: !document.getElementById('jsErr').hidden };
    });
    if (r.nan || r.undef || r.side || r.err || errs.length) { bad++; console.log('FAIL', scheme, w, where, JSON.stringify(r), errs.join(' | ')); errs.length = 0; }
  };
  const scrub = async (ctl, where) => {
    const n = await p.evaluate(c => { const r = document.getElementById(c + '-s'); return r ? +r.max : -1 }, ctl);
    if (n < 0) { bad++; console.log('FAIL no controller', ctl); return; }
    for (let v = 0; v <= n; v++) {
      await p.evaluate((c, v) => { const r = document.getElementById(c + '-s'); r.value = v; r.dispatchEvent(new Event('input')); }, ctl, v);
      await check(where + ' step ' + v);
    }
    for (const b of ['-p', '-p', '-f', '-b']) { await p.evaluate((c, b) => document.getElementById(c + b).click(), ctl, b); }
    await p.evaluate(c => { const s = document.getElementById(c + '-v'); s.value = '2'; s.dispatchEvent(new Event('change')); }, ctl);
    await check(where + ' buttons');
  };
  const shot = async (id, name) => {
    const el = await p.$('#' + id);
    if (el) { await el.scrollIntoView(); await sleep(80); await el.screenshot({ path: `${out}/${name}-${scheme}-${w}.png` }); }
  };
  const seg = async (segId, m) => p.evaluate((s, m) => document.querySelector('#' + s + ' [data-m="' + m + '"]').click(), segId, m);
  await p.click('#tabs button[data-t="t-read"]');
  await shot('one-topo', 'one-topo'); await shot('layers-fig', 'layers');
  for (const m of ['curve25519-sha256', 'sntrup761x25519-sha512', 'ecdh-sha2-nistp256', 'mlkem768x25519-sha256']) { await seg('hs-seg', m); await scrub('hs-ctl', 'hs ' + m); }
  await p.evaluate(() => { const r = document.getElementById('hs-ctl-s'); r.value = 4; r.dispatchEvent(new Event('input')); }); await shot('hs-card', 'hs');
  await shot('rtt-fig', 'rtt');
  for (const m of ['cert_expired', 'cert_wrong_principal', 'cert_no_principal', 'cert_revoked']) { await seg('cert-seg', m); await check('cert ' + m); }
  await shot('cert-card', 'cert');
  for (const m of ['forward', 'constrained', 'proxyjump']) { await seg('ag-seg', m); await scrub('ag-ctl', 'agent ' + m); }
  await seg('ag-seg', 'forward'); await p.evaluate(() => { const r = document.getElementById('ag-ctl-s'); r.value = 3; r.dispatchEvent(new Event('input')); }); await shot('ag-card', 'agent');
  for (const m of ['fresh', 'mux', 'both']) { await seg('mux-seg', m); await scrub('mux-ctl', 'mux ' + m); }
  await shot('mux-card', 'mux'); await shot('fwd-fig', 'fwd'); await shot('reach-tbl', 'reach'); await shot('xfer-fig', 'xfer');
  const nc = await p.$$eval('#cfg-card .cfg div[role=option]', d => d.length);
  for (let i = 0; i < nc; i++) { await p.evaluate(i => document.querySelectorAll('#cfg-card .cfg div[role=option]')[i].click(), i); await check('cfg ' + i); }
  await shot('cfg-card', 'cfg');
  await p.evaluate(() => document.querySelectorAll('#t-read details summary').forEach(s => s.click()));
  await check('reading details');
  // nav links
  const nn = await p.$$eval('#rd-nav a', a => a.length);
  for (let i = 0; i < nn; i++) { await p.evaluate(i => document.querySelectorAll('#rd-nav a')[i].click(), i); }
  await check('nav');
  // Cluster lab
  await p.click('#tabs button[data-t="t-lab"]');
  const ns = await p.$$eval('#lab-list button', b => b.length);
  for (let i = 0; i < ns; i++) { await p.evaluate(i => document.querySelectorAll('#lab-list button')[i].click(), i); await scrub('lab-ctl', 'lab ' + i); if (i === 2 || i === 7) await shot('lab-card', 'lab' + i); }
  // Error decoder
  await p.click('#tabs button[data-t="t-err"]');
  const ne = await p.$$eval('#err-list button', b => b.length);
  for (let i = 0; i < ne; i++) { await p.evaluate(i => document.querySelectorAll('#err-list button')[i].click(), i); await check('err ' + i); }
  await shot('t-err', 'err');
  await p.type('#err-q', 'denied'); await check('err filter'); 
  const nf = await p.$$eval('#err-list button', b => b.length); if (nf < 1) { bad++; console.log('FAIL filter found nothing'); }
  await p.evaluate(() => document.querySelector('#err-detail .err-sec').click()); await check('err section link');
  // Further reading
  await p.click('#tabs button[data-t="t-more"]'); await check('more');
  const links = await p.$$eval('#t-more a[target=_blank]', a => a.filter(x => !/^https:\/\//.test(x.href)).length); if (links) { bad++; console.log('FAIL non-https link'); }
  await p.close();
}
await browser.close();
console.log('checks', total, 'failures', bad);
process.exit(bad ? 1 : 0);
